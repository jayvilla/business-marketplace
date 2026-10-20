using BusinessMarketplace.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BusinessMarketplace.Api.Data;

/// <summary>
/// Inserts development listings when the seed command runs.
///
/// This is not a migration. Migrations change the schema and are reviewed
/// before they reach production. Seed data is sample rows for local use.
/// Production does not run this command, and application startup does not
/// call it. Generating 500 rows on every boot would slow startup and would
/// make a production process write fictional businesses.
///
/// <see cref="EnsureAllowed"/> is the guard the command calls before it
/// opens a scope. The methods that write rows do not read the environment.
/// Integration tests call them against an isolated database whose
/// environment is Testing. That split is the same idea as a NestJS CLI
/// command checking <c>NODE_ENV</c> before it calls a Prisma seed function.
///
/// Idempotent: a listing whose id is already stored is left alone. A second
/// <c>--seed</c> inserts nothing, and it does not overwrite a price or a
/// title a developer edited. That is <c>createMany({ skipDuplicates: true })</c>
/// in Prisma, not <c>upsert</c>. Upsert would replace the edit.
///
/// <c>--seed --reset-generated</c> is the explicit opt-in that deletes and
/// reinserts the generated ids only. Sample listings and any other row stay.
/// The delete and the insert share one transaction, so a failure rolls both
/// back. A seed that stopped halfway is finished by running <c>--seed</c>
/// again: only ids that are not already in the table are inserted.
///
/// <see cref="DbSet{TEntity}.AddRange"/> marks every new entity Added.
/// <see cref="DbContext.SaveChangesAsync(CancellationToken)"/> opens one
/// database transaction and writes those inserts. EF Core splits the SQL
/// into batches (the relational default is 42 commands per round trip)
/// inside that transaction. One <c>SaveChangesAsync</c> per listing would
/// be 500 transactions and 500 round trips. A bulk-copy library is not
/// worth it at this size: the rows are small, and the batching already
/// avoids a transaction per row.
///
/// Change tracking is the reason the context remembers those entities.
/// For a few hundred rows the tracker is cheap. Turning
/// <c>AutoDetectChangesEnabled</c> off is a later tuning step if the catalog
/// grows into the tens of thousands, not a requirement for 500 listings.
/// </summary>
internal static class DevelopmentListingSeeder
{
    internal static void EnsureAllowed(string environmentName, bool resetGenerated, bool seed)
    {
        if (!string.Equals(environmentName, "Development", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Refusing to seed the {environmentName} environment.");
        }

        if (resetGenerated && !seed)
        {
            throw new InvalidOperationException(
                "Pass --seed with --reset-generated. Reset is opt-in and only replaces generated listings.");
        }
    }

    public static async Task<DevelopmentSeedResult> SeedAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        var sample = SampleBusinessListings.All;
        var generated = BusinessListingSeedGenerator.Create();
        var sampleMissing = await MissingAsync(db, sample, cancellationToken);
        var generatedMissing = await MissingAsync(db, generated, cancellationToken);
        var missing = sampleMissing.Concat(generatedMissing).ToArray();

        if (missing.Length == 0)
        {
            return new DevelopmentSeedResult(0, 0);
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.BusinessListings.AddRange(missing);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new DevelopmentSeedResult(sampleMissing.Count, generatedMissing.Count);
    }

    public static async Task<int> ResetGeneratedAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        var listings = BusinessListingSeedGenerator.Create();
        var ids = listings.Select(listing => listing.Id).ToArray();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.BusinessListings
            .Where(listing => ids.Contains(listing.Id))
            .ExecuteDeleteAsync(cancellationToken);

        // ExecuteDelete removes rows in SQL. It does not detach objects this
        // context already loaded. Adding those keys again would throw.
        // Clear forgets tracked copies. It also drops unsaved edits in this
        // context, so reset should be the only work the scope performs.
        db.ChangeTracker.Clear();
        db.BusinessListings.AddRange(listings);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return listings.Count;
    }

    private static async Task<List<BusinessListing>> MissingAsync(
        AppDbContext db,
        IReadOnlyList<BusinessListing> listings,
        CancellationToken cancellationToken)
    {
        var wanted = listings.Select(listing => listing.Id).ToArray();
        var existing = await db.BusinessListings
            .Where(listing => wanted.Contains(listing.Id))
            .Select(listing => listing.Id)
            .ToListAsync(cancellationToken);
        var existingIds = existing.ToHashSet();
        return listings.Where(listing => !existingIds.Contains(listing.Id)).ToList();
    }
}

/// <summary>
/// How many rows this run inserted. Zero and zero means the catalog was
/// already present. The two counts stay separate so a log line can say
/// whether the new rows were the sample catalog or the generated set.
/// </summary>
internal readonly record struct DevelopmentSeedResult(int SampleInserted, int GeneratedInserted)
{
    public int TotalInserted => SampleInserted + GeneratedInserted;
}
