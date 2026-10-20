import { BusinessListing } from '../models/business-listing';

/**
 * One fictional business for component tests.
 *
 * Specs pass overrides for the field they care about. Copying this object
 * into each spec would let the title, the money, and the image drift apart,
 * and a failure would no longer mean the same listing.
 */
export function businessListing(
  overrides: Partial<BusinessListing> = {},
): BusinessListing {
  return {
    id: 'lst-harbor',
    title: 'Harbor & Rye',
    description: 'A fictional neighborhood restaurant used in component tests.',
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
