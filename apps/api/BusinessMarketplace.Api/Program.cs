using BusinessMarketplace.Api.Configuration;
using BusinessMarketplace.Api.Services;

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
// the csproj sets ImplicitUsings. The two usings above are ours.

var builder = WebApplication.CreateBuilder(args);

// Controllers, model binding, validation, and System.Text.Json.
// Property names are camelCase on the wire unless this is overridden.
builder.Services.AddControllers();

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

// Callers will depend on IBusinessListingService. This line is the binding
// from that contract to the in-memory class, the same role as a NestJS
// provider registered against an injection token.
//
// Scoped: one instance per HTTP request, disposed at the end of the request.
// Transient would construct a new instance at every injection point inside
// that request. Singleton would construct one for the process.
// Scoped is the lifetime a database session uses. A request-scoped service
// may take that session in its constructor. A singleton must not: the
// container would capture the session for the life of the process.
// The sample catalog is static shared data, not a list created in the
// service constructor, so the scoped lifetime does not give each request
// a private mutable copy.
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

if (app.Environment.IsDevelopment())
{
    // Each Use* call appends middleware. Order is the behavior, same as
    // Express app.use. The exception page has to be first so it can catch
    // exceptions thrown by middleware registered after it.
    app.UseDeveloperExceptionPage();

    // Viewer only. The page fetches the document MapOpenApi exposes at
    // /openapi/v1.json. MapOpenApi adds an endpoint; it does not occupy
    // this slot in the middleware chain.
    app.UseSwaggerUI(options =>
    {
        options.DocumentTitle = "Business Marketplace API";
        options.SwaggerEndpoint("/openapi/v1.json", "Business Marketplace API v1");
    });

    app.MapOpenApi();

    // Before authorization and before endpoints execute, so controller
    // responses still receive Access-Control-Allow-Origin.
    app.UseCors(FrontendCorsSettings.PolicyName);

    app.Logger.LogInformation(
        "Development CORS is enabled for {Origins}",
        string.Join(", ", developmentOrigins));
}

// No authentication scheme is registered. The middleware is here so a later
// [Authorize] attribute has a place to run. With nothing configured it
// lets every request through.
app.UseAuthorization();

app.MapControllers();

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
