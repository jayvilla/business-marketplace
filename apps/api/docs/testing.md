# Testing

## Purpose

The API suite checks the HTTP contract without the Angular or Vue apps, and it checks PostgreSQL separately so a unit run does not need Docker.

## Architecture

`BusinessMarketplace.Api.Tests` is an xUnit project (`xunit` 2.9.3) on `net10.0`. It references the API project. Packages that matter: `Microsoft.AspNetCore.Mvc.Testing` 10.0.13, `Testcontainers.PostgreSql` 4.16.0, and `coverlet.collector` 6.0.4.

Nx targets in `apps/api/project.json`:

| Target | Command |
| --- | --- |
| `nx test api` | `dotnet test` on the solution, every test |
| `nx test-unit api` | `--filter Category!=Integration` |
| `nx test-integration api` | `--filter Category=Integration` |
| `nx test-coverage api` | `dotnet test` with XPlat coverage into `apps/api/coverage` |

`dotnet test` cannot copy `BusinessMarketplace.Api.exe` while `nx serve api` is running. Stop the API before a test run that rebuilds it.

## Implementation

Tests that do not need Docker boot `WebApplicationFactory<Program>` and replace `IBusinessListingService` with an in-memory double. `ActiveListingQuery` still runs, against a list. `ListingQueryEndpointTests`, `BusinessListingsEndpointTests`, `BusinessListingsControllerTests`, `HealthEndpointTests`, `ErrorHandlingTests`, and `OpenApiDocumentTests` are in that group. Mapping, the seed generator, and the service tests that do not open a connection are there too.

`SampleCatalogListingService` is the double used by the endpoint tests. It is not a fake that reimplements `Where` by hand.

Integration tests are marked `[Trait("Category", "Integration")]` on the class:

- `Integration/ListingPersistenceTests.cs`
- `Integration/DevelopmentSeedTests.cs`

`PostgresFixture` implements `IAsyncLifetime`. `InitializeAsync` starts a `postgres:17` container with `Testcontainers.PostgreSql`, database name `business_marketplace_test`, and a test username. That database is not `business_marketplace` and it is not the Compose volume. `PostgresApiFactory` points the host at the container connection string. Migrations run against that database. Tests truncate between cases. `DisposeAsync` stops the container.

The fixture's test password is a Testcontainers credential for an ephemeral database. It is not the development password and it is not documented here as something to type into Compose.

`BusinessListingServiceTests` that only need query composition stay in the unit filter. Persistence of decimals, nulls, and enum names is the integration file's job.

## What has been run

During the phase 4.10 review, `nx build api` succeeded and `nx test-unit api` reported 66 passed, 0 failed. `nx test-integration api` was not run. `docker info` failed because the Docker Desktop engine pipe was missing, and Testcontainers needs that engine. This documentation pass did not re-run the suite and did not start Docker.

A green unit run is not evidence that PostgreSQL accepted the migration or that a seeded `GET /api/listings` returned 200.

## Concepts for a TypeScript reader

`WebApplicationFactory` is `supertest` against the real pipeline, with a hook to replace services. `[Fact]` is one test. `[Theory]` is a parameterized test. `[Trait("Category", "Integration")]` is the Jest `describe` you would put behind a Docker check. The Nx filter is that split.

`HttpTestingController` in Angular and `vi.fn()` around `fetch` in Vue are the client-side versions of the in-memory double. They do not start Kestrel.

## Engineering decisions

The query operators live in `ActiveListingQuery` so the double and PostgreSQL share them. A double that filtered differently would make the unit tests green and the database wrong.

Integration tests do not share the Compose database. A failed assertion cannot delete the development seed.

No EF InMemory package. It would not translate `numeric` or the null-sort the same way Npgsql does.

## Key takeaways

`nx test-unit api` is the default check and does not need Docker. `nx test-integration api` is the PostgreSQL check and does. The last recorded integration run for this repository, in the phase 4.10 session, did not happen.
