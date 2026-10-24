# Testing and accessibility

## Purpose

The Angular suite checks the listings journeys without a browser and without PostgreSQL. Accessibility is built into the templates. This note lists what the specs actually cover and what they do not prove.

## Architecture

Specs sit next to the file they test. The runner is `@angular/build:unit-test` (Vitest) via `nx test angular-web`. `TestBed.configureTestingModule` creates the component. `provideRouter` supplies a router. `provideHttpClientTesting` and `HttpTestingController` supply HTTP. `fakeAsync` and `tick` advance the form debounce.

| Spec | What it locks |
| --- | --- |
| `app.spec.ts` | Skip link and landmarks |
| `app.routes.spec.ts` | Redirect, listings, wildcard |
| `header.spec.ts` | Disclosure, Escape, focus leaving the header |
| `listing-query.spec.ts` | Parse and serialize |
| `listing-filters.spec.ts` | Debounce, errors, clear |
| `business-listings.service.spec.ts` | Query string and a bad 200 |
| `listings-error-message.spec.ts` | Sentences |
| `to-business-listing.spec.ts` | Mapping |
| `business-listing-card.spec.ts` | Fields, currency, image fallback |
| `business-listings-grid.spec.ts` | Loading, empty, error, retry |
| `listing-pagination.spec.ts` | Previous, Next, disabled while pending |
| `listings-page.spec.ts` | Router, form, and one flushed request |

The phase 4.10 review ran `nx test angular-web` and recorded 69 passing tests. This documentation pass did not re-run the suite. Do not treat 69 as a quality score. The Vue suite is larger because the query, the fetch client, and the composable each have their own file.

## Implementation

A page test navigates with the harness, expects one request on `HttpTestingController`, and flushes a JSON body. The component does not know the body was canned. `switchMap` cancellation is covered by starting a second query before the first is flushed.

Accessibility in the templates:

- One `main#main-content` with `tabindex="-1"`.
- Skip link `href="#main-content"`.
- Header `nav` has `aria-label="Primary"`. The current listings link uses `aria-current="page"`.
- Filter controls have visible labels. Errors use `aria-invalid` and `aria-describedby`.
- Loading is a visually hidden `role="status"`. Skeletons are `aria-hidden`.
- The connection failure and the inverted price use `role="alert"`.
- The pager is a `nav` named Pagination. Its status text is a polite live region.
- Card images use `alt=""`.
- `:focus-visible` outlines and `prefers-reduced-motion` live in the global styles.
- After Previous or Next, the page focuses the results heading so a disabled button does not drop focus on the document.

The open mobile menu closes when focus leaves the header. The spec dispatches `FocusEvent`. A physical Tab key was not automated. The phase 4.10 browser session found that programmatic `element.focus()` in that environment did not emit `focusout`, so the live behavior of that handler was not confirmed in the browser.

Results heading `scroll-margin-top` is `var(--space-7)`. The Vue heading uses a larger sticky offset. Whether the Angular heading sits under the closed header was not measured in this pass.

There is no axe run in this project. A green unit suite is not a WCAG claim.

## Angular concepts

`TestBed` is the injector and the component factory. `fixture.whenStable()` waits for the current turn. `HttpTestingController.expectOne` fails the test if the URL was not requested. `fakeAsync` keeps debounce tests off the real clock.

`OnPush` components still refresh in tests when an input or a signal changes and the test calls `whenStable` or `detectChanges`, because the signal write marks the view.

## React comparison

`TestBed.createComponent` is `render` from Testing Library. `HttpTestingController` is a mocked `fetch` plus `waitFor`. Assert the accessible name and the text. The Angular specs mostly do that, with some class checks on the header (`is-open`) where the disclosure state is a class.

## Vue comparison

Vue mounts with Vue Test Utils and a memory-history router, and it mocks `getListings` instead of flushing `HttpClient`. The journeys overlap: one request, debounce, blocked price, retry, image fallback. See [Vue testing](../../vue-web/docs/phase-4.8-testing-accessibility.md).

## Engineering decisions

Page tests use the real filter, grid, and pager. Mocking those children would not catch a missing output.

No end-to-end runner was added. `nx.json` leaves the Angular generator on `e2eTestRunner: none`. A browser test becomes worth it when the API is up and the question is "did both clients render the same seeded page?"

## Testing

The table above is the suite. Gaps that remain: physical keyboard order, a screen reader, 200% zoom, and a live API. Those are listed again in the [phase 4.10 review](../../vue-web/docs/phase-4.10-final-review-angular-comparison.md).

## Key takeaways

Flush one request and read the page text. `fakeAsync` is how the debounce stays deterministic. Accessible names in the template are the assertions that matter. They are not a conformance certificate.
