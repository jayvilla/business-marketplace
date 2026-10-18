import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Application shell. It stays mounted for the life of the page and does not
 * render a feature itself.
 *
 * Standalone components list their own template dependencies in `imports`.
 * Nothing here is declared in an NgModule. `RouterOutlet` is the directive
 * that marks where the router inserts the component for the active URL.
 *
 * `OnPush` limits when Angular checks this view. The default strategy walks
 * the component tree whenever any application event might have changed data.
 * OnPush skips that walk unless an input reference changes, a DOM event
 * originates in this template, or a signal read during rendering updates.
 * The shell has no inputs and no local state, so those extra checks would
 * never find a change.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
