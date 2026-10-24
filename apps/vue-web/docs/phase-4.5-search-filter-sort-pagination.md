# Phase 4.5 — Server-side search, filtering, sorting, and pagination

This note is for a React and TypeScript developer learning Vue 3. The listings page now asks `GET /api/listings` for one page of a filtered, sorted catalog. The browser does not filter the six cards it already has.

Angular is the reference for what the screen does. The Vue page uses `ref`, `computed`, and `watch` instead of signals and RxJS. The ASP.NET Core action is unchanged.

## A. Query architecture

Three different facts used to get collapsed into one object. They are not the same fact.

1. **Draft.** The characters in the search box, including a word the user has not finished. That lives in `ref`s inside `ListingFilters.vue`. It is not in the URL, and it is not sent.
2. **Committed query.** What Back, Forward, and a shared link must restore. That is `route.query`. `parseListingQuery` turns it into a `ListingQuery`. A `computed` holds the result. There is no second copy in a store.
3. **Response metadata.** `totalCount`, `page`, and `pageSize` come back on the JSON page. They describe the answer. They do not describe what the user asked for. The pager's current page is the requested page, not a page number remembered from the previous response.

`useListings` receives the committed query. It does not read the router. The view is the only place that calls `router.push` and `router.replace`.

Defaults are omitted. `/listings` means search empty, every category, no prices, newest first, page 1, page size 6. The API fills those in when the keys are absent. Writing `page=1` on every visit would make a default address look different from the canonical one, and Back would stop on a URL that means the same thing.

There is no location parameter. `search` is matched by the API against title, description, city, and state. A location dropdown would send a key the action does not bind. Category is the `BusinessCategory` enum (`Restaurant`, `Retail`, `Technology`, `Healthcare`, `Manufacturing`, `ProfessionalServices`, `Other`). There is no category-list endpoint. The same seven identifiers are what Angular offers. Price is `minPrice` and `maxPrice`. Sort is `sortBy` plus `sortDirection`.

Invalid values are dropped and the URL is rewritten, except an inverted price range. `minPrice=10&maxPrice=1` is a real validation message. The request is not sent, because the API would answer 400. `category=Coffee`, `sortBy=Title`, `page=0`, and `pageSize=100` are not sent. They become the defaults, and `replace` removes them so Back does not return to the rejected address.

## B. Vue Router

`useRoute()` is the current location. Reading `route.query` inside `computed` subscribes to it. When the address changes, the computed runs again.

`useRouter()` performs navigation. It is not the current location. Calling it does not read state.

```ts
const parsed = computed(() => parseListingQuery(route.query));
const query = computed(() => parsed.value.query);
```

`router.push` records a step the user took: a new search, a category, a sort, a page, Clear filters. Back returns to the previous filters.

`router.replace` corrects a URL the user did not choose as a new step. `page=0` and `category=Coffee` are replaced. The history entry becomes the cleaned address. A later Back does not land on the bad link again.

The same helper builds both locations. Listing keys are rewritten. Any other key already on the URL is copied, so `ref=newsletter` survives a category change.

```ts
function commit(next: ListingQuery, mode: 'push' | 'replace'): void {
  const location = { query: toRouteQuery(route.query, next) };
  const result =
    mode === 'push' ? router.push(location) : router.replace(location);
  void result.catch(() => undefined);
}
```

The `catch` is for a navigation that Vue Router rejects because it is a duplicate. The page also skips the call when `listingQueryEqual` says the committed query did not change. A canonical `replace` of `page=1` parses to the same `ListingQuery` as `/listings`, so the composable's watch does not start a second GET.

Changing search, category, price, or sort sets `page` back to 1 and keeps `pageSize`. Clear filters clears search, category, and both prices. It keeps the sort. Angular does the same. Sort is an ordering, not a filter, and the Clear button stays disabled when sort is the only thing set.

## C. Vue reactivity

`ref` holds a value that can change and that the template should see. The filter form uses one ref per control. Writing `search.value` is the update. The template reads `search` without `.value`.

`computed` derives a value. It caches until a dependency changes. `query` is derived from the route. `listingPageCount` of the visible total is derived too. Neither is stored.

`watch` is for a side effect. Two watches exist on purpose.

