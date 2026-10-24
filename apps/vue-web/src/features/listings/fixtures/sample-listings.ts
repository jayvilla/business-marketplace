import type { BusinessListing } from '../models/business-listing';

/**
 * One fictional business. Specs override the field they care about.
 * The page fixture below is the only data `ListingsView` renders.
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

/**
 * Deterministic stand-in for a listings page. Not a response from
 * `GET /api/listings`. One row is featured, and one figure is undisclosed,
 * so those card states are visible without a toggle.
 */
export const fixtureListings: readonly BusinessListing[] = [
  businessListing({ featured: true }),
  businessListing({
    id: 'lst-cedar',
    title: 'Cedar Bakery',
    description:
      'A fictional retail bakery in Tampa. The sample leaves cash flow undisclosed.',
    category: 'Retail',
    location: 'Tampa, FL',
    askingPrice: 114_085,
    annualRevenue: 193_945,
    cashFlow: null,
    imageUrl: '/listings/retail.svg',
    featured: false,
  }),
  businessListing({
    id: 'lst-northbridge',
    title: 'Northbridge Accounting',
    description:
      'A fictional professional-services practice. Revenue and cash flow are both undisclosed in this sample.',
    category: 'Professional services',
    location: 'Austin, TX',
    askingPrice: 640_000,
    annualRevenue: null,
    cashFlow: null,
    imageUrl: '/listings/services.svg',
    featured: false,
  }),
];
