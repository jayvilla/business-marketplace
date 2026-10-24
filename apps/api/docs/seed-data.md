# Seed data

## Purpose

Local listings have to come from somewhere before either client can show a card. The seed command inserts fictional rows. Startup does not, and a request does not.

## Architecture

| File | Responsibility |
| --- | --- |
| `Data/DevelopmentListingSeeder.cs` | Guard, insert, reset |
| `Data/SampleBusinessListings.cs` | 11 fixed listings |
| `Data/BusinessListingSeedGenerator.cs` | 500 deterministic listings |
| `Program.cs` | Reads `--seed` and `--reset-generated`, then returns |

The seeder is `internal`. Tests see it through `InternalsVisibleTo`.

## Implementation

`EnsureAllowed` runs before a scope is opened. It throws unless the environment name is `Development`. `--reset-generated` without `--seed` throws. The methods that write rows do not read the environment. Integration tests call them against a Testing host on the ephemeral database. The command path is what checks `Development`.

`SeedAsync` loads the sample list and `BusinessListingSeedGenerator.Create()`. It inserts only ids that are not already stored. A second `--seed` inserts nothing and does not overwrite a price or a title you edited. That is skip-if-present, not an upsert.

The insert is one transaction: `BeginTransactionAsync`, `AddRange`, `SaveChangesAsync`, commit. EF batches the commands inside that transaction. One `SaveChanges` per row was rejected. A bulk-copy library was rejected at this size.

`--seed --reset-generated` deletes and reinserts the generated ids only. The 11 sample listings and any other row stay. The delete and the insert share one transaction.

### Sample catalog

`SampleBusinessListings` documents eleven listings. Ids use the prefix `01900000-0000-7000-8000-` and the suffixes `0001` through `000b`. The first row is Elm Street Bistro, Portland, OR, asking 875000, category `Restaurant`, status `Active`, with an `https://images.example/...` image URL. That host is a documentation name. It does not resolve. The clients substitute a local SVG when the image fails or is null.

Timestamps are fixed. The type does not call `Guid.NewGuid` or `DateTimeOffset.UtcNow`.

### Generated catalog

`BusinessListingSeedGenerator` constants:

| Constant | Value |
| --- | --- |
| `Count` | 500 |
| `ActiveCount` | 425 |
| `PendingCount` | 35 |
| `SoldCount` | 25 |
| `DraftCount` | 15 |
| `RandomSeed` | `3102026` |

Statuses are assigned in those counts and then shuffled with `System.Random` seeded by `RandomSeed`. The class does not call `Random.Shared`, `Guid.NewGuid`, or `DateTimeOffset.UtcNow`. Ids use the prefix `01910000-0000-7000-8000-`. `ImageUrl` is always null. Asking prices are `decimal` dollars. Revenue and cash flow may be null so the card's "Not disclosed" path has data. `GET /api/listings` returns only Active rows. With both catalogs and no extra rows, the public total is the Active sample rows plus 425. The sample file's comment describes a mix of statuses among the 11. This note does not recount them by hand. The generator's 425 is the number in source.

Changing `Count` requires the four quotas to still add up. Changing `RandomSeed` or the reference date does not rewrite rows that are already stored. Use the reset flag for that.

## Commands

Stop `nx serve api` first if it is running. The seed builds the same executable, and a running API locks that file on Windows.

```bash
pnpm exec nx seed api
```

The same command without Nx:

```bash
dotnet run --project apps/api/BusinessMarketplace.Api --launch-profile http -- --seed
```

Reset the generated ids only:

```bash
dotnet run --project apps/api/BusinessMarketplace.Api --launch-profile http -- --seed --reset-generated
```

The launch profile sets `ASPNETCORE_ENVIRONMENT` to Development. Production, Staging, and Testing are refused by `EnsureAllowed` on this command path.

Apply the migration before the first seed. The seed does not create tables. See [local development](local-development.md).

## Engineering decisions

Seed data is not a migration. A migration runs when the schema is applied, including in places that should not gain 511 fictional businesses.

Idempotent insert protects a row you edited. Reset is opt-in and scoped to the generated ids so the sample catalog the HTTP tests mention stays put.

Deterministic generation means a second machine can insert the same ids. An unseeded `Guid.NewGuid` would make "already stored" meaningless.

## Testing

`BusinessListingSeedGeneratorTests` checks the counts, the id prefix, null images, and that two `Create()` calls match. It does not need Docker. `DevelopmentSeedTests` is `Category=Integration`. It checks insert-once and the generated reset against Testcontainers. That file was not run in the phase 4.10 session.

## Key takeaways

`--seed` inserts missing ids in Development and then exits. It does not start Kestrel. A second run is a no-op. `--reset-generated` replaces only the 500.
