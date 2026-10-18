import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge } from 'rxjs';
import {
  filtersEqual,
  LISTING_CATEGORIES,
  LISTING_MAX_SEARCH_LENGTH,
  LISTING_SORTS,
  ListingCategory,
  ListingFilters,
  ListingQuery,
  ListingSort,
  listingCategoryLabel,
} from '../../models/listing-query';

/**
 * Search, category, price, and sort. It does not call HTTP and it does
 * not read the router. The page owns the URL. This form tells the page
 * when the committed filters change.
 *
 * Text and prices wait 300ms. A select applies immediately. `debounceTime`
 * is on those three controls only, so choosing a category does not wait
 * out a timer that exists for keystrokes. `distinctUntilChanged` drops a
 * second emission of the same string, which a debounce alone would still
 * forward.
 */
@Component({
  selector: 'app-listing-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './listing-filters.html',
  styleUrl: './listing-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingFiltersForm {
  readonly value = input.required<ListingQuery>();
  readonly filtersChange = output<ListingFilters>();

  protected readonly categories = LISTING_CATEGORIES;
  protected readonly sorts = LISTING_SORTS;
  protected readonly categoryLabel = listingCategoryLabel;
  protected readonly maxSearchLength = LISTING_MAX_SEARCH_LENGTH;
  protected readonly fieldError = signal<string | null>(null);
  protected readonly filtersActive = signal(false);

  protected readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl<ListingCategory | ''>('', { nonNullable: true }),
    minPrice: new FormControl('', { nonNullable: true }),
    maxPrice: new FormControl('', { nonNullable: true }),
    sort: new FormControl<ListingSort>('newest', { nonNullable: true }),
  });

  /**
   * The URL is the source of the committed query, including Back and
   * Forward. Patching without `emitEvent` keeps that update from looking
   * like a keystroke and writing the same URL again.
   */
  private readonly syncFromQuery = effect(() => {
    const query = this.value();
    const current = this.readFilters();
    if (current !== null && filtersEqual(current, query)) {
      this.refreshFiltersActive();
      return;
    }
    this.form.patchValue(
      {
        search: query.search,
        category: query.category ?? '',
        minPrice: query.minPrice === null ? '' : String(query.minPrice),
        maxPrice: query.maxPrice === null ? '' : String(query.maxPrice),
        sort: query.sort,
      },
      { emitEvent: false },
    );
    this.fieldError.set(null);
    this.refreshFiltersActive();
  });

  constructor() {
    merge(
      this.form.controls.search.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
      ),
      this.form.controls.minPrice.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
      ),
      this.form.controls.maxPrice.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
      ),
      this.form.controls.category.valueChanges,
      this.form.controls.sort.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.refreshFiltersActive();
        this.publish();
      });
  }

  protected applyNow(event: Event): void {
    event.preventDefault();
    this.publish();
  }

  protected clear(): void {
    this.form.patchValue({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
    });
    this.fieldError.set(null);
    this.refreshFiltersActive();
    // Price and search are debounced. Clear should not wait out that timer.
    this.publish();
  }

  protected sortLabel(sort: ListingSort): string {
    switch (sort) {
      case 'newest':
        return 'Newest';
      case 'price-asc':
        return 'Asking price: low to high';
      case 'price-desc':
        return 'Asking price: high to low';
      case 'revenue-desc':
        return 'Annual revenue: high to low';
    }
  }

  private publish(): void {
    const filters = this.readFilters();
    if (filters === null) {
      return;
    }
    this.fieldError.set(null);
    this.filtersChange.emit(filters);
  }

  private readFilters(): ListingFilters | null {
    const raw = this.form.getRawValue();
    const search = raw.search.trim();
    if (search.length > LISTING_MAX_SEARCH_LENGTH) {
      this.fieldError.set(
        `Search must be ${LISTING_MAX_SEARCH_LENGTH} characters or fewer.`,
      );
      return null;
    }

    const minPrice = readPrice(raw.minPrice);
    const maxPrice = readPrice(raw.maxPrice);
    if (minPrice === undefined || maxPrice === undefined) {
      this.fieldError.set('Enter a price as a number zero or greater.');
      return null;
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      this.fieldError.set('Minimum price cannot be greater than the maximum.');
      return null;
    }

    return {
      search,
      category: raw.category === '' ? null : raw.category,
      minPrice,
      maxPrice,
      sort: raw.sort,
    };
  }

  private refreshFiltersActive(): void {
    const raw = this.form.getRawValue();
    this.filtersActive.set(
      raw.search.trim() !== '' ||
        raw.category !== '' ||
        raw.minPrice.trim() !== '' ||
        raw.maxPrice.trim() !== '',
    );
  }
}

/** `null` is an empty field. `undefined` is text that is not a price. */
function readPrice(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return undefined;
  }
  return Number(trimmed);
}
