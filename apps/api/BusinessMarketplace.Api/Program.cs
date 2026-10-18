using BusinessMarketplace.Api.Configuration;
using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Diagnostics;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

// Composition root.
//
// NestJS splits startup across main.ts (bootstrap) and AppModule (providers).
// ASP.NET Core keeps both steps in this file:
//   1. Register services on `builder` (the DI container).
//   2. Call Build(), which freezes that container.
//   3. Register middleware and endpoints on `app`.
//   4. Call Run(), which listens until the process is stopped.
//
// There is no handwritten Main. Top-level statements compile into
// Program.Main, like a Node module that runs from the top of the file.
// Framework namespaces (Microsoft.AspNetCore.Builder and the logging,
// configuration, and DI namespaces) are imported by the Web SDK because
// the csproj sets ImplicitUsings. The project usings above are ours.
// Microsoft.EntityFrameworkCore is explicit because UseNpgsql lives there.

var builder = WebApplication.CreateBuilder(args);

// Controllers, model binding, validation, and System.Text.Json.
// Property names are camelCase on the wire unless this is overridden.
builder.Services.AddControllers();

// RFC 9457 ProblemDetails for client errors and for the exception handler.
// Customize runs for both, so traceId and instance are not added in each action.
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = MarketplaceProblemDetails.Customize;
});

// IExceptionHandler is invoked by UseExceptionHandler. Registration alone
// does nothing. The handler is a singleton, like a NestJS APP_FILTER.
builder.Services.AddExceptionHandler<UnexpectedExceptionHandler>();

// "self" is liveness: the process answered. "database" is readiness:
// PostgreSQL accepted a connection. The tags keep those questions apart.
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);

// Built-in OpenAPI document for ASP.NET Core 10 (OpenAPI 3.1).
// Swagger UI, registered further down, only renders this document.
// Do not also call AddSwaggerGen: that is a second generator for the
// same endpoints.
builder.Services.AddOpenApi(options =>
{
    // Runs when /openapi/v1.json is requested. context and cancellationToken
    // are for transformers that read the request or call a service. A fixed
    // title needs neither, but the delegate signature still requires them.
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info.Title = "Business Marketplace API";
        document.Info.Version = "v1";
        document.Info.Description =
            "Shared HTTP API for the Angular and Vue marketplace clients.";
        return Task.CompletedTask;
    });
});

// HealthService has no per-request data, and nothing will swap it for
// another implementation, so one instance for the process is enough.
// NestJS providers are singletons unless the scope is changed.
builder.Services.AddSingleton<HealthService>();

// ConnectionStrings__DefaultConnection is the environment-variable form of
// ConnectionStrings:DefaultConnection. Environment variables override the
// JSON files. The local default lives in appsettings.Development.json and
// matches docker-compose.yml. The value is not written to the log.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not set. Set ConnectionStrings__DefaultConnection.");
}

// AddDbContext registers AppDbContext as scoped. UseNpgsql selects the
// PostgreSQL provider. Migrations are applied with dotnet ef, not at startup.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Callers depend on IBusinessListingService. This binds that contract to
// the EF implementation. The service is scoped so it can take the scoped
// AppDbContext. A singleton service must not take a DbContext: the container
// would keep that one session for the life of the process, and a context
// cannot be used by two requests at once.
builder.Services.AddScoped<IBusinessListingService, BusinessListingService>();

// Browsers enforce CORS. The Angular dev server (:4200) and the Vue dev
// server (:4201) are different origins from this API (:5000). Origins are
// loaded from configuration so the ports are not compiled into the pipeline.
// The policy exists only in Development; production origins are not decided.
// Non-browser clients (HttpClient, the tests) do not send Origin, so they
// are unaffected when the middleware is absent.
string[] developmentOrigins = [];

if (builder.Environment.IsDevelopment())
{
    developmentOrigins = builder.Configuration
        .GetSection(FrontendCorsSettings.SectionName)
        .Get<FrontendCorsSettings>()
        ?.Origins ?? [];

    if (developmentOrigins.Length == 0)
    {
        throw new InvalidOperationException(
            $"{FrontendCorsSettings.SectionName}:Origins must list at least one origin when the environment is Development.");
    }

    builder.Services.AddCors(options =>
    {
        options.AddPolicy(FrontendCorsSettings.PolicyName, policy =>
        {
            // WithOrigins is an allow-list. AllowAnyOrigin would let any site
            // call this API from a browser. AllowAnyHeader and AllowAnyMethod
            // are a local convenience while the contract is still small.
            // AllowCredentials is omitted: there is no cookie auth yet, and
            // credentials cannot be combined with AllowAnyOrigin.
            policy
                .WithOrigins(developmentOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });
}

// Services cannot be registered after Build(). Middleware is separate:
// it is the request pipeline, not the DI container.
var app = builder.Build();

// Explicit development seed. Startup does not call this, and neither does
// production. Apply migrations first, then:
//   dotnet run --project apps/api/BusinessMarketplace.Api --launch-profile http -- --seed
if (args.Contains("--seed"))
{
    if (!app.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            $"Refusing to seed the {app.Environment.EnvironmentName} environment.");
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var inserted = await DevelopmentListingSeeder.SeedAsync(db);
    app.Logger.LogInformation("Development seed inserted {InsertedCount} listings.", inserted);
    return;
}

if (app.Environment.IsDevelopment())
{
    // CORS is outside the exception handler. A 500 is written by that
    // handler, and the CORS middleware adds Access-Control-Allow-Origin
    // on the way back out. Registered the other way around, the Angular
    // dev server would see a network error instead of the problem document.
    app.UseCors(FrontendCorsSettings.PolicyName);

    app.Logger.LogInformation(
        "Development CORS is enabled for {Origins}",
        string.Join(", ", developmentOrigins));
}

// Catches exceptions from everything registered after this call.
// UseDeveloperExceptionPage is not used. That page is HTML and includes
// the stack trace. This API's clients, including a later Angular app,
// need a ProblemDetails JSON body in every environment. The stack trace
// is written once, by UnexpectedExceptionHandler, to the server log.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    // Viewer only. The page fetches the document MapOpenApi exposes at
    // /openapi/v1.json. MapOpenApi adds an endpoint; it does not occupy
    // this slot in the middleware chain.
    app.UseSwaggerUI(options =>
    {
        options.DocumentTitle = "Business Marketplace API";
        options.SwaggerEndpoint("/openapi/v1.json", "Business Marketplace API v1");
    });

    app.MapOpenApi();
}

// No authentication scheme is registered. The middleware is here so a later
// [Authorize] attribute has a place to run. With nothing configured it
// lets every request through.
app.UseAuthorization();

app.MapControllers();

// Separate from GET /api/health, which stays the existing JSON contract.
// A plain "Healthy" or "Unhealthy" body has no host, database name, or error text.
app.MapHealthChecks("/api/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live"),
});
app.MapHealthChecks("/api/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
});

// Blocks this thread until Ctrl+C. Kestrel continues to accept requests
// on thread-pool threads, which is why a synchronous action is still served
// without blocking other requests for long.
app.Run();

// Top-level statements generate an internal Program class. This partial
// makes that class public so the test project can use
// WebApplicationFactory<Program>. It has to stay in the global namespace
// to merge with the generated half. It is not a type to add members to.
public partial class Program
{
}
