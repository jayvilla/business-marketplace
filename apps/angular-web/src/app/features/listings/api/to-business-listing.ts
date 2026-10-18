import { placeholderForCategory } from '../images/listing-placeholder';
import { BusinessListing } from '../models/business-listing';
import { BusinessListingSummary } from './business-listing-summary';

/**
 * Labels for the category strings the API writes today.
 * `ProfessionalServices` is an identifier. The card shows words.
 * An unknown future value is shown as the API sent it, so a new category
 * does not disappear and does not require a frontend release to be visible.
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
 * Copies one summary into the object the card renders.
 *
 * City and state become one location line. Category identifiers become
 * labels. A missing image becomes a local placeholder. `featured` is false
 * because the summary DTO has no such flag; inventing one would badge
 * listings the API did not mark.
 */
export function toBusinessListing(summary: BusinessListingSummary): BusinessListing {
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
    imageUrl: summary.imageUrl ?? placeholderForCategory(category),
    featured: false,
  };
}
