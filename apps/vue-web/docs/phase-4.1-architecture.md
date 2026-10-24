# Phase 4.1 — Vue 3 architecture and project foundation

This note is for a React and TypeScript developer learning Vue 3 on this marketplace. It describes the shell that Phase 4.1 leaves in `apps/vue-web`. It does not describe listings data, filters, or the ASP.NET API client. Those are later phases.

The Angular client and the API already exist. Vue is a second client in the same Nx workspace. It will call the same HTTP API later. It does not import Angular, C#, or a shared TypeScript contract. There is no shared contract package in this repo yet.

## 1. Architecture and folder structure

```text
apps/vue-web/src/
├── app/
│   ├── App.vue                 Shell: skip link, header, main, router view
│   ├── router/index.ts         Route table and router factory
│   └── views/NotFoundView.vue  Unknown URL
├── components/
│   └── layout/AppHeader.vue    Site header
├── features/
│   └── listings/
│       └── views/ListingsView.vue
├── styles/
│   ├── tokens.css              Design tokens
│   └── base.css                Reset, type, focus, reduced motion
├── main.ts                     createApp, install the router, mount
└── vue-shims.d.ts              Lets TypeScript import `*.vue`
```

`main.ts` is the composition root, the same role as Angular's `main.ts` plus `app.config.ts`. It creates the application, installs the router, and mounts into `#root` in `index.html`.

`app/` is the shell: landmarks, the route table, and the unknown-URL screen. Those concepts belong to the application, not to listings.

`components/layout/` holds presentational pieces the shell composes. `AppHeader.vue` is the only one so far. A `components/ui/` folder waits until a second screen needs the same control.

`features/listings/` is the feature boundary. The folder name matches the Angular feature and the API resource (`/api/listings`), so the two clients stay comparable. The suggested name `businesses` was adapted for that reason. The feature currently contains one view. `components/`, `composables/`, `services/`, and `types/` inside it are omitted until a file has a caller. Empty directories do not document intent. They only look like unfinished work.

`styles/` holds rules that must apply to the whole document. Component presentation stays in `<style scoped>` on the component that owns it.

There is no `services/api/` and no `src/types/` domain model yet. The client does not send a request in this phase. Copying the C# DTOs or the Angular interfaces now would create a third contract that can drift before anything reads it. The contracts that already exist are:

- `apps/api/BusinessMarketplace.Api/Dtos/BusinessListingSummaryDto.cs`
- `apps/api/BusinessMarketplace.Api/Dtos/BusinessListingPageDto.cs`
- `apps/angular-web/src/app/features/listings/api/business-listing-summary.ts`

Vue models should be added in the phase that parses those responses.

Dependencies already in the workspace, and used here: `vue`, `vue-router`, Vite, `vue-tsc`, Vitest, Vue Test Utils, and `eslint-plugin-vue`. Pinia, VueUse, and a component library are not installed. Nothing in this phase calls them.

## 2. Why the Composition API

Vue 3 offers two ways to write a component. The Options API groups code by option (`data`, `methods`, `computed`). The Composition API groups code by feature inside `setup`, and `<script setup>` is the form this application uses.

The Composition API is the project standard for three reasons.

TypeScript inference is direct. `ref`, `computed`, and `defineProps` carry their types into the template. The Options API can be typed, and the types sit further from the values.

Logic that belongs together can stay together. A later listings screen will own a query, a request, and a derived error message. In the Composition API those lines can live in one composable, `useListings()`, and the view calls it once. In the Options API the same work is split across `data`, `methods`, and `computed` in every component that needs it.

The shape is familiar if you write React function components. A composable is the Vue counterpart of a hook: a function that uses reactive state and can be called from `setup`. It is not a hook. The rules differ, and section 10 covers that.

The Options API remains supported and is a reasonable way to read older Vue code. New files in this app use `<script setup lang="ts">`.

## 3. How `<script setup lang="ts">` works

`lang="ts"` tells the Vue compiler and `vue-tsc` that the block is TypeScript.

`<script setup>` is compiled into the component's `setup()` function. You do not write `export default` and you do not return an object. Top-level bindings are exposed to the template automatically. Imports used in the template, such as `RouterLink` and `AppHeader`, are registered as components because the template references them. An import the template never references is unused, and ESLint reports it.

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
</script>

<template>
  <AppHeader />
  <main id="main-content" tabindex="-1">
    <RouterView />
  </main>
</template>
```

`AppHeader` and `RouterView` are in scope in the template because they are bindings in the setup script. There is no `components: { AppHeader }` map. Angular's `imports: [Header, RouterOutlet]` array is the closer comparison: both are explicit lists of what the template may render. Vue's list is the set of bindings the template actually references.

`defineProps` and `defineEmits` are compiler macros. They are erased at compile time and are not imported from `vue`. This phase has no props or events yet. The pattern, for a later component, looks like this:

```vue
<script setup lang="ts">
interface ListingCardProps {
  title: string;
  city: string;
}

