/**
 * Local stand-in for a summary with no image URL, or a URL that fails to load.
 * The development seed points at `images.example`, which does not resolve.
 * These files are the illustrations already shipped with the app.
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
