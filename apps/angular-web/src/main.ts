import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// No AppModule. The platform creates an injector from `appConfig`, then
// mounts `App` on the `<app-root>` element in index.html.
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
