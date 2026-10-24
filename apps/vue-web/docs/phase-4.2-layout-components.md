# Phase 4.2 — Layout and shared components

This note is for a React and TypeScript developer learning Vue 3. It describes the shell built in this phase: skip link, header, main, footer, and the mobile disclosure. It does not describe listing cards, filters, or the API client.

The Angular client is the reference for how the shell looks and behaves. The Vue route table from Phase 4.1 is unchanged: `/` is the listings placeholder, and every other path is the not-found view.

## A. Component architecture

The shell stays mounted. Navigation swaps the component inside `<RouterView>` and leaves the header and footer in place, including the header's menu state until a navigation clears it.

```text
App.vue
├── skip link          in-page fragment, not a route
├── AppHeader.vue      brand, disclosure toggle, primary links
├── main
│   └── RouterView     ListingsView or NotFoundView
└── AppFooter.vue      brand, the same links, copyright
```

`App.vue` has no state. It lists landmarks. `AppHeader.vue` owns the only piece of UI state in the shell, `menuOpen`. A listings view does not import the header and does not know the menu exists.

`primary-nav.ts` is the list both landmarks render:

```ts
export const primaryNavLinks = [
  { label: 'Home', to: '/' },
  { label: 'Listings', to: '/' },
];
```

The header and the footer do not share a component. One is a disclosure. The other is a static row. A shared component would need a variant prop for two call sites. The labels and the URL are the part that has to stay aligned, so that part is data.

Routed views render a `<section>` and an `<h1>`. They do not render `<main>`. The shell's `<main>` is the only one.

The shell is a column with `min-height: 100dvh`. `main` has `flex: 1 0 auto`. The footer has `margin-top: auto`. A short page pins the footer to the bottom of the viewport. A tall page scrolls the footer after the content.

## B. Vue reactivity and `ref()`

`menuOpen` is a `ref<boolean>`. A ref is an object `{ value: boolean }` that Vue can track. Assigning a new boolean to a plain `let` would not update the template. Writing `menuOpen.value` does.

```ts
const menuOpen = ref(false);

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value;
}
```

In the template the same ref is unwrapped. `menuOpen` there is the boolean, not the object. `menuOpen.value` in the template would be wrong: the template would look up `.value` on the boolean.

```vue
<button :aria-expanded="menuOpen ? 'true' : 'false'" @click="toggleMenu">
  {{ menuOpen ? 'Close' : 'Menu' }}
</button>
```

Unwrapping applies to top-level refs returned to the template. A ref nested inside a plain object is not unwrapped. `route.fullPath` is not a ref. It is a property on the reactive route object from `useRoute()`, so the watch reads it as a normal string:

```ts
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);
```

The getter matters. Watching `route` itself would be watching the same object for its identity. The getter tells Vue which property to track, the same way a template tracks the properties it read while rendering.

`computed()` was not used. The button label is one ternary, used once, in the template. A computed earns its place when script and template both need the same derivation, or when the derivation is expensive enough to cache. This label is neither.

`useTemplateRef('menuButton')` is also a ref. Vue sets `.value` to the `<button>` after mount and clears it on unmount. Escape handling calls `menuButton.value?.focus()`. Before mount the value is `null`, and Escape cannot fire yet because the button is not on the page.

## C. Props, emits, and slots

This phase does not define a component with `defineProps` or `defineEmits`. The header's state is created inside the header. The shell does not pass the menu in, and the header does not emit "opened" to the shell. Lifting that boolean would force `App.vue` to know about a disclosure it only places on the page.

The compiler macros, for a later component that does have inputs, look like this. They are not imported from `vue`. The compiler erases them.

```vue
<script setup lang="ts">
interface ListingCardProps {
  title: string;
}

const props = defineProps<ListingCardProps>();

const emit = defineEmits<{
  open: [id: string];
}>();

function onOpen(id: string): void {
  emit('open', id);
}
</script>
```