- The view watches `route.query` and `replace`s a URL that is not canonical. It does not fetch.
- `useListings` watches the committed request and fetches. It does not navigate.

`watch` is not how the template learns the query. If the committed query were copied into a ref on every route change, that ref and the route would both claim to be the source. Back would update one of them and the other would still hold the page the user had left.

`filtersEqual` is the guard on the form's watch. When the URL changes to values the inputs already show, the inputs are left alone. Replacing the string would move the caret. When the URL is a different query, including Back during a pending debounce, the timer is cleared and the inputs are patched from the URL. The patch does not emit. Emitting would write the URL that just arrived.

## D. Search debouncing

Each keystroke is not a query. A catalog request on every letter spends a round trip on a word the user is still typing, and the response to "b" can arrive after the response to "bakery" if the slower one is not cancelled.

Search, minimum price, and maximum price wait 300 milliseconds. That is the same interval Angular's `debounceTime(300)` uses. Category and sort apply on `change`. Search and Clear publish immediately and cancel the timer, so a submit does not sit through the rest of the delay.

One timer covers the text fields. A second keystroke clears the first deadline. There is no debounce library. `setTimeout` is enough, and a library would hide the cleanup this screen has to get right.

The cleanup has two moments.

- `onUnmounted` clears the timer. A navigation away from the page must not emit into a view that is gone.
- The watch on the committed query clears the timer when that query is not the draft. The user can type "bakery" and press Back before 300 milliseconds. The restored URL is the previous filters. If the timer still fired, it would `push` "bakery" again and undo Back.

`distinctUntilChanged` is unnecessary here. A debounced publish of the same filters hits `listingQueryEqual` in the view and does not navigate.

The search input trims before it is committed. The API ignores surrounding whitespace. The field `maxlength` is 200, which is `MaxSearchLength` on the query DTO. A longer value is also sliced in `parseListingQuery`, so a shared link cannot send a 400.

## E. Server-side filtering

The grid renders `items`. `totalCount` is the size of the match in the database, which can be larger than `items`. Filtering those six objects would answer a different question: "which of these six match?" The user asked "which listings match, and what is page 2 of that set?"

PostgreSQL applies search, category, and price to the active catalog, then sorts, then skips and takes one page. `getListings` checks that the body is a page and maps each summary. It does not drop or reorder rows.

An empty `items` array with `totalCount: 0` is a real empty catalog, or a filter that matched nothing. It is HTTP 200. The empty copy depends on the committed query: "No businesses are listed yet." when nothing is filtered, and "No businesses match these filters." when search, category, or a price is set.

## F. Sorting

The API sorts the full match, then pages it. Sorting the current page in JavaScript would order six rows and leave page 2 in a different order.

The screen offers the four orders Angular offers.

| Control                     | `sortBy`        | `sortDirection` |
| --------------------------- | --------------- | --------------- |
| Newest                      | omitted         | omitted         |
| Asking price: low to high   | `AskingPrice`   | `Asc`           |
| Asking price: high to low   | `AskingPrice`   | `Desc`          |
| Annual revenue: high to low | `AnnualRevenue` | `Desc`          |

Omitted sort keys are `CreatedAt` descending. That column is not on the summary JSON. The database still has it, so newest-first does not require sending the timestamp to the browser. There is no oldest option, because the API screen in Angular does not offer one and an unsupported pair is a 400.

The `<select>` value is the `ListingSort` id (`price-asc`), not the label. After refresh and after Back, `parseListingQuery` reads `sortBy` and `sortDirection` and the select shows that option. Unknown pairs (`sortBy=Title`) become newest and the URL is replaced.

Changing sort resets the page to 1. Page 4 of a price sort is not page 4 of newest.

## G. Pagination

The response does not include a page count. The client computes it.

```ts
export function listingPageCount(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.ceil(totalCount / pageSize);
}
```

Eight listings at the default size of 6 is two pages. The count line is the total, "8 listings" or "1 listing", and only when the latest request succeeded and the total is greater than zero. The pager says "Page 1 of 2". Those are different sentences. The count is the match. The pager is where you are in it.

Previous and Next are the only page controls, matching Angular. Previous is disabled on page 1. Next is disabled on the last page. Both are disabled while a request is open, and the live text becomes "Loading page N" so a second click cannot ask for a total that still belongs to the previous query.

