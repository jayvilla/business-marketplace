using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BusinessMarketplace.Api.Diagnostics;

/// <summary>
/// One shape for every ProblemDetails body this API writes.
///
/// RFC 9457 (the successor to RFC 7807) is a JSON error document, not a
/// custom envelope. NestJS has the same idea in its HttpException body
/// (statusCode, message, error). The fields here are the standard ones:
/// type, title, status, detail, and instance. traceId is an extension.
/// Clients that only understand the standard fields can ignore it.
///
/// [ApiController] already turns 400 and 404 results into this document.
/// AddProblemDetails routes that factory through this method, and the
/// exception handler does too. One method is what keeps those paths from
/// drifting apart.
/// </summary>
internal static class MarketplaceProblemDetails
{
    internal const string UnexpectedTitle = "An unexpected error occurred.";

    internal const string UnexpectedDetail =
        "The request could not be completed. Use the trace identifier when reporting this error.";

    internal static void Customize(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        var http = context.HttpContext;

        // instance is the path the client called. It is not the stack.
        problem.Instance ??= http.Request.Path.Value;

        // Activity.Current.Id is the W3C trace id for this request
        // (00-{trace}-{span}-00). TraceIdentifier is the same value when
        // the server created that activity, and it is the fallback when
        // no activity exists. The response and the error log both use
        // this expression so a client can quote the id back to the server log.
        problem.Extensions["traceId"] = Activity.Current?.Id ?? http.TraceIdentifier;

        if (problem.Status == StatusCodes.Status500InternalServerError)
        {
            // A 500 never repeats exception.Message. That string can contain
            // a SQL fragment or a host name. The log has the exception.
            problem.Title = UnexpectedTitle;
            problem.Detail = UnexpectedDetail;
            problem.Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1";
            problem.Extensions.Remove("exception");
            problem.Extensions.Remove("exceptionDetails");
        }
        else if (problem.Status == StatusCodes.Status404NotFound && string.IsNullOrEmpty(problem.Detail))
        {
            // Same sentence for an unknown id and a listing that is not
            // Active. A more specific sentence would reveal that the id exists.
            problem.Detail = "The requested resource was not found.";
        }
    }
}
