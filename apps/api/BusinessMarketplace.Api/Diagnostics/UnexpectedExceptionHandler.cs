using System.Data.Common;
using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusinessMarketplace.Api.Diagnostics;

/// <summary>
/// Turns an exception that escaped a controller into HTTP 500.
///
/// The request pipeline is a chain of middleware, the same shape as
/// Express or NestJS middleware. UseExceptionHandler is the outer link
/// that catches what the inner links throw. An exception bubbles from the
/// action, through authorization, and stops here. Controllers therefore
/// do not each wrap their body in try/catch. NestJS does the same job
/// with an exception filter, which is global rather than a middleware
/// function, but the reason is the same: one policy, applied once.
///
/// IExceptionHandler is a singleton. It must not take a DbContext.
/// On .NET 10, when TryHandleAsync returns true the exception middleware
/// does not log the exception again. This class is the one log.
/// </summary>
internal sealed class UnexpectedExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<UnexpectedExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        // The exception argument is what writes the stack trace. The
        // template does not interpolate it, and it does not include the
        // connection string. DbException covers a PostgreSQL failure
        // without a second handler type.
        if (exception is DbException)
        {
            logger.LogError(
                exception,
                "Database operation failed for {Method} {Path}. TraceId: {TraceId}",
                httpContext.Request.Method,
                httpContext.Request.Path.Value,
                traceId);
        }
        else
        {
            logger.LogError(
                exception,
                "Unhandled exception for {Method} {Path}. TraceId: {TraceId}",
                httpContext.Request.Method,
                httpContext.Request.Path.Value,
                traceId);
        }

        if (httpContext.Response.HasStarted)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        // Exception is passed so the service knows a failure occurred.
        // MarketplaceProblemDetails strips it from the JSON. A 404 is not
        // thrown to get here. NotFound() is an ordinary result.
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = MarketplaceProblemDetails.UnexpectedTitle,
                Detail = MarketplaceProblemDetails.UnexpectedDetail,
                Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
                Instance = httpContext.Request.Path.Value,
            },
        });
    }
}
