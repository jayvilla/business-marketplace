# Phase 4.3 — Business listings UI

This note is for a React and TypeScript developer learning Vue 3. It describes the listings screen added in this phase: the card, the grid, the three presentation states, and the `/listings` route. It does not describe an HTTP client. The page renders a fixture.

The Angular listings page is the reference for the card, the grid, and the states. Search, filters, sort, and paging stay on the Angular page only. They are not part of this Vue screen.

## A. Component architecture

The page is three components. Data flows down. Nothing below the view fetches.

```text
ListingsView.vue          owns the fixture array and the page heading
└── ListingsGrid.vue      chooses loading, error, empty, or the list
    └── ListingCard.vue   renders one BusinessListing
```

`ListingsView` imports `fixtureListings` and passes that array. It does not pass `status`. The grid's default is `ready`, so the screen shows the three businesses. Loading, empty, and error are exercised by mounting the grid with those props. The view does not grow a control that switches them.

`ListingsGrid` does not import the fixture. A test, and later the API screen, can pass any array. `ListingCard` does not import the grid. It receives one `listing` prop.

That split matches the Angular components `app-listings-page`, `app-business-listings-grid`, and `app-business-listing-card`. The Vue names drop the `Business` prefix because the folder is already `features/listings`.

The shell from Phase 4.2 is unchanged in structure. `App.vue` still owns the only `<main>`. The listings template adds a page `<header class="intro">` inside that main. A header nested in main is the page introduction. It is not a second banner. The site header remains `header.bar`.

## B. Typed props

`defineProps` is a compiler macro. It is not imported from `vue`. The compiler reads the type argument and removes the call. The template then sees each prop by name.

The card takes one object:

```ts
const props = defineProps<{
  listing: BusinessListing;
}>();
```

In React the same boundary is a function parameter, often `function ListingCard({ listing }: { listing: BusinessListing })`. The parent writes `<ListingCard listing={listing} />`. In Vue the parent writes `<ListingCard :listing="listing" />`. The colon binds an expression. Without it, the attribute would be the string `"listing"`.

In Angular the same boundary is an input. The parent writes `<app-business-listing-card [listing]="listing" />`. The child reads `listing()`. A Vue prop is not a signal. In script it is `props.listing`. In the template, `listing` is the object, because the template unwraps the props object the same way it unwraps a top-level ref.

The grid uses `withDefaults` because a missing array should be empty, not `undefined`:

```ts
const props = withDefaults(
  defineProps<{
    listings?: readonly BusinessListing[];
    status?: ListingsGridStatus;
    errorMessage?: string;
    emptyMessage?: string;
  }>(),
  {
    listings: () => [],
    status: 'ready',
    errorMessage: 'Sample listings could not be loaded.',
    emptyMessage: 'No businesses are listed yet.',
  },
);
```

The array default is a factory. A shared array would be one mutable value across every grid that omitted the prop. React does the same thing with a default parameter, and the same mistake is a shared default array. Angular expresses the default on the input declaration instead of in the template.

`status` is `'loading' | 'ready' | 'error'`. There is no `any`. Optional props are marked `?`. Money that a seller withheld is `number | null` on the model, not an optional prop of the card. The card always receives a whole listing.

Props are one-way. The card does not assign to `props.listing`. Image failure is a local `ref`, which is the card's own state, the way a React card would keep `useState` rather than writing back into the listing object.

## C. List rendering

The grid renders cards with `v-for` and a stable key:

```vue
<ul v-else class="grid">
  <li v-for="listing in props.listings" :key="listing.id">
    <ListingCard :listing="listing" />
  </li>
</ul>
```

`v-for` is the template form of a loop. React writes `listings.map((listing) => <li key={listing.id}>...</li>)`. Angular writes `@for (listing of listings(); track listing.id)`. The three are the same idea: walk the array, and tell the framework which item is which.

`:key="listing.id"` is that identity. Vue's diff walks the old list and the new list. A key it has seen before reuses that component instance and moves the DOM node. An index key means "the item in this slot," so reordering the array keeps the component where it is and hands it a different listing. This card stores `imageFailed` on the instance. An index key would leave a broken-image flag on the business that slid into that slot.

The grid spec checks the behavior rather than the attribute. It breaks the first image, reverses the array, and expects the placeholder to stay on Alpha and the original URL to stay on Beta. If the key were the index, the watch on `listing` would clear the flag when the first instance received Beta, and Alpha would show its original URL again.

