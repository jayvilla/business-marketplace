# Phase 4.6 — State management and composables

This note is for a React and TypeScript developer learning Vue 3. The listings screen already worked. This phase asks who owns each value, and changes only the places where a second copy could drift.

Pinia is not installed. The address bar remains the committed query. `useListings()` remains the server-state owner for this page.

## A. State ownership inventory

Nothing in the header needs to know the listings query. Nothing in a listing card needs to know the page number. The table is the ownership that follows from that.

| Value                                                                                             | Owner               | Category               | Mutable or derived                 | Who reads it                     | Lifecycle                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| `route.query`                                                                                     | Vue Router          | URL                    | Written only by `push` / `replace` | `ListingsView`                   | Lives with the history entry                                                      |
| `parsed`, `query`, `priceError`                                                                   | `ListingsView`      | Derived from the URL   | `computed`                         | Form, pager, `useListings`       | Recomputed when the query changes                                                 |
| `filtersActive`, `emptyMessage`, `showCount`, `countLabel`, `showPagination`, `paginationPending` | `ListingsView`      | Derived                | `computed`                         | The results column               | Same                                                                              |
| `search`, `category`, `minPrice`, `maxPrice`, `sort`, `fieldError`                                | `ListingFilters`    | Local draft            | `ref`                              | The form                         | Cleared when the committed query diverges, and on unmount the timer dies          |
| `filtersActive`                                                                                   | `ListingFilters`    | Derived from the draft | `computed`                         | Clear filters                    | Follows the fields                                                                |
| `textTimer`                                                                                       | `ListingFilters`    | Lifecycle, not state   | Plain `let`                        | The debounce                     | `clearTimeout` on unmount, Back, submit, and Clear                                |
| `state`                                                                                           | `useListings`       | Server                 | `ref` of a union                   | Private                          | Replaced, never patched field by field                                            |
| `listings`, `status`, `errorMessage`, `totalCount`                                                | `useListings`       | Derived server state   | `computed`                         | The view, then the grid as props | Follow `state`                                                                    |
| `retryNonce`, `generation`, `controller`, `active`                                                | `useListings`       | Request lifecycle      | `ref` or plain `let`               | Private                          | Nonce is the retry trigger. The rest die with the component                       |
| `page`, `pageSize`, `totalCount`, `pending`                                                       | `ListingPagination` | Props                  | `pageCount` is `computed`          | The pager buttons                | The view passes the requested page, not a page number cached from an old response |
| `listings`, `status`, messages                                                                    | `ListingsGrid`      | Props                  | None of its own server data        | The cards                        | Presentational                                                                    |
| `imageFailed`                                                                                     | `ListingCard`       | Local UI               | `ref`                              | That card's image                | Reset when `imageUrl` changes                                                     |
| `menuOpen`                                                                                        | `AppHeader`         | Local UI               | `ref`                              | The header                       | Closed on navigation and Escape. The key listener is removed on unmount           |

There is no shared application state. A value that is only a calculation is a `computed`. A value that is only a timer or a counter is not wrapped in `reactive()`.

`filtersActive` in the form used to be a `ref` assigned from every input handler. That assignment duplicated the fields. It is now derived. The view's `filtersActive` is a different fact: it reads the committed query, so the empty-state button appears only after the URL has caught up. The form's flag follows the draft, so Clear filters enables while the debounce is still waiting. Those two are not copies of one source.

## B. Vue reactivity fundamentals

These are the primitives in Vue 3. The ones this app uses are called out. The others are here so the names are not mysterious later.

`ref()` holds one value. You read and write `.value` in script. The template unwraps it. Use it for a value that changes independently: the search draft, the menu, a failed image. A `ref` is mutable on purpose.

`reactive()` wraps an object so each property is tracked. Destructuring it copies the current values and drops the tracking, which is the usual way to lose reactivity. This app does not use `reactive()`. The listings state is one union replaced as a whole. A `ref` of that union makes the replacement obvious. A `reactive` object would invite `state.kind = 'ready'` while `state.page` still belonged to a load.

`computed()` caches a derivation until a dependency changes. `query` is `parsed.value.query`. `filtersActive` is "does the draft have a filter?". `status` is the grid's view of the union. None of these are stored and then watched. A `watch` that only assigns another `ref` is a derivation written as a side effect.

`watch()` runs a side effect when a source changes. This app has four:

- Canonical URL rewrite, watching `parsed`.
- The fetch, watching the request inside `useListings`.
- The filter form, watching `props.query` so Back can replace the draft.
- The header, watching `route.fullPath` to close the menu.

`watch` is not used to copy the route into a `ref`. That copy would be a second committed query.

`watchEffect()` runs immediately and tracks whatever it reads. It is easy to track too much, including a value the effect itself writes. This app does not use it. The fetch and the URL rewrite have explicit sources.

`readonly()` wraps a reactive value so assignment fails. The public listings fields are `computed` refs. A computed is already readonly: assigning `.value` is a Vue warning and, under the return type `ComputedRef`, a type error. Wrapping them again would not add a boundary the type does not already state. The `state` ref is simply not returned.

