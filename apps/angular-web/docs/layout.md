# Application layout

## Purpose

The shell gives every route the same landmarks: a skip link, a header, one `main`, and a footer. Feature pages do not own the menu.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/app/app.html` | Skip link, `<app-header>`, `<main id="main-content">`, `<app-footer>` |
| `src/app/app.scss` | Skip link visibility and the shell column |
| `src/app/layout/header/header.ts` | Mobile disclosure |
| `src/app/layout/footer/footer.ts` | Footer landmark and the same primary links |
| `src/styles.scss` and `src/styles/_tokens.scss` | Document defaults and tokens |
| `src/styles/_breakpoints.scss` | Shared breakpoint names |

`main` has `tabindex="-1"` so the skip link can focus it without putting `main` in the tab order. Routed pages render inside `<router-outlet>`, still inside that `main`. A page that rendered another `<main>` would create a second landmark. The template comment says not to.

## Implementation

The header is a disclosure, not a dialog. `menuOpen` is a `signal(false)`. The button sets `aria-expanded` and `aria-controls="primary-navigation"`. Closed links use `display: none` in `header.scss`, which removes them from tab order. A height animation could leave them focusable.

The host is `position: sticky`. The open panel is in normal flow, so the sticky bar grows. On a narrow viewport that bar is taller than the closed header. `closeMenuWhenFocusLeaves` handles `focusout`: if `relatedTarget` is outside the host, the signal becomes false. Focus moving among the brand, the toggle, and the links stays inside the host, so the menu stays open. Escape calls `closeMenuFromKeyboard` and focuses the toggle. `Router.events` filtered to `NavigationEnd`, with `takeUntilDestroyed()`, closes the menu on navigation, including Back.

`OnPush` still updates the header. The template read `menuOpen()`, so Angular recorded that signal as a dependency.

The footer repeats the primary links. It does not own menu state.

Tokens live in `_tokens.scss` as custom properties. Component SCSS is encapsulated to the component. A class in the footer does not pick up a header rule. Custom properties still inherit.

Breakpoints used by the header: the menu button is hidden from `48rem`, and the nav becomes a row. The listings layout uses `64rem` for the filter column. Those numbers match the Vue client.

## Angular concepts

`viewChild` is a signal of the template reference `#menuButton`. Escape handling uses it instead of `document.querySelector`.

`host` listeners attach to the component element. `'(document:keydown.escape)'` is the document listener. `'(focusout)'` is the host.

`signal` and `set` / `update` are the local state API. The template calls `menuOpen()` to read it.

## React comparison

`menuOpen` would be `useState`. The document Escape listener would be `useEffect` with a cleanup that removes the listener. `takeUntilDestroyed()` is that cleanup for the router subscription. A sticky header component would be the same markup. React would not encapsulate the SCSS unless you added CSS modules.

## Vue comparison

`AppHeader.vue` holds `menuOpen` in a `ref` and closes on `focusout` the same way. Vue uses a `watch` on `route.fullPath` where Angular filters `NavigationEnd`. Both reject `role="menu"` and a focus trap. See [Vue layout](../../vue-web/docs/phase-4.2-layout-components.md).

## Engineering decisions

The panel is not a modal. Trapping focus would be the wrong widget for two links.

`display: none` wins over `v-if`-style removal and over a CSS height transition, for the same reason in both clients: closed links must leave the tab order, and a media query must be able to show them at `48rem`.

Closing on `focusout` was chosen instead of a larger `scroll-padding`. The open bar's height depends on the links. A fixed offset would have to guess it.

## Testing

`header.spec.ts` covers the closed start, the toggle, Escape returning focus to the button, closing when focus leaves the header, and staying open when focus moves between header controls. `app.spec.ts` checks the skip link `href` and the landmarks. There is no `footer.spec.ts`. The specs dispatch `FocusEvent` and `KeyboardEvent`. They do not prove a physical Tab key. The phase 4.10 review recorded that limitation.

## Key takeaways

The shell is landmarks plus an outlet. Menu state stays in the header. `OnPush` does not freeze a child that writes its own signal.
