# Architecture

## Purpose

`apps/api` is the HTTP API both frontends call. It reads businesses for sale from PostgreSQL and returns JSON. It does not render a page.

## Architecture

```text
apps/api/
├── project.json                         Nx targets: build, serve, test, seed
└── BusinessMarketplace.Api/
    ├── Program.cs                       Composition root
    ├── BusinessMarketplace.Api.csproj   net10.0
    ├── Controllers/                     HTTP adapters
    ├── Services/                        Listing queries
    ├── Data/                            EF Core, migrations, seed
    ├── Models/                          Entity and enums
    ├── Dtos/                            JSON shapes
    ├── Mapping/                         Entity to DTO
    ├── Diagnostics/                     Problem details and the 500 handler
    └── Configuration/                   CORS settings
```

The test project is `BusinessMarketplace.Api.Tests`. `InternalsVisibleTo` lets it reach internal types such as the seeder and `ActiveListingQuery`.

Nx `api:build` runs `dotnet build apps/api/BusinessMarketplace.slnx`. `api:serve` runs `dotnet run` with launch profile `http` and `--urls http://localhost:5000`.

## Implementation

`Program.cs` is top-level statements. They compile into `Program.Main`. A `public partial class Program` at the bottom exists so `WebApplicationFactory<Program>` in the tests can see that class. It is not a type to add members to.

Startup is four steps:

1. `WebApplication.CreateBuilder` loads configuration.
2. Services are registered on `builder.Services`.
3. `builder.Build()` freezes the container.
4. Middleware and endpoints are registered, then `app.Run()` listens.

Registrations:

| Service | Lifetime | Why |
| --- | --- | --- |
| Controllers, problem details, exception handler | framework | HTTP and errors |
| Health checks `self` (tag `live`) and `DatabaseHealthCheck` (tag `ready`) | framework | Process versus database |
| OpenAPI document | framework | `/openapi/v1.json` |
| `HealthService` | singleton | No per-request data |
| `AppDbContext` via `AddDbContext` and `UseNpgsql` | scoped | One session per request |
| `IBusinessListingService` → `BusinessListingService` | scoped | It takes the scoped context |

A singleton must not take `AppDbContext`. The container would keep one session for the process, and a context cannot serve two requests at once.

If `ConnectionStrings:DefaultConnection` is missing, startup throws before the pipeline is built. The environment-variable form is `ConnectionStrings__DefaultConnection`. The value is not logged.

`DevelopmentListingSeeder` runs only when the process arguments contain `--seed` or `--reset-generated`. The method returns before `app.Run()`. A normal serve does not seed and does not migrate.

Middleware order in Development:

1. `UseCors` with policy name `Frontend`, so a later 500 still gets `Access-Control-Allow-Origin` on the way out.
2. `UseExceptionHandler`.
3. Swagger UI and `MapOpenApi`, Development only.
4. `UseAuthorization`. No authentication scheme is registered. The call is a placeholder for a later `[Authorize]`.
5. `MapControllers`.
6. `MapHealthChecks` for `/api/health/live` and `/api/health/ready`.

CORS is not registered outside Development. Origins come from `FrontendCors:Origins`. An empty list in Development throws. `AllowAnyOrigin` is not used. `AllowCredentials` is not set. There is no cookie auth.

The OpenAPI document is `Microsoft.AspNetCore.OpenApi`. Swashbuckle is only the UI. `AddSwaggerGen` is not called. The document title is "Business Marketplace API". In Development the UI reads `/openapi/v1.json`.

## Concepts for a TypeScript reader

Dependency injection here is the Angular injector or a Nest provider, with lifetimes. `AddScoped` is one instance per HTTP request. `AddSingleton` is one instance per process.

Middleware is the Express chain. `UseExceptionHandler` is the outer link. Controllers do not each wrap their body in `try/catch`.

A controller is the HTTP adapter. `BusinessListingsController` binds the request, calls `IBusinessListingService`, maps to a DTO, and chooses the status code. It does not build the SQL.

There is no repository interface. `AppDbContext` is the unit of work and the set of tables. The service takes the context.

## React and Angular comparison

Neither frontend imports this project. Angular registers `HttpClient` in `app.config.ts` and points `API_BASE_URL` at `http://localhost:5000`. Vue reads `VITE_API_BASE_URL` or the same fallback. The C# DTOs are the contract those TypeScript types are checked against at runtime.

## Engineering decisions

Controllers stayed. Minimal APIs would have been a second style for two resources. The existing actions are short because the query lives in the service.

No generic repository. A second abstraction over `DbSet<BusinessListing>` would only rename `Where`.

CORS is Development-only. Production origins were not decided, so the middleware is absent outside Development rather than copied from the dev allow-list.

## Testing

`WebApplicationFactory<Program>` boots the pipeline in the test project. Controller tests replace `IBusinessListingService`. Integration tests replace the connection string with a Testcontainers database. See [testing](testing.md).

## Key takeaways

`Program.cs` is both the module and the composition root. Scoped context, singleton health, and a controller that does not know SQL are the split. Seed and migrate are commands, not startup.
