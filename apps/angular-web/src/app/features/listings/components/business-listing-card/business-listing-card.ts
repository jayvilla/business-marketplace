import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BusinessListing } from '../../models/business-listing';

/**
 * One listing, with no knowledge of the collection or where the data came from.
 *
 * `listing` is a signal input. The parent binds `[listing]="listing"`, and
 * this class reads `listing()` in the template. That read is the dependency.
 * OnPush refreshes this view when the parent passes a new object, and skips
 * it when some other card's input changes.
 *
 * The input is required. A card with no listing has nothing honest to show,
 * so the compiler and the runtime both refuse to render it unset.
 *
 * There is no `output()` and no click handler. A detail route does not exist,
 * and a control that navigates nowhere would look like a broken link.
 *
 * The title is an `h3` because this card is rendered under the page's
 * "Listing results" `h2`. The level is part of that contract.
 */
@Component({
  selector: 'app-business-listing-card',
  imports: [CurrencyPipe],
  templateUrl: './business-listing-card.html',
  styleUrl: './business-listing-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessListingCard {
  readonly listing = input.required<BusinessListing>();
}
