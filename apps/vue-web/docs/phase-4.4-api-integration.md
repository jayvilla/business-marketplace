# Phase 4.4 — ASP.NET Core API integration

This note is for a React and TypeScript developer learning Vue 3. It describes how the listings page stopped reading a fixture and started reading `GET /api/listings`. Search, filters, sort, and paging controls are still absent. The card and the grid still do not fetch.

## A. Architecture

The request moves down the page. The presentation components stay where they were.

```text
ASP.NET Core  GET /api/listings
    │  BusinessListingPageDto (JSON)
    ▼
getJson()                 fetch, status, abort, unknown body
    ▼
getListings()             narrows the JSON, maps each summary
    ▼
useListings()             loading / ready / error, one request at a time
    ▼
ListingsView.vue          heading, count, retry
    ▼
ListingsGrid.vue          skeletons, empty copy, alert, list
    ▼
ListingCard.vue           one BusinessListing, no HTTP
```

`ListingCard` and `ListingsGrid` still receive props. The view is the only component that calls the composable. The composable is the only caller of `getListings`. `getListings` is the only caller of `getJson` for this feature.

Mapping sits in `getListings`, not in the composable. The composable's job is the lifecycle. The mapper's job is the copy from a summary to a card. Keeping those apart means a unit test of the mapper does not mount Vue, and a unit test of the composable can hand back cards that are already mapped.

## B. Fetch API

`getJson` is one GET. It is not a client framework.

```ts
response = await fetch(url, {
  method: 'GET',
  headers: { Accept: 'application/json' },
  signal,
});
```

`Accept` asks for JSON. The API already sends JSON. A non-success status throws `HttpError` with the status and nothing from the body. A network rejection throws `NetworkError`, except an abort, which is rethrown as itself. A success body that is not JSON throws a local error.

The function returns `Promise<unknown>`. A generic `getJson<BusinessListingPageResponse>` would not validate the payload. TypeScript erases the type parameter. `response.json()` is whatever the server sent. The listings client narrows that `unknown` with `isListingPage` before it reads `items`. A body that fails the check throws. Treating a missing `items` as `[]` would look like an empty catalog.

The base URL is `VITE_API_BASE_URL`. Vite exposes only names that start with `VITE_`. `.env.development` sets it to `http://localhost:5000`, the local Kestrel origin. An empty value falls back to that same origin. A deployed build should set the variable so the fallback is not what ships. The value is an origin, not a secret. The browser sends it on every request.

Development CORS already allows `http://localhost:4200` and `http://localhost:4201`. The Vue dev server is `localhost` on port 4201, so the browser can call the API directly. `http://127.0.0.1:4201` is a different origin and is not on the allow-list. `vite preview` uses port 4300, which is also absent. Those two were left as they are. The API was not changed.

## C. Backend contracts

`GET /api/listings` returns one page, not an array.

```json
{
  "items": [],
  "page": 1,
  "pageSize": 6,
  "totalCount": 0
}
```

No query string is sent in this phase. The API then applies its own defaults: page 1, 6 rows, newest first. An empty catalog is HTTP 200 with `items: []` and `totalCount: 0`. It is not 404.

Each item is `BusinessListingSummaryDto`. ASP.NET writes camelCase. A GUID is a string. Money is a JSON number. `annualRevenue`, `cashFlow`, and `imageUrl` are null when the seller withheld them. `category` is an identifier such as `ProfessionalServices`. There is no `featured` field and no `location` string. City and state stay separate. Status and timestamps stay on the detail DTO, which this page does not request.

`BusinessListing` is still the card model: one location line, a display label, a resolved image URL, and `featured`. `toBusinessListing` is the copy.

```ts
const category = CATEGORY_LABELS[summary.category] ?? summary.category;

return {
  id: summary.id,
  location: `${summary.city}, ${summary.state}`,
  category,
  askingPrice: summary.askingPrice,
  annualRevenue: summary.annualRevenue ?? null,
  cashFlow: summary.cashFlow ?? null,
  imageUrl: displayImage(summary.imageUrl, category),
  featured: false,
};
```

Unknown category strings are shown as sent. Null money stays null, and the card prints "Not disclosed". A null, empty, or documentation-host image (`images.example` and the other reserved suffixes the Angular client already skips) becomes the category placeholder before an `<img>` request exists. `featured` is always false. The summary has no such flag, so the badge is not invented.

