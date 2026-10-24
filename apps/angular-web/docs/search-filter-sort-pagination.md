# Search, filtering, sorting, and pagination

## Purpose

The listings page asks the API for one page of matches. Filtering in the browser would hide rows only on the current page and would still show the server's total. PostgreSQL does the work. See [filtering on the server](../../api/docs/filtering-sorting-pagination.md).

## Architecture

`models/listing-query.ts` is the client copy of the query the API binds. `ListingFiltersForm` edits a draft. `ListingsPage` writes the committed value into the router. `BusinessListingsService` serializes it.

There is no location parameter. Search matches title, description, city, and state on the server. A location dropdown would be a filter the API does not bind.

## Implementation

`ListingQuery` fields: `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `pageSize`.

Constants in `listing-query.ts`:

| Constant | Value |
| --- | --- |
| `LISTING_PAGE_SIZE` | 6 |
| `LISTING_MAX_PAGE_SIZE` | 24 |
| `LISTING_MAX_SEARCH_LENGTH` | 200 |

Categories: `Restaurant`, `Retail`, `Technology`, `Healthcare`, `Manufacturing`, `ProfessionalServices`, `Other`. The label for `ProfessionalServices` is "Professional services".

Sorts: `newest`, `price-asc`, `price-desc`, `revenue-desc`. `newest` omits `sortBy` and `sortDirection`. The others send `AskingPrice` or `AnnualRevenue` with `Asc` or `Desc`.

`parseListingQuery` reads `ParamMap`. Unknown categories and unknown sort pairs become the defaults, and `listingQueryNeedsCanonicalUrl` makes the page `replaceUrl` them so they are not sent and do not add a history entry. An inverted pair (`minPrice` greater than `maxPrice`) sets `priceError` and stays in the URL. The request is not sent. The API would answer 400.

`readPrice` on the URL treats an empty value as `null` and a negative or non-numeric value as `null`. `0` is a real bound. The form's own parser is stricter and is described in [forms](forms-validation.md). The URL parser does not enforce the API maximum of 1,000,000,000. A larger number can be written into the query and rejected by the server as 400. The Vue parser refuses that bound before the request. That is a real client difference.

Page values that are not a positive integer, or that are above 10,000, become page 1 and are rewritten. Page size outside 1–24 becomes 6. A page past the last match is still requested. The empty copy is "This page is outside the results." Previous can move back. `listingPageCount` is `ceil(total / pageSize)`.

Changing filters writes page 1. Changing page keeps the filters. `serializeListingQuery` omits defaults.

Pagination renders when there is more than one page, or when the current page is already past 1. It hides while `priceError` is set. Buttons are disabled while `updating`, so a second click cannot ask for a total that still belongs to the previous query.

## Angular concepts

`queryParamsHandling: 'merge'` keeps unrelated keys during a `replaceUrl` canonical rewrite. `relativeTo: this.route` writes the query onto the current route.

`listingQueryEqual` is a field compare. `distinctUntilChanged` uses it so a rewrite that did not change the parsed query does not start another GET.

## React comparison

You would store the same object in `URLSearchParams` and read it with `useSearchParams`. Debounce would wrap the text handler. The lesson is the same: the URL is the committed query, and the input can be ahead of it.

## Vue comparison

`apps/vue-web/src/features/listings/models/listing-query.ts` is the same contract. Vue's `parseDraftPrice` also rejects values above 1,000,000,000 and malformed decimals before they reach the URL. Angular's form rejects non-numeric text, and the URL parser drops negatives, but neither Angular parser enforces that upper bound. See [Vue search](../../vue-web/docs/phase-4.5-search-filter-sort-pagination.md).

## Engineering decisions

Server-side filtering was required once the catalog could be larger than one page. The seed can insert 500 generated rows plus the sample catalog. Only Active rows are returned.

Defaults are omitted so the address for "newest, page 1, every category" stays `/listings`.

Inverted prices stay visible. Silently swapping them would hide the mistake. Silently dropping them would look like a successful clear.

## Testing

`listing-query.spec.ts` covers parsing, serialization, and the inverted pair. `listings-page.spec.ts` covers debounce into the URL, category, sort, page changes, a page past the end, an invalid URL rewritten once, and a blocked inverted link. `business-listings.service.spec.ts` checks the query parameters on the flushed request.

## Key takeaways

The URL is the query. The form is a draft until it commits. The page count is computed from `totalCount` and `pageSize` because the API does not send `totalPages`.