`defineProps<T>()` is the typed form. The template reads `props.title` or, when the binding is not shadowed, `title`. `defineEmits` names the events and the payload tuple. A parent listens with `@open="onOpen"`. That is the Vue counterpart of a React callback prop and of an Angular `output()`.

A slot is a hole the parent fills. This phase consumes one, on the brand. `RouterLink` with the `custom` prop renders nothing of its own and passes `href` and `navigate` to the default slot. The header supplies the `<a>`.

```vue
<RouterLink v-slot="{ href, navigate }" to="/" custom>
  <a class="brand" :href="href" @click="navigate">Business Marketplace</a>
</RouterLink>
```

The slot props are why the brand can be a normal anchor. `navigate` calls `preventDefault` for a plain click and leaves Ctrl-click and a middle click to the browser. Adding `.prevent` on `@click` would cancel those clicks too. The brand uses the slot so it does not also receive `aria-current="page"`. The primary links are the current-page controls, which matches the Angular header: the brand is a `routerLink` without `ariaCurrentWhenActive`.

The primary links use `RouterLink` without `custom`. Vue Router renders the `<a>`, sets `aria-current`, and merges the header's `@click` with its own navigation handler. A test activates Home from the not-found route and checks both that the URL became `/` and that the menu closed.

## D. Conditional rendering

`v-if` adds and removes DOM. `v-show` keeps the DOM and sets an inline `display` style. The mobile nav uses neither.

The links have to be in the document at every width. From `48rem` up, a media query shows them and hides the toggle. `v-if="menuOpen"` would remove the links whenever the menu was closed, and the desktop query would have nothing to show. `v-show` writes `display: none` as an inline style. An inline style beats a stylesheet, so the desktop query could not turn the links back on.

The class does the same job as Angular's `is-open`:

```vue
<nav class="nav" :class="{ 'is-open': menuOpen }"></nav>
```

```css
.nav {
  display: none;
}

.nav.is-open {
  display: flex;
}

@media (min-width: 48rem) {
  .nav,
  .nav.is-open {
    display: flex;
  }
}
```

`display: none` also removes the closed links from the tab order. A height of zero can leave them focusable. There is no animation, which also respects the reduced-motion rule in `base.css`.

`v-if` is the right tool when the hidden content is expensive or must not be read by assistive technology at all, and when no stylesheet needs to show it independently. `v-show` is the right tool for toggling something that should stay in one layout, with no competing media query. A disclosure that becomes a horizontal nav at a breakpoint is the class.

The button label uses a text binding, `{{ menuOpen ? 'Close' : 'Menu' }}`, not `v-if`. The element does not change. The words do.

## E. Dynamic bindings and events

`:aria-expanded` and `:class` are one-way bindings. The value is an expression. When `menuOpen` changes, Vue updates the attribute.

```vue
<button
  :aria-expanded="menuOpen ? 'true' : 'false'"
  aria-controls="primary-navigation"
  @click="toggleMenu"
></button>
```

`aria-expanded` is not a DOM boolean attribute. A boolean attribute such as `disabled` is present or absent. `aria-expanded` must be the string `"true"` or `"false"`. Binding the boolean `false` can remove the attribute. The ternary always writes a string, which is what the tests read.

`aria-controls` does not change, so it is a static attribute. Static values do not need `:`.

`@click` is `v-on:click`. Vue listens on that element and calls `toggleMenu` with the event. The method ignores the event. The call runs inside Vue, so writing `menuOpen.value` schedules the DOM update. There is no `setState` and no `forceUpdate`.

`:class` accepts an object whose keys are class names and whose values decide whether the class is present. It merges with the static `class="nav"`. Both can sit on the same element.

## F. Vue Router integration

`RouterLink` renders an `<a href>` and navigates through the router on an unmodified click. The header and the footer both point Home and Listings at `/`. On that URL, Vue Router sets `aria-current="page"` and the class `is-active`, because `exact-active-class` is `is-active` and the match is exact. On `/missing-page` neither link is current. The brand never is.

