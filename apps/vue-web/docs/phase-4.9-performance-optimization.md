# Phase 4.9 — Performance optimization

This pass measured the production build, then changed only the two rendering issues the measurement and the template structure supported. Caching, virtualization, and extra memoization were left out.

## A. Performance baseline

Production build, Vite 8, `nx build vue-web`, before the rendering changes. Sizes are the files in `dist/apps/vue-web`. Vite's `kB` is decimal. Gzip is Vite's `reportCompressedSize` figure.

| Asset                |                     Raw |     Gzip | Role                         |
| -------------------- | ----------------------: | -------: | ---------------------------- |
| `index-*.js`         | 95.48 kB (95,485 bytes) | 36.74 kB | Vue, Vue Router, shell       |
| `index-*.css`        |   5.18 kB (5,183 bytes) |  1.54 kB | Tokens and document defaults |
| `ListingsView-*.js`  | 19.16 kB (19,165 bytes) |  6.53 kB | Listings route               |
| `ListingsView-*.css` |   7.02 kB (7,029 bytes) |  1.51 kB | Listings route styles        |
| `NotFoundView-*.js`  |     0.53 kB (535 bytes) |  0.38 kB | Unknown URLs                 |
| `NotFoundView-*.css` |     0.22 kB (222 bytes) |  0.16 kB | Unknown URLs                 |
| `index.html`         |     0.44 kB (449 bytes) |  0.29 kB | Document                     |

Initial JavaScript is the shell chunk. The listings chunk loads with that route. The not-found chunk does not. Total JavaScript if every route chunk is counted is 115.19 kB raw. Total CSS is 12.43 kB raw.

The five placeholder illustrations in `public/listings` are 372 to 536 bytes. `services.svg` is the largest file in the app. There is no raster image in the Vue app. A listing photograph comes from `imageUrl` on the API row, and that host was not available.

`index.html` references the shell script and the shell stylesheet. It does not reference the listings chunk. That chunk is a dynamic import.

No third-party data library, image service, or component library is in the graph. `sample-listings.ts` is imported by specs only.

## B. Measurement methodology

- Bundle sizes: production `vite build` output, not the dev server.
- Request list: `vite preview` at `http://localhost:4300/listings`, cold navigation, Chrome resource timing. Viewport 940×640, device pixel ratio 1. Cache was cold for that origin.
- API: `GET http://localhost:5000/api/listings` failed. Docker Desktop's engine pipe was missing, so PostgreSQL did not start. The page settled on the connection alert.
- Search check: six slow keystrokes of `bakery` in that same preview session, then resource timing again.
- LCP and CLS: `PerformanceObserver` with `buffered: true` on that failed load. INP: an Event Timing observer was installed, and the automated Try again click produced no event entry, so INP is unmeasured.
- These are one local session. They are not field Core Web Vitals.

## C. Bundle optimization

`routes` in `src/app/router/index.ts` lazy-loads both views:

```ts
component: () => import('../../features/listings/views/ListingsView.vue');
```

The generated chunks match that split. The shell stays Vue, the router, the header, and the footer. The cards, the form, `useListings`, and the fetch mapper stay in the listings chunk. Not-found stays its own chunk because almost no visit renders it.

The preview confirmed the split. A cold `/listings` load requested the shell script, the shell CSS, the listings script, the listings CSS, and one listings fetch. It did not request the not-found chunk or a placeholder SVG.

`/` redirects to `/listings`, so a normal visit always pays for both the shell and the listings chunk. The listings file is 6.53 kB gzip. Folding it into the shell would remove one round trip and grow the first script by that amount. The round trip is real: the browser discovers the listings import only after the shell runs. The split stays, because 6.5 kB is a small second request on a connection the shell has already opened, and the feature boundary is what keeps a future route from landing in the first paint. Adding more lazy boundaries inside the listings page would add requests for components that render together.

## D. Vue rendering performance

Vue re-runs a component's render when a reactive dependency read during that render changes. A `computed` runs again when something it read changes, and readers see the previous value until then. A card does not re-render because the search draft changed, unless that card actually read the draft. It does not.

