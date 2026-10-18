import { TestBed } from '@angular/core/testing';
import { BusinessListing } from '../../models/business-listing';
import { BusinessListingCard } from './business-listing-card';

function listing(overrides: Partial<BusinessListing> = {}): BusinessListing {
  return {
    id: 'lst-test',
    title: 'Harbor & Rye',
    description: 'A fictional neighborhood restaurant used in the card test.',
    category: 'Restaurant',
    location: 'Seattle, WA',
    askingPrice: 875_000,
    annualRevenue: 1_420_000,
    cashFlow: 186_000,
    imageUrl: '/listings/restaurant.svg',
    featured: true,
    ...overrides,
  };
}

describe('BusinessListingCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessListingCard],
    }).compileComponents();
  });

  async function render(value: BusinessListing): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(BusinessListingCard);
    fixture.componentRef.setInput('listing', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the listing content and formats whole-dollar amounts', async () => {
    const compiled = await render(listing());

    expect(compiled.querySelector('h3')?.textContent).toContain('Harbor & Rye');
    expect(compiled.textContent).toContain('Restaurant');
    expect(compiled.textContent).toContain('Seattle, WA');
    expect(compiled.textContent).toContain('fictional neighborhood restaurant');
    expect(compiled.textContent).toContain('Asking price');
    expect(compiled.textContent).toContain('$875,000');
    expect(compiled.textContent).toContain('$1,420,000');
    expect(compiled.textContent).toContain('$186,000');

    const image = compiled.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/listings/restaurant.svg');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(compiled.querySelector('a, button')).toBeNull();
  });

  it('shows the featured badge only when the listing is featured', async () => {
    const fixture = TestBed.createComponent(BusinessListingCard);
    fixture.componentRef.setInput('listing', listing({ featured: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Featured');

    fixture.componentRef.setInput('listing', listing({ featured: false }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Featured');
  });

  it('says a missing financial figure was not disclosed', async () => {
    const compiled = await render(listing({ cashFlow: null, annualRevenue: null }));

    expect(compiled.textContent).toContain('$875,000');
    expect(compiled.textContent).toContain('Not disclosed');
    expect(compiled.textContent).not.toContain('$1,420,000');
  });
});
