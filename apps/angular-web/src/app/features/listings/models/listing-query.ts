import { ParamMap, Params } from '@angular/router';

/**
 * Query the listings API actually accepts.
 *
 * `GET /api/listings` filters, sorts, and pages in PostgreSQL. These fields
 * are that contract. A field the API does not bind is not here, so the
 * form cannot invent one.
 *
 * The URL is the stored copy of this object. The form and the service both
 * read it. A second copy in a service would drift from the address bar
 * and from the Back button.
 */

export const LISTING_PAGE_SIZE = 6;
export const LISTING_MAX_PAGE_SIZE = 24;
export const LISTING_MAX_SEARCH_LENGTH = 200;

export const LISTING_CATEGORIES = [
  'Restaurant',
  'Retail',
  'Technology',
  'Healthcare',
  'Manufacturing',
  'ProfessionalServices',
  'Other',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

/**
 * The four orders the API can serve and this screen offers.
 * `newest` is `sortBy=CreatedAt` and `sortDirection=Desc`, which is what
 * the API does when those keys are omitted. There is no separate "oldest"
 * option, because the screen does not offer that direction.
 */
export const LISTING_SORTS = [
  'newest',
  'price-asc',
  'price-desc',
  'revenue-desc',
] as const;

export type ListingSort = (typeof LISTING_SORTS)[number];

export interface ListingQuery {
  readonly search: string;
  readonly category: ListingCategory | null;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly sort: ListingSort;
  readonly page: number;
  readonly pageSize: number;
}

/** Filter fields, without the page. Changing any of them returns to page 1. */
export interface ListingFilters {
  readonly search: string;
  readonly category: ListingCategory | null;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly sort: ListingSort;
}

export const defaultListingQuery: ListingQuery = {
  search: '',
  category: null,
  minPrice: null,
  maxPrice: null,
  sort: 'newest',
  page: 1,
  pageSize: LISTING_PAGE_SIZE,
};

export interface ParsedListingQuery {
  readonly query: ListingQuery;
  /**
   * Set when both prices are numbers and the minimum is greater.
   * That request is not sent. The API would answer 400, and the previous
   * page of results would be the wrong thing to show as an empty catalog.
   */
  readonly priceError: string | null;
}

const CATEGORY_LABELS: Readonly<Record<ListingCategory, string>> = {
  Restaurant: 'Restaurant',
  Retail: 'Retail',
  Technology: 'Technology',
  Healthcare: 'Healthcare',
  Manufacturing: 'Manufacturing',
  ProfessionalServices: 'Professional services',
  Other: 'Other',
};

export function listingCategoryLabel(category: ListingCategory): string {
  return CATEGORY_LABELS[category];
}

export function listingPageCount(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.ceil(totalCount / pageSize);
}

export function listingQueryEqual(left: ListingQuery, right: ListingQuery): boolean {
  return (
    left.search === right.search &&
    left.category === right.category &&
    left.minPrice === right.minPrice &&
    left.maxPrice === right.maxPrice &&
    left.sort === right.sort &&
    left.page === right.page &&
    left.pageSize === right.pageSize
  );
}

export function filtersEqual(filters: ListingFilters, query: ListingQuery): boolean {
  return (
    filters.search === query.search &&
    filters.category === query.category &&
    filters.minPrice === query.minPrice &&
    filters.maxPrice === query.maxPrice &&
    filters.sort === query.sort
  );
}

/**
 * Query string for one listing query.
 *
 * `null` removes a key when merged onto the current URL. Defaults are
 * omitted so `/listings` means "newest, page 1, page size 6" and the
 * address does not repeat what the API already assumes.
 * Other keys on the URL are left alone by `queryParamsHandling: 'merge'`.
 */
export function serializeListingQuery(query: ListingQuery): Params {
  const sort = sortToParams(query.sort);
  return {
    search: query.search.length > 0 ? query.search : null,
    category: query.category,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sortBy: sort.sortBy,
    sortDirection: sort.sortDirection,
    page: query.page > 1 ? query.page : null,
    pageSize: query.pageSize === LISTING_PAGE_SIZE ? null : query.pageSize,
  };
}

/**
 * Reads the address bar into a query the API can run.
 *
 * Unknown categories, sorts, and numbers are dropped. The caller compares
 * the result with the raw params and replaces the URL when they differ, so
 * a bad link does not become a 400 and does not stay in the history as the
 * current address.
 */
export function parseListingQuery(params: ParamMap): ParsedListingQuery {
  const minPrice = readPrice(params.get('minPrice'));
  const maxPrice = readPrice(params.get('maxPrice'));
  const inverted =
    minPrice !== null && maxPrice !== null && minPrice > maxPrice;

  return {
    query: {
      search: readSearch(params.get('search')),
      category: readCategory(params.get('category')),
      minPrice,
      maxPrice,
      sort: readSort(params.get('sortBy'), params.get('sortDirection')),
      page: readPage(params.get('page')),
      pageSize: readPageSize(params.get('pageSize')),
    },
    priceError: inverted
      ? 'Minimum price cannot be greater than the maximum.'
      : null,
  };
}

export function listingQueryNeedsCanonicalUrl(
  params: ParamMap,
  query: ListingQuery,
): boolean {
  const expected = serializeListingQuery(query);
  const keys = [
    'search',
    'category',
    'minPrice',
    'maxPrice',
    'sortBy',
    'sortDirection',
    'page',
    'pageSize',
  ] as const;

  return keys.some((key) => (params.get(key) ?? null) !== textValue(expected[key]));
}

function textValue(value: Params[string]): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function readSearch(value: string | null): string {
  if (value === null) {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > LISTING_MAX_SEARCH_LENGTH
    ? trimmed.slice(0, LISTING_MAX_SEARCH_LENGTH)
    : trimmed;
}

function readCategory(value: string | null): ListingCategory | null {
  if (value !== null && isListingCategory(value)) {
    return value;
  }
  return null;
}

function readPrice(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    return null;
  }
  return price;
}

function readPage(value: string | null): number {
  if (value === null) {
    return 1;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  return page > 10_000 ? 1 : page;
}

function readPageSize(value: string | null): number {
  if (value === null) {
    return LISTING_PAGE_SIZE;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    return LISTING_PAGE_SIZE;
  }
  const pageSize = Number(value);
  if (pageSize < 1 || pageSize > LISTING_MAX_PAGE_SIZE) {
    return LISTING_PAGE_SIZE;
  }
  return pageSize;
}

function readSort(sortBy: string | null, sortDirection: string | null): ListingSort {
  if (sortBy === null && sortDirection === null) {
    return 'newest';
  }
  if (
    (sortBy === 'CreatedAt' && sortDirection === 'Desc') ||
    (sortBy === 'CreatedAt' && sortDirection === null)
  ) {
    return 'newest';
  }
  if (sortBy === 'AskingPrice' && sortDirection === 'Asc') {
    return 'price-asc';
  }
  if (sortBy === 'AskingPrice' && sortDirection === 'Desc') {
    return 'price-desc';
  }
  if (sortBy === 'AnnualRevenue' && sortDirection === 'Desc') {
    return 'revenue-desc';
  }
  return 'newest';
}

function sortToParams(sort: ListingSort): {
  sortBy: string | null;
  sortDirection: string | null;
} {
  switch (sort) {
    case 'price-asc':
      return { sortBy: 'AskingPrice', sortDirection: 'Asc' };
    case 'price-desc':
      return { sortBy: 'AskingPrice', sortDirection: 'Desc' };
    case 'revenue-desc':
      return { sortBy: 'AnnualRevenue', sortDirection: 'Desc' };
    case 'newest':
      return { sortBy: null, sortDirection: null };
  }
}

function isListingCategory(value: string): value is ListingCategory {
  return (LISTING_CATEGORIES as readonly string[]).includes(value);
}
