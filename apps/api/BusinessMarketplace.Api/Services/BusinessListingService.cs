using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BusinessMarketplace.Api.Services;

/// <summary>
/// PostgreSQL <see cref="IBusinessListingService"/>.
///
/// The constructor takes <see cref="AppDbContext"/>. The container creates
/// both for the request and disposes them together, because both are scoped.
/// Callers still depend on the interface. There is no repository class.
/// A DbContext already is the unit of work and the set of tables.
///
/// GetActiveListingsAsync builds an IQueryable through ActiveListingQuery,
/// then CountAsync and ToListAsync each run it. GetByIdAsync stays a
/// single FirstOrDefaultAsync. IQueryable is a query description.
/// IEnumerable would be objects already in memory. Where on an IQueryable
/// becomes a SQL WHERE, so PostgreSQL returns only the Active rows. Loading
/// the whole table and then filtering in C# would move every listing across
/// the network, including drafts. AsNoTracking tells EF not to snapshot the
/// rows. These methods only read. A later SaveChanges on this context will
/// not treat a caller's edit of a returned object as an update.
///
/// The cancellation token is passed into the async call. EF stops the
/// command when the request is aborted. Task.Run is not used. The database
/// driver is already asynchronous. Wrapping it would occupy a thread pool
/// thread and hide the token.
/// </summary>
public sealed class BusinessListingService(AppDbContext db) : IBusinessListingService
{
    public async Task<BusinessListingPage> GetActiveListingsAsync(
        ListingQuery query,
        CancellationToken cancellationToken = default)
    {
        // Apply returns a query. Count and the page each execute it.
        // Skip/Take are SQL OFFSET/LIMIT, so a later page does not read
        // the earlier rows into the process.
        var filtered = ActiveListingQuery.Apply(db.BusinessListings.AsNoTracking(), query);
        var totalCount = await filtered.CountAsync(cancellationToken);
        var items = await filtered
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new BusinessListingPage(items, query.Page, query.PageSize, totalCount);
    }

    public async Task<BusinessListing?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await db.BusinessListings
            .AsNoTracking()
            .FirstOrDefaultAsync(listing => listing.Id == id, cancellationToken);
    }
}
