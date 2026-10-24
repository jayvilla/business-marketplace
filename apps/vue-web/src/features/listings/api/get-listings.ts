import { apiBaseUrl } from '../../../app/api/api-base-url';
import { getJson } from '../../../app/api/get-json';
import type { BusinessListing } from '../models/business-listing';
import type { BusinessListingPageResponse } from './business-listing-page';
import type { BusinessListingSummary } from './business-listing-summary';
import { toBusinessListing } from './to-business-listing';

/**
 * One page of cards, already in the shape `ListingsGrid` renders.
 *
 * `items` is the page the API returned. `totalCount` is the size of the
 * match, which can be larger than `items`. This phase requests the
 * default page and does not send search, filter, sort, or page query
 * parameters. The API applies its own defaults: page 1, 6 rows, newest
 * first.
 */
export interface ListingPage {
  readonly items: readonly BusinessListing[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

/**
 * `GET /api/listings`.
 *
 * Mapping happens here so a composable never sees a DTO. The mapper
 * stays a separate function and does not know about HTTP. A body that
 * is not a page throws. Mapping a missing `items` array to `[]` would
 * look like an empty catalog.
 */
export async function getListings(signal?: AbortSignal): Promise<ListingPage> {
  const body = await getJson(`${apiBaseUrl()}/api/listings`, signal);
  if (!isListingPage(body)) {
    throw new Error('Listing response was not a page.');
  }
  return {
    items: body.items.map(toBusinessListing),
    page: body.page,
    pageSize: body.pageSize,
    totalCount: body.totalCount,
  };
}

function isListingPage(value: unknown): value is BusinessListingPageResponse {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const page = value as Record<string, unknown>;
  return (
    Array.isArray(page['items']) &&
    page['items'].every(isSummary) &&
    typeof page['page'] === 'number' &&
    typeof page['pageSize'] === 'number' &&
    typeof page['totalCount'] === 'number'
  );
}

function isSummary(value: unknown): value is BusinessListingSummary {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === 'string' &&
    typeof item['title'] === 'string' &&
    typeof item['description'] === 'string' &&
    typeof item['askingPrice'] === 'number' &&
    isNullableNumber(item['annualRevenue']) &&
    isNullableNumber(item['cashFlow']) &&
    typeof item['city'] === 'string' &&
    typeof item['state'] === 'string' &&
    typeof item['category'] === 'string' &&
    (item['imageUrl'] === undefined ||
      item['imageUrl'] === null ||
      typeof item['imageUrl'] === 'string')
  );
}

function isNullableNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number';
}