`exact-active-class` means "this URL", not "this URL or a child of it". These links have no children. A later detail route under `/` would need a decision about whether Home stays highlighted. Angular's `routerLinkActive` highlights a link when the URL is the link or a descendant. The two clients match for the routes that exist today.

The menu closes from two places:

- `@click="closeMenu"` on each primary link. Activating Home while already on `/` does not change `route.fullPath`, and the disclosure still has to close.
- `watch(() => route.fullPath, ...)`. The browser Back button never clicks the link. Any navigation that changes the URL closes the menu, including one started outside the header.

The document title is still the router's `afterEach` guard from Phase 4.1. The header does not set it.

## G. React comparison

| Piece                | React                                                         | Vue, this phase                                |
| -------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Menu state           | `const [open, setOpen] = useState(false)`                     | `const menuOpen = ref(false)`                  |
| Read in render       | `open`                                                        | template: `menuOpen`. script: `menuOpen.value` |
| Toggle               | `setOpen((value) => !value)`                                  | `menuOpen.value = !menuOpen.value`             |
| Derived label        | a variable in the function body, or `useMemo` if it is costly | the ternary in the template                    |
| DOM node             | `useRef<HTMLButtonElement>(null)`                             | `useTemplateRef('menuButton')`                 |
| Subscribe to the URL | `useLocation()` in the component, or a router subscriber      | `useRoute()` plus `watch`                      |
| Clean up a listener  | `useEffect`'s return function                                 | `onUnmounted`                                  |
| Link                 | `<Link to="/">`                                               | `<RouterLink to="/">`                          |
| Class                | `className={open ? 'nav is-open' : 'nav'}`                    | `class` plus `:class`                          |
| Slot                 | `children`, or a named render prop                            | `v-slot`                                       |

A React header would look like this:

```tsx
export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !menuOpen) {
        return;
      }
      setMenuOpen(false);
      menuButton.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <button
      ref={menuButton}
      type="button"
      aria-expanded={menuOpen}
      aria-controls="primary-navigation"
      onClick={() => setMenuOpen((open) => !open)}
    >
      {menuOpen ? 'Close' : 'Menu'}
    </button>
  );
}
```

The React effect that listens for Escape re-subscribes when `menuOpen` changes, or it reads `menuOpen` through a ref, because the effect closes over a render's value. The Vue listener reads `menuOpen.value` when the key is pressed. The ref object is stable. The boolean inside it is current. That is the practical difference between a value closed over by a render and a box Vue mutates.

React Router's `NavLink` takes a class function or `aria-current`. Vue Router's `exact-active-class` and the built-in `aria-current="page"` cover the same job for these links.

## H. Angular comparison

| Piece               | Angular                                        | Vue                                                  |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Menu state          | `signal(false)`, read as `menuOpen()`          | `ref(false)`, read as `menuOpen.value` in script     |
| Template read       | `menuOpen()`                                   | `menuOpen`                                           |
| Toggle binding      | `(click)="toggleMenu()"`                       | `@click="toggleMenu"`                                |
| Class               | `[class.is-open]="menuOpen()"`                 | `:class="{ 'is-open': menuOpen }"`                   |
| Expanded            | `[attr.aria-expanded]="menuOpen()"`            | `:aria-expanded="menuOpen ? 'true' : 'false'"`       |
| Button element      | `viewChild` signal                             | `useTemplateRef`                                     |
| Close on navigation | `Router.events` filtered to `NavigationEnd`    | `watch(() => route.fullPath, ...)`                   |
| Escape              | host listener `(document:keydown.escape)`      | `document` listener added in `onMounted`             |
| Active link         | `routerLinkActive` and `ariaCurrentWhenActive` | `exact-active-class` and RouterLink's `aria-current` |
| Change detection    | `OnPush` plus a signal read                    | the template's reactive dependencies                 |