The skeleton loop uses `:key="slot"` on the constant `[1, 2, 3, 4, 5, 6]`. Those are not listings. The list never reorders, so the key only has to be unique inside that loop.

## D. Conditional rendering

The grid is one chain. The first true branch wins, and the others are not rendered:

```vue
<div v-if="props.status === 'loading'" class="loading">...</div>
<div v-else-if="props.status === 'error'" class="state" role="alert">...</div>
<div v-else-if="props.listings.length === 0" class="state">...</div>
<ul v-else class="grid">...</ul>
```

`v-if` destroys the branch when the condition is false. `v-show` would hide it with CSS and keep the nodes. The loading branch is six decorative skeletons. Keeping them mounted under a populated list would waste nodes and could be announced if a status text were left in the tree. `v-if` removes them.

`v-else-if` and `v-else` must follow the `v-if` element. They are not free-floating. The empty branch is `ready` plus an empty array, not a fourth status. A status of `empty` could disagree with an array that still had rows. The error branch wins over an empty array, so a failed request does not also say that nothing is listed.

React would use `if` statements or nested ternaries, and those branches would be different elements in the returned tree. Angular uses `@if` / `@else if` / `@else`, which is the same chain. The badge on the card is a smaller case: `v-if="listing.featured"` renders the paragraph only for a featured row. A false condition leaves no badge node, so the text "Featured" is absent rather than hidden.

## E. Derived state

`computed` caches a value and recomputes it when a dependency read inside it changes.

The card derives the image URL and the three money strings:

```ts
const imageSource = computed(() => {
  if (imageFailed.value) {
    return placeholderForCategory(props.listing.category);
  }
  return props.listing.imageUrl;
});

const figures = computed(() => ({
  askingPrice: formatDollars(props.listing.askingPrice),
  annualRevenue: money(props.listing.annualRevenue),
  cashFlow: money(props.listing.cashFlow),
}));
```

The template reads `imageSource` and `figures.askingPrice`. It does not format currency itself. Script and template share one derivation, which is the case that earns a computed. A formatter call written only in the template would also work. It would run on every render of the card and the rule would live in the markup. The computed keeps the null rule (`"Not disclosed"`) next to the formatter.

`imageFailed` is a `ref`, not a computed. It changes because the image fires `error`, which is an event, not a derivation of the listing. The `watch` clears it when `props.listing` is replaced. A computed cannot remember "the last URL failed" unless some other ref remembers it.

The page label is not a computed:

```ts
const listingCountLabel =
  fixtureListings.length === 1
    ? '1 listing'
    : `${fixtureListings.length} listings`;
```

The fixture array does not change after setup. A computed of a constant would cache a value that nothing invalidates. An ordinary constant is the right tool. React would not wrap that string in `useMemo` either.

## F. Component events

The grid declares one event:

```ts
const emit = defineEmits<{
  retry: [];
}>();

function onRetry(): void {
  emit('retry');
}
```

The parent listens with `@retry="onRetry"`. The compiler maps that to a prop named `onRetry`. The tuple `retry: []` means the event carries no payload. A payload would be `retry: [message: string]`, and `emit('retry', message)` would be checked against it.

In React the parent passes a function, `onRetry={() => reload()}`, and the child calls `props.onRetry()`. The names line up on purpose: Vue's listener prop is `onRetry` for an emit called `retry`. The difference is who declares the contract. Vue's `defineEmits` is the child's list of events. A React child accepts whatever callbacks the props type lists. Angular declares an `output()` and the parent binds `(retry)="retry()"`. The grid's button is that output.

The button is rendered only when a listener is attached:

```ts
function retryListenerAttached(): boolean {
  const vnodeProps = getCurrentInstance()?.vnode.props;
  if (vnodeProps == null || !('onRetry' in vnodeProps)) {
    return false;
  }
  const listener: unknown = vnodeProps.onRetry;
  return typeof listener === 'function' || Array.isArray(listener);
}
```

Declared emits are removed from `$attrs`, so `$attrs.onRetry` is empty even when the parent is listening. The vnode still has the listener. The fixture view does not bind `@retry`, and its grid is never `status="error"`, so the page has no "Try again" button. A test that wants the button passes `onRetry`. A parent that sets `status` to `error` and does not listen gets the alert and no button. A button that emits into nothing is a control that does nothing.

## G. Slots

A slot is a hole the parent fills with markup. The default slot is the material between the component's tags. A named slot is a hole with a name. A scoped slot is a hole that also receives data from the child.

