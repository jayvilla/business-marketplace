import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/**
 * Fallback for a URL that matched no earlier route.
 *
 * Rendered inside the shell's `<main>`, so this template has no main of its own.
 *
 * It lives next to the shell rather than under `features/listings` because
 * an unknown address is not a listings concept. It also is not a shared
 * widget: nothing embeds it. The router is its only caller.
 *
 * `RouterLink` updates the URL through the router. A normal `href` would
 * ask the browser for a new document and boot the application again.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  constructor() {
    // The browser tab is the page name before the h1 is read.
    // The shell stays mounted, so each route sets its own title.
    inject(Title).setTitle('Page not found');
  }
}
