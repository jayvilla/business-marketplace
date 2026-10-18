import { TestBed } from '@angular/core/testing';
import { defaultListingQuery, ListingFilters } from '../../models/listing-query';
import { ListingFiltersForm } from './listing-filters';

describe('ListingFiltersForm', () => {
  async function setup(): Promise<{
    element: HTMLElement;
    emitted: ListingFilters[];
    detectChanges: () => void;
  }> {
    await TestBed.configureTestingModule({
      imports: [ListingFiltersForm],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListingFiltersForm);
    fixture.componentRef.setInput('value', defaultListingQuery);
    const emitted: ListingFilters[] = [];
    fixture.componentInstance.filtersChange.subscribe((filters) => {
      emitted.push(filters);
    });
    fixture.detectChanges();
    return {
      element: fixture.nativeElement as HTMLElement,
      emitted,
      detectChanges: () => fixture.detectChanges(),
    };
  }

  function setControl(element: HTMLElement, id: string, value: string): void {
    const control = element.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('change'));
  }

  it('debounces search and does not emit on each keystroke', async () => {
    const { element, emitted } = await setup();
    vi.useFakeTimers();
    try {
      setControl(element, 'listing-search', 'bakery');
      await vi.advanceTimersByTimeAsync(299);
      expect(emitted).toEqual([]);

      await vi.advanceTimersByTimeAsync(1);
      expect(emitted).toEqual([
        {
          search: 'bakery',
          category: null,
          minPrice: null,
          maxPrice: null,
          sort: 'newest',
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('emits a category immediately', async () => {
    const { element, emitted } = await setup();

    setControl(element, 'listing-category', 'Restaurant');

    expect(emitted[emitted.length - 1]?.category).toBe('Restaurant');
  });

  it('does not emit an inverted price range', async () => {
    const { element, emitted, detectChanges } = await setup();
    vi.useFakeTimers();
    try {
      setControl(element, 'listing-min-price', '900');
      setControl(element, 'listing-max-price', '100');
      await vi.advanceTimersByTimeAsync(300);
      detectChanges();

      expect(emitted).toEqual([]);
      expect(element.textContent).toContain(
        'Minimum price cannot be greater than the maximum.',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a price that is not a number', async () => {
    const { element, emitted, detectChanges } = await setup();
    vi.useFakeTimers();
    try {
      setControl(element, 'listing-min-price', 'twelve');
      await vi.advanceTimersByTimeAsync(300);
      detectChanges();

      expect(emitted).toEqual([]);
      expect(element.textContent).toContain(
        'Enter a price as a number zero or greater.',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears search, category, and price without waiting for the debounce', async () => {
    const { element, emitted } = await setup();
    vi.useFakeTimers();
    try {
      setControl(element, 'listing-search', 'bakery');
      setControl(element, 'listing-category', 'Retail');
      await vi.advanceTimersByTimeAsync(300);
      emitted.length = 0;

      (element.querySelector('button[type="button"]') as HTMLButtonElement).click();

      expect(emitted[emitted.length - 1]).toEqual({
        search: '',
        category: null,
        minPrice: null,
        maxPrice: null,
        sort: 'newest',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
