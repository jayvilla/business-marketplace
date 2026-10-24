/**
 * One listing in the shape a card renders.
 *
 * This is not `BusinessListingSummaryDto` and not the Angular HTTP summary.
 * Those keep `city` and `state` apart, send a category identifier such as
 * `ProfessionalServices`, and use a nullable image URL. The card wants one
 * location line, a display label, and a URL it can put on `<img>`. The
 * phase that calls the API owns that copy. This phase's fixtures are
 * already in this shape, so there is no mapper yet.
 *
 * Null money means the seller did not disclose the figure. It does not
 * mean zero. `featured` is a card flag. The summary DTO has no such field,
 * so API data will map it to false. A fixture may set it so the badge can
 * be seen.
 *
 * `id` is the stable identity used as the list key. The API sends a GUID
 * string. A fixture may use any unique string.
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
