# Validation and error handling

## Purpose

Callers should get a predictable status and a JSON problem document when the query is wrong or the process fails. They should not get a stack trace, a connection string, or a different status for "missing" versus "not for sale."

## Architecture

`[ApiController]` turns invalid model binding and `IValidatableObject` failures into HTTP 400 before the action runs. `AddProblemDetails` customizes those documents in `MarketplaceProblemDetails`. `UnexpectedExceptionHandler` handles exceptions that escape the action. `UseExceptionHandler` is what invokes it.

## Implementation

`ListingQuery` carries data annotations:

- `[StringLength(200)]` on `Search`
- `[Range(typeof(decimal), "0", "1000000000")]` on both prices
- `[Range(1, 10_000)]` on `Page`
- `[Range(1, 24)]` on `PageSize`
- Unknown enum values fail binding

`Validate` yields one `ValidationResult` when both prices are present and `minPrice > maxPrice`. The message is `minPrice cannot be greater than maxPrice.` The member names are `MinPrice` and `MaxPrice`.

A 400 body is `HttpValidationProblemDetails`: a problem document plus an `errors` object. `MarketplaceProblemDetails.Customize` sets `instance` to the request path and adds `traceId` from `Activity.Current.Id` or `HttpContext.TraceIdentifier`.

`GET /api/listings/{id}` with a non-GUID is also 400, because the route has no `:guid` constraint. Model binding fails instead of missing the route.

`NotFound()` is a 404 result, not an exception. It does not enter `UnexpectedExceptionHandler`. Unknown ids and non-Active listings share that result. The controller logs a warning for a missing id and an information line for a non-Active status. The body does not include the title or the status.

Unhandled exceptions become HTTP 500. The handler logs once. `DbException` uses the message "Database operation failed" and does not include the connection string. Other exceptions use "Unhandled exception." If the response has already started, the handler returns false and does not write a second body.

The 500 document uses:

- Title: `An unexpected error occurred.`
- Detail: `The request could not be completed. Use the trace identifier when reporting this error.`
- Type: `https://tools.ietf.org/html/rfc9110#section-15.6.1`

`Customize` strips the exception from the JSON. `UseDeveloperExceptionPage` is not used. That page is HTML and includes the stack.

CORS is registered outside the exception handler in Development. A 500 written by the handler still receives `Access-Control-Allow-Origin` on the way out. The other order would look like a network error in the browser.

`GET /api/health/ready` returns 503 with the word `Unhealthy` when `CanConnectAsync` fails. The exception stays in the log. The health body does not include it.

Clients do not render these documents. Angular and Vue map the status code to a short sentence. A 400 on the listings collection becomes "Those filters were rejected. Adjust them and try again."

## Concepts for a TypeScript reader

Problem details are RFC 9457. The useful fields here are `title`, `status`, `detail`, `instance`, and `traceId`. Validation adds `errors`. This is the JSON you would parse with a Zod schema if a client wanted the field list. These clients intentionally do not.

`[ApiController]` is closer to a validation middleware that runs before the handler than to a try/catch inside the handler.

## Engineering decisions

Expected misses are results. Unexpected failures are one handler. Mixing them would log a 404 as an error and would risk putting "not found" through the 500 title.

The developer exception page was rejected because the clients are browsers that need JSON in every environment, including Development.

The inverted-price rule is on the DTO, not only in the clients. A client bug or a hand-written URL still gets 400 instead of an empty or surprising page.

## Testing

`ErrorHandlingTests` covers the 500 problem document and checks that the body does not contain the exception message. `ListingQueryEndpointTests` covers 400 for a bad price, a bad page, an unknown category, and an inverted range. `BusinessListingsEndpointTests` covers 404 and the 400 for a bad id. Those projects use `WebApplicationFactory` and do not need PostgreSQL.

## Key takeaways

400 is binding and `Validate`. 404 is a result. 500 is the exception handler, logged once, without the stack in the JSON. The trace id is the handle a caller can report.
