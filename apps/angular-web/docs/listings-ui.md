# Business listings UI

## Purpose

The listings screen shows one page of businesses for sale: a card grid, a loading skeleton, an empty message, and an error with retry. It does not search by itself. The page passes the rows in.

## Architecture

| File | Responsibility |
| --- | --- |
| `features/listings/pages/listings-page.ts` | Chooses the status and the rows |
| `components/business-listings-grid/` | Loading, updating, empty, error, and the list |
| `components/business-listing-card/` | One card |
| `components/listing-pagination/` | Previous and Next |
| `models/business-listing.ts` | Presentation model |
| `images/listing-placeholder.ts` | Category SVG when the photo is missing or fails |
| `testing/listing-fixtures.ts` | Spec data, not used by the page |

The page template is `listings-page.html`. The grid does not inject `HttpClient`.

## Implementation

`BusinessListing` is the card shape: id, title, description, category label, location, asking price, annual revenue, cash flow, image URL, and `featured`. `to-business-listing.ts` builds it from the summary DTO. City and state become one location string. `featured` is a view concern. The API summary DTO has no such field. The mapper decides it.

The card template renders an `h3` under the results `h2`. The image is decorative: `alt=""`. `loading="lazy"` is set on every card, including the first. Width and height attributes reserve the 16:10 box together with the media element's aspect ratio. A failed load swaps in `placeholderForCategory`. Files live in `public/listings/` and match the Vue placeholders.

Money uses the `currency` pipe with USD, symbol, and digits `1.0-0`, so amounts are whole dollars. Null revenue or cash flow renders "Not disclosed". Asking price is required on the DTO.

The grid's status union is `loading | updating | ready | error`. Empty is `ready` with no rows. The loading branch shows six skeletons and a visually hidden `role="status"` that says "Loading listings." Skeletons are `aria-hidden`. Updating keeps the previous cards, sets `aria-busy`, and shows "Updating listings." Error shows the message. The retry button is rendered only when the parent passed a listener. Clear filters appears on the empty state only when the page asks for it.

`OnPush` is set on the card and the grid. A new `listing` input refreshes the card. The card does not poll.

## Angular concepts

`input()` and `output()` are the signal-based input and output APIs. The grid reads `listings()` and `status()` in the template.

`@if` and `@for` are the control flow the templates use. `@for` tracks by `listing.id`. An index track would reuse the card component at that slot, so a failed image could stick to the wrong business after a reorder.

`CurrencyPipe` is the framework formatter. The digits string `'1.0-0'` means at least one integer digit and no fraction digits.

## React comparison

The grid is a presentational component that takes `listings` and `status` as props. You would write the same conditional in JSX. `CurrencyPipe` would be `Intl.NumberFormat` in a helper, which is what the Vue card does. Tracking by id is the `key` prop.

## Vue comparison

`ListingsGrid.vue` and `ListingCard.vue` mirror this split. Vue's first card uses `loading="eager"` and `fetchpriority="high"`. Angular leaves every image `loading="lazy"`. That difference is intentional in the Vue performance pass and was not copied back. See [Vue listings UI](../../vue-web/docs/phase-4.3-business-listings-ui.md).

## Engineering decisions

The grid does not fetch. Tests can mount each status without a timer or `HttpClient`.

Six skeletons match the default page size of 6, so the first successful paint replaces a block of about the same height. That is a layout choice, not a measured Core Web Vitals score.

`featured` stays off the API DTO. Putting it on the wire would invent a field the database does not store.

## Testing

`business-listing-card.spec.ts` checks the fields, whole-dollar amounts, "Not disclosed", the lazy image, and the placeholder after an error. `business-listings-grid.spec.ts` checks loading, empty, error without a button, retry, and clear. `to-business-listing.spec.ts` checks the mapping, including a null image.

## Key takeaways

The card is a pure view of `BusinessListing`. Status is a union, not two booleans. The track key is the listing id.