const props = defineProps<ListingCardProps>();

const emit = defineEmits<{
  open: [id: string];
}>();

function onOpen(): void {
  emit('open', props.title);
}
</script>
```

The generic form is type-only. The compiler turns it into runtime props. Use `withDefaults` when a prop needs a default. Prefer an interface when the props are a real object. Avoid `any`. If a value arrives from outside the app, type it as `unknown` and narrow it before use.

## 4. How Single File Components differ from React components

A Vue Single File Component (SFC) is one `.vue` file with up to three blocks: `<template>`, `<script setup>`, and `<style>`. The compiler turns the template into a render function and the style into CSS. You edit HTML-shaped markup, and the bundler ships a render function.

A React component is a function that returns JSX. Markup, logic, and styles are whatever you place in that module. Colocation is a convention. In Vue, colocation of template, logic, and scoped style is the file format.

```tsx
// React
export function ListingsPage() {
  return (
    <section aria-labelledby="listings-heading">
      <h1 id="listings-heading">Businesses for Sale</h1>
    </section>
  );
}
```

```vue
<!-- Vue -->
<template>
  <section class="page" aria-labelledby="listings-heading">
    <h1 id="listings-heading">Businesses for Sale</h1>
  </section>
</template>
```

Template expressions are JavaScript, with a few template-only forms (`v-if`, `v-for`, `v-slot`). They are not a second language. `{{ title }}` escapes HTML. Rendering raw HTML is `v-html`, and this app does not use it.

Reactivity is the largest behavioral difference. In React, changing state schedules a render, and the function runs again. In Vue, the template tracks which reactive properties it read. A later write to one of those properties updates the DOM nodes that depend on it. You do not call `setState`. A `ref` is read as `count.value` in script and as `count` in the template. The template unwraps refs.

Scoped CSS is built in. `<style scoped>` rewrites selectors so they match this component's elements. React has no equivalent in the language. CSS Modules, a CSS-in-JS library, or a naming convention do that job.

The root of `App.vue` is a `<div class="shell">` because the shell needs one flex parent for the skip link, the header, and `main`. Vue 3 allows multiple root nodes. A fragment would leave the column layout with no parent, so the shell uses one root on purpose.

## 5. How Vue Router works

The router is a plugin. `main.ts` calls `app.use(createAppRouter())` before `mount`. After that, any component can render `<RouterLink>` and `<RouterView>`, or call `useRouter()` / `useRoute()`.

`createWebHistory` uses the HTML5 history API, so URLs look like `/` and `/missing-page` rather than `/#/missing-page`. The dev server and the production host must answer those paths with `index.html`. Vite does that in development. `import.meta.env.BASE_URL` is the public base path Vite injects, so a future deployment under a subpath still works.

```ts
export const routes = [
  {
    path: '/',
    name: 'listings',
    component: () => import('../../features/listings/views/ListingsView.vue'),
    meta: { title: 'Businesses for Sale' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Page not found' },
  },
];
```

Matching walks the array and uses the first match. `/` is a real record, so it wins for the home URL. `/:pathMatch(.*)*` matches any other path, including paths with several segments. It is last. Placed first, it would swallow `/`.

`component: () => import('...')` is a lazy route. The shell bundle does not include the view. The browser downloads that chunk when the route is first entered. The listings import is the feature boundary, the same idea as Angular's `loadChildren`. The not-found view is its own chunk because almost no session renders it.

`<RouterView>` asks the router for the component of the current match and renders it. The header is a sibling, so it stays mounted and keeps its DOM while the view swaps.

`<RouterLink to="/">` renders an `<a>` and calls `router.push` on a plain click. The `href` stays real, so open-in-new-tab, copy-link, and modified clicks still work. `navigate` from the custom slot is that same behavior for the brand, which needs a custom `<a>` so it does not also receive `aria-current`. Vue Router sets `aria-current="page"` when the link is exactly the current route (`isExactActive`). The active class used here is `exact-active-class`, for the same reason: "this page" rather than "this section or a child of it."

`router.afterEach` sets `document.title` from `meta.title`. The shell never unmounts, so a view cannot depend on a new document load to rename the tab. One guard covers every record.

Tests pass `createMemoryHistory()` into `createAppRouter`. Memory history does not write the address bar and starts nowhere, so each test pushes the URL it cares about before mount. The running app uses the default HTML5 history.

## 6. How TypeScript integrates with Vue

`apps/vue-web/tsconfig.json` sets `"strict": true`. The workspace base config is loose so one setting can serve every project. The Vue app overrides it, the same way the Angular app does. Extra flags were left as they are. Angular turns on `noUncheckedIndexedAccess` for itself and records that Vue was left unchanged.

