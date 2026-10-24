# Phase 4.10 — Final review, Angular comparison, and integration

This is a review of the monorepo as it stands. The Angular client, the Vue client, and the ASP.NET Core API are implemented. A live round trip from either browser through PostgreSQL was not completed in this phase, because the Docker engine was not running.

## A. Project overview

The repository is an Nx workspace with one root `package.json`. Angular and Vue are dependencies of that workspace. Neither frontend imports the other. The API is a .NET solution invoked by Nx `run-commands` targets. There is no shared TypeScript contract package. Each client types the JSON it receives and checks the shape at runtime.

| App           | Role                                            | Dev URL               |
| ------------- | ----------------------------------------------- | --------------------- |
| `angular-web` | Angular 22 client                               | http://localhost:4200 |
| `vue-web`     | Vue 3 client                                    | http://localhost:4201 |
| `api`         | ASP.NET Core, `net10.0`                         | http://localhost:5000 |
| PostgreSQL 17 | Compose service `business-marketplace-postgres` | localhost:5432        |

`/` redirects to `/listings` in both clients. Unknown paths render a not-found view. `GET /api/listings` is the list contract. `GET /api/listings/{id}` exists on the server and has no client screen.

Ports are fixed: Angular `project.json` uses 4200, Vue `vite.config.mts` uses `strictPort: 4201`, and the API serve target binds `http://localhost:5000`. Development CORS allows those two frontend origins.

`dist/`, `coverage/`, `bin/`, and `obj/` are gitignored. This phase also ignores `.env` and `.env.*`, with an exception for `.env.example`. The development database password in `appsettings.Development.json` and `docker-compose.yml` is the documented local default `postgres`, not a production secret. No production credential was found in the tree.

The root README had still described Vue as an unconnected starter. That description was updated to match the listings client.

## B. Architecture comparison

| Concern       | Angular                                                               | Vue                                                                                       | React equivalent                         | Tradeoff                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap     | `bootstrapApplication` and `app.config.ts` providers                  | `createApp` in `main.ts`, then `app.use(router)`                                          | `createRoot` and a provider tree         | Angular registers `HttpClient` and `API_BASE_URL` in the injector. Vue imports the router and reads `import.meta.env` in a function. React would pass both through context or a module. |
| Routing       | `provideRouter`, lazy `loadComponent` for listings and not-found      | `createRouter`, dynamic `import()` for the same two views                                 | `createBrowserRouter` and `lazy`         | Both keep the shell in the first chunk and the listings screen in a second chunk.                                                                                                       |
| Shell         | `App` composes skip link, header, `router-outlet`, footer             | `App.vue` composes the same landmarks and `RouterView`                                    | A layout route with `<Outlet>`           | The feature page does not own the header in either app.                                                                                                                                 |
| Feature files | `features/listings` with pages, components, services, models          | `features/listings` with views, components, composables, api, models                      | A feature folder of components and hooks | The folder split follows the framework: a service and a page in Angular, a composable and a view in Vue.                                                                                |
| Styling       | Global tokens plus encapsulated SCSS                                  | Global tokens plus scoped CSS                                                             | CSS modules or a shared stylesheet       | Tokens match closely. Component styles do not try to share a file.                                                                                                                      |
| Dependencies  | `inject()` and `providedIn: 'root'`                                   | Plain imports                                                                             | Hooks close over modules, or context     | One listings service is enough. A store was not added on either side.                                                                                                                   |
| State         | Signals for UI, the URL for the committed query, RxJS for the request | `ref` and `computed` for UI, the URL for the committed query, one `watch` for the request | `useState`, the URL, and a data hook     | The address bar is the source of truth in both clients.                                                                                                                                 |
| HTTP          | `HttpClient` returning an `Observable`                                | `fetch` in `getJson`, narrowed from `unknown`                                             | `fetch` inside a hook or query library   | Both map a DTO to a card model and reject a 200 that is not a page.                                                                                                                     |
| Errors        | Status mapped to a short sentence. The body is not rendered.          | The same sentences in `listings-error-message.ts`                                         | The same mapping in the hook             | Users see the same words for a network failure and a bad payload.                                                                                                                       |
| Tests         | `TestBed`, `HttpTestingController`                                    | Vitest and Vue Test Utils, with `getListings` mocked at the feature boundary              | Testing Library and a mocked fetch       | Angular's HTTP tests sit on `HttpClient`. Vue's HTTP tests sit on `fetch`.                                                                                                              |

## C. Functional parity matrix

"Verified by tests" means both suites assert the behavior. It does not mean a seeded API was on screen. The API was down, so populated cards, search hits, and page changes were not compared in the browser this phase.

