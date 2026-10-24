import type { BusinessListingSummary } from './business-listing-summary';

/**
 * JSON body of `GET /api/listings`.
 *
 * `items` is one page. The API default is page 1 and 6 rows. `totalCount`
 * is every active row that matched, including rows this response did not
 * include. An empty catalog is HTTP 200 with `items: []` and
 * `totalCount: 0`, not a bare array and not 404.
 */
export interface BusinessListingPageResponse {
  readonly items: readonly BusinessListingSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}
