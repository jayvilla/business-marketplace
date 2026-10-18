using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Dtos;
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
    public Task<BusinessListingPage> GetActiveListingsAsync(
        ListingQuery query,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // Same operators as the EF service. This double does not open
        // PostgreSQL; it only proves the HTTP contract.
        var filtered = ActiveListingQuery.Apply(SampleBusinessListings.All.AsQueryable(), query);
        var totalCount = filtered.Count();
        var items = filtered
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToArray();

        return Task.FromResult(new BusinessListingPage(items, query.Page, query.PageSize, totalCount));
    }

    public Task<BusinessListing?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var match = SampleBusinessListings.All.FirstOrDefault(listing => listing.Id == id);
        return Task.FromResult(match);
    }
}
