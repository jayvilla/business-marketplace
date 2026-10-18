import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
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
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Reports uncaught browser errors through Angular's ErrorHandler.
    provideBrowserGlobalErrorListeners(),
    // Constructs the router and gives it the top-level route table.
    provideRouter(appRoutes),
  ],
};
