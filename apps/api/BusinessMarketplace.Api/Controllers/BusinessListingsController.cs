using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Mapping;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusinessMarketplace.Api.Controllers;

/// <summary>
/// Public read API for businesses that are for sale.
///
/// A controller is the HTTP adapter. It binds the request, calls a service,
/// maps the domain object to a DTO, and chooses the status code. It does not
/// own the catalog and it does not decide which rows are Active. That filter
/// already lives on <see cref="IBusinessListingService.GetActiveListingsAsync"/>.
///
/// [ApiController] turns on API conventions. Invalid model binding becomes a
/// 400 before the action runs, binding sources are inferred, and those errors
/// use problem details. ControllerBase is the base type with Ok, NotFound,
/// and the rest of the status helpers, and without Razor views.
///
/// [Route("api/listings")] is the prefix, the same job as NestJS
/// @Controller('listings') under a global "api" prefix. [HttpGet] is @Get().
/// [HttpGet("{id}")] is @Get(':id'). The method name is not part of the URL.
///
/// [Produces("application/json")] keeps the OpenAPI document from also
/// advertising text/plain. The constructor takes the interface, so this
/// class does not name the EF implementation. The container supplies it,
/// as NestJS supplies a constructor dependency. ILogger&lt;T&gt; is the
/// category logger. The category is this class name, which is how a log
/// viewer filters "listings" without a stringly-typed label.
/// </summary>
[ApiController]
[Produces("application/json")]
[Route("api/listings")]
public class BusinessListingsController(
    IBusinessListingService listingService,
    ILogger<BusinessListingsController> logger) : ControllerBase
{
    /// <summary>
    /// Active listings for a card grid.
    ///
    /// The action is async because the service awaits PostgreSQL. Await is
    /// how the status code can depend on the result. Returning the Task
    /// without awaiting would also work here, because this action has only
    /// one success path, but the detail action has to branch.
    ///
    /// CancellationToken is the request's AbortSignal. The framework binds
    /// it from the connection. It is not a route or query value, and no
    /// [FromQuery] is required. The token is passed through so a canceled
    /// browser request can stop the service.
    ///
    /// An empty catalog is still HTTP 200 and []. The collection route
    /// exists. 404 would tell the client the route is missing. NestJS
    /// returns [] from a list handler for the same reason, rather than
    /// throwing NotFoundException.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<BusinessListingSummaryDto[]>(StatusCodes.Status200OK)]
    public async Task<ActionResult<BusinessListingSummaryDto[]>> GetActive(
        CancellationToken cancellationToken)
    {
        var active = await listingService.GetActiveListingsAsync(cancellationToken);

        var summaries = active
            .Select(listing => listing.ToSummaryDto())
            .ToArray();

        return Ok(summaries);
    }

    /// <summary>
    /// One published listing.
    ///
    /// {id} is a route parameter. The action parameter is also named id, so
    /// [ApiController] treats the Guid as [FromRoute]. A simple type whose
    /// name does not match a route value would bind from the query string
    /// instead. There is no :guid route constraint. That constraint makes a
    /// malformed value fail to match the route, and the response becomes 404
    /// because no endpoint was selected. Leaving the constraint off lets
    /// model binding fail, and [ApiController] turns that failure into 400
    /// with a problem-details body before this method runs.
    ///
    /// ActionResult&lt;BusinessListingDto&gt; is the success body plus any
    /// other IActionResult. Ok and NotFound are both legal returns, and the
    /// OpenAPI success schema is the DTO. A plain IActionResult would compile
    /// and would not tell the document generator what 200 contains.
    ///
    /// Unknown ids and listings that are not Active share one 404. Draft,
    /// Pending, and Sold are unpublished or no longer offered. A different
    /// status or body would tell a stranger that the id exists. The service
    /// still returns those rows, because an owner screen may need them.
    /// Hiding them is an HTTP rule, so it stays in this action.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType<BusinessListingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<HttpValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BusinessListingDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var listing = await listingService.GetByIdAsync(id, cancellationToken);

        // NotFound() is a 404 result, not an exception. Expected misses
        // must not enter the exception handler. [ApiController] writes
        // the result as problem details. Unknown and not-Active stay
        // indistinguishable in that body. The log can tell them apart
        // because it stays on the server. A successful read is not logged.
        if (listing is null)
        {
            logger.LogWarning("Business listing {ListingId} was not found", id);
            return NotFound();
        }

        if (listing.Status != ListingStatus.Active)
        {
            logger.LogInformation(
                "Business listing {ListingId} is not publicly available. Status: {ListingStatus}",
                id,
                listing.Status);
            return NotFound();
        }

        return Ok(listing.ToDto());
    }
}
