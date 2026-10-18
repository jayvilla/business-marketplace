import { Routes } from '@angular/router';

/**
 * Top-level URL map. The router walks this array in order and uses the first
 * match, so the wildcard has to stay last.
 *
 * `/` is not a page. `pathMatch: 'full'` makes the empty path match only the
 * bare URL. Without it, `''` is a prefix of every URL and the redirect would
 * win before `listings` could.
 *
 * `loadChildren` is the feature boundary. Visiting `/listings` downloads
 * `listings.routes` and anything that file imports. The shell bundle does not
 * contain the listings page, and this file does not need to change when the
 * feature adds a detail URL later — that child route belongs to the feature.
 *
 * The unknown-page component is loaded the same way, with `loadComponent`,
 * because a direct import would put a rarely shown screen in the initial
 * bundle. `loadComponent` is enough here: the page has no child routes.
 */
export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/listings',
  },
  {
    path: 'listings',
    loadChildren: () =>
      import('./features/listings/listings.routes').then(
        (m) => m.listingsRoutes,
      ),
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () =>
      import('./pages/not-found-page').then((m) => m.NotFoundPage),
  },
];
