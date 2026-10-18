import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Site footer. It has no state, so it does not need a signal.
 * It is still a component: the shell template stays a list of landmarks,
 * and these links are the same router directives the header uses.
 * A second footer somewhere inside a feature would be a reason to move
 * this to `shared/`. One footer is not that reason; it stays under `layout/`.
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {}
