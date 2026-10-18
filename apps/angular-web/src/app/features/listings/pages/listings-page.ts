import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Routed placeholder for the listings feature.
 *
 * The router instantiates this class when `/listings` is active and destroys
 * it on the way out. `App` never imports it. That is what keeps the feature
 * out of the shell: the only link is the lazy route.
 *
 * OnPush matters more once this screen reads listing data. A signal written
 * by a listings service will refresh this view, because reading a signal
 * during template rendering records it as a dependency. Unrelated updates
 * elsewhere in the app will not.
 */
@Component({
  selector: 'app-listings-page',
  templateUrl: './listings-page.html',
  styleUrl: './listings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsPage {}
