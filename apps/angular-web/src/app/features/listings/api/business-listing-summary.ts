/**
 * JSON body of `GET /api/listings`.
 *
 * This is the summary DTO, not `BusinessListingDto`. The collection route
 * returns a JSON array of these objects. It does not wrap them in
 * `{ data: ... }`. Property names are camelCase.
 *
 * The type is a compile-time claim. `HttpClient` will not reject a payload
 * that misses a field or sends a category the API has not documented.
 * Guids arrive as strings. Money arrives as JSON numbers. `annualRevenue`,
 * `cashFlow`, and `imageUrl` are null when the seller did not disclose them.
 * There is no `featured` field and no single `location` string.
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
