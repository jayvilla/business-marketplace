import { BusinessListingSummary } from './business-listing-summary';

/**
 * JSON body of `GET /api/listings`.
 *
 * `items` is one page. `totalCount` is every active row that matched,
 * including rows on other pages. The TypeScript type is a claim about
 * that JSON. It is not checked at runtime.
 */
export interface BusinessListingPageResponse {
  readonly items: readonly BusinessListingSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}
