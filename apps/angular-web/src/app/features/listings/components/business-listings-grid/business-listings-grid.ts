import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LISTING_PAGE_SIZE } from '../../models/listing-query';
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
 *
 * `updating` is the in-flight query after a page is already on screen.
 * The rows are the previous response. The template marks them stale so
 * they are not announced as the new result.
 */
export type ListingsGridStatus = 'loading' | 'updating' | 'ready' | 'error';

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
  /** True when the empty catalog is the result of the current filters. */
  readonly showClear = input(false);
  readonly retry = output<void>();
  readonly clearFilters = output<void>();

  /**
   * One placeholder per row the API returns by default. Fewer skeletons
   * than cards makes the grid jump when the response arrives. The slots
   * are a constant so the template does not allocate an array on every
   * check.
   */
  protected readonly skeletonSlots = Array.from(
    { length: LISTING_PAGE_SIZE },
    (_, index) => index + 1,
  );
}
