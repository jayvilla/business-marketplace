# ASP.NET Core API documentation

These notes explain the API in `apps/api`. They were written from the C# source. The Angular and Vue clients call this process. They do not share a generated client.

| Document | What it covers |
| --- | --- |
| [Architecture](architecture.md) | Startup, dependency injection, middleware |
| [Database and EF Core](database-entity-framework.md) | PostgreSQL, `AppDbContext`, the listing table |
| [Listings API](listings-api.md) | `GET /api/listings` and `GET /api/listings/{id}` |
| [Filtering, sorting, pagination](filtering-sorting-pagination.md) | The query PostgreSQL runs |
| [Validation and errors](validation-error-handling.md) | 400, 404, and 500 |
| [Testing](testing.md) | xUnit, `WebApplicationFactory`, Testcontainers |
| [Seed data](seed-data.md) | The sample catalog and the generated 500 |
| [Local development](local-development.md) | Compose, migrations, serve, tests |

Related:

- [Angular API integration](../../angular-web/docs/api-integration.md)
- [Vue API integration](../../vue-web/docs/phase-4.4-api-integration.md)
