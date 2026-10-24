# Phase 4.8 — Testing and accessibility

This note is for a React and TypeScript developer learning Vue 3. The listings screen already had 102 passing tests. This phase filled the journeys those tests did not cover, and fixed two accessibility defects the tests could not see: a control border that was too light, and two live regions announcing one page change.

This is an audit against WCAG 2.2 AA. It is not a certification.

## A. Testing strategy

The useful split is risk, not a coverage percentage.

| Layer | What it proves | What it misses |
| --- | --- | --- |
| Unit | A function, given this input, returns that output. No Vue. | Wiring between the form, the URL, and the request. |
| Component | One component's markup and events, with props. | The router and the fetch together. |
| Composable | The request lifecycle, with `getListings` mocked. | What the page announces. |
| Feature integration | `ListingsView` with a real memory-history router and the real composable. The mock is `getListings`, the network boundary. | CSS contrast, real focus movement, the ASP.NET process. |
| Browser | Layout, overflow, and the running dev server. | A passing assertion in CI. |

Vitest runs in jsdom from `apps/vue-web/vite.config.mts`. There is no separate test setup file. `flushPromises` drains the microtask queue. `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` fakes the debounce and leaves promises real, so `await router.push` still finishes.

There is no end-to-end suite. Playwright would be the point to add one, once a seeded API can be started in CI. Adding it for a page whose API is still down would not run.

## B. Unit testing

`listing-query.spec.ts`, `parseDraftPrice`, `get-json.spec.ts`, `get-listings.spec.ts`, `to-business-listing.spec.ts`, and `listings-error-message.spec.ts` are pure tests. They do not mount Vue.

They already cover empty versus zero, decimals, the price ceiling, malformed and inverted ranges, unknown categories and sorts, encoding of `a&b=c`, a body that is not a page, a summary missing `city`, and null cash flow. Those cases were not copied into new files.

## C. Component testing

Vue Test Utils `mount` renders one component. Assertions prefer the accessible name and the role: the search label, `aria-invalid`, the pagination nav, "Try again". A class selector is used when the role would be ambiguous, such as `.updating` next to another status.

`AppHeader.spec.ts` checks the current page with and without a query string. `ListingCard.spec.ts` checks the image fallback. `ListingsGrid.spec.ts` checks loading, empty, error, retry, and the updating announcement. `NotFoundView` is covered through `router.spec.ts`, which mounts the real router and the shell.

No snapshot of a component tree was added. A snapshot would fail on copy edits that are not defects.

## D. Composable testing

`useListings` is mounted inside a tiny host component so `onUnmounted` runs. The tests pass a `ref` as the source. They do not mount the page.

Deferred promises hold a response until the test resolves it. That is how a late response is proved not to overwrite a newer query, and how unmount is proved not to record an error.

The transitions covered are: loading to ready, loading to empty, loading to error, retry ignored while loading and while updating, retry after error, a newer query aborting the previous one, unmount, updating that keeps the old rows, an update that fails and drops them, blocked with no request, and blocked becoming a valid query that then loads.

## E. Integration testing

`ListingsView.spec.ts` mounts the real view, the real form, the real grid, the real pager, and the real composable. `createMemoryHistory` is the router. `vi.mock` replaces `getListings` only.

That is why a search test can type into the input, advance 300ms, and see both the URL and the card title change. Mocking `useListings` would skip the watch that decides to fetch. Mocking the form would skip the debounce.

The new journeys are: search results then Back restores the previous cards and clears the field; minimum and maximum price leave on one request; clearing an inverted price link starts the request that the link had blocked. The older tests still cover category, sort, invalid drafts, page focus, and retry.

## F. Async testing

Three clocks show up.

`setTimeout` is the debounce. Fake it, or the test waits on the wall clock and races CI.

`Promise` is the fetch. Leave it real. `flushPromises` waits until the mocked `getListings` has resolved and Vue has rendered.

A deferred promise is a fetch you control. Resolve the first one after the second has started, and the stale title must not appear.

`nextTick` is enough when the only work is a watcher that Vue scheduled. It is not enough when the watcher awaits a request. That needs `flushPromises`.

The fake-timer call lists `setTimeout` and `clearTimeout` only. Faking every timer also freezes Vue's scheduler, and the test hangs.

