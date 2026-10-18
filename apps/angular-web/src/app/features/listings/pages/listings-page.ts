import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mockBusinessListings } from '../data/mock-business-listings';
import { BusinessListingsGrid } from '../components/business-listings-grid/business-listings-grid';

/**
 * Listings route. It owns the page heading and the sample collection.
 * The grid owns how that collection looks.
 *
 * `sampleListings` is the mock array itself, not a copy. The objects are
 * readonly, and this phase never replaces them. When a service exists, this
 * field becomes a signal of request state and the grid inputs stay the same.
 */
@Component({
  selector: 'app-listings-page',
  imports: [BusinessListingsGrid],
  templateUrl: './listings-page.html',
  styleUrl: './listings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsPage {
  readonly sampleListings = mockBusinessListings;
}
