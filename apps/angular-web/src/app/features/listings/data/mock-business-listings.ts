import { BusinessListing } from '../models/business-listing';

/**
 * Fictional sample listings. Names, places, and figures are invented.
 * They are not offers to buy a real business.
 *
 * The array lives beside the feature, not inside a component, so the page
 * can hand the same data to the grid and a later service can replace this
 * import without the card learning where listings come from.
 *
 * Identifiers are stable strings. `@for` tracks `id`, and an index would
 * change when the array is reordered.
 *
 * Images are local SVG files in `public/listings`. A remote placeholder
 * URL would fail the layout whenever that host was slow or blocked.
 */
export const mockBusinessListings: readonly BusinessListing[] = [
  {
    id: 'lst-harbor-rye',
    title: 'Harbor & Rye',
    description:
      'A 48-seat neighborhood restaurant with a dinner-only service and a small bar program. The sample figures assume a single leased room on a retail street.',
    category: 'Restaurants',
    location: 'Seattle, WA',
    askingPrice: 875_000,
    annualRevenue: 1_420_000,
    cashFlow: 186_000,
    imageUrl: '/listings/restaurant.svg',
    featured: true,
  },
  {
    id: 'lst-northbeam-coffee',
    title: 'Northbeam Coffee',
    description:
      'A neighborhood coffee bar with morning pastry sales and a short lunch menu. The sample treats the business as one counter-service shop.',
    category: 'Coffee shops',
    location: 'Portland, OR',
    askingPrice: 420_000,
    annualRevenue: 680_000,
    cashFlow: 96_000,
    imageUrl: '/listings/coffee.svg',
    featured: false,
  },
  {
    id: 'lst-lumen-home',
    title: 'Lumen Home',
    description:
      'A home-goods shop carrying furniture, lighting, and small housewares. The sample figures are for one street-level store, not a chain.',
    category: 'Retail',
    location: 'Austin, TX',
    askingPrice: 640_000,
    annualRevenue: 980_000,
    cashFlow: 121_000,
    imageUrl: '/listings/retail.svg',
    featured: true,
  },
  {
    id: 'lst-redline-auto',
    title: 'Redline Auto Care',
    description:
      'An independent repair shop with four service bays and a small parts counter. The sample excludes any real-estate value for the building.',
    category: 'Automotive',
    location: 'Denver, CO',
    askingPrice: 1_100_000,
    annualRevenue: 1_850_000,
    cashFlow: 240_000,
    imageUrl: '/listings/automotive.svg',
    featured: false,
  },
  {
    id: 'lst-calder-bookkeeping',
    title: 'Calder Bookkeeping',
    description:
      'A bookkeeping practice serving local professional firms. The sample assumes recurring monthly clients and no licensed audit work.',
    category: 'Professional services',
    location: 'Chicago, IL',
    askingPrice: 390_000,
    annualRevenue: 540_000,
    cashFlow: 175_000,
    imageUrl: '/listings/services.svg',
    featured: false,
  },
  {
    id: 'lst-fieldnote-goods',
    title: 'Fieldnote Goods',
    description:
      'An online shop selling paper goods and desk accessories, fulfilled from one warehouse. The sample has no physical storefront.',
    category: 'E-commerce',
    location: 'Boise, ID',
    askingPrice: 720_000,
    annualRevenue: 1_600_000,
    cashFlow: 210_000,
    imageUrl: '/listings/ecommerce.svg',
    featured: false,
  },
  {
    id: 'lst-ironwood-athletic',
    title: 'Ironwood Athletic',
    description:
      'A membership gym with coached group classes and a free-weight floor. The sample figures cover one club and its current member base.',
    category: 'Fitness',
    location: 'San Diego, CA',
    askingPrice: 950_000,
    annualRevenue: 1_300_000,
    cashFlow: 155_000,
    imageUrl: '/listings/fitness.svg',
    featured: false,
  },
  {
    id: 'lst-parcel-logic',
    title: 'Parcel Logic',
    description:
      'A small software studio building shipping tools for independent retailers. The sample is an asset sale of the product, not a staffing firm.',
    category: 'Technology',
    location: 'Raleigh, NC',
    askingPrice: 1_800_000,
    annualRevenue: 2_100_000,
    cashFlow: 640_000,
    imageUrl: '/listings/technology.svg',
    featured: true,
  },
  {
    id: 'lst-mesa-plate',
    title: 'Mesa Plate',
    description:
      'A daytime restaurant focused on counter service and takeout. The sample assumes a smaller staff and a shorter day than a dinner house.',
    category: 'Restaurants',
    location: 'Albuquerque, NM',
    askingPrice: 510_000,
    annualRevenue: 890_000,
    cashFlow: 102_000,
    imageUrl: '/listings/restaurant.svg',
    featured: false,
  },
  {
    id: 'lst-birch-main',
    title: 'Birch & Main Market',
    description:
      'A neighborhood market with groceries, household basics, and a short prepared-food case. The sample is one leased shop.',
    category: 'Retail',
    location: 'Madison, WI',
    askingPrice: 455_000,
    annualRevenue: 770_000,
    cashFlow: 88_000,
    imageUrl: '/listings/retail.svg',
    featured: false,
  },
];
