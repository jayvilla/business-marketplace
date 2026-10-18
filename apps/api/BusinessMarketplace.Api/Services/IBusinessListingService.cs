using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Services;

/// <summary>
/// Read operations for businesses offered for sale.
///
/// An interface is a contract: the method names, arguments, and return
/// types callers may rely on. It has no data and no method bodies.
/// BusinessListingService is the current body. A later class can implement
/// the same contract against a database. Callers depend on this interface,
/// not on that class. Program.cs is the only place that chooses the class.
/// That split is dependency inversion. NestJS does the same thing when a
/// controller asks for an injection token and a module binds the token to
/// a provider. A TypeScript interface disappears at runtime. A C# interface
/// is a real type the DI container can resolve.
///
/// IReadOnlyList can be counted and indexed, and it does not offer Add.
/// List would tell callers they may append. IEnumerable can be a lazy
/// query that runs again on every foreach. The list returned here is the
/// finished result of one call.
///
/// Task is the C# counterpart of Promise. Task&lt;T&gt; is Promise&lt;T&gt;.
/// Callers await it. These methods return a Task even though the current
/// body is synchronous, so a database implementation can become asynchronous
/// without changing the contract.
///
/// BusinessListing? uses a nullable reference type. Null is a normal
/// answer for an unknown id, the way a TypeScript return type of
/// BusinessListing | null is. It is not an exception and it is not an
/// HTTP 404. A controller decides the status code.
///
/// CancellationToken is an AbortSignal passed down from the request.
/// The default value is CancellationToken.None, so a caller that has no
/// request can omit it. The default is applied at the call site from the
/// type the caller compiles against.
/// </summary>
public interface IBusinessListingService
{
    /// <summary>
    /// Listings whose status is Active. Draft, Pending, and Sold are omitted.
    /// </summary>
    Task<IReadOnlyList<BusinessListing>> GetActiveListingsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// The listing with this id, whatever its status is, or null when the
    /// id is unknown.
    ///
    /// Returning a Draft or Sold listing is safe only for a trusted caller.
    /// A public HTTP endpoint has to decide who may see those statuses
    /// before it calls this method. This service does not check a user.
    /// </summary>
    Task<BusinessListing?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
