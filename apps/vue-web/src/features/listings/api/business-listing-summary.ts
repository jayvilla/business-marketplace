/**
 * One object inside `items` on `GET /api/listings`.
 *
 * This is `BusinessListingSummaryDto`, not the detail DTO and not the
 * card model. ASP.NET writes camelCase. A GUID arrives as a string.
 * Money arrives as a JSON number. `annualRevenue`, `cashFlow`, and
 * `imageUrl` are null when the seller did not disclose them. Category
 * is the identifier, such as `ProfessionalServices`. There is no
 * `featured` field and no single `location` string.
 *
 * The type is a claim about that JSON. It is checked by the listings
 * client before a field is read. TypeScript does not do that check.
 */
export interface BusinessListingSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly askingPrice: number;
  readonly annualRevenue: number | null;
  readonly cashFlow: number | null;
  readonly city: string;
  readonly state: string;
  readonly category: string;
  readonly imageUrl: string | null;
}