React's equivalent of the default slot is `children`. A named slot is closer to a named render prop, or to several `children` fields. Angular's equivalent is `<ng-content>`, and a named slot maps to `<ng-content select="...">`. Angular does not hand the projected content a value from the child. A scoped slot does. That is the piece that has no direct `ng-content` twin. The usual Angular shape is a template input plus `NgTemplateOutlet`.

This phase does not put a slot on `ListingCard` or `ListingsGrid`. The card's markup is fixed: image, title, location, three figures. A slot for "the price" would let a parent invent a layout the card is supposed to own. The parent already controls the data through the prop.

The header does use a scoped slot, on `RouterLink`. The listings route made it necessary. Home and Listings both point at `/listings`. The built-in active class would mark both as the current page.

```vue
<RouterLink
  v-for="link in primaryNavLinks"
  :key="link.label"
  v-slot="{ href, navigate, isExactActive }"
  :to="link.to"
  custom
>
  <a
    :href="href"
    :class="{ 'is-active': link.currentPage && isExactActive }"
    :aria-current="link.currentPage && isExactActive ? 'page' : undefined"
    @click="followLink($event, navigate)"
  >
    {{ link.label }}
  </a>
</RouterLink>
```

`v-slot` receives `href`, `navigate`, and `isExactActive` from the router. `custom` tells `RouterLink` not to render its own anchor, so the header can. `currentPage` is data on the link, not something the router knows. Only the Listings item sets it, so only that anchor gets `aria-current="page"`.

`navigate` is called with the click. It leaves modified clicks (Ctrl, middle button) to the browser. The handler does not call `preventDefault` itself. It closes the menu first, because activating Home on the listings page does not change the URL, and the disclosure should still close.

## H. Data architecture

The card's model is `BusinessListing` in `models/business-listing.ts`. It is the shape on the screen: one location line, a category label, a resolved image URL, whole-dollar numbers, and `featured`.

The ASP.NET summary DTO is a different shape. It has `city` and `state` separately, a category identifier such as `ProfessionalServices`, a nullable `imageUrl`, and no `featured` field. Angular already splits those. `BusinessListingSummary` is the HTTP type. `toBusinessListing` copies it into `BusinessListing` before a card sees it. This phase does not copy that function and does not add an API client. The fixture is written in the card's shape, so there is nothing to map.

Null money means the seller did not disclose the figure. It does not mean zero. The card prints "Not disclosed". `id` is a string. The API will send a GUID. The fixture uses ids such as `lst-harbor`. Either string is a stable key.

`featured` is a view flag. API rows will map it to `false`. One fixture row sets it so the badge can be seen without a toggle.

The placeholder map lives in `images/listing-placeholder.ts`. Keys are display labels, including `"Professional services"`, not the API identifier. The SVG files in `public/listings` are the same illustrations the Angular client serves. They are copied into this app so the Vue dev server can serve `/listings/restaurant.svg` without importing Angular's public folder.

`formatDollars` is one `Intl.NumberFormat` for whole US dollars. The card calls it. The grid does not format money, because the grid does not print prices.

## I. Accessibility

The page has one `h1`, "Businesses for Sale". The results region is a `section` labelled by an `h2`, "Listing results". Each card title is an `h3` under that `h2`. The card is an `article` inside a list item. The list is a `<ul>`, so the collection is a list without an extra `role`.

The image is decorative. The category and the title are already text, so the image has `alt=""`. A later photograph needs its own description. Repeating the business name in the alt text would announce it twice.

The card is not a link. A detail route does not exist. A clickable `div`, or an anchor to `#`, would look interactive and go nowhere.

Loading renders a visually hidden `p` with `role="status"` and the text "Loading listings." The six skeletons are `aria-hidden="true"`. A pulsing block is not something to announce. The shimmer animation is turned off under `prefers-reduced-motion`, and the global stylesheet also shortens animations.

The error state is `role="alert"`, so the message is announced when it appears. "Try again" is a `<button type="button">`, present only when the parent handles `retry`. The empty state is a paragraph, not an alert. An empty catalog is not an emergency, and the copy does not mention filters. This page has no filters.

The results heading has `tabindex="-1"` and `scroll-margin-top`. It can take programmatic focus later without becoming a tab stop, and the sticky header will not cover it. Nothing focuses it in this phase. Angular focuses it when a filter changes. Those controls are absent here.

Focus rings come from the global `:focus-visible` rule. The retry button and the navigation links are real controls, so they receive that ring.