`totalCount` can be larger than `items.length`. The page sentence is "Showing 6 of 24 listings" in that case. When the page happens to be the whole match, it is "6 listings" or "1 listing". The count is hidden while loading, on error, and when nothing matched.

## D. Vue reactivity

`useListings` keeps one `ref` of a discriminated union:

```ts
type ListingsState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly listings: readonly BusinessListing[]; readonly totalCount: number }
  | { readonly kind: 'error'; readonly message: string };
```

Assigning `state.value = { kind: 'ready', ... }` after `await` is what updates the template. A plain object would change in memory and the template would not hear it. The ref's `.value` write is the notification. Vue re-renders the components that read `status`, `listings`, or `errorMessage` during the last render.

Those three are `computed` values derived from the one ref. The template reads them unwrapped: `status` in the template is the string, not the computed object. Script still uses `status.value`.

Empty is `ready` with an empty array. A separate empty kind could disagree with an array that still had rows. The error message is `''` unless `kind` is `error`, so the alert and the skeletons cannot both be the current state.

The count label is another computed, on the view. It is presentation, not request state. It reads `status`, `listings`, and `totalCount`, so it updates when the request settles.

## E. Composables

`useListings()` is a function that owns the request. The view calls it once in `<script setup>`:

```ts
const { listings, status, errorMessage, totalCount, retry } = useListings();
```

Anything the function creates — the ref, the generation counter, the `AbortController` — belongs to that call. A second call would be a second request. The view calls it once, so there is one.

This is the same idea as a React custom hook: a function that uses the framework's state primitives and returns the values a component renders. It is not an Angular service. An Angular service is one object in the injector, created when something first injects it, and shared by every injector that does not override it. A composable is created by the component that calls it, and it is thrown away when that component is thrown away. Page-local request state does not need Pinia. A store would let some other component start a second GET.

`load` and `retry` are returned because the view and the tests need to start a request. `retry` refuses to run while `kind` is `loading`. Two clicks on the same failure would abort a request that is already the retry.

## F. Lifecycle hooks

`onMounted` runs after the component is in the document. That is where the first GET starts.

```ts
onMounted(() => {
  void load();
});
```

Calling `load` during setup would also work. Mount is the point where the page is actually on screen, and it pairs with unmount. `void` marks the promise as intentionally not awaited. Setup cannot be async. The ref update later is what paints the result.

`onUnmounted` runs when the router leaves the page or the test unmounts it.

```ts
onUnmounted(() => {
  active = false;
  controller?.abort();
});
```

`active` closes the door on a response that arrives after the instance is gone. Writing `state.value` after unmount would touch a component Vue has already discarded. The abort tells `fetch` to stop. Both are there because a mock, or a slow server, can still resolve after the abort event.

Vue does not run `onMounted` twice in development the way React 18 Strict Mode runs effects twice. One mount is one request.

## G. Request cancellation

Each `load` does three things before it awaits:

1. Abort the previous controller.
2. Increment `generation`.
3. Replace the state with `loading`.

The `await` that is already in flight belongs to the old generation. When it settles, it returns without writing if `requestId !== generation` or `active` is false. A late page for the first request cannot replace the page for the second.

An aborted `fetch` rejects. That rejection is named `AbortError`. `isAbortError` checks the name, not `instanceof Error`, because the DOM exception in the test environment is not an `Error`. The catch returns on that name. The page does not show an error for a request the composable canceled. It also does not log it.

`retry` does not abort a request that is already loading. `load` does abort, and the tests call `load` a second time to prove the stale page is dropped. The button on the page calls `retry`.

## H. Error handling

The sentence on the page depends on the kind of failure, not on the response body.

| Failure | Sentence |
| --- | --- |
| Network | Listings could not be loaded. Check your connection and try again. |
| HTTP 404 | The listings service could not be found. |
| HTTP 500 and above | The listings service had a problem. Try again in a moment. |
| Anything else, including a body that is not a page | Listings could not be loaded. |

`console.error` receives a short log: the status, the word "network", or the local exception message. It does not receive the problem-details body. That body can contain a trace id. The alert is `role="alert"`, so the sentence is announced when it appears. "Try again" is a button, and it is present because the view listens for `retry`. The click calls `retry`, which calls `load`, which performs another GET.

A canceled request is none of the rows above. It leaves the state alone.

## I. React comparison

