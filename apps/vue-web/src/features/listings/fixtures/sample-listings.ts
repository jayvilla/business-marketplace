import type { BusinessListing } from '../models/business-listing';

/**
 * One fictional business. Card and grid specs override the field they
 * care about. The listings page does not import this module. It loads
 * `GET /api/listings`.
 */
export function businessListing(
  overrides: Partial<BusinessListing> = {},
): BusinessListing {
  return {
    id: 'lst-harbor',
    title: 'Harbor & Rye',
    description:
      'A fictional neighborhood restaurant. Dinner service, a small bar, and a lease the sample treats as transferable.',
    category: 'Restaurant',
    location: 'Seattle, WA',
    askingPrice: 875_000,
    annualRevenue: 1_420_000,
    cashFlow: 186_000,
    imageUrl: '/listings/restaurant.svg',
    featured: false,
    ...overrides,
  };
}
