import { placeholderForCategory } from '../images/listing-placeholder';
import type { BusinessListing } from '../models/business-listing';
import type { BusinessListingSummary } from './business-listing-summary';

/**
 * Labels for the category strings the API writes today.
 * `ProfessionalServices` is an identifier. The card shows words.
 * An unknown future value is shown as the API sent it, so a new category
 * stays visible without a frontend release.
 */
const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  Restaurant: 'Restaurant',
  Retail: 'Retail',
  Technology: 'Technology',
  Healthcare: 'Healthcare',
  Manufacturing: 'Manufacturing',
  ProfessionalServices: 'Professional services',
  Other: 'Other',
};

/**
 * Copies one summary into the object a card renders.
 *
 * Pure: no Vue, no fetch. City and state become one location line.
 * A missing image becomes a local placeholder. `featured` is false
 * because the summary has no such flag.
 *
 * `images.example` is a documentation host. It does not resolve.
 * Putting it on `<img src>` starts a lookup that ends only when the
 * browser gives up. The same placeholder a null URL already uses is
 * applied here, before a request exists. A URL on any other host is
 * left alone, and the card still swaps in the placeholder if that
 * photo fails.
 */
export function toBusinessListing(
  summary: BusinessListingSummary,
): BusinessListing {
  const category = CATEGORY_LABELS[summary.category] ?? summary.category;

  return {
    id: summary.id,
    title: summary.title,
    description: summary.description,
    category,
    location: `${summary.city}, ${summary.state}`,
    askingPrice: summary.askingPrice,
    annualRevenue: summary.annualRevenue ?? null,
    cashFlow: summary.cashFlow ?? null,
    imageUrl: displayImage(summary.imageUrl, category),
    featured: false,
  };
}

function displayImage(imageUrl: string | null, category: string): string {
  if (imageUrl === null || imageUrl === '' || isDocumentationHost(imageUrl)) {
    return placeholderForCategory(category);
  }
  return imageUrl;
}

/** `.example`, `.invalid`, and `.test` are reserved and have no photo server. */
function isDocumentationHost(imageUrl: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch {
    return false;
  }
  return (
    hostname === 'example' ||
    hostname.endsWith('.example') ||
    hostname === 'invalid' ||
    hostname.endsWith('.invalid') ||
    hostname === 'test' ||
    hostname.endsWith('.test')
  );
}