`shallowRef()` tracks replacement of `.value` and does not track nested properties. It would fit `state`, because the code replaces the object. It would also hide a mistaken `state.value.page.items.push(...)` instead of failing loudly in a test. The union is replaced today. `ref` stays until a measurement says the deep tracking matters.

The request watch compares queries with `listingQueryEqual`. The computed returns a new object whenever the route or the retry nonce changes. Object identity would otherwise count a canonical `replace` of `page=1` as a new request. The comparison is semantic. The watch is not `deep`.

## C. Composable architecture

`useListings()` is a function called from `ListingsView` setup. It owns the request and returns the snapshot the template needs.

```ts
export function useListings(
  source?: MaybeRefOrGetter<ListingsRequest>,
): ListingsSnapshot;
```

`source` is usually a computed of the URL. The composable does not import the router. A test passes a `ref` and never mounts the page. That is the reason it is a composable and not a component, and the reason it is not a store: the caller decides which query is committed.

Inside, one `ref` holds the union:

```ts
type ListingsState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'updating'; readonly page: ListingPage }
  | { readonly kind: 'ready'; readonly page: ListingPage }
  | { readonly kind: 'error'; readonly message: string };
```

`updating` carries the previous page. `error` does not. Those two cannot be true together, because they are different `kind`s. Booleans such as `isLoading` and `isError` can both be true. The union cannot.

`blocked` means the price range is inverted. The public `status` reports that as `loading`. The view does not render the grid in that case. It renders the price alert from `priceError`, which is URL state, not server state. Keeping `blocked` out of `ListingsStatus` means the grid's prop stays the set of states the grid knows how to draw.

`retry()` increments a nonce. The same watch that sees a new query sees the nonce and calls the private `load`. Retry returns immediately when `kind` is `loading` or `updating`, so a double click does not start a second flight. `load` is not on `ListingsSnapshot`. A public load could request "bakery" while the URL still said nothing.

## D. URL state versus local state

Committed filters are whatever `parseListingQuery(route.query)` returns. Draft text is the `ref`s in `ListingFilters`. The form emits a `ListingFilters` value. The view turns that into a `ListingQuery` with page 1 and `router.push`.

Back and Forward change `route.query`. The form's watch sees a committed query that is not the draft, clears the timer, and copies the URL into the inputs. It does not emit. Emitting would write the URL that just arrived.

If the user types and navigates Back before 300ms, the timer is cleared first. The timeout cannot `push` the abandoned word over the restored query.

`router.push` is a user step. `router.replace` is a repair: `category=Coffee`, `page=0`, an unknown sort. An inverted price is not repaired. It stays in the URL, and `blocked` skips the fetch. The rewrite watches `parsed`, the same computed the request uses, so the two cannot disagree about what the address means.

Unrelated keys are copied by `toRouteQuery`. A campaign parameter is not listings state, and it is not dropped when the page changes.

## E. Server state

`listings` and `totalCount` describe the last response the composable is willing to show. They are not the form, and they are not the URL.

The requested page is `query.page`. The pager uses that, plus `totalCount` from the visible response, to compute how many pages exist. During `updating`, `totalCount` is still the previous response. The buttons are disabled while `pending` is true, so the user cannot page against a total that belongs to the previous query and believe the click was accepted.

A failed update sets `kind: 'error'` with no page. The old rows are not left on screen under the new query. A successful response replaces them. There is no client cache and no optimistic row. This phase does not add either. The catalog is the database's.

DTO types stay in the API module. `getListings` maps them to `BusinessListing` before the composable sees a page. The composable never branches on `city` or `askingPrice`.

## F. Component communication

The view coordinates. Children do not.

- `ListingFilters` receives the committed `query` and emits `change`. It does not call `getListings` or `useRouter`.
- `ListingPagination` receives page, page size, total, and pending. It emits `pageChange`. It does not know which filters are active.
- `ListingsGrid` receives the rows, the status, and the messages. It emits `retry` and `clear`. It does not fetch.
- `ListingCard` receives one `BusinessListing`. The failed-image `ref` stays on the card.

Props down, events up, one composable at the view. `provide` / `inject` would hide those props behind a lookup. The tree is one level deep. Injection starts to pay when a distant descendant needs a value that every intermediate component would otherwise forward unchanged. That descendant does not exist here.

The header does not inject the listings query. Its only route concern is "did the path change?", so it can close the menu.

## G. Lifecycle management

Setup runs once. The template re-renders when a ref it read changes. The setup function does not run again. Cleanup is registered during that single run.

| Work                        | Where it stops                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `fetch`                     | `controller.abort()` when a newer request starts, when the query becomes blocked, and on unmount |
| Stale success or failure    | `generation` must still match, and `active` must still be true                                   |
| Debounce                    | `clearTimeout` on unmount, and when the committed query is no longer the draft                   |
| URL watch and request watch | Stopped by Vue when the component that created them unmounts                                     |
| Header `keydown`            | `removeEventListener` in `onUnmounted`                                                           |