Angular's host listener is removed with the component. Vue's `onMounted` listener is removed in `onUnmounted`. Same lifetime.

Angular passes the boolean signal's value through `[attr.aria-expanded]`, and the binding always writes the attribute. Vue needs the string ternary so `"false"` stays in the DOM.

Angular injects `Router` and subscribes with `takeUntilDestroyed()`. Vue calls `useRoute()` during setup. The watch stops when the header unmounts. There is no manual unsubscribe.

Both shells are a column. Both footers use `margin-top: auto`. Both headers are `position: sticky`. Both breakpoints are `48rem`. The token names are the ones Phase 4.1 copied from the Angular stylesheet.

## I. Accessibility

The pattern is the [disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): a button shows and hides a region that stays in the page. It is not the menu pattern. A menu pattern would add `role="menu"`, roving `tabindex`, and arrow-key handling. These are ordinary site links. Arrow keys already scroll the page. Replacing that would be the bug.

What the markup provides:

- The skip link is the first focusable control and points at `#main-content`. `tabindex="-1"` on `<main>` lets the fragment move focus there without putting `<main>` in the tab order.
- One `<header>`, one `<main>`, one `<footer>`.
- The toggle is `<button type="button">`. Its accessible name is the visible word, Menu or Close.
- `aria-expanded` is `"true"` or `"false"`. `aria-controls="primary-navigation"` points at the `<nav>`.
- The nav has `aria-label="Primary"`. The footer nav has `aria-label="Footer"`, so the two lists of links have different names.
- Closed mobile links are `display: none`, so they leave the tab order and the accessibility tree until the disclosure opens.
- From `48rem` up the toggle is `display: none` and the links are visible. Keyboard users tab the links directly. The hidden toggle is not a tab stop.
- Escape, while open, closes the disclosure and moves focus back to the toggle. While closed, Escape does nothing and does not move focus.
- `RouterLink` sets `aria-current="page"` on the links that are the current URL. The brand does not.
- Focus uses the global `:focus-visible` outline from `base.css`.
- The color pairs are the Phase 4.1 tokens, chosen for WCAG 2.2 AA body text.
- `prefers-reduced-motion` is handled in `base.css`. This phase adds no animation.

Opening a link does not trap focus. The disclosure is not a modal.

## J. Architectural tradeoffs

**Shared link component.** A `PrimaryNavLink.vue` with `defineProps` would exist to demonstrate props. The header and footer style the anchors differently, and parent scoped CSS does not reach elements inside a child. The shared piece is the array in `primary-nav.ts`.

**`computed()` for the label.** One ternary in the template is easier to see than a computed that only the template calls.

**`v-show`.** Rejected because the inline style would defeat the desktop media query. Documented next to the CSS so the next change does not "simplify" it.

**Resize listener.** Opening the menu and widening the window shows the links and hides the toggle, via CSS, without clearing `menuOpen`. Narrowing again shows the disclosure still open. That is the Angular behavior. A `matchMedia` listener could reset the flag and would be a second source of truth next to the stylesheet.

**Escape handling.** A button does not close a sibling nav on Escape by itself. The listener is the one custom key handler. It does not implement arrow keys, typeahead, or a focus trap.

**Home URL.** Angular links `/listings`. Vue links `/`. Adding `/listings` as an alias would make `/listings` stop being the not-found page, which is a route-table change from Phase 4.1. The links point at the screen this client actually renders. The label text matches Angular.

**Both links current.** Home and Listings share a URL, so both receive `aria-current="page"` on the listings screen. Angular does the same with two `routerLink`s to `/listings`. Splitting them onto different URLs would invent a page this phase does not have.

**No new dependencies.** The disclosure does not need VueUse, a focus library, or a component kit. `ref`, `watch`, and a `keydown` listener are enough.