`useListings` keeps one `state` ref. `listings`, `status`, `errorMessage`, and `totalCount` are computeds over it. The watch compares the next committed query with `listingQueryEqual` and returns when the parsed value is the same object contents, so a canonical URL rewrite does not start a second GET.

`formatDollars` holds one `Intl.NumberFormat` at module scope. A card calls it while rendering. Building that object per amount would repeat locale work for every figure on every update. The amounts themselves are cheap once the formatter exists, so there is no second cache of formatted strings.

The grid's `v-for` key is `listing.id`. An index key would reuse the component at that slot. The card's failed-image flag would then stick to the wrong business after a reorder. That is already covered by a grid test.

What the template did not do: updating and ready were two branches. Vue destroys the branch it leaves. Finishing a request destroyed every card and mounted new ones, even when the id was unchanged. The failed-image flag reset, and the browser started the photo again. Updating and ready now share one list, so the same id keeps the same card instance. An empty in-flight page still uses that list. The empty copy is only for a finished request with no rows.

`v-memo`, `v-once`, `shallowRef`, and `markRaw` were not added. Nothing in this screen was a measured hot render that those tools would fix. The page size cap is 24.

## E. React comparison

React renders a component again when its parent renders, unless `React.memo` and a stable props comparison skip it. A parent `useState` update re-renders the children even when their props are unchanged. Vue does not. A child re-renders when a reactive value it read changes. `React.memo` is the tool you reach for when a parent render is dragging quiet children along. This grid does not need that equivalent.

`useMemo` is the usual place to keep an `Intl.NumberFormat`. The same object here is a module constant, because nothing about it depends on a render. `useCallback` exists so a memoized child can see a stable function. These components do not skip renders based on function identity, so wrapping `onPageChange` would not change what runs.

`v-memo` is the closer cousin of `memo` on a list row. It was skipped for the same reason `memo` would be skipped on a list of at most 24 cheap cards.

## F. Angular comparison

Angular's default change detection walks the component tree. `OnPush` narrows that walk to input changes, events, and signals the template reads. Vue's dependency tracking is closer to signals than to the default walk: a computed or a render effect subscribes to the sources it touched.

`@for (listing of listings; track listing.id)` is this grid's `:key="listing.id"`. Both exist so a reorder moves the row instead of redrawing it in place.

`HttpClient` testing uses `HttpTestingController`. This app's tests mock `getListings` at the feature boundary, and `get-json.spec.ts` stubs `fetch`. There is no client cache in front of either.

## G. API performance

One watch in `useListings` owns the GET. A committed query change and Retry both come through it.

- The first navigation calls `getListings` once. The preview recorded one `GET /api/listings` before any typing.
- Search and prices wait 300ms on one timer. Six keystrokes of `bakery` produced one request, `GET /api/listings?search=bakery`, and the URL became `?search=bakery` once.
- Category and sort publish immediately. The existing view specs cover those calls.
- Previous and Next send the page they show. A filter change commits page 1.
- A newer query aborts the previous `AbortController`. A late body is ignored because `generation` moved on.
- An inverted price sets `blocked` and does not fetch. The view spec mounts `/listings?minPrice=10&maxPrice=1` and expects no call.
- Retry returns while a request is `loading` or `updating`, so a second click does not stack a twin request. After the bakery search failed, Try again issued one more call to the same URL.
- Rewriting `category=Coffee&sortBy=Title&page=0&pageSize=100` into the canonical URL calls `getListings` once. The watch compares the parsed query, not the raw string.

No response cache was added. The same URL can be requested again on Back, and that is acceptable: the payload is one page, the server is the source of truth, and a cache would have to know when a listing changed.

## H. Image performance

Each card reserves the photograph with `width="640"` and `height="400"`, and the media box uses `aspect-ratio: 16 / 10`. The image fills that box with `object-fit: cover`. The box is the layout, so a slow photo does not push the title down. `alt=""` stays, because the category and the title are already text.

`loading="lazy"` on every card included the first one. That image is in the first viewport and is the likely largest paint once rows exist. Browsers delay a lazy image until they know it is near the viewport, which is the wrong hint for the image already there. The grid now passes `prioritizeImage` for index 0. That card uses `loading="eager"` and `fetchpriority="high"`. The rest stay `loading="lazy"`. Every card still uses `decoding="async"`, so a large photo does not decode on the interaction that revealed it. `decoding="sync"` on the first photo would favor that paint and can stall input. The eager hint is the part that was wrong.

