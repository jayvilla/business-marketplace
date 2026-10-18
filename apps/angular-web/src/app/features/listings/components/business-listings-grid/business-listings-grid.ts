import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BusinessListing } from '../../models/business-listing';
import { BusinessListingCard } from '../business-listing-card/business-listing-card';

/**
 * How a collection of listings is drawn, including the states around it.
 *
 * The page chooses the status and the array. This component does not fetch,
 * filter, or sort. Loading, empty, and error are inputs so a test can show
 * each one without a timer or a fake HTTP call. The service phase can pass
 * the same inputs once a request exists.
 *
 * Empty is not its own status. It is `ready` with no rows. A separate
 * `empty` status could disagree with an array that still has items.
 */
export type ListingsGridStatus = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-business-listings-grid',
  imports: [BusinessListingCard],
  templateUrl: './business-listings-grid.html',
  styleUrl: './business-listings-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessListingsGrid {
  readonly listings = input<readonly BusinessListing[]>([]);
  readonly status = input<ListingsGridStatus>('ready');
  readonly errorMessage = input('Sample listings could not be loaded.');
  readonly emptyMessage = input('No businesses are listed yet.');
  /** True while a newer request is in flight and the previous rows stay visible. */
  readonly busy = input(false);
  readonly retry = output<void>();

  /**
   * Fixed slots, not `Array.from` in the template. A function call in a
   * template runs on every check. This array is created once.
   */
  protected readonly skeletonSlots = [1, 2, 3, 4] as const;
}