| Feature                   | Angular                                                                                                 | Vue                                                                                                                         | Status                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Header                    | Brand, Home, Listings. Listings carries `aria-current="page"` on `/listings`, including a query string. | Same path rule. Home is unmarked because it shares the URL.                                                                 | Verified by header tests.                                                                                           |
| Mobile navigation         | Disclosure, `display: none` when closed, Escape returns focus to the toggle, navigation closes it.      | Same.                                                                                                                       | Verified by header tests.                                                                                           |
| Skip link                 | `href="#main-content"`, `main` is `tabindex="-1"`.                                                      | Same.                                                                                                                       | Verified by shell tests. Physical Tab was not walked.                                                               |
| Responsive layout         | Menu hidden from 48rem. Filters beside results from 64rem.                                              | Same breakpoints.                                                                                                           | Verified earlier on Vue at 320, 390, 768, and 1280. Angular layout was reviewed in SCSS, not remeasured this phase. |
| Cards                     | Title, category, location, description, three figures.                                                  | Same fields and heading level.                                                                                              | Verified by card tests.                                                                                             |
| Category labels           | Display labels such as "Professional services".                                                         | Same labels.                                                                                                                | Verified by tests and the shared option lists.                                                                      |
| Currency                  | Whole USD via `CurrencyPipe` digits `1.0-0`.                                                            | One shared `Intl.NumberFormat` with the same digits.                                                                        | Verified by card tests (`$875,000`).                                                                                |
| Missing money             | "Not disclosed". Asking price is always present.                                                        | Same.                                                                                                                       | Verified by card tests.                                                                                             |
| Image fallback            | Local SVG by category. `alt=""`.                                                                        | Same files and empty alt. A failed URL stays failed until `imageUrl` changes.                                               | Verified by card tests.                                                                                             |
| Loading                   | Visually hidden "Loading listings." and six skeletons.                                                  | Same.                                                                                                                       | Verified by grid tests.                                                                                             |
| Empty                     | "No businesses are listed yet." or "No businesses match these filters."                                 | Same sentences.                                                                                                             | Verified by page tests.                                                                                             |
| Error                     | "Listings could not be loaded. Check your connection and try again."                                    | Same sentence.                                                                                                              | Verified by error-message tests. Seen on the Vue dev server while the API was down.                                 |
| Retry                     | Try again starts one new request and ignores a second click while one is open.                          | Same.                                                                                                                       | Verified by page and composable tests.                                                                              |
| Search                    | 300ms debounce, trimmed, max 200 characters, resets the page.                                           | Same timer and limit.                                                                                                       | Verified by filter and view tests.                                                                                  |
| Category                  | Applies on change. Unknown values are dropped from the URL.                                             | Same.                                                                                                                       | Verified by query and view tests.                                                                                   |
| Minimum and maximum price | Empty is "no bound". `0` is a bound. Max is 1,000,000,000.                                              | Same grammar in `parseDraftPrice`.                                                                                          | Verified by query tests.                                                                                            |
| Invalid price             | The draft stays off the URL. The field is `aria-invalid` and points at `listing-filter-error`.          | Same association.                                                                                                           | Verified by filter tests.                                                                                           |
| Inverted range            | The URL can hold it. No request. An alert explains the order.                                           | Same, with status `blocked` so the grid is not mounted as a loading state.                                                  | Verified by page tests.                                                                                             |
| Sort                      | Newest omits sort keys. Price and revenue map to `AskingPrice` or `AnnualRevenue` plus a direction.     | Same query string.                                                                                                          | Verified by `get-listings` and service tests.                                                                       |
| Pagination                | Previous and Next. A page past the end can step backward. Buttons wait while a request is open.         | Same.                                                                                                                       | Verified by pagination and view tests.                                                                              |
| URL sync                  | The router is the committed query. Defaults are omitted.                                                | Same. A canonical rewrite does not fetch twice.                                                                             | Verified by view tests.                                                                                             |
| Back and Forward          | Restores the query and the form.                                                                        | Same, including the previous cards in the Vue view test.                                                                    | Verified by tests. Not exercised against the API.                                                                   |
| Clear filters             | Clears search, category, and prices. Keeps sort. Does not wait for the debounce.                        | Same.                                                                                                                       | Verified by filter tests.                                                                                           |
| Announcements             | Loading, count, pager "Loading page N", and alerts are live regions.                                    | The pager is the only polite region during a page change. The updating sentence stays visible without a second live region. | Known difference, covered by Vue grid tests. Angular still has its own updating copy.                               |
| Focus after paging        | Results heading is focused. Filter typing does not move focus.                                          | Same. Vue also sets `scroll-margin-top` to `--sticky-header-offset` (4.5rem). Angular uses `--space-7` on that heading.     | Behavior verified by tests. The offset difference is from code review.                                              |
| Not-found                 | Lazy route, its own title.                                                                              | Lazy route, title "Page not found".                                                                                         | Verified by router tests.                                                                                           |
| First image               | Every card uses `loading="lazy"`.                                                                       | The first card uses `loading="eager"` and `fetchpriority="high"`. The rest stay lazy.                                       | Intentional Vue change from phase 4.9. Angular was left as it was.                                                  |