Home and Listings share `/listings`. Angular marks both `aria-current="page"`. This app marks only Listings. Two current pages would tell assistive technology that both items are the page you are on. The brand link navigates to the same URL and does not set `aria-current`. The footer uses the same rule.

The skip link from Phase 4.2 is unchanged: it is the first focusable control, it points at `#main-content`, and `main` has `tabindex="-1"` so the fragment can land there. A unit test cannot see the `:focus` style, because that style depends on the browser focusing the document.

In the browser, synthetic Tab and Enter events did not move focus or activate the link. Once the document itself had focus, calling `focus()` on the skip link applied `.skip-link:focus`: `transform` became `none`, and the blue "Skip to content" control was visible at the top left. Activating that link moved the URL to `#main-content` and moved focus to `<main id="main-content">`. The Tab key from the top of the document could not be verified with this automation. `:focus-visible` did not match the programmatic focus, which is expected. The visible rule is `:focus`, matching the Angular skip link.

## J. Framework comparison

| Concern | Vue on this page | Angular listings page | React equivalent |
| --- | --- | --- | --- |
| Page state | Fixture constant in the view | Signals for the query, the request, and the rows | `useState` for the request, props down |
| Card input | `defineProps<{ listing: BusinessListing }>()` | `input.required<BusinessListing>()` | A typed props argument |
| List | `v-for` and `:key="listing.id"` | `@for` and `track listing.id` | `map` and `key={listing.id}` |
| States | `v-if` / `v-else-if` / `v-else` | `@if` / `@else if` / `@else` | Early returns or ternaries |
| Money label | `computed` | `computed` or a pipe in the template | A function, or `useMemo` if it is shared |
| Retry | `defineEmits<{ retry: [] }>()` | `output<void>()` | An `onRetry` callback prop |
| Image failure | `ref` plus `watch` on the listing | `linkedSignal` reset when the input changes | `useState` plus `useEffect` on the listing |
| Active link | Scoped slot, one item allowed to be current | `routerLinkActive` on both links | `NavLink` and your own rule for the shared URL |

The Angular page also renders a filter column, an updating state, pagination, and a price-error alert. Those depend on the query string and the API. Copying the controls without the query would leave buttons that do not filter. They are omitted, and the intro sentence that names them is omitted with them. The heading and the first sentence stay.

The grid breakpoint matches Angular: one column, then two columns at `48rem`. Angular's page becomes a sidebar plus a results column at `64rem`. This page has no sidebar, so at that width each card is wider than the Angular card. The card's own rules, the 16:10 image, the type, and the figure rows are the same.

## K. Architectural tradeoffs

The fixture lives in `fixtures/sample-listings.ts`, not in the view file and not behind a composable. A composable named `useListings` that returned a constant would look like a data layer and would not fetch. The view imports the array. When the API arrives, that import is the line that changes. The grid's props stay.

There is no Pinia store. Three components and a constant do not need one. A store would let any component read the catalog. The card should not be able to.

There is no mapper and no DTO type in this app. Adding `BusinessListingSummary` now would duplicate the C# contract before a client exists, and the card would still need the presentation type. One model is enough until a response has to be copied.

The card is an article, not a router link. A `/listings/:id` route would be a new page. The Angular card does not navigate. Inventing the route would make the two clients disagree and would imply a detail screen this phase does not have.

The grid does not include Angular's `updating` status or the clear-filters button. `updating` means "a new query is in flight and the previous rows stay visible." There is no query. Clear filters is the empty state's action when a filter excluded every row. The empty copy is the no-filter sentence: "No businesses are listed yet."

Retry is an emit, not a prop callback, except for the check that a listener exists. A callback prop `onRetry?: () => void` would make that check a simple `v-if`. It would also be a second way to pass the same event, because Vue already turns `retry` into `onRetry`. One channel keeps the contract on `defineEmits`. The vnode check is the awkward part, and it is documented next to the function so the next reader does not replace it with `$attrs`.

Only Listings is the current page, which disagrees with Angular's header. The shared URL is the cause. Matching Angular would announce two current pages. The labels and the destination still match. Home is still in the nav, because removing it would invent a different information architecture. It does not get its own route.

The skeleton count is 6, the API's default page size, written as a constant on the grid. It is not a query model. Importing `LISTING_PAGE_SIZE` from a query module would pull paging into a component that does not page.

Scoped CSS stays on the component that uses it. Colors, type, space, radius, and shadow are the tokens from Phase 4.1. The card sets `max-width: none` on its paragraphs so the global `65ch` measure does not fight the card width. No component redeclares a token value.