## G. Accessibility

The criteria below are the ones that apply to this screen. Passing them here is not a WCAG certificate.

| Criterion | What was checked | Result |
| --- | --- | --- |
| 1.3.1 Info and relationships | One `main`, header and footer landmarks, labeled controls, heading levels `h1` then `h2` | Holds |
| 1.3.2 Meaningful sequence | DOM order is skip link, header, main, footer. The form order is search, category, prices, sort, buttons | Holds |
| 1.4.3 Contrast | Body `#141920` and muted `#3a4553` on `#f3f5f8`, white on `#1d4ed8` | Holds for text. Computed ratios are in the token comment and this note, not from a contrast tool in the browser |
| 1.4.10 Reflow | 320px width in the browser: no horizontal scroll | Holds for the widths that were opened. See section J |
| 1.4.11 Non-text contrast | Input border `#b7c2d0` on white was about 1.8:1 | Fixed. Controls use `#7d8b9a`, about 3.5:1 |
| 2.1.1 Keyboard | Native controls, no custom key trap in the form | Markup supports it. Real Tab was not confirmed. See section H |
| 2.1.2 No keyboard trap | The mobile menu is a disclosure, not a dialog. Escape closes it and returns focus to the toggle | Covered by the header tests for Escape. Not re-walked with a physical keyboard in this phase |
| 2.4.3 Focus order | Source order, and `display: none` on the closed mobile nav so those links are not tab stops | Holds in markup |
| 2.4.7 Focus visible | `:focus-visible` is a 2px `#1d4ed8` outline, offset 3px | Holds. Programmatic `focus()` does not show `:focus-visible` |
| 2.4.11 Focus not obscured | Sticky header could cover a focused control | `scroll-padding-top` and the results heading use `--sticky-header-offset` (4.5rem). The open mobile menu is taller than that and is a residual risk |
| 2.5.8 Target size | Buttons and inputs use `min-height: 2.75rem` (44px), above the 24px minimum | Holds |
| 3.3.1 Error identification | Text, not color alone. `aria-invalid` on the failed fields | Holds |
| 3.3.2 Labels or instructions | Every filter control has a `<label for>` | Holds |
| 4.1.2 Name, role, value | Native inputs, buttons, and selects. Pagination is a `nav` | Holds |
| 4.1.3 Status messages | See section I | The page-change double announcement was removed |

`axe-core` was not added. In jsdom it does not compute contrast or move real focus, which are the two checks this phase cared about. The role and name checks are already assertions. An automated axe run would not have been evidence of 1.4.11 or 2.1.1.

## H. Keyboard testing

Synthetic Tab in the Cursor browser, in Phase 4.7 and again as a known limit, does not move `document.activeElement`. That event is not proof.

What was verified without claiming a keyboard pass:

- The skip link points at `main#main-content`, which has `tabindex="-1"`.
- The closed mobile nav is `display: none`, so its links are not tab stops. At `48rem` the menu button is hidden and the links are shown.
- Escape on the open menu is tested in `AppHeader.spec.ts`.
- Search is `type="submit"`. Clear filters and pagination are `type="button"`.
- Selects are native `<select>` elements.
- Focus moves to `#results-heading` only after Previous or Next, in the view test, via `element.focus()`. That test proves the handler, not that Tab reached the button.

### Manual keyboard QA

Run the app at `http://localhost:4201/listings` and use the physical keyboard.

1. Tab from the address bar. The skip link should appear. Enter should move focus to `main`.
2. Tab through the brand, the nav (or Menu, then the links), search, category, both prices, sort, Search, and Clear filters when it is enabled.
3. Shift+Tab should reverse that order. Focus should stay visible and not sit entirely under the sticky header.
4. Enter in a field should submit the form once. The page should not reload.
5. On a narrow window, open Menu, press Escape, and confirm focus returns to Menu.
6. With more than one page of results, Tab to Next page, press Enter, and confirm focus lands on "Listing results".
7. Type `-5` in the minimum price, wait, and confirm the error is announced without moving focus.

Until that list is walked, keyboard behavior is not signed off.

## I. Screen-reader behavior

Landmarks: skip link, banner header, `nav` named Primary, `main`, content info footer, `nav` named Footer, and on the listings page a `nav` named Pagination.