## D. State management

### Angular

`menuOpen` is a `signal` on the header. The template reads it, so `OnPush` still updates when it changes. Derived page labels are `computed`. The committed filters are the router URL. `BusinessListingsService.getListings` returns an `Observable` and does not subscribe. The page uses `switchMap`: a newer query unsubscribes, and `HttpClient` aborts the previous request. `takeUntilDestroyed()` ends the navigation subscription that closes the menu. There is no `effect()` writing the URL, and no NgRx store. One boolean and one request stream do not need one.

### Vue

`menuOpen` and the filter draft are `ref`s. `filtersActive`, the parsed query, and the listings snapshot are `computed`. `useListings` watches the committed query. `load` aborts the previous `AbortController` and ignores a body whose `generation` is stale. `onUnmounted` aborts again, for the case where the body already resolved and the assignment is still queued. `provide` / `inject` is unused. The router is passed in `main.ts`. There is no Pinia store. The same rule as Angular: the URL is shared state, and the screen does not have a second copy.

### React

`useState` would hold `menuOpen` and the price draft. `useMemo` would hold the parsed query. `useEffect` would start the request and return a cleanup that aborts it. That cleanup is the piece Vue's `onUnmounted` and Angular's `takeUntilDestroyed` already are. A custom hook named like `useListings` would be the composable. Context would be the Angular injector if a distant component needed the same client. Nothing in this screen is distant enough.

A global store becomes useful when two routes edit one draft that is not in the URL, or when many features subscribe to a session. This app has one route that matters, and the URL already holds the query. NgRx, Pinia, and Redux were not added.

## E. Forms

Angular builds a `FormGroup` of `FormControl`s. Text and prices are strings. `valueChanges` with `debounceTime(300)` commits search and price. Selects emit immediately. Validators are local functions, not only `Validators.required`, because an empty price is valid and means "no bound". Cross-field order is checked when a commit is attempted. The URL is updated by the page, not by the form.

Vue binds search and prices with `v-model`. There is no `.trim` and no `.number`, so a trailing space and an empty field survive until commit. One `setTimeout` of 300ms covers the text fields. Selects use `@change`. `parseDraftPrice` is the shared grammar: empty is `null`, `0` is a bound, values above 1,000,000,000 fail, and an inverted pair blocks the request. The form emits the commit. It does not call `fetch`.

React would use controlled inputs: `value` plus `onChange`, which is what `v-model` expands to, and what a `FormControl` tracks internally.

Neither form uses a touched flag. The error shows when a commit is refused, because the debounce has already given up and the URL did not change. Clear cancels the timer, empties search and prices, and keeps the current sort.

Both clients accept the same categories (`Restaurant`, `Retail`, `Technology`, `Healthcare`, `Manufacturing`, `ProfessionalServices`, `Other`) and the same sorts (`newest`, `price-asc`, `price-desc`, `revenue-desc`). Page size defaults to 6 and is capped at 24. A page past the end is still requested so Previous can move back.

## F. API integration

The contract is `GET /api/listings` with `search`, `category`, `minPrice`, `maxPrice`, `sortBy`, `sortDirection`, `page`, and `pageSize`. Defaults are omitted from the query string. Both clients point at `http://localhost:5000` in development: Angular through the `API_BASE_URL` token, Vue through `VITE_API_BASE_URL` or that same fallback.

Angular's service builds `HttpParams` and types the call as `Observable<BusinessListingPageResponse>`. The generic is a compile-time claim. The service still checks that `items` is an array before mapping. Vue's `getJson` returns `unknown`. `getListings` narrows a page and throws if the body is not one. Mapping to the card model happens before the composable sees a row.

Cancellation is `switchMap` plus `HttpClient` on the Angular side, and `AbortSignal` on the Vue side. Retry is a new emission or a new `retryNonce`. A 400 from an inverted range is avoided in the client. A network failure and a non-JSON body become the sentences in the error-message modules. Neither client prints the problem-details body.

