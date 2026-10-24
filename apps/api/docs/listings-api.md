# Listings API

## Purpose

Browsers need a page of businesses that are for sale, and a way to ask for one listing by id. Both Angular and Vue use the page endpoint. Neither client calls the id endpoint yet.

## Architecture

`BusinessListingsController` is `[Route("api/listings")]`. It takes `IBusinessListingService` and `ILogger<BusinessListingsController>`. Mapping functions live in `Mapping/BusinessListingMapping.cs`. Shapes live in `Dtos/`.

`HealthController` is a separate resource: `GET /api/health`.

## Implementation

### `GET /api/listings`

Query object: `Dtos/ListingQuery.cs`. Names are the query-string names. Binding is case-insensitive, so `minPrice` and `MinPrice` match.

| Parameter | Default | Rule |
| --- | --- | --- |
| `search` | omitted | Max 200 characters. Trimmed by the service. Match is a case-insensitive substring of title, description, city, and state |
| `category` | omitted | A `BusinessCategory` name. Unknown name is 400 |
| `minPrice`, `maxPrice` | omitted | Inclusive `decimal` bounds from 0 through 1,000,000,000. `minPrice` greater than `maxPrice` is 400 |
| `sortBy` | `CreatedAt` | `CreatedAt`, `AskingPrice`, or `AnnualRevenue` |
| `sortDirection` | `Desc` | `Asc` or `Desc` |
| `page` | 1 | 1 through 10,000. A page past the end is still 200 |
| `pageSize` | 6 | 1 through 24 |

200 body is `BusinessListingPageDto`:

```json
{
  "items": [
    {
      "id": "01900000-0000-7000-8000-000000000001",
      "title": "Elm Street Bistro",
      "description": "A 42-seat dinner restaurant on a streetcar corner, with a short wine list and a leased dining room.",
      "askingPrice": 875000,
      "annualRevenue": 1240000,
      "cashFlow": 186000,
      "city": "Portland",
      "state": "OR",
      "category": "Restaurant",
      "imageUrl": "https://images.example/elm-street-bistro.jpg"
    }
  ],
  "page": 1,
  "pageSize": 6,
  "totalCount": 1
}
```

`items` is the page. `totalCount` is the match size before skip and take. There is no `totalPages`. `category` is a string, not an integer. `status` and the timestamps are not on the summary. They stay on the detail DTO. `id` is a GUID string. Null `annualRevenue`, `cashFlow`, or `imageUrl` means not disclosed. The sample row above is the first object in `SampleBusinessListings`. Generated rows use a null `imageUrl`.

An empty match is 200 with `items: []` and `totalCount: 0`. It is not 404.

`CancellationToken` is bound from the connection. It is the aborted-request signal. The action passes it into the service, and EF passes it to the command.

### `GET /api/listings/{id}`

`id` binds as `Guid` from the route. There is no `:guid` constraint. A value that is not a GUID fails model binding and becomes 400. A constraint would have missed the route and returned 404 instead.

200 is `BusinessListingDto`, which adds `status`, `createdAt`, and `updatedAt` to the summary fields.

Unknown ids and listings whose status is not `Active` both return 404 problem details. Draft, Pending, and Sold stay indistinguishable from a missing id in the body. The log can tell them apart. A successful read is not logged.

### `GET /api/health`

`HealthService.GetStatus()` returns `HealthStatus("ok", "API is running")`. JSON is `{ "status": "ok", "message": "API is running" }`. It does not open PostgreSQL.

`GET /api/health/live` is the health-check middleware for the `live` tag. The body is the plain word `Healthy` when the process answers.

`GET /api/health/ready` runs `DatabaseHealthCheck`. The body is `Healthy`, or `Unhealthy` with HTTP 503. It does not include the host, the database name, or the exception text.

## Concepts for a TypeScript reader

`[ApiController]` is the convention layer: invalid binding becomes 400 before the action, and those errors are problem details. `[FromQuery]` on `ListingQuery` is one object built from the query string, the way a Zod object would parse `URLSearchParams`.

`ActionResult<T>` is "200 with this body, or some other result." `Ok` and `NotFound` are results, not thrown exceptions.

System.Text.Json writes camelCase unless a property overrides it. `JsonStringEnumConverter<BusinessCategory>` writes `Restaurant` rather than `0`.

## Client notes

Angular's `BusinessListingsService` and Vue's `getListings` both omit default query fields and both reject a 200 that is not a page. Angular checks the page envelope. Vue also checks each item's fields. Neither client renders the problem-details body.

The id route is unused by both clients. A detail screen can call it later without a new server route.

## Engineering decisions

404 for unpublished listings avoids telling a stranger that the id exists. The service still returns those rows, because a future owner screen may need them. Hiding them is an HTTP rule, so it stays in the action.

No create, update, or delete routes exist.

## Testing

`ListingQueryEndpointTests` and `BusinessListingsEndpointTests` call the pipeline with `WebApplicationFactory` and a stand-in service. They cover 200, empty pages, 400 for a bad query, 404 for a missing or inactive id, and CORS for `http://localhost:4200` and `http://localhost:4201`. `HealthEndpointTests` covers the JSON health payload and the live and ready checks. Those tests do not require Docker. Integration tests that hit PostgreSQL are separate.

The sample JSON above is the shape in `BusinessListingSummaryDto` filled from the first sample listing. A live 200 from a seeded database was not captured for this note. Phase 4.10 left that check blocked because the Docker engine was not running.

## Key takeaways

The list endpoint is a page, not an array. The id endpoint hides anything that is not Active. Defaults live on `ListingQuery` so a bare `GET /api/listings` is newest, page 1, six rows.
