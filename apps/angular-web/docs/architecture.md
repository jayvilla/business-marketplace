# Architecture and project setup

## Purpose

`apps/angular-web` is the Angular client for the marketplace. It renders the shell and the listings screen, and it calls the ASP.NET API on port 5000. A React reader can treat it as a single-page app with a router and one feature folder.

## Architecture

```text
apps/angular-web/src/
├── main.ts                         bootstrapApplication
├── index.html                      <app-root>
├── styles.scss                     global styles, tokens
├── styles/_tokens.scss
├── styles/_breakpoints.scss
└── app/
    ├── app.ts                      shell component
    ├── app.config.ts               providers
    ├── app.routes.ts               top-level routes
    ├── core/api-base-url.ts        InjectionToken
    ├── layout/                     header and footer
    ├── pages/not-found-page.ts
    └── features/listings/          the only feature
```

Nx project name: `angular-web`. The build target is `@angular/build:application`. The dev server target sets port 4200. Tests use `@angular/build:unit-test` with `watch: false`. There is no e2e target. `nx.json` sets the Angular application generator's `e2eTestRunner` to `none`.

The app does not import `apps/vue-web` or `apps/api`. The JSON contract is re-declared in TypeScript under `features/listings/api/`.

## Implementation

`main.ts` starts the app without a module:

```ts
bootstrapApplication(App, appConfig).catch((err: unknown) =>
  console.error(err),
);
```

`app.config.ts` is the injector. It registers four things:

- `provideBrowserGlobalErrorListeners()`
- `provideRouter(appRoutes)`
- `provideHttpClient()` with no interceptors
- `{ provide: API_BASE_URL, useValue: 'http://localhost:5000' }`

`API_BASE_URL` is an `InjectionToken<string>` in `core/api-base-url.ts`. The comment in `app.config.ts` says a deployed build should replace that provider. The token is not a secret. The browser sends it on every request.

`app.routes.ts` walks in order:

| Path | Behavior |
| --- | --- |
| `''` with `pathMatch: 'full'` | Redirects to `/listings` |
| `listings` | `loadChildren` of `listings.routes.ts` |
| `**` | `loadComponent` of `NotFoundPage`, title `Page not found` |

`pathMatch: 'full'` matters. An empty path without it is a prefix of every URL, and the redirect would win before `listings`.

`listings.routes.ts` is already the lazy chunk. Its only route is `path: ''`, component `ListingsPage`, title `Businesses for Sale`. The page is a static import inside that file. A nested `loadComponent` would add a second request for code that is already in the chunk. A future `:id` route can sit beside the empty path without editing `app.routes.ts`.

`App` is a standalone component. `imports: [Header, Footer, RouterOutlet]` is the template's dependency list. A missing import is a compile error. The class has no fields. `ChangeDetectionStrategy.OnPush` is set on the shell. A signal write in `Header` still refreshes that child.

## Angular concepts

Standalone components replace `NgModule` declarations. `bootstrapApplication` replaces `platformBrowserDynamic().bootstrapModule(AppModule)`. Providers in `app.config.ts` are the old `AppModule.providers` array.

`loadChildren` and `loadComponent` are the router's code-splitting API. They return a dynamic `import()`.

`inject()` reads the injector from the current injection context. A service constructor and a component field initializer are both valid places. `BusinessListingsService` uses `inject(HttpClient)` and `inject(API_BASE_URL)`.

## React comparison

`bootstrapApplication` is `createRoot`. `app.config.ts` is the provider tree you would pass as `<BrowserRouter>` plus a context value for the API origin. `loadChildren` is `React.lazy` on a route. Standalone `imports` are closer to an explicit import list than to React, where using a component is enough once the file is imported.

## Vue comparison

Vue's `main.ts` calls `createApp` and `app.use(router)`. Angular splits that into `bootstrapApplication` and `appConfig`. Vue lazy-loads `ListingsView.vue` and `NotFoundView.vue` with dynamic imports in `apps/vue-web/src/app/router/index.ts`. Angular lazy-loads a route module for listings and a component for not-found. Both keep `/` as a redirect to `/listings`.

See [Vue architecture](../../vue-web/docs/phase-4.1-architecture.md).

## Engineering decisions

No `NgModule`. The file that would have listed every component added nothing once standalone `imports` existed.

No HTTP interceptors. One listings call does not need a cross-cutting header or a retry interceptor. Cancellation lives on the page's `switchMap`.

The API origin is a token, not `environment.ts`. Replacing one provider is the deployment seam the config comment describes.

The listings page is not a second lazy boundary under `loadChildren`. The route file is the boundary.

## Testing

`app.routes.spec.ts` covers the redirect, the listings route, and the wildcard. `app.spec.ts` covers the skip link and the landmarks. `nx test angular-web` runs the suite. This documentation pass did not re-run it. The phase 4.10 review recorded 69 passing tests after the header focus tests were added.

## Key takeaways

The composition root is `app.config.ts`. The shell component stays empty on purpose. The feature boundary is a lazy route file, and the page ships inside that chunk.
