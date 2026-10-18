import { BusinessListingSummary } from './business-listing-summary';
import { toBusinessListing } from './to-business-listing';

function summary(
  overrides: Partial<BusinessListingSummary> = {},
): BusinessListingSummary {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    title: 'Elm Street Bistro',
    description: 'A 42-seat dinner restaurant.',
    askingPrice: 875_000,
    annualRevenue: 1_240_000,
    cashFlow: 186_000,
    city: 'Portland',
    state: 'OR',
    category: 'Restaurant',
    imageUrl: 'https://images.example/elm-street-bistro.jpg',
    ...overrides,
  };
}

describe('toBusinessListing', () => {
  it('joins location, labels the category, and leaves featured unset', () => {
    const listing = toBusinessListing(
      summary({ category: 'ProfessionalServices' }),
    );

    expect(listing.id).toBe('01900000-0000-7000-8000-000000000001');
    expect(listing.location).toBe('Portland, OR');
    expect(listing.category).toBe('Professional services');
    expect(listing.askingPrice).toBe(875_000);
    expect(listing.imageUrl).toBe('https://images.example/elm-street-bistro.jpg');
    expect(listing.featured).toBe(false);
  });

  it('keeps undisclosed money as null and substitutes a local image', () => {
    const listing = toBusinessListing(
      summary({
        annualRevenue: null,
        cashFlow: null,
        imageUrl: null,
        category: 'Healthcare',
      }),
    );

    expect(listing.annualRevenue).toBeNull();
    expect(listing.cashFlow).toBeNull();
    expect(listing.category).toBe('Healthcare');
    expect(listing.imageUrl).toBe('/listings/services.svg');
  });

  it('shows an unknown category string instead of dropping it', () => {
    const listing = toBusinessListing(summary({ category: 'Hospitality' }));

    expect(listing.category).toBe('Hospitality');
  });
});