CORS in Development allows `http://localhost:4200` and `http://localhost:4201`. The API tests name both origins. That is code and test evidence. It was not observed on a running server this phase. Preview on port 4300 is outside that list, which is why production-preview checks in phase 4.9 did not expect a successful cross-origin response.

## G. Testing comparison

Angular uses `TestBed`, `provideRouter`, and `HttpTestingController`. A listings-page spec can accept a route, flush one request, and read the fixture text. `fakeAsync` and `tick` advance the 300ms form debounce.

Vue uses `mount` and a memory-history router. `ListingsView` specs mock `getListings`, not the child components, so the form, the grid, and the pager are the real ones. `vi.useFakeTimers` fakes `setTimeout` only, so Vue's promises still flush. `get-json.spec.ts` is the suite that stubs `fetch`.

Counts are not the comparison. Angular has 69 tests across 12 files. Vue has 112 tests across 16 files. The Vue number is higher because the query grammar, the fetch client, and the composable each have their own file. The Angular page spec covers several of those journeys in one harness.

Gaps that remain, in both apps:

- No test drives a real browser Tab or Shift+Tab.
- No test runs against a live `GET /api/listings`.
- Screen-reader output is not asserted.
- Angular does not assert `loading="eager"` on the first card, because that behavior is Vue-only.

This phase added four tests: the open menu closes when focus leaves the header, and it stays open when focus moves between header controls, in each client. Existing suites were not rewritten.

## H. Accessibility review

Both shells have one `main`, a skip link, a labeled primary nav, an `h1` then the filter `h2` then the results `h2`, and card titles under that. Filter fields have visible labels. Invalid fields set `aria-invalid` and `aria-describedby`. Errors and the inverted-price message use `role="alert"`. Loading uses a polite status that is visually hidden. `prefers-reduced-motion` shortens animation, including the skeleton shimmer. Control borders on the Vue side use `--color-control-border` from phase 4.8. Buttons and inputs use a 44px minimum.

The open mobile menu was a confirmed focus risk. The header is sticky, and the open disclosure makes that bar about 169px tall on a 390px viewport, which is more than the closed-bar offset. A control at the top of `main` can sit under it. Both headers now close the disclosure on `focusout` when the next focus is outside the header. Moving among the brand, the toggle, and the links does not close it. Escape still returns focus to the toggle. Navigation still closes it. The tests dispatch `FocusEvent`. That is the check that ran.

In the Vue dev server, `element.focus()` on the search field did not emit `focusout` at all, so that session is not evidence the live page closes the menu. Physical Tab, a screen reader, and 200% zoom were not run. This review is not a WCAG conformance claim.

Angular's results heading still uses `scroll-margin-top: var(--space-7)`. Vue uses the larger sticky offset. That difference was not remeasured.

## I. Performance comparison

Production builds from this phase. Angular prints "Estimated transfer size". Vue prints gzip from Vite. Those columns are not the same compressor, so they are shown separately.

Angular `nx build angular-web` (production):

| Chunk                   |       Raw | Estimated transfer |
| ----------------------- | --------: | -----------------: |
| Initial framework chunk | 276.13 kB |           76.03 kB |
| `main`                  |   6.85 kB |            1.85 kB |
| Initial extra chunk     |   1.14 kB |          577 bytes |
| Global `styles`         |   1.54 kB |          572 bytes |
| Initial total           | 285.66 kB |           79.03 kB |
| Lazy `listings-routes`  |  66.87 kB |           15.52 kB |
| Lazy `not-found-page`   | 965 bytes |          965 bytes |

Vue `nx build vue-web`:

| Chunk            |      Raw |     Gzip |
| ---------------- | -------: | -------: |
| Shell script     | 95.65 kB | 36.82 kB |
| Listings script  | 19.33 kB |  6.62 kB |
| Not-found script |  0.53 kB |  0.38 kB |
| Shell CSS        |  5.18 kB |  1.55 kB |
| Listings CSS     |  7.02 kB |  1.51 kB |
| Not-found CSS    |  0.22 kB |  0.16 kB |

Angular's initial chunk includes the framework runtime. Vue's runtime is inside the 95.65 kB shell. Angular component SCSS is bundled into the JavaScript chunks, so the 1.54 kB CSS file is only the global sheet. Vue extracts component CSS. A smaller Vue file is not a claim that Vue paints sooner. The listings route is lazy in both, which adds one request on the only primary page and keeps the not-found view out of the first download.

Vue still eager-loads only the first card image. Angular lazy-loads every card image. Remote photographs are not resized by either client. The skeleton-to-error shift measured in phase 4.9 (about 0.158 on a failed load) is still the failure path only.

## J. Integration verification

`docker info` failed:

