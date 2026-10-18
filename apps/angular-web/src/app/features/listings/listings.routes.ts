import { Routes } from '@angular/router';
import { ListingsPage } from './pages/listings-page';

/**
 * URLs owned by the listings feature.
 *
 * The parent route already consumed the `listings` segment, so paths here are
 * relative to `/listings`. An empty path is the feature's index. A future
 * listing detail route can be declared beside it as `:id` without editing
 * the application route table.
 *
 * The page is a static import on purpose. This file is already the lazy
 * boundary, so the page ships in the same chunk. Nesting `loadComponent`
 * under `loadChildren` would only add a second request.
 */
export const listingsRoutes: Routes = [
  {
    path: '',
    component: ListingsPage,
    title: 'Business listings',
  },
];