`vue-tsc` typechecks `.vue` files. The app `tsconfig` includes `src/**/*.vue`. `src/vue-shims.d.ts` declares the `*.vue` module so a `.ts` file can import a component. The shim is intentionally wide. The strict check of a component's props happens when `vue-tsc` compiles that SFC, not when a spec imports it through the shim.

Type-only imports use `import type` so a type import cannot become a runtime import:

```ts
import { createRouter, createWebHistory } from 'vue-router';
import type {
  RouteMeta,
  RouteRecordRaw,
  Router,
  RouterHistory,
} from 'vue-router';
```

Route metadata is the domain type this phase actually has. Vue Router types `meta` as an open `RouteMeta` interface. Augmenting that interface gives `to.meta.title` the type `string` inside the guard, with no cast:

```ts
declare module 'vue-router' {
  interface RouteMeta {
    title: string;
  }
}

type AppRouteRecord = RouteRecordRaw & {
  meta: RouteMeta;
};
```

The augmentation lives in `router/index.ts` because that file is already a module (it has imports). A `declare module` in a script that has no import or export would replace the interface instead of extending it. `AppRouteRecord` exists because `meta` on `RouteRecordRaw` is optional. The augmentation types the field. The intersection makes a record without a title fail to compile.

No listing DTO is declared. Untrusted JSON is not read yet. When it is, the boundary should accept `unknown` and narrow it into an interface. `any` would disable that check.

## 7. Why this architecture is maintainable

The shell, the feature, and the document styles change for different reasons. A listing card can be added under `features/listings` without editing `App.vue`. A token can change in `tokens.css` and every component that uses `var(--space-4)` follows, because custom properties inherit through the scoped-CSS boundary.

The lazy import is a hard boundary. Feature code that the listings view eventually imports stays in the listings chunk. The shell stays the header, the main region, and the router.

Routes carry their document title in data. A new route that omits `meta.title` fails typecheck. The guard does not need a new branch.

Presentational components receive their inputs as props (once they have inputs). They do not reach into a store. There is no store. Shared client state does not exist yet. Introducing one now would be an empty abstraction that every later feature would be tempted to put things in.

The Vue app does not import the Angular app. The two clients can follow the same information architecture and the same token scale while remaining free to change their component models. Coupling them through a shared UI package would force one framework's components onto the other.

## 8. Architectural tradeoffs and alternatives

**Home URL.** The Angular client redirects `/` to `/listings`. This Vue app renders listings at `/`. One screen needs one path. An alias or a redirect can be added when URL parity matters, without moving `ListingsView.vue`.

**Lazy home route.** Lazy-loading `/` costs one extra request before the first view paints. The listings chunk is tiny today. The split is still the feature boundary, so the cost stays paid in the same place when the view grows. The alternative is a static import of `ListingsView.vue` in the router, which puts the feature in the shell chunk and removes the boundary. The not-found view would stay lazy either way.

**CSS without Sass.** The Angular tokens use Sass mixins for breakpoints, because a custom property cannot appear in a media-query condition. Vue does not have a Sass dependency, and this phase does not add one. `tokens.css` repeats `@media (min-width: 48rem)` and assigns the custom properties inside the query. A mixin would be shorter. A preprocessor is a dependency, and two call sites do not earn it.

**No Pinia.** A store would hold state that more than one distant component must write. The shell has no such state. Router location is already shared state, owned by the router. A store added now would sit empty beside it.

**No composable yet.** `useDocumentTitle()` could wrap the `afterEach` guard. The guard is already one function in the router factory, which is the place that knows every navigation. A composable called from each view would duplicate the subscription and would miss a view that forgot to call it.

**No shared contract package.** A `libs/` package of DTO types would keep Angular and Vue aligned, and it would have to be updated with the API. The repo has not introduced that package. This phase does not start it ahead of the first Vue request.

**Catch-all parameter name.** `pathMatch` is unused. Vue Router's syntax requires a name. Reading `route.params.pathMatch` in the view would couple the copy to the pattern. The view ignores it.

**Footer and mobile menu.** The Angular shell has both. This phase builds the landmarks the route needs: header, main, skip link. The footer and the disclosure menu are layout work. Adding them here would implement the next phase.

## 9. How this compares with the Angular implementation

Both clients are standalone UI applications in one Nx workspace. Both mount a shell that stays alive while a router swaps the page inside `<main>`. Both lazy-load the rarely seen not-found screen. Both keep listings as a feature folder. Both use the same token names and the same breakpoint widths. Both set the document title from the route, to the page name alone (`Businesses for Sale`, `Page not found`).

