import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Fallback for a URL that matched no earlier route.
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
export class NotFoundPage {}