`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`

The engine is not running. Compose was not retried. PostgreSQL was not started. The API was not served. `GET /api/listings` was not observed returning 200. Neither browser rendered seeded rows. Live integration is blocked.

API unit tests that do not need Docker passed: 66. The integration filter (`Category=Integration`) was not run. Those tests start their own PostgreSQL with Testcontainers and also need the engine.

When Docker Desktop is running, this is the check:

1. `docker info` prints a server version.
2. `docker compose up -d`
3. `dotnet tool restore`
4. `dotnet tool run dotnet-ef database update --project apps/api/BusinessMarketplace.Api`
5. `pnpm exec nx seed api` (stop `nx serve api` first if it is running)
6. `pnpm exec nx serve api`
7. `GET http://localhost:5000/api/health` returns 200, then `GET http://localhost:5000/api/listings` returns 200 and a page of Active rows.
8. Open http://localhost:4200/listings and http://localhost:4201/listings. The first titles and totals should match.
9. Search, category, min and max price, sort, and page 2 should change the query string and the rows together.
10. Back should restore the previous query. An inverted `minPrice` / `maxPrice` should show the order alert and should not be sent. Try again, after a stopped API, should recover when the API is back.
11. `pnpm exec nx test-integration api`

## K. Architectural tradeoffs

The URL is the committed query so Back and Forward are the history of the search. A second store would drift from the address bar.

Invalid drafts stay in the form and off the URL. Sending them would turn a typing mistake into a 400 and a history entry.

The listings view is lazy even though `/` redirects there. The extra request is the listings chunk (Vue 6.62 kB gzip, Angular about 15.52 kB estimated transfer). The not-found screen stays out of the first load. Inlining the listings route was considered in phase 4.9 and left as a boundary.

Vue does not lazy-load the first card image. Angular still does. Changing Angular was out of scope for a review that was not trying to make the templates match.

`provide` / `inject` and a root Angular service are the same idea. This feature is small enough that Vue can import `getListings` directly.

No virtualization, response cache, NgRx, Pinia, or component library was added. The page size cap is 24.

## L. Remaining risks

| Priority | Risk                                                                                                                                     | Next action                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| High     | Live API and seeded data are unverified.                                                                                                 | Start Docker Desktop, then follow section J.                                                                                                     |
| High     | Physical keyboard order is unverified. Synthetic Tab in this browser has not moved focus, and `element.focus()` did not emit `focusout`. | Walk Tab, Shift+Tab, Enter, Space, and Escape on a 390px viewport in both apps. Confirm the open menu closes when focus enters the search field. |
| Medium   | No screen-reader pass.                                                                                                                   | Confirm the loading status, the count, the pager, and the price alert with one reader.                                                           |
| Medium   | 200% zoom was not measured.                                                                                                              | Check 320px CSS width and 200% zoom for overflow on the figures and the pager.                                                                   |
| Medium   | Angular pagination focus uses a smaller `scroll-margin` than Vue.                                                                        | Measure a focused results heading under the sticky header and align the offset if it is covered.                                                 |
| Low      | Skeleton-to-error layout shift on a failed load.                                                                                         | Revisit only after a successful load is measured. The skeletons match the card media box so a successful replacement can stay still.             |
| Low      | Remote images can be large.                                                                                                              | A later change could set sizes or a host policy. Do not add an image service without a requirement.                                              |
| Low      | API integration tests were not run.                                                                                                      | `pnpm exec nx test-integration api` after Docker is up.                                                                                          |

## M. Learning summary

The same screen does not want the same file layout. Angular's page subscribes to a service stream and lets `switchMap` be the cancellation policy. Vue's view watches the route and lets one composable own the `AbortController`. React would put that policy in a hook cleanup. The policy is the thing to compare: one request per committed query, a stale body cannot win, and an invalid draft does not become a request.

Signals and `computed` are closer to Vue's `ref` and `computed` than either is to a React render. React rerenders the children of a state update unless you opt out. Vue and an Angular signal template rerun what they read. That is why this grid did not grow a `memo` or `v-memo`.

`FormControl` is a controlled input with a subscription channel. `v-model` is a controlled input without a form class. Both needed an explicit debounce and an explicit "empty is not zero" rule, because the platform widgets do not know the API's numeric bounds.

The bundle sizes are mostly the frameworks and the decision to ship component CSS inside JavaScript or beside it. They are a poor scoreboard. The useful performance facts are the lazy listings chunk, the single debounced request, and which image is allowed to be the first paint.

Topic notes for the other two apps: [Angular docs](../../angular-web/docs/README.md) and [API docs](../../api/docs/README.md).