A failed URL still swaps to the category SVG, and the flag still clears only when `imageUrl` changes. Placeholders are a few hundred bytes and are not requested until an error.

The first two cards can sit side by side from 48rem. Only the first is eager. The second is the same size and could also be a largest-paint candidate. Loading both immediately would spend another photo on every visit. One eager image is the smaller choice until a populated trace shows the second image winning LCP.

## I. Core Web Vitals

LCP is the render time of the largest image or text block in the viewport. CLS is unexpected layout movement. INP is how long the next paint waits after an interaction. The usual "good" lines are 2.5 seconds, 0.1, and 200 milliseconds. A single localhost run is not a field score.

On the failed production load, LCP was a paragraph at about 80ms. CLS across the skeleton-to-alert change was about 0.158. That shift is the tall loading grid collapsing into the short connection alert. It is not the shift of a populated results page. The skeletons use the same 16:10 media box as a card so a successful page can replace them without moving the headings. That success path was not measured, because the API returned nothing.

INP was not recorded. The Event Timing observer saw no entry for the automated click.

Do not read the 80ms figure as the listings page. A populated page's largest element should be the first card image, and that image was never on screen.

## J. Optimizations implemented

### First card image loads immediately

Before: every `ListingCard` set `loading="lazy"`. After: the first card in the grid sets `loading="eager"` and `fetchpriority="high"`. The listings chunk grew from 19.16 kB to 19.33 kB raw, and from 6.53 kB to 6.62 kB gzip. The shell script moved from 95,485 bytes to 95,492 bytes. CSS sizes did not change.

The tradeoff is one high-priority photo on the first viewport, and lazy photos after it. The bundle cost is the attribute binding, not a new file.

### Updating and ready share one list

Before: the updating branch and the ready branch were separate, so a finished request remounted every card. After: one list covers both, keyed by `listing.id`. A grid test fails the image, sets the status to `ready` with the same id, and still sees the placeholder. An empty updating page still shows "Updating listings." and does not show the empty-state copy.

The tradeoff is a slightly denser template. The live region, `aria-busy`, and the dimmed list still follow the updating status only.

## K. Optimizations rejected

- Virtualization. The API allows at most 24 rows. A windowing library would add a dependency and a scroll container for a list this small.
- A response cache or in-flight dedupe map. The watch already collapses equal queries, aborts stale ones, and ignores late bodies. Back is allowed to refetch.
- `v-memo`, `shallowRef`, `markRaw`. No render was shown to be expensive enough to justify them.
- More route splits. The form, the grid, and the pager appear together.
- Inlining the listings route into the shell. Documented in section C. The extra request is small, and the boundary stays.
- `decoding="sync"` on the first image. It can block input for a large photo. `loading="eager"` is the change that addresses LCP.
- Eager-loading the second card as well. Unmeasured, and it would double the priority images.
- Replacing the skeleton shimmer. It runs only while the first load is open, and `prefers-reduced-motion` already disables it.
- Changing the placeholder files. They are already a few hundred bytes and are not on the first load.

## L. Remaining risks

- No populated-page LCP, CLS, or INP. The API was down.
- The local CLS of about 0.158 is the failure path only.
- The open mobile menu is taller than `--sticky-header-offset`. A focused control at the top of `main` can sit under that open menu. This pass did not change the menu and does not treat that as fixed.
- Keyboard behavior is still the manual procedure from phase 4.8. This pass did not walk it.
- A screen reader was not used. The updating text, the count, and the alerts were left as they were.
- Remote listing photographs can be large. This app does not resize them. `fetchpriority` and `loading` only change the request hint.

## M. Future checks

A browser trace of a successful `GET /api/listings` is the next useful measurement: LCP element, whether it is the first card, and CLS between the skeletons and the cards. That trace is also the point where an end-to-end test would start earning its cost. Until the API is up, the unit tests around one request, the debounce, the blocked query, and the image attributes are the regression net.
