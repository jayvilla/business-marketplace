# Performance and final architecture review

## Purpose

This note records how the Angular client is split and what a production build reported. It does not claim the client is faster or slower than Vue.

## Architecture

The initial bundle is the shell: Angular runtime, router, header, footer, and global styles. `loadChildren` puts `ListingsPage`, the form, the grid, the card, and `HttpClient` usage that the page pulls in into `listings-routes`. `loadComponent` puts `NotFoundPage` in its own chunk. Component SCSS is bundled into the JavaScript chunks. `styles-*.css` is the global sheet.

`OnPush` is set on `App`, `Header`, `ListingsPage`, the form, the grid, the card, and the pagination component. A parent re-render does not walk those views unless an input, an event, or a signal they read changes.

The card list uses `@for` with `track listing.id`. The default page size is 6 and the API rejects `pageSize` above 24, so the grid is not virtualized.

Every card image uses `loading="lazy"`. The media box keeps a 16:10 aspect ratio. Remote photographs are not resized.

## Implementation

The phase 4.10 review ran `nx build angular-web` in the production configuration. This documentation pass did not rebuild. The recorded output was:

| Chunk | Raw | Estimated transfer |
| --- | ---: | ---: |
| Initial framework chunk | 276.13 kB | 76.03 kB |
| `main` | 6.85 kB | 1.85 kB |
| Initial extra chunk | 1.14 kB | 577 bytes |
| Global styles | 1.54 kB | 572 bytes |
| Initial total | 285.66 kB | 79.03 kB |
| Lazy `listings-routes` | 66.87 kB | 15.52 kB |
| Lazy `not-found-page` | 965 bytes | 965 bytes |

"Estimated transfer size" is Angular's figure. It is not the same number as Vite's gzip column for the Vue build. The Vue shell script in that same review was 95.65 kB raw and 36.82 kB gzip, and the listings script was 19.33 kB raw and 6.62 kB gzip, with CSS extracted beside the scripts. Angular's component styles sit inside the JavaScript chunks, so the 1.54 kB CSS file is only the global sheet.

The large initial chunk is the framework runtime. It is not the listings feature. Comparing the two totals without that distinction is misleading.

`switchMap` plus a 300ms debounce on text is the request policy. A canonical URL rewrite that parses to the same query does not start a second GET. Those are the performance behaviors the tests lock. No Core Web Vitals number was recorded for a populated Angular page. The API was down during the phase 4.10 browser check.

## Angular concepts

`OnPush` skips a component until an input reference changes, an event fires, or a signal read during the template's last render changes. That is closer to Vue's dependency tracking than to Angular's default check of every binding.

`loadChildren` is the router's split point. The listings route file imports the page directly so the feature is one chunk.

## React comparison

`React.memo` is the opt-in that `OnPush` approximates. `React.lazy` is `loadChildren`. A virtualization library would be the same decision here: unnecessary at 24 rows.

## Vue comparison

Vue's first card is `loading="eager"`. Angular's cards are all lazy. Vue extracts CSS. Angular inlines component CSS into the route chunk. Both lazy-load the listings screen and leave not-found out of the first download. The write-up of the Vue measurements is [phase 4.9](../../vue-web/docs/phase-4.9-performance-optimization.md). The side-by-side reading is [phase 4.10](../../vue-web/docs/phase-4.10-final-review-angular-comparison.md).

## Engineering decisions

No virtualization, no HTTP cache, and no NgRx. The page size cap and a single cancelled request were the constraints that mattered.

The listings chunk stays lazy even though `/` redirects there. The cost is one extra request. The not-found page stays out of the first download.

Angular image priority was not changed to match Vue during the review. The templates were not being unified.

## Testing

The request-count assertions live in `listings-page.spec.ts`. There is no test that asserts a bundle size. A budget in `project.json` fails the production build above 1 MB initial and 8 kB for any component style. The recorded build was inside those budgets. The exact budget check is the build, not a unit test.

## Key takeaways

Read the chunk names before comparing kilobytes. `OnPush` and `track listing.id` are the rendering choices. `switchMap` is the network choice. A smaller file is not, by itself, a faster page.
