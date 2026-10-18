using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// HTTP-test stand-in for the EF service. It reads the same fictional rows
/// the development seeder inserts, and it does not open a database
/// connection. PostgreSQL behavior is checked against the Docker database,
/// not from this suite.
/// </summary>
internal sealed class SampleCatalogListingService : IBusinessListingService
{
    public Task<IReadOnlyList<BusinessListing>> GetActiveListingsAsync(
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        IReadOnlyList<BusinessListing> active = SampleBusinessListings.All
            .Where(listing => listing.Status == ListingStatus.Active)
            .ToArray();

        return Task.FromResult(active);
    }

    public Task<BusinessListing?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var match = SampleBusinessListings.All.FirstOrDefault(listing => listing.Id == id);
        return Task.FromResult(match);
    }
}
