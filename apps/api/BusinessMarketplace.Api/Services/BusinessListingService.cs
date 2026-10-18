using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Services;

/// <summary>
/// In-memory <see cref="IBusinessListingService"/>.
///
/// The class line is the C# form of <c>implements</c>. The public methods
/// satisfy the interface implicitly, so tests can call them on this class
/// and a controller can call them on the interface. A second data source
/// should be another class that implements the interface, not a subclass.
/// The type is sealed for that reason.
///
/// There is no constructor parameter yet. The container still calls the
/// constructor when it creates the service. HealthService shows the other
/// case: its constructor takes ILogger, and the container supplies it.
/// When a database arrives, this constructor will take that database
/// session the same way. Callers will keep depending on the interface.
///
/// <see cref="_listings"/> points at the shared catalog. It is not a list
/// built per request, and these methods do not add, remove, or edit entries.
/// The objects in the catalog are the stored entities. A caller that assigns
/// Title on a returned listing would change the catalog. Mapping to a DTO
/// before a response leaves the process is what keeps that private.
/// </summary>
public sealed class BusinessListingService : IBusinessListingService
{
    private readonly IReadOnlyList<BusinessListing> _listings = SampleBusinessListings.All;

    public Task<IReadOnlyList<BusinessListing>> GetActiveListingsAsync(
        CancellationToken cancellationToken = default)
    {
        // Throw before the query. A canceled request should not do the work.
        // This is the cooperative form of an AbortSignal: nothing is stopped
        // unless the method looks at the token.
        cancellationToken.ThrowIfCancellationRequested();

        // Where is Array.filter. It does not run until the sequence is
        // walked. ToArray walks it now and stores the matches in a new
        // array, so the filter is finished before this method returns and
        // the caller cannot clear the catalog by clearing the result.
        // The new array still holds the same listing instances.
        IReadOnlyList<BusinessListing> active = _listings
            .Where(listing => listing.Status == ListingStatus.Active)
            .ToArray();

        // The work was synchronous. Task.FromResult wraps the array in an
        // already completed Task, which is Promise.resolve. Marking the
        // method async would allocate a state machine and then complete it
        // immediately, because there is no I/O to await. A database query
        // is real asynchronous I/O. That implementation will await the
        // query and will not use FromResult.
        return Task.FromResult(active);
    }

    public Task<BusinessListing?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // FirstOrDefault is Array.find. For a class, the default is null,
        // which matches the nullable return. First would throw when the id
        // is missing. Unknown is a normal result here, not a failure.
        // Status is not part of the predicate. Draft, Pending, and Sold
        // are returned to the caller, who has to apply visibility rules.
        var match = _listings.FirstOrDefault(listing => listing.Id == id);

        return Task.FromResult(match);
    }
}
