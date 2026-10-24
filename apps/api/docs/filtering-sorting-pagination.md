# Filtering, sorting, and pagination

## Purpose

`GET /api/listings` used to be describable as "every active row." Paging that array in the browser would still download the catalog. The filter now runs in PostgreSQL, and the response is one page plus the total.

## Architecture

`ActiveListingQuery.Apply` builds an `IQueryable<BusinessListing>`. `BusinessListingService.GetActiveListingsAsync` runs it twice: `CountAsync` for `totalCount`, then `Skip`/`Take` and `ToListAsync` for `items`. Both executions share the same `Where` and `OrderBy`. The controller does not filter again.

The in-memory HTTP test double calls `ActiveListingQuery` too. A category rule cannot be fixed in the double and left wrong in SQL.

## Implementation

The first predicate is `Status == Active`. Draft, Pending, and Sold never appear on this route.

Search trims `query.Search`. An empty string adds no predicate. Otherwise the term is lowercased and compared with `Contains` against title, description, city, and state. The source comment says EF parameterizes the term and escapes `LIKE` wildcards, so a search for `%` does not mean "match everything."

Category, when present, is an equality check. `minPrice` is `AskingPrice >= min`. `maxPrice` is `AskingPrice <= max`. Omitted bounds add no predicate. Zero is a real bound.

Sort:

| `sortBy` | `sortDirection` | Order |
| --- | --- | --- |
| `CreatedAt` (default) | `Desc` (default) | Newest first |
| `AskingPrice` | `Asc` or `Desc` | Price |
| `AnnualRevenue` | `Asc` or `Desc` | Revenue, with nulls last |

Null revenue is "not disclosed." The query orders `AnnualRevenue == null` first so nulls sort after real amounts in both directions. PostgreSQL would otherwise put nulls first on a descending sort. Every branch ends with `ThenBy(listing => listing.Id)` so a tie does not swap places between requests.

Paging is `Skip((page - 1) * pageSize).Take(pageSize)`. That is `OFFSET`/`LIMIT`. A later page does not load the earlier rows into the process. `CountAsync` is a second round trip. It counts the filtered set, not the page. A page past the end returns an empty list and the real total, with HTTP 200.

`AsNoTracking()` is applied before `Apply`. These reads do not need the change tracker.

The status column is indexed. Category, price, and the sort columns are not. A large catalog can still filter correctly and do more I/O than an index would. The configuration comment records that choice. The seed's generated catalog is 500 rows, which is small enough that the missing indexes are not a measured problem. No query plan was captured for this note.

## Concepts for a TypeScript reader

`IQueryable` is a description. `await ToListAsync` is the execution. Filtering a `BusinessListing[]` in the controller would be the bug this design avoids: the process would hold every active row, and `totalCount` would describe memory instead of the database.

`OFFSET` gets slower as the page number grows, because the database still walks the skipped rows. Page size is capped at 24 and page number at 10,000. Keyset pagination was not added. The clients only offer Previous and Next on a page size of 6.

## Client behavior

Both clients omit default parameters. `newest` does not send `sortBy`. An inverted price is blocked in the client so this 400 is not the normal path. If a client sends it anyway, model validation rejects it before `Apply` runs. See [validation](validation-error-handling.md).

## Engineering decisions

One composable query for EF and the test double, instead of two copies of the `Where` clauses.

Nulls-last for revenue is explicit. Leaving it to PostgreSQL would put undisclosed listings at the top of "highest revenue."

No `totalPages` on the DTO. The client divides `totalCount` by `pageSize`. A second field would be another copy of that division.

## Testing

`ListingQueryEndpointTests` covers search, category, prices, sort, page size, and a page past the end against the in-memory double. `ListingPersistenceTests` covers the same operators against PostgreSQL when Docker is available. The persistence file is `Category=Integration`.

## Key takeaways

Active, then the optional filters, then a stable sort, then offset and limit. Count and page are two executions of one query description. Unpublished rows are not in the count.
