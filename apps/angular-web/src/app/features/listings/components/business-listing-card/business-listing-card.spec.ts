import { TestBed } from '@angular/core/testing';
import { placeholderForCategory } from '../../images/listing-placeholder';
import { businessListing } from '../../testing/listing-fixtures';
import { BusinessListingCard } from './business-listing-card';

/**
 * `TestBed` builds a module for this spec. The card is standalone, so
 * `imports` is the component itself; there is no NgModule to declare.
 * `createComponent` returns a fixture: the component instance plus the
 * DOM it rendered. Assertions read that DOM. Reading `listing()` would
 * only prove the input was stored, which the template binding already did.
 */
describe('BusinessListingCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessListingCard],
    }).compileComponents();
  });

  async function render(
    value: ReturnType<typeof businessListing>,
  ): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(BusinessListingCard);
    fixture.componentRef.setInput('listing', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the listing content and formats whole-dollar amounts', async () => {
    const compiled = await render(businessListing({ featured: true }));

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
    fixture.componentRef.setInput('listing', businessListing({ featured: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Featured');

    fixture.componentRef.setInput('listing', businessListing({ featured: false }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Featured');
  });

  it('says a missing financial figure was not disclosed', async () => {
    const compiled = await render(
      businessListing({ cashFlow: null, annualRevenue: null }),
    );

    expect(compiled.textContent).toContain('$875,000');
    expect(compiled.textContent).toContain('Not disclosed');
    expect(compiled.textContent).not.toContain('$1,420,000');
  });

  it('replaces the previous listing when the input changes', async () => {
    const fixture = TestBed.createComponent(BusinessListingCard);
    fixture.componentRef.setInput(
      'listing',
      businessListing({ featured: true, imageUrl: 'https://images.example/harbor.jpg' }),
    );
    await fixture.whenStable();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    image.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(image.getAttribute('src')).toBe(placeholderForCategory('Restaurant'));

    fixture.componentRef.setInput(
      'listing',
      businessListing({
        id: 'lst-elm',
        title: 'Elm Street Bistro',
        category: 'Retail',
        location: 'Portland, OR',
        askingPrice: 540_000,
        featured: false,
        imageUrl: '/listings/retail.svg',
      }),
    );
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Elm Street Bistro');
    expect(text).toContain('Portland, OR');
    expect(text).toContain('$540,000');
    expect(text).not.toContain('Harbor & Rye');
    expect(text).not.toContain('Featured');
    expect(image.getAttribute('src')).toBe('/listings/retail.svg');
  });
});
