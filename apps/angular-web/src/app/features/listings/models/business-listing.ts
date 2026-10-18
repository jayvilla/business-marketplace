/**
 * One fictional business for sale, in the shape the listings UI renders.
 *
 * Money fields are US dollars as numbers. They are not formatted strings and
 * they are not cents. The `currency` pipe formats them in the template, so
 * this type stays free of locale details.
 *
 * This is a domain model, not an API DTO and not a view model. A DTO would
 * mirror a server payload: integer cents, separate city and region fields,
 * or properties the screen never shows. A view model would already contain
 * "$875,000". Keeping those steps apart means a future HTTP mapper is the
 * only place that translates the wire format, and the card does not care
 * whether the object came from a file or from the API.
 *
 * Fields are readonly so a card cannot change a listing it was given. OnPush
 * only notices a new object, not a mutated field. Replacing the object is
 * the update path.
 */
export interface BusinessListing {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: BusinessCategory;
  readonly location: string;
  readonly askingPrice: number;
  readonly annualRevenue: number;
  readonly cashFlow: number;
  readonly imageUrl: string;
  readonly featured: boolean;
}

/**
 * Closed set of categories the sample data uses. A plain `string` would
 * accept a typo and give the filters, when they exist, nothing to group on.
 * Location stays a string: nothing filters or geocodes it yet, so a
 * city/region object would be structure with no behavior.
 */
export const businessCategories = [
  'Restaurants',
  'Coffee shops',
  'Retail',
  'Automotive',
  'Professional services',
  'E-commerce',
  'Fitness',
  'Technology',
] as const;

export type BusinessCategory = (typeof businessCategories)[number];
