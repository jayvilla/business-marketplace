# State management with signals and RxJS

## Purpose

The listings screen has three kinds of state. Menu and field errors are local. The committed search is the URL. The HTTP result is a short-lived stream. None of them is a global store.

## Architecture

`ListingsPage` owns the URL write and the request. `ListingFiltersForm` owns the draft. `Header` owns `menuOpen`. `BusinessListingsService` owns no state. It returns an observable.

The view state is a union in `listings-page.ts`:

```ts
type ListingsViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'updating'; readonly previous: BusinessListingPage }
  | { readonly kind: 'ready'; readonly page: BusinessListingPage }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'invalid' };
```

Empty is `ready` with no rows. `invalid` is the inverted price. The grid is not mounted for that arm. The price alert is.

## Implementation

`queryParamMap` is bridged with `toSignal`. `parsed`, `query`, and `priceError` are `computed` from that signal. An `effect` named `canonicalizeUrl` calls `router.navigate` with `replaceUrl: true` when the raw query spells a default or an unknown value and the price range is not inverted.

The request is the other bridge. `toObservable` watches a `computed` of `{ query, blocked, nonce }`. The pipe:

1. `distinctUntilChanged` with `listingQueryEqual` drops a rewrite that parsed to the same query.
2. `switchMap` calls `load`. A blocked query emits `{ type: 'blocked' }` and does not call `getListings`.
3. `scan(reduceView, initialView)` folds events into the union. `updating` keeps `previous` when a page is already on screen. An error drops that page. A blocked query becomes `invalid`.
4. `toSignal` exposes the result. `initialValue` is `loading` because `toObservable` emits on the next turn.

`retryNonce` is a signal. Retry increments it. The query object does not change, so `distinctUntilChanged` would have swallowed the click without the nonce. Clicks during `loading` or `updating` do not increment.

`filtersActive` is a `computed` of the committed query, not a second ref written beside it. The form has its own `filtersActive` signal for the draft, so Clear can enable before the URL updates.

There is no `NgRx` store and no signal store. The page comments say a signal cannot cancel an HTTP observable. `switchMap` can. That is why the request stays on RxJS.

## Angular concepts

`signal` holds a value. `computed` reruns when a signal it read changes. `effect` runs for side effects. This app uses `effect` for the URL rewrite and for patching the form from the query. It does not use `effect` to fetch.

`toSignal` and `toObservable` from `@angular/core/rxjs-interop` are the bridge. One subscription remains, inside `toSignal`.

`takeUntilDestroyed()` ends the header's router subscription and the form's `valueChanges` subscription when those components are destroyed.

## React comparison

`useState` is `signal` for a single value. `useMemo` is `computed`. `useEffect` is the Angular `effect`, with the extra rule that the Angular `effect` tracks signals read during the run. The request effect in React would be `useEffect` plus `AbortController` in the cleanup. `switchMap` is that pattern for observables. Context would be the injector if a distant component needed the same client. The listings page injects the service directly.

## Vue comparison

`useListings` is the `switchMap` pipeline: one `watch`, an `AbortController`, and a generation number. Vue's `blocked` status is this page's `invalid` kind. Both keep the previous page while `updating`, and both refuse to show that page under an error for a different query. See [Vue state](../../vue-web/docs/phase-4.6-state-management-composables.md).

## Engineering decisions

The URL is the committed query so Back and Forward are the history of the search. A service field would drift from the address bar.

`scan` keeps the previous page without a second writable signal that could disagree with the status.

NgRx was not added. One route, one request, and a URL do not need actions and reducers.

## Testing

`listings-page.spec.ts` is the integration of router, form, and `HttpTestingController`. It asserts one request for a canonical rewrite, no request for an inverted URL, and a second request on retry. The header and filter specs cover their own signals without the page.

## Key takeaways

Signals describe the current URL and the current view. RxJS describes the request that can be cancelled. `toSignal` is the seam, and there is still one subscription.
