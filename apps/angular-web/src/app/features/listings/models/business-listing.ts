/**
 * One listing in the shape the card renders.
 *
 * This is not the HTTP body. `GET /api/listings` returns a summary with
 * `city`, `state`, a category identifier, and a nullable image URL.
 * `toBusinessListing` copies that summary into this type. Money stays a
 * number of US dollars so the `currency` pipe can format it. Null means
 * the API omitted the figure, not that the amount is zero.
 *
 * `featured` is a card concern. The summary DTO has no such field, so API
 * data maps it to false. The card still honors true when a test or a later
 * contract sets it.
 *
 * Fields are readonly. OnPush notices a new object, not a mutated field.
 */
export interface BusinessListing {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly location: string;
  readonly askingPrice: number;
  readonly annualRevenue: number | null;
  readonly cashFlow: number | null;
  readonly imageUrl: string;
  readonly featured: boolean;
}
