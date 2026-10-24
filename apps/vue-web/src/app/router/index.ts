import { createRouter, createWebHistory } from 'vue-router';
import type {
  RouteMeta,
  RouteRecordRaw,
  Router,
  RouterHistory,
} from 'vue-router';

/**
 * Document title carried by every URL. The navigation guard reads `title`
 * and would otherwise leave the previous page's name in the browser tab.
 *
 * This is module augmentation. It adds a field to Vue Router's `RouteMeta`
 * instead of casting `meta` at every call site. The official pattern is a
 * side-effect import in a `.d.ts` file. This file already imports from
 * `vue-router`, so the same augmentation lives next to the routes that
 * must satisfy it.
 *
 * `meta` on a route record is still optional. Augmentation alone does not
 * reject a record that omits `meta`. `AppRouteRecord` below does.
 */
declare module 'vue-router' {
  interface RouteMeta {
    title: string;
  }
}

/**
 * A route in this table. `title` is required so a new URL cannot compile
 * without a document title.
 */
type AppRouteRecord = RouteRecordRaw & {
  meta: RouteMeta;
};

/**
 * Application URL map. The router walks this array and uses the first
 * match, so the catch-all stays last.
 *
 * `/listings` is the listings screen, the same path the Angular client
 * uses. `/` only redirects there. A second home view would be a page this
 * application does not have.
 *
 * `/:pathMatch(.*)*` is Vue Router's catch-all. The parameter name is
 * required by the syntax. This screen does not read the value. The record
 * stays last so a real path is never swallowed by it.
 *
 * The listings view and the not-found view are dynamic imports. The shell
 * chunk stays free of both. The listings import is the feature boundary:
 * the cards live in that chunk. The not-found view is a separate chunk
 * because almost no visit renders it. The `/` record is a redirect, so it
 * has no component of its own.
 */
export const routes: AppRouteRecord[] = [
  {
    path: '/',
    name: 'home',
    redirect: { name: 'listings' },
    meta: {
      title: 'Businesses for Sale',
    },
  },
  {
    path: '/listings',
    name: 'listings',
    component: () => import('../../features/listings/views/ListingsView.vue'),
    meta: {
      title: 'Businesses for Sale',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: {
      title: 'Page not found',
    },
  },
];

/**
 * `history` is an argument so a test can pass `createMemoryHistory()`.
 * The HTML5 history API writes the real address bar. A unit test should
 * not share that across cases. The running application uses the default.
 */
export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
): Router {
  const router = createRouter({
    history,
    routes,
  });

  // The shell stays mounted across navigations, so a view cannot rely on
  // a fresh document load to rename the tab. One guard covers every record
  // in `routes`. The string is the page name alone, matching the Angular
  // client, so both apps put the same text in the tab.
  router.afterEach((to) => {
    document.title = to.meta.title;
  });

  return router;
}
