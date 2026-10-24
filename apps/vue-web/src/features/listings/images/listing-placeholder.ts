/**
 * Local stand-in when a photo URL fails to load.
 *
 * The files in `public/listings` are the same illustrations the Angular
 * client serves. Keys are the card's display labels, including
 * "Professional services", not the API identifier `ProfessionalServices`.
 */
const PLACEHOLDERS: Readonly<Record<string, string>> = {
  Restaurant: '/listings/restaurant.svg',
  Retail: '/listings/retail.svg',
  Technology: '/listings/technology.svg',
  Healthcare: '/listings/services.svg',
  Manufacturing: '/listings/automotive.svg',
  'Professional services': '/listings/services.svg',
  Other: '/listings/retail.svg',
};

export function placeholderForCategory(category: string): string {
  return PLACEHOLDERS[category] ?? '/listings/retail.svg';
}