The page `h1` is "Businesses for Sale". The form and the results are `h2`. There is no skipped level.

Loading is one visually hidden `role="status"`: "Loading listings." The skeletons are `aria-hidden`.

Updating on a single page is `role="status"`: "Updating listings." When the pager is on screen, that paragraph keeps the words for sighted users and drops the role. The pager's one polite, atomic paragraph says "Loading page N" and then "Page N of M". Typing in the search box does not announce. The count is a status only after a successful total.

Errors and the inverted-price message are `role="alert"`. The field error is also `aria-describedby` on the invalid inputs. The results alert for a bad link is not repeated on the inputs, so it is not announced twice.

The blocked state does not announce a load. The grid is not mounted.

A screen reader was not run in this phase. The roles and names above are what the markup exposes.

## J. Responsive testing

Breakpoints in the tokens are 48rem, 64rem, and 90rem. The listing grid becomes two columns at 48rem. The filters sit beside the results at 64rem.

Checked in the browser on the running dev server, with the API still down, so the results column was the connection error or the inverted-price alert:

| Width | What was seen |
| --- | --- |
| 320px | No horizontal scroll. The menu button is the navigation. The form is full width and stacked. |
| 390px | Same, checked again in this phase. |
| 768px | The menu button is gone. Home and Listings are in a row. The form is still stacked above the results, because 768px is under 64rem. |
| 1280px | The filter column is 320px beside the results. Checked in Phase 4.5 and the layout rules have not changed. |

940px was checked in Phase 4.5 and stacks, which is correct. 200% zoom was not checked. Do not treat the table as every viewport.

## K. React comparison

Vue Test Utils `mount` is closer to `render` from React Testing Library than it looks, and worse when tests query `.updating` instead of the role. Prefer `getByRole` in React and `find('[role="status"]')` or the accessible name here. Both libraries encourage asserting what the user sees.

Vitest is the runner. Jest is the React habit. The fake-timer and mocked-fetch ideas are the same. `flushPromises` is the Vue stand-in for `waitFor` when you know the mock resolves immediately. `waitFor` retries. `flushPromises` does not. A test that needs a retry has a race. These tests do not.

A composable test mounts a host so the lifecycle runs. A React hook test uses `renderHook`. Neither mounts the page. The integration test is the one that does, in both stacks.

## L. Angular comparison

Angular's `TestBed` and `ComponentFixture` are `mount`. `HttpTestingController` expects a request and flushes a body. This app mocks `getListings`, one level above `fetch`, so the test does not rebuild HTTP. `get-json.spec.ts` is the layer that stubs `fetch`.

Angular accessibility for this form is the same labels, the same alert, and `debounceTime(300)`. The Vue tests advance a fake timer instead of `fakeAsync` and `tick`.

`router.navigate` in an Angular test is `router.push` on a memory history. Both are the Back test.

## M. Audit findings

Fixed:

- Interactive borders now use `--color-control-border` (`#7d8b9a`) so the edge of an input or an outline button clears 3:1 on white.
- `scroll-padding-top` on `html`, and the same offset on the results heading, keep a focused control from sitting under the closed sticky header.
- A page change no longer exposes two polite live regions. The pager speaks. "Updating listings." stays visible.

Not changed, on purpose:

- The existing 102 tests were not restyled.
- `axe-core` was not installed.
- Card borders stay `#b7c2d0`. A card is a group of text, not a control whose only affordance is that border.
- The open mobile menu can be taller than `--sticky-header-offset`. It is in normal flow and sticky. A focused control at the top of `main` can slip under it. Closing the menu, which Escape already does, is the practical mitigation.

## N. Future testing strategy

Add a browser end-to-end test when the API and PostgreSQL can start from CI without a manual Docker Desktop session. The first scenario is the one this phase still cannot prove: `GET /api/listings` returns 200, the cards render, search narrows them, and Back restores them. Playwright against `nx serve vue-web` and the API is the tool. It is also the place to press a real Tab key.

Until then, Vitest covers the logic and the component wiring, and the manual keyboard list in section H covers what jsdom and synthetic keys do not.

A screen reader pass, VoiceOver or NVDA, is the check for the live regions. The markup is ready for that pass. It has not been done.
