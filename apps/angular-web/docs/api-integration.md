# ASP.NET Core API integration

## Purpose

The listings page needs one page of active businesses from `GET /api/listings`. This note is the Angular side of that call. The contract itself is [the listings API](../../api/docs/listings-api.md).

## Architecture

| File | Responsibility |
| --- | --- |
| `core/api-base-url.ts` | `InjectionToken` for the origin |
| `services/business-listings.service.ts` | Builds the URL and checks the body |
| `api/business-listing-page.ts` | Page DTO type |
| `api/business-listing-summary.ts` | Row DTO type |
| `api/to-business-listing.ts` | DTO to `BusinessListing` |
| `api/listings-error-message.ts` | Status code to a sentence |
| `pages/listings-page.ts` | Subscribes, cancels, retries |

`providedIn: 'root'` registers one `BusinessListingsService`. The page does not import `HttpClient`.

## Implementation

`getListings` returns `Observable<BusinessListingPage>` and does not subscribe. `http.get<unknown>` is deliberate. A generic would only change the compile-time claim. `isListingPage` checks that the body is an object with an `items` array and numeric `page`, `pageSize`, and `totalCount`. It does not check every field of each row. A 200 that fails that check throws `Listing response was not a page.` Mapping a missing array to `[]` would look like an empty catalog.

`toHttpParams` copies `serializeListingQuery`. Empty and default fields are omitted, so a default visit is `GET /api/listings` with no query string.

The page's pipeline is the subscription. `switchMap` unsubscribes from the previous inner observable when the query changes. `HttpClient` treats that unsubscribe as an abort. A slow response for an old query cannot overwrite the newer one. `catchError` turns a failure into an error state and completes normally. Without it, the outer stream would die on the first 500 and Retry would have nothing to subscribe to.

`listingsErrorMessage` maps status codes and ignores the body:

| Condition | Sentence |
| --- | --- |
| Not an `HttpErrorResponse` | "Listings could not be loaded." |
| Status `0` | "Listings could not be loaded. Check your connection and try again." |
| `400` | "Those filters were rejected. Adjust them and try again." |
| `404` | "The listings service could not be found." |
| `500` and above | "The listings service had a problem. Try again in a moment." |

`listingsErrorLog` is what `console.error` receives. The template never receives the status code or the problem-details body.

Retry bumps `retryNonce`. A second click while `loading` or `updating` returns without incrementing. One new GET follows.

There is no detail route. `GET /api/listings/{id}` exists on the server and is unused here.

## Angular concepts

`HttpClient` is the HTTP API. `provideHttpClient()` in `app.config.ts` registers it. Interceptors are not configured.

`Observable` is lazy. Nothing happens until something subscribes. The page is that subscriber, through `toSignal`.

`HttpTestingController` in the service spec expects one request and flushes a body. That is the stand-in for `fetch` mocks in the Vue `get-json` specs.

## React comparison

A data hook would call `fetch` inside `useEffect` and abort in the cleanup. `switchMap` is that cleanup plus "start the next request." `HttpClient` is the extra layer: it parses JSON and types the error as `HttpErrorResponse`. You can skip it and call `fetch`. This app uses it so tests can flush requests without a network.

## Vue comparison

Vue's `getJson` returns `unknown` from `fetch`. `getListings` narrows the page. `useListings` aborts with `AbortController` and a generation counter. The sentences in `apps/vue-web/src/features/listings/api/listings-error-message.ts` match the table above. See [Vue API integration](../../vue-web/docs/phase-4.4-api-integration.md).

## Engineering decisions

No Axios and no TanStack Query. One GET, cancelled by `switchMap`, did not need a cache or a second client.

The DTO types are duplicated, not imported from C#. A shared package does not exist. The runtime check is what keeps a bad 200 from becoming cards.

The response body is not rendered. A 500 problem document includes a trace id. The page shows a fixed sentence instead.

## Testing

`business-listings.service.spec.ts` expects the query string, including `maxPrice`, and rejects a 200 that is not a page. `listings-error-message.spec.ts` covers the sentences. `listings-page.spec.ts` flushes the request with `HttpTestingController` for loading, empty, error, and retry.

Live `GET /api/listings` from this client was still unverified at the end of phase 4.10 because Docker was not running. These specs do not change that.

## Key takeaways

The service returns an observable and does not subscribe. The page's `switchMap` is the cancellation policy. The TypeScript generic is not a parser.
