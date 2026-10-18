import { InjectionToken } from '@angular/core';

/**
 * Origin of the ASP.NET Core API, with no trailing slash.
 *
 * The browser will send this value on every listings request, so it is not a
 * secret. Production should replace the provider in `app.config.ts` with the
 * deployed API origin, or with a same-host path if a reverse proxy serves
 * both apps. A development proxy was not added: CORS already allows
 * http://localhost:4200, and a proxy would hide that cross-origin request.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
