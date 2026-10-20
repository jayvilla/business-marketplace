import { TestBed } from '@angular/core/testing';
import { BusinessListing } from '../../models/business-listing';
import { BusinessListingsGrid } from './business-listings-grid';

function listing(id: string, title: string): BusinessListing {
  return {
    id,
    title,
    description: 'Fictional sample used by the grid test.',
    category: 'Retail',
    location: 'Austin, TX',
    askingPrice: 100_000,
    annualRevenue: 200_000,
    cashFlow: 30_000,
    imageUrl: '/listings/retail.svg',
    featured: false,
  };
}

describe('BusinessListingsGrid', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessListingsGrid],
    }).compileComponents();
  });

  it('renders one card per listing, tracked content included', async () => {
    const fixture = TestBed.createComponent(BusinessListingsGrid);
    fixture.componentRef.setInput('listings', [
      listing('lst-a', 'Elm Street Bistro'),
      listing('lst-b', 'King Street Bakery'),
    ]);
    await fixture.whenStable();

    const cards = fixture.nativeElement.querySelectorAll(
      'app-business-listing-card',
    );
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Elm Street Bistro');
    expect(fixture.nativeElement.textContent).toContain('King Street Bakery');
  });

  it('renders the empty state when the ready collection has no rows', async () => {
    const fixture = TestBed.createComponent(BusinessListingsGrid);
    fixture.componentRef.setInput('status', 'ready');
    fixture.componentRef.setInput('listings', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No businesses are listed yet.');
    expect(fixture.nativeElement.querySelector('app-business-listing-card')).toBeNull();
  });

  it('renders the error message instead of cards or the empty state', async () => {
    const fixture = TestBed.createComponent(BusinessListingsGrid);
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('listings', []);
    fixture.componentRef.setInput('errorMessage', 'The sample feed failed.');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('The sample feed failed.');
    expect(fixture.nativeElement.textContent).not.toContain('No businesses are listed yet.');
    expect(fixture.nativeElement.querySelector('app-business-listing-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });

  it('renders loading placeholders instead of the listings it was given', async () => {
    const fixture = TestBed.createComponent(BusinessListingsGrid);
    fixture.componentRef.setInput('status', 'loading');
    fixture.componentRef.setInput('listings', [
      listing('lst-a', 'Should Stay Hidden'),
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Loading listings.');
    expect(fixture.nativeElement.textContent).not.toContain('Should Stay Hidden');
    expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(6);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Loading listings.',
    );
  });

  it('marks the previous rows as updating instead of treating them as the new result', async () => {
    const fixture = TestBed.createComponent(BusinessListingsGrid);
    fixture.componentRef.setInput('status', 'updating');
    fixture.componentRef.setInput('listings', [listing('lst-a', 'King Street Bakery')]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Updating listings.');
    expect(fixture.nativeElement.textContent).toContain('King Street Bakery');
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.skeleton')).toBeNull();
  });

  it('offers clear filters only when asked, and the button is keyboard-focusable', async () => {
    const fixture = TestBed.createComponent(BusinessListingsGrid);
    const clears: number[] = [];
    fixture.componentInstance.clearFilters.subscribe(() => clears.push(1));
    fixture.componentRef.setInput('status', 'ready');
    fixture.componentRef.setInput('listings', []);
    fixture.componentRef.setInput('emptyMessage', 'No businesses match these filters.');
    fixture.componentRef.setInput('showClear', true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Clear filters');
    expect(button.getAttribute('type')).toBe('button');
    button.click();
    expect(clears).toEqual([1]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
