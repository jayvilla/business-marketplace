import { describe, expect, it } from 'vitest';
import type { BusinessListingSummary } from './business-listing-summary';
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
  it('maps a complete summary onto the card model', () => {
    const listing = toBusinessListing(
      summary({ category: 'ProfessionalServices' }),
    );

    expect(listing.id).toBe('01900000-0000-7000-8000-000000000001');
    expect(listing.title).toBe('Elm Street Bistro');
    expect(listing.description).toBe('A 42-seat dinner restaurant.');
    expect(listing.location).toBe('Portland, OR');
    expect(listing.category).toBe('Professional services');
    expect(listing.askingPrice).toBe(875_000);
    expect(listing.annualRevenue).toBe(1_240_000);
    expect(listing.cashFlow).toBe(186_000);
    expect(listing.imageUrl).toBe('/listings/services.svg');
    expect(listing.featured).toBe(false);
  });

  it('keeps a real image URL and replaces a documentation host', () => {
    const real = toBusinessListing(
      summary({
        imageUrl: 'https://cdn.example.com/elm.jpg',
        category: 'Retail',
      }),
    );
    const documented = toBusinessListing(summary());

    expect(real.imageUrl).toBe('https://cdn.example.com/elm.jpg');
    expect(documented.imageUrl).toBe('/listings/restaurant.svg');
  });

  it('keeps withheld money as null and substitutes a missing image', () => {
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
    expect(listing.askingPrice).toBe(875_000);
    expect(listing.imageUrl).toBe('/listings/services.svg');
  });

  it('treats an empty image URL as missing', () => {
    const listing = toBusinessListing(
      summary({ imageUrl: '', category: 'Manufacturing' }),
    );

    expect(listing.imageUrl).toBe('/listings/automotive.svg');
  });

  it('shows an unknown category string instead of dropping it', () => {
    const listing = toBusinessListing(
      summary({ category: 'Hospitality', imageUrl: null }),
    );

    expect(listing.category).toBe('Hospitality');
    expect(listing.imageUrl).toBe('/listings/retail.svg');
  });
});