A request for a page past the end is still sent. The API returns 200, an empty `items` array, and the real `totalCount`. The screen says "This page is outside the results." Previous from that page goes to `pageCount`, not to `page - 1`, so page 9 of a two-page result steps back to page 2.

The pager is hidden when there is a price error, while the first load or an error is showing, and when the result is a single page the user is already on. It stays visible when the URL asks for a page greater than 1, including a page past the end, so the user can move back.

Page changes `push` the same filters and sort with a new `page`. They do not clear search. The results heading is focused after a page change because Next can become disabled on the last page and leave the tab order. Filter changes do not move focus. The user is still in the form.

## H. Async request lifecycle

`useListings` keeps one discriminated state. Loading and error cannot both be true. Empty is `ready` with no rows.

| State      | When                                                 | What is on screen                                                            |
| ---------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `loading`  | No page to show, and a request is open               | Six skeletons. "Loading listings."                                           |
| `updating` | A page is already showing, and a newer query is open | The previous cards at reduced opacity, `aria-busy`, and "Updating listings." |
| `ready`    | The latest request succeeded                         | That page.                                                                   |
| `error`    | The latest request failed                            | The message and Try again. The previous cards are gone.                      |
| `blocked`  | The URL has an inverted price range                  | No request. The view shows the price alert instead of the grid.              |

`updating` exists so a category change does not flash skeletons over a page the user was just reading. The previous cards are marked busy. They are the previous answer. The status text says the results are updating. They are not presented as the new match.

A failed update discards that page. Keeping Harbor & Rye on screen under a search for "bakery" would claim those rows matched. Retry from the error state starts from skeletons, because there is no honest page left. The same discard happens for `blocked`: the next valid query loads from scratch.

One watch owns the GET. The watched value is the query, the blocked flag, and a retry nonce. `listingQueryEqual` plus the nonce means one committed change produces one request. Retry increments the nonce. It does nothing while a request is already open, whether that request is the first load or an update.

`load` aborts the previous `AbortController` and increments `generation`. The response is applied only when this generation is still the latest and the component is still mounted. An abort is not an error. `isAbortError` checks the `name` because a DOM exception from the test environment is not always an `Error` instance.

```ts
state.value =
  previous === null
    ? { kind: 'loading' }
    : { kind: 'updating', page: previous };
```

The first request has no previous page, so a second `load()` that starts before it finishes stays on skeletons. That is the stale-response case: the late response is ignored, and the user never sees it.

## I. React comparison

A React page would keep the same split. Draft text would be `useState`. The committed query would be `useSearchParams` from React Router, not a second `useState` copied from the search string in an effect. Copying it is the bug this page avoids: the effect and the setter both write, and Back updates the URL without going through the setter.

`computed` is the derived value you would write as `const query = parse(searchParams)` during render, or wrap in `useMemo` if parsing were expensive. You do not need `useMemo` for correctness in React. You need `computed` in Vue so that reading it tracks the route. A plain function call in Vue setup runs once.

`watch` is the effect. The dependency list is the thing you read inside the watch source, or the getter you pass. The Vue watch on `route.query` is the React `useEffect` that calls `navigate(cleaned, { replace: true })`. The fetch watch is the effect that calls `getListings` when the parsed query changes. `useEffect` cleanup is `onUnmounted` plus the abort in that watch.

`useListings()` is the custom hook. It returns refs. A React hook would return the state and `retry`. The interesting difference is that Vue refs stay stable and their `.value` changes. React state is a new value each render, and the component function runs again. The template re-renders when a ref it read changes. It does not re-run the setup function.

`router.push` and `router.replace` are `navigate(next)` and `navigate(next, { replace: true })`.

## J. Angular comparison

Angular's listings page stores the URL with the router and reads it with `toSignal` on the query param map. `parseListingQuery` is the same function, ported off `ParamMap` onto a plain record. `serializeListingQuery` still uses `null` for "omit this key."

