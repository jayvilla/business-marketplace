/**
 * Query `GET /api/listings` actually accepts.
 *
 * The URL is the stored copy. The form keeps a draft while someone is
 * typing. The service reads the URL. A second committed copy would drift
 * from the address bar and from Back.
 *
 * There is no location parameter. Search matches title, description,
 * city, and state on the server. A location dropdown would be a filter
 * the API does not bind.
 */

export const LISTING_PAGE_SIZE = 6;
export const LISTING_MAX_PAGE_SIZE = 24;
export const LISTING_MAX_SEARCH_LENGTH = 200;

/** Inclusive upper bound on `minPrice` and `maxPrice`. The API rejects more. */
export const LISTING_MAX_PRICE = 1_000_000_000;

/** Shared by the draft form and a URL that already contains an inverted range. */
export const LISTING_PRICE_ORDER_ERROR =
  'Minimum price cannot be greater than the maximum.';

/** How long search and price wait before the URL changes. Selects do not wait. */
export const LISTING_TEXT_DEBOUNCE_MS = 300;

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
 * `newest` is what the API does when `sortBy` and `sortDirection` are
 * omitted: `CreatedAt` descending. There is no "oldest" option.
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
   * That request is not sent. The API would answer 400.
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

const QUERY_KEYS = [
  'search',
  'category',
  'minPrice',
  'maxPrice',
  'sortBy',
  'sortDirection',
  'page',
  'pageSize',
] as const;

/**
 * One query value as Vue Router reports it. A repeated key arrives as an
 * array, and a key can be null. Reading the first string is enough: this
 * API binds a single value per name.
 */
export type ListingQueryParam =
  | string
  | null
  | undefined
  | readonly (string | null)[];

export type ListingQueryParams = Record<string, ListingQueryParam>;

export function listingCategoryLabel(category: ListingCategory): string {
  return CATEGORY_LABELS[category];
}

export function listingSortLabel(sort: ListingSort): string {
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

export function listingPageCount(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.ceil(totalCount / pageSize);
}

export function listingQueryEqual(
  left: ListingQuery,
  right: ListingQuery,
): boolean {
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

export function filtersEqual(
  filters: ListingFilters,
  query: ListingQuery,
): boolean {
  return (
    filters.search === query.search &&
    filters.category === query.category &&
    filters.minPrice === query.minPrice &&
    filters.maxPrice === query.maxPrice &&
    filters.sort === query.sort
  );
}

/**
 * Query string fields for one listing query.
 *
 * `null` means the key is omitted. Defaults are omitted so `/listings`
 * means newest, page 1, page size 6, and the address does not repeat
 * what the API already assumes.
 */
export function serializeListingQuery(
  query: ListingQuery,
): Record<(typeof QUERY_KEYS)[number], string | number | null> {
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

/** Encoded query string for `GET /api/listings`, without the leading `?`. */
export function listingQueryString(query: ListingQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(serializeListingQuery(query))) {
    if (value !== null) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

/**
 * Route query for `router.push` or `router.replace`.
 *
 * Listing keys are rewritten. Every other key already on the URL stays,
 * so a campaign parameter is not dropped when the page changes.
 */
export function toRouteQuery(
  current: ListingQueryParams,
  query: ListingQuery,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(current)) {
    if ((QUERY_KEYS as readonly string[]).includes(key)) {
      continue;
    }
    const text = firstText(value);
    if (text !== null) {
      next[key] = text;
    }
  }
  for (const [key, value] of Object.entries(serializeListingQuery(query))) {
    if (value !== null) {
      next[key] = String(value);
    }
  }
  return next;
}

export function parseListingQuery(
  params: ListingQueryParams,
): ParsedListingQuery {
  const minPrice = readPrice(readParam(params, 'minPrice'));
  const maxPrice = readPrice(readParam(params, 'maxPrice'));
  const inverted =
    minPrice !== null && maxPrice !== null && minPrice > maxPrice;

  return {
    query: {
      search: readSearch(readParam(params, 'search')),
      category: readCategory(readParam(params, 'category')),
      minPrice,
      maxPrice,
      sort: readSort(
        readParam(params, 'sortBy'),
        readParam(params, 'sortDirection'),
      ),
      page: readPage(readParam(params, 'page')),
      pageSize: readPageSize(readParam(params, 'pageSize')),
    },
    priceError: inverted ? LISTING_PRICE_ORDER_ERROR : null,
  };
}

/**
 * True when the address is not the canonical spelling of `query`.
 * The page then `replace`s the URL. A bad link does not stay in history
 * as the current address, and it is not sent to the API as a 400.
 */
export function listingQueryNeedsCanonicalUrl(
  params: ListingQueryParams,
  query: ListingQuery,
): boolean {
  const expected = serializeListingQuery(query);
  return QUERY_KEYS.some(
    (key) => readParam(params, key) !== textValue(expected[key]),
  );
}

function textValue(value: string | number | null): string | null {
  if (value === null) {
    return null;
  }
  return String(value);
}

function readParam(params: ListingQueryParams, key: string): string | null {
  return firstText(params[key]);
}

function firstText(value: ListingQueryParam): string | null {
  if (typeof value === 'string') {
    return value === '' ? null : value;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const first = value[0];
  return typeof first === 'string' && first !== '' ? first : null;
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
  if (value === null) {
    return null;
  }
  const parsed = parseDraftPrice(value);
  return parsed.ok ? parsed.value : null;
}

export type DraftPriceReason = 'malformed' | 'negative' | 'above-maximum';

export type DraftPriceResult =
  | { readonly ok: true; readonly value: number | null }
  | { readonly ok: false; readonly reason: DraftPriceReason };

/**
 * One price grammar for the draft form and for the URL.
 *
 * Empty is `null`, which means the bound is unset. Zero is a real bound.
 * Letters, a leading minus, and a value above `LISTING_MAX_PRICE` are
 * failures. They are not coerced to zero. The form shows the failure.
 * The URL parser drops it and the page rewrites the address, because a
 * shared link is not a field the user is still editing.
 */
export function parseDraftPrice(raw: string): DraftPriceResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: true, value: null };
  }
  if (/^-\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, reason: 'negative' };
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, reason: 'malformed' };
  }
  const price = Number(trimmed);
  if (!Number.isFinite(price)) {
    return { ok: false, reason: 'malformed' };
  }
  if (price > LISTING_MAX_PRICE) {
    return { ok: false, reason: 'above-maximum' };
  }
  return { ok: true, value: price };
}

export function draftPriceMessage(
  field: 'Minimum price' | 'Maximum price',
  reason: DraftPriceReason,
): string {
  if (reason === 'negative') {
    return `${field} must be zero or greater.`;
  }
  if (reason === 'above-maximum') {
    return `${field} cannot exceed $1,000,000,000.`;
  }
  return 'Enter a price as a number zero or greater.';
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

function readSort(
  sortBy: string | null,
  sortDirection: string | null,
): ListingSort {
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