Vue 3.5 can pass `onCleanup` into a watch callback. That cleanup runs before the next run and when the watch stops. The fetch does not use it. Abort on unmount is not enough by itself: the response can already be in hand, with `state.value = ready` still queued. `active = false` drops that write. `onCleanup` would abort a request that might already have succeeded, and the flag would still be required. Two mechanisms for one race is the extra infrastructure this phase avoids.

An aborted `fetch` rejects. `isAbortError` returns before the error state is set. A cancelled search is not "Listings could not be loaded."

## H. React comparison

These are analogies. The runtimes schedule updates differently. Vue tracks what a render read. React re-renders the function and you declare dependencies.

`ref` is the mutable cell `useState` gives you, without a new snapshot every render. You keep the same ref object and change `.value`. React's state value is the snapshot for that render. The setter is how the next render sees a change.

`computed` is a derived value. In React you write it during render, and reach for `useMemo` when the work is expensive or the identity matters. You need `computed` in Vue so that reading it subscribes. A plain function called from setup runs once.

`watch` is `useEffect`. The source list is the dependency list. The Vue watch on `parsed` that calls `router.replace` is the effect that calls `navigate(cleaned, { replace: true })`. The fetch watch is the effect that calls `getListings` when the query changes. Cleanup in React is the function `useEffect` returns. In this Vue code it is `onUnmounted`, the abort, and `clearTimeout`.

A composable is a custom hook: a function that uses the framework's state primitives and must be called during setup, the way a hook must be called during render. It is not a singleton. Two calls make two independent states. That is why `useListings()` in the view is not shared with the header.

`provide` / `inject` is the closest thing to Context. This app uses neither for listings. Context is how React would avoid prop drilling. The drilling here is one component deep.

Pinia is a global store with devtools and a module boundary. Zustand and Redux are the React names people reach for in the same situation. None of them belong on this page while the URL is the committed query. A store of the same filters would be a second writer, and Back would have to be copied into it.

## I. Angular comparison

`ref` is the signal you can set. `computed` is a computed signal. `watch` is the `effect` that is allowed to navigate or fetch. Angular's listings page reads the query param map with `toSignal` and parses it. This page parses `route.query` in a `computed`. Both treat the router as the source.

Angular's filter form uses `valueChanges` and `debounceTime(300)`. The Vue form uses one `setTimeout`. Angular's page uses `switchMap` so a new query unsubscribes the previous HTTP observable. `useListings` aborts the previous `fetch` and ignores a stale generation. Both mean the slower response cannot paint over the newer one.

An Angular service provided in `root` is one instance for the app. A composable is one instance per call. Sharing listings state with another page would mean either calling the composable from a common parent, or a store, or a service. This app has one page that fetches listings. A root service would keep the last page alive after the user left, which is a cache this phase is not introducing.

Pinia versus a shared injectable is the same decision as Pinia versus a root service. The Angular client does not put the listings query in a service either. It leaves it on the router.

## J. Pinia decision

Pinia is not added.

1. No second page reads the listings query, the draft, or the last response.
2. The committed query already outlives the view, because it is the URL. The server page should not outlive the view. Leaving it would show a stale catalog on the next visit without a refresh policy.
3. The header, the form, the grid, and the pager do not coordinate except through the view.
4. A store would not delete a duplicate. The duplicates this phase removed were a hand-maintained `filtersActive` and a public `load`.
5. A store of filters would sit beside `route.query`. Back updates the route. The store would need a subscription to follow, which is the loop the `computed` avoids.
6. Tests already pass a `ref` into `useListings` and assert the status. A store would need a reset between tests so one file's query does not leak into the next. That is more machinery, not less.

Reconsider a store when a value is read by unrelated pages and is not already the URL. A signed-in user in the header and on a seller form is the usual first case. A cache of listing pages is a different tool, closer to a query library than to Pinia, and it is not this phase.

## K. Architectural improvements

Three changes.

The form's Clear-filters flag is a `computed` of the draft fields. It can no longer miss an update when a new input is added.

`useListings` returns `ListingsSnapshot`. `load` stays private. The stale-response test changes the source query while the first request is open, which is the public way to overlap two requests. `status` is the exported union the grid accepts, and the comment on `blocked` records why that union does not include it.

The canonical URL watch reads `parsed` instead of calling `parseListingQuery` again. The rewrite and the request share one parse.

The fetch lifecycle, the debounce, the union, and the decision to keep the query in the URL were already right. They were left in place.

## L. Future considerations

Shared state is justified when two features that do not share a parent must see the same value change, and the URL is the wrong place for it. Authentication is the likely first one. A seller id in the header and on a form should not be parsed out of a listings query string.

A cross-page workflow, such as a draft listing started on one route and finished on another, needs a home that survives the first route's unmount. That can be a store, or it can be the server. Prefer the server when the draft must survive a refresh.

Caching the listings response across visits would avoid a repeat GET. It needs a rule for when the cache is wrong. A store field with no expiry is not that rule. Add it when a measured navigation is slow, not before.

Do not put the committed search in that future store. The address bar already shares it, restores it, and can be linked.
