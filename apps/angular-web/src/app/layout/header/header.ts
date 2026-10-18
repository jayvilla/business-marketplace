import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';

/**
 * Site header. It is its own component because it owns mobile-menu state
 * and the primary links. `App` only composes landmarks. A feature page
 * should not know the menu exists.
 *
 * `header.html` is this class's template. `menuOpen()` reads the signal.
 * `(click)="toggleMenu()"` is an event binding: Angular listens on that
 * element and calls the method when the event fires. The call is already
 * inside Angular, so no manual change detection is required.
 *
 * `OnPush` would ignore an unrelated update elsewhere in the app. It still
 * refreshes this view when `menuOpen` changes, because the template read
 * the signal while rendering and Angular recorded that dependency.
 *
 * The panel is a disclosure in normal document flow, not a modal. Focus is
 * not trapped. `display: none` while closed (see the stylesheet) removes
 * the links from keyboard and screen-reader order on small screens.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenuFromKeyboard()',
  },
})
export class Header {
  private readonly router = inject(Router);

  /**
   * `viewChild` is a signal of the button marked `#menuButton`.
   * It is how this class reaches that element without `document.querySelector`.
   * Escape handling uses it to return focus to the control that opened the menu.
   */
  private readonly menuButton =
    viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  /** Local UI state. One boolean does not need a service or a store. */
  protected readonly menuOpen = signal(false);

  constructor() {
    // `Router.events` is still an Observable. This is the one subscription.
    // A click handler on the links would miss the browser Back button.
    // `takeUntilDestroyed()` unsubscribes when the header is destroyed.
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenuFromKeyboard(): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    this.menuButton()?.nativeElement.focus();
  }
}