The filter form there is a `FormGroup`. Text and prices use `valueChanges.pipe(debounceTime(300))`. Category and sort emit immediately. `takeUntilDestroyed` drops those subscriptions. The Vue form uses one `setTimeout` and clears it on unmount and on Back. `switchMap` on the page's request stream cancels the previous inner observable. The Vue composable aborts the previous `fetch` and ignores a stale generation. Both mean the slower response cannot overwrite the newer one.

`HttpClient` takes `HttpParams` and an `HttpContext` or options signal. `getListings` builds a `URLSearchParams` string and passes the `AbortSignal` to `fetch`. The runtime check that the body is a page stays in front of the mapper. Angular's typed `get<T>` does not prove the JSON shape either. Both clients narrow `unknown`.

Signals and `computed` are the closest analog to `ref` and `computed`. An Angular `effect` that navigates is the Vue `watch` that `replace`s. The Angular effect patches the form with `emitEvent: false` so Back does not look like a keystroke. The Vue watch assigns the refs and does not emit.

The view states match: loading, updating, ready, error, and a blocked price range that never reaches the grid. Retry is ignored while a request is in flight. A failed update drops the previous page.

## K. Accessibility

The search input has a visible `<label for="listing-search">`. Category, both prices, and sort are labeled the same way. The selects are native `<select>` elements. They take the browser's keyboard behavior. No listbox widget is added.

The price and search errors use one `role="alert"` and `aria-describedby` only on the fields that are wrong. A price error is not announced when focus is on Search. An inverted range that arrived in the URL is a second alert, in the results column, and the grid is not shown.

The pager is a `<nav aria-label="Pagination">`. Previous and Next are buttons. Disabled is the native `disabled` attribute, which removes them from the tab order and is announced as unavailable. The page sentence is one `<p aria-live="polite" aria-atomic="true">`. The element stays in the DOM when the text changes from "Page 1 of 2" to "Loading page 2", so assistive technology is not handed a new region on every page.

The result count is `role="status"` only after a successful page with a total. Search keystrokes do not announce. The debounced commit updates the URL, then the response updates the count once. "Updating listings." is a status, not an alert. The error is an alert. Skeletons are hidden from the accessibility tree. A visually hidden "Loading listings." is the loading announcement.

Focus moves to the results heading only after Previous or Next. The heading has `tabindex="-1"` so it can take focus without becoming a tab stop. `scroll-margin-top` keeps it below the sticky header.

Clear filters is a button named "Clear filters". It is disabled when search, category, and both prices are empty. Sort alone does not enable it. The empty state repeats the button when a committed filter matched nothing, so the user can reset without scrolling back to the form.

The Listings nav item stays `aria-current="page"` when the URL is `/listings?category=Retail`. The comparison is the path. `isExactActive` also compares the query, which would drop the current-page mark on the first filter. Home shares the path and stays unmarked because only Listings is flagged as the current page.

## L. Architectural tradeoffs

The URL is the committed store. A Pinia store of the same filters would be a second writer. Back would have to be subscribed and copied back in. Nothing else in the app reads the listings query yet. A store starts to pay for itself when two screens share that state. This page does not.

`computed` from the route was chosen over a ref synced in a watch. The ref would be easier to set from a test and easier to forget to update from Back. The route cannot drift from itself.

Debounce lives in the form, not in `useListings`. The composable fetches the committed query. It does not know that search is typed. Putting the timer in the composable would delay category changes too, or it would special-case fields the composable should not name.

`updating` keeps the previous page instead of clearing it. The alternative is skeletons on every filter change. That matches the first load and is simpler. It also hides the context the user is refining. The cost of `updating` is a rule for failure: the old page must disappear when the new request fails, or the screen lies. That rule is explicit in the composable.

Inverted prices are not fetched and not rewritten. Fetching them would train the user to read a 400 as a filter result. Rewriting them would delete the range the user, or a shared link, asked to see.

Page size stays whatever the URL had, defaulting to 6 and capped at 24 by the parser. The screen does not offer a page-size control. Angular does not either. A `pageSize` in a shared link is preserved across filter changes so the link's page size is not silently discarded.

Unrelated query keys are preserved. The alternative is to pass only the listing keys and drop campaign parameters. `toRouteQuery` copies the rest.

The previous cards are not filtered in the browser while the request is open. They are visibly stale. Filtering them locally would show a different set than the server returns a moment later, including rows from other pages that the client does not have.