| Concern            | Angular                                      | Vue, this phase                  |
| ------------------ | -------------------------------------------- | -------------------------------- |
| Composition root   | `main.ts`, `app.config.ts`                   | `main.ts`                        |
| Root component     | `App` class, `app.html`, `app.scss`          | `App.vue`                        |
| Route table        | `app.routes.ts`                              | `app/router/index.ts`            |
| Home URL           | redirect `/` to `/listings`                  | `/` renders listings             |
| Feature routes     | `loadChildren` of `listings.routes.ts`       | one lazy component import        |
| Unknown URL        | `path: '**'`, `loadComponent`                | `/:pathMatch(.*)*`               |
| Header             | `layout/header`, signals, mobile menu        | `AppHeader.vue`, one link        |
| Footer             | `layout/footer`                              | later layout phase               |
| State in the shell | none                                         | none                             |
| Styles             | global SCSS plus encapsulated component SCSS | global CSS plus `<style scoped>` |
| Title              | route `title` and `Title` service            | `meta.title` and `afterEach`     |
| HTTP               | `BusinessListingsService`                    | not started                      |

Angular registers a component's template dependencies in the `@Component` `imports` array, and the compiler checks them. Vue registers them by importing the binding that the template uses. Both fail the build when the template references something that was not imported.

Angular's `loadChildren` splits a whole feature route table. Vue's dynamic `import()` splits one component. When the listings feature grows a detail route, the Vue table can gain a child or a sibling record. The Angular detail route would be added inside `listings.routes.ts` and would ship in the feature chunk. The Vue equivalent is another record whose `component` is a dynamic import, or a parent record with `children`, once a second listings URL exists.

Angular components use `OnPush` and signals. Vue's template already tracks reactive reads, so there is no change-detection strategy to pick. A `ref` written by a later composable updates the nodes that read it.

Angular injects `Router` and `Title` with `inject()`. Vue exposes the router with `useRouter()` after the plugin is installed, and this phase does not call it from a component. The title guard is registered on the router instance instead of injected into the view. The view stays free of document side effects.

Scoped styles correspond to Angular's emulated encapsulation. A class in `AppHeader.vue` does not style a class of the same name in the view. Custom properties cross that boundary in both frameworks, which is why the tokens live on `:root`.

## 10. How this compares with React

| Concern               | React                                         | Vue, this phase                               |
| --------------------- | --------------------------------------------- | --------------------------------------------- |
| Component             | function returning JSX                        | SFC: template, script setup, scoped style     |
| State                 | `useState` returns a value and a setter       | `ref` / `reactive`; the template tracks reads |
| Shared logic          | custom hook                                   | composable called from `setup`                |
| Router                | React Router `<Routes>`, `<Outlet>`, `<Link>` | `<RouterView>`, `<RouterLink>`, route records |
| Lazy route            | `React.lazy(() => import(...))`               | `component: () => import(...)`                |
| Document title        | an effect, or a router handle                 | `meta` plus `afterEach`                       |
| Styles                | CSS Modules, or a library                     | `<style scoped>`                              |
| App startup           | `createRoot(el).render(<App />)`              | `createApp(App).use(router).mount(el)`        |
| Props                 | function arguments                            | `defineProps`                                 |
| Cross-cutting plugins | context providers wrapping the tree           | `app.use` before mount                        |

`<RouterView>` is `<Outlet>`. `<RouterLink>` is `<Link>`. A route record is the object you would pass to `createBrowserRouter`. Lazy components are the same dynamic `import()`.

A composable and a hook are both functions that hold stateful logic outside the component body. Call a composable synchronously from `setup` (the `<script setup>` body or a function it calls while setup is running). That is the same moment a hook has to run: during render, not from a click handler or a `setTimeout`. Vue tracks effect order itself, so it does not impose the Rules of Hooks' "always the same order, never inside a condition" lint. A conditional call during setup is still a sharp edge, because a lifecycle registration that sometimes runs will leak or miss an instance. A composable returns refs. You assign `count.value` in script. The template unwraps the ref, so the template reads `count`.

React state updates are explicit. Vue updates flow from mutating a reactive object or a ref. The template is a consumer. That is why this shell keeps state out of `App.vue`. When state appears, it should be a `ref` in the component that owns the interaction, or a composable that component calls. It should not be a module-level mutable variable. A module-level variable would be shared by every instance and would not trigger a render.

`createApp` is closer to `createRoot` than it looks, with one extra step. The Vue instance can receive plugins before it is mounted. React shares that kind of dependency by rendering a provider above `<App />`. The router plugin is that provider.

## What this phase leaves in place

`pnpm exec nx serve vue-web` serves the shell at `http://localhost:4201`. `/` shows the listings placeholder. Any other path shows the not-found view, inside the same header and main region. Neither view calls the API.

Phase 4.2 can add the rest of the shell — footer, navigation behavior, and shared controls — on top of `App.vue`, `AppHeader.vue`, and the tokens, without rearranging the feature boundary.
