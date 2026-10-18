using Microsoft.EntityFrameworkCore;

namespace BusinessMarketplace.Api.Data;

/// <summary>
/// Inserts the fictional catalog when a developer runs the seed command.
///
/// This is not a migration. Migrations change the schema and are reviewed
/// before they reach production. Seed data is sample rows for local use.
/// Production does not run this command, and application startup does not
/// call it.
///
/// Idempotent: a listing whose id is already stored is left alone, so a
/// second run does not insert a duplicate and does not overwrite a row a
/// developer edited. Ids and timestamps come from SampleBusinessListings.
/// </summary>
internal static class DevelopmentListingSeeder
{
    public static async Task<int> SeedAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        var existingIds = await db.BusinessListings
            .Select(listing => listing.Id)
            .ToListAsync(cancellationToken);

        var missing = SampleBusinessListings.All
            .Where(listing => !existingIds.Contains(listing.Id))
            .ToArray();

        if (missing.Length == 0)
        {
            return 0;
        }

        db.BusinessListings.AddRange(missing);
        await db.SaveChangesAsync(cancellationToken);
        return missing.Length;
    }
}
