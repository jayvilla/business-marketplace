import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// No AppModule. The platform creates an injector from `appConfig`, then
// mounts `App` on the `<app-root>` element in index.html.
//
// `Promise.catch` types the rejection as `any`. Annotating `unknown` means a
// failed bootstrap is not a value whose properties can be read by accident.
bootstrapApplication(App, appConfig).catch((err: unknown) =>
  console.error(err),
);
