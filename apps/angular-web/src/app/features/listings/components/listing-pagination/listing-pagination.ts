import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { listingPageCount } from '../../models/listing-query';

/**
 * Previous and next for a server page.
 *
 * The component does not know how many rows the API returns per page
 * beyond the two numbers it is given. `pageCount` is `ceil(total / size)`.
 * The API does not send that quotient. A page past the end still renders
 * so Previous can move back onto a page that has rows.
 */
@Component({
  selector: 'app-listing-pagination',
  templateUrl: './listing-pagination.html',
  styleUrl: './listing-pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingPagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pageCount = computed(() =>
    listingPageCount(this.totalCount(), this.pageSize()),
  );

  protected readonly previousTarget = computed(() =>
    this.page() > this.pageCount() ? this.pageCount() : this.page() - 1,
  );

  protected go(page: number): void {
    this.pageChange.emit(page);
  }
}
