import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from './core/api-base-url';
import { appRoutes } from './app.routes';

/**
 * Application-wide dependency-injection setup.
 *
 * `bootstrapApplication` in `main.ts` passes this object to the injector
 * before the root component is created. A later `inject(Router)` call, or a
 * `router-outlet` in a template, resolves against the providers registered
 * here. Route and component providers can add narrower overrides, but the
 * router itself is a singleton created once by `provideRouter`.
 *
 * This file is the standalone replacement for an `AppModule.providers` array.
 * Keeping infrastructure here leaves `App` responsible only for the shell
 * template.
 *
 * `provideHttpClient()` registers `HttpClient` once, the same way
 * `provideRouter` registers the router. A listings service then
 * `inject(HttpClient)`. Putting that provider on a component would create
 * a second client and hide the application's HTTP setup in a feature.
 *
 * `API_BASE_URL` is the local API origin. It is not read from a component.
 * Replace this provider for a deployed environment. Do not put credentials
 * in it. The browser can see the value.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Reports uncaught browser errors through Angular's ErrorHandler.
    provideBrowserGlobalErrorListeners(),
    // Constructs the router and gives it the top-level route table.
    provideRouter(appRoutes),
    // One HttpClient for the application. No interceptors yet.
    provideHttpClient(),
    { provide: API_BASE_URL, useValue: 'http://localhost:5000' },
  ],
};
