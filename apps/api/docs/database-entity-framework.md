# Database and Entity Framework Core

## Purpose

Listings are rows in PostgreSQL. Entity Framework Core is the mapper from `BusinessListing` to that table. The public list never loads the table and filters it in C#.

## Architecture

| File | Responsibility |
| --- | --- |
| `Data/AppDbContext.cs` | `DbSet<BusinessListing> BusinessListings` |
| `Data/Configurations/BusinessListingConfiguration.cs` | Column types, lengths, the status index |
| `Data/Migrations/20261018124056_InitialCreate.cs` | The only migration |
| `Data/AppDbContextFactory.cs` | Design-time factory for `dotnet ef` |
| `Models/BusinessListing.cs` | The entity |
| `Models/BusinessCategory.cs`, `ListingStatus.cs` | Enums stored as names |
| `docker-compose.yml` | PostgreSQL 17 for local development |

The Compose service is `business-marketplace-postgres`, image `postgres:17`, database name `business_marketplace`. The host port defaults to 5432. The named volume keeps data across `docker compose down`. `docker compose down -v` deletes it. The development connection string is `ConnectionStrings:DefaultConnection` in `appsettings.Development.json`. It is a local default. This note does not copy it. Override it with `ConnectionStrings__DefaultConnection`.

## Implementation

`BusinessListing` is a class, not a record. Identity is `Id`. Two instances with the same field values are still two objects. Response DTOs are records because a response is a value.

`Id`, money, and timestamps are `required` and, for `Id` and `CreatedAt`, `init`. `required` means the object initializer must assign them. It is not the same thing as nullability. `AnnualRevenue`, `CashFlow`, and `ImageUrl` are nullable. Null means "not disclosed". Zero is a real amount.

`AskingPrice` is `decimal` US dollars, not cents and not `double`. A `double` cannot store `0.10` exactly.

`BusinessListingConfiguration` is Fluent API. The entity has no EF attributes. The table is `BusinessListings`.

| Column | Store type |
| --- | --- |
| `Id` | `uuid`, client-supplied, `ValueGeneratedNever` |
| `Title` | `varchar(200)` |
| `Description` | `varchar(4000)` |
| `City`, `State` | `varchar(100)`. State is free text, not a code list |
| `AskingPrice`, `AnnualRevenue`, `CashFlow` | `numeric(18,2)` |
| `Category` | `varchar(32)`, enum name (`Restaurant`) |
| `Status` | `varchar(16)`, enum name (`Active`) |
| `ImageUrl` | `varchar(2048)`, nullable |
| `CreatedAt`, `UpdatedAt` | `timestamptz`, supplied by the application |

The only secondary index is `IX_BusinessListings_Status`. The public list filters on `Active`. City, category, and price are not indexed. The configuration comment says those indexes wait until a query needs them. Category and price filters do run. They scan within the status predicate. That is a known limitation, not an index that was forgotten in the migration by accident. The migration matches the configuration.

`HasConversion<string>()` stores the enum member name. Renaming a member is a data change and needs a migration. Integer enum values are not the column type.

`AppDbContext` is registered with `UseNpgsql`. Migrations are applied with `dotnet ef`, not in `Program.cs`. `AppDbContextFactory` exists so the tool can build a context without starting the web host.

Reads in `BusinessListingService` use `AsNoTracking()`. The methods only read. A later `SaveChanges` on that context will not treat an edit of a returned object as an update. `IQueryable` stays a query description until `CountAsync` or `ToListAsync`. `Where` becomes SQL. `Skip` and `Take` become `OFFSET` and `LIMIT`.

There is no EF InMemory provider. Unit tests that need the same operators use an in-memory `IQueryable` through `ActiveListingQuery`. Integration tests use PostgreSQL.

## Concepts for a TypeScript reader

`DbContext` is a Prisma client plus a unit of work: it tracks entities you attach, and `SaveChanges` writes them. `AsNoTracking` is "give me a plain object." `IQueryable` is a query builder that the provider turns into SQL. Enumerating it too early would pull the table into the process.

A migration is a reviewed schema change. Seed data is not a migration. Mixing them would run fictional businesses into production the next time the schema is applied.

## Engineering decisions

Fluent configuration keeps `BusinessListing` free of database attributes so the domain type can be constructed in tests and in the seeder without referencing EF.

`numeric(18,2)` is wider than any asking price the seed generates. It still stores cents exactly. The API's query `Range` stops at 1,000,000,000, which fits in that column.

No repository. The service method is the query.

## Testing

`ListingPersistenceTests` is marked `Category=Integration`. It applies migrations to a Testcontainers database and checks that a round trip keeps decimal money, null financials, and enum names. It does not use the Compose database. See [testing](testing.md).

## Key takeaways

The entity is a class. The DTO is a record. The configuration is Fluent. Tracking is off for reads. The status index matches the public filter, and other filters are correct but unindexed.