A React page would keep the same union in `useState` and start the request in `useEffect`:

```tsx
useEffect(() => {
  const controller = new AbortController();
  let ignore = false;
  setState({ kind: 'loading' });
  getListings(controller.signal).then(
    (page) => {
      if (!ignore) setState({ kind: 'ready', listings: page.items, totalCount: page.totalCount });
    },
    (error: unknown) => {
      if (!ignore && !isAbortError(error)) setState({ kind: 'error', message: listingsErrorMessage(error) });
    },
  );
  return () => {
    ignore = true;
    controller.abort();
  };
}, [attempt]);
```

`ignore` is `generation` plus `active`. The cleanup function is `onUnmounted`. `attempt` is the retry counter. React runs that effect after paint. Vue's `onMounted` is the same moment. The difference people trip on is `.value`: the Vue ref is an object, and the template hides that. React state is the value itself, and you replace it with the setter.

A custom hook named `useListings` would return the same fields. Calling it twice would still mean two requests, in both frameworks. Fetch is the same function. Neither framework checks JSON against a generic.

## J. Angular comparison

The Angular listings service injects `HttpClient` and returns an `Observable`. The page does not subscribe in the service. It `switchMap`s the query stream onto `getListings`. A new query unsubscribes the previous observable, and `HttpClient` turns that unsubscribe into an abort. That is the same stale-response rule as `generation` here. This phase has no query stream, so the composable aborts inside `load` instead of inside `switchMap`.

Angular types the HTTP call as `get<unknown>` and then checks the body with `isListingPage`. This client does the same check. `HttpClient`'s generic would not have validated the JSON either.

Errors there are `HttpErrorResponse`. Status `0` is a network failure. Fetch has no status `0`. A failed DNS lookup rejects the promise, and that becomes `NetworkError`. The sentences match the Angular ones that do not mention filters. This page does not send filters, so a 400 does not say the filters were rejected.

Angular stores the page in a signal and derives `gridStatus` with `computed`. Vue stores the page in a ref and derives `status` with `computed`. The signal is read by calling it. The ref is read through `.value` in script and unwrapped in the template. Both are push-based: a write schedules a render.

The Angular service is a singleton. This composable is not. When the route is left, the composable is destroyed and the request is aborted. The Angular service stays registered. Its observable is what gets torn down.

## K. Architectural tradeoffs

Native `fetch` is enough for one GET. Axios would add a dependency to set a base URL and throw on a status. Both of those are a few lines. TanStack Query would cache, retry, and dedupe. This page has one request and a button that means "try once more". A cache would hide whether Retry actually hit the server. Pinia would move the ref into a store that outlives the page. The page is the only reader, and unmount is supposed to cancel the request. A store makes that cancellation somebody else's problem.

The DTO types are separate from `BusinessListing`. One interface that tried to be both would have `city` and `location` on the same object, and the card would have to know which one the API filled in. The mapper is the only place that knows both shapes.

Validation is a hand-written check of the page and of each item, not a schema library. The check is the fields this endpoint actually returns. A generator that imported the C# assembly would couple the Vue build to the API project. The types can drift. The runtime check fails the request when they do, instead of rendering `undefined`.

The grid still has no `updating` state. Retry from an error replaces the alert with skeletons. There is no previous page that would be honest to keep on screen. When filters arrive, a new query can keep the previous rows and mark them stale. That state was left for that phase. Adding it now would be a branch nothing can reach.

## L. Future development

Phase 4.5 can add server-side search, filtering, sorting, and paging without changing the card.

`getListings` is the function that gains a query argument and a query string. The API already binds `search`, `category`, `minPrice`, `maxPrice`, `sortBy`, `sortDirection`, `page`, and `pageSize`. Omitting them is what selects the defaults. Sending them is the whole client change at the HTTP boundary.

`ListingPage` already carries `page`, `pageSize`, and `totalCount`. A pager can compute the page count from the last two. The view already refuses to call six rows "the catalog" when `totalCount` is larger.

`useListings` already aborts the previous request when `load` runs again. A filter change can call `load` with the new query. The generation counter already drops the response for the query the user has left. The piece that does not exist yet is the `updating` presentation: keep the previous rows visible while that next request is in flight, which the Angular page does and this page deliberately does not.

The card still has no link. A detail route would be a different endpoint, `GET /api/listings/{id}`, and a different DTO. This phase does not call it.
