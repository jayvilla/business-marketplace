using BusinessMarketplace.Api.Data;
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
/// GetActiveListingsAsync and GetByIdAsync return IQueryable until
/// ToListAsync or FirstOrDefaultAsync. IQueryable is a query description.
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
    public async Task<IReadOnlyList<BusinessListing>> GetActiveListingsAsync(
        CancellationToken cancellationToken = default)
    {
        return await db.BusinessListings
            .AsNoTracking()
            .Where(listing => listing.Status == ListingStatus.Active)
            .ToListAsync(cancellationToken);
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
