import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

/**
 * Application shell. It stays mounted for the life of the page.
 *
 * The template lists three landmarks and the outlet. Header and footer are
 * separate components so menu behavior and footer markup do not accumulate
 * in this class. This class has no fields: there is nothing for it to track.
 *
 * Standalone `imports` are the template's dependencies. `Header` is listed
 * because the template contains `<app-header>`. The Angular compiler checks
 * that. A missing import is a build error, not a blank region at runtime.
 *
 * `OnPush` on this shell does not block the header. A signal write in
 * `Header` marks that child view, and Angular refreshes the child even
 * when this parent has nothing new to render.
 */
@Component({
  selector: 'app-root',
  imports: [Header, Footer, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
