import { describe, expect, it } from 'vitest';
import {
  defaultListingQuery,
  LISTING_MAX_PRICE,
  listingPageCount,
  listingQueryNeedsCanonicalUrl,
  listingQueryString,
  parseDraftPrice,
  parseListingQuery,
  serializeListingQuery,
  toRouteQuery,
} from './listing-query';

describe('listing query', () => {
  it('omits API defaults from the query string', () => {
    expect(serializeListingQuery(defaultListingQuery)).toEqual({
      search: null,
      category: null,
      minPrice: null,
      maxPrice: null,
      sortBy: null,
      sortDirection: null,
      page: null,
      pageSize: null,
    });
    expect(listingQueryString(defaultListingQuery)).toBe('');
  });

  it('maps a sort option onto the API field and direction', () => {
    expect(
      serializeListingQuery({ ...defaultListingQuery, sort: 'price-asc' }),
    ).toMatchObject({ sortBy: 'AskingPrice', sortDirection: 'Asc' });
    expect(
      serializeListingQuery({ ...defaultListingQuery, sort: 'price-desc' }),
    ).toMatchObject({ sortBy: 'AskingPrice', sortDirection: 'Desc' });
    expect(
      serializeListingQuery({ ...defaultListingQuery, sort: 'revenue-desc' }),
    ).toMatchObject({ sortBy: 'AnnualRevenue', sortDirection: 'Desc' });
  });

  it('serializes an active search, category, price, and page', () => {
    expect(
      serializeListingQuery({
        search: 'bakery',
        category: 'Restaurant',
        minPrice: 1000,
        maxPrice: 9000,
        sort: 'newest',
        page: 2,
        pageSize: 6,
      }),
    ).toMatchObject({
      search: 'bakery',
      category: 'Restaurant',
      minPrice: 1000,
      maxPrice: 9000,
      page: 2,
      pageSize: null,
    });
  });

  it('encodes search text and keeps a non-default page size', () => {
    const query = listingQueryString({
      ...defaultListingQuery,
      search: 'a&b=c',
      page: 2,
      pageSize: 12,
    });
    const params = new URLSearchParams(query);

    expect(params.get('search')).toBe('a&b=c');
    expect(query).toContain('search=a%26b%3Dc');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('12');
  });

  it('reads a shared URL and trims the search', () => {
    const parsed = parseListingQuery({
      search: '  bakery  ',
      category: 'Restaurant',
      minPrice: '540000',
      maxPrice: '875000',
      sortBy: 'AskingPrice',
      sortDirection: 'Asc',
      page: '2',
    });

    expect(parsed.priceError).toBeNull();
    expect(parsed.query).toMatchObject({
      search: 'bakery',
      category: 'Restaurant',
      minPrice: 540000,
      maxPrice: 875000,
      sort: 'price-asc',
      page: 2,
    });
  });

  it('drops unknown category and sort values', () => {
    const params = {
      category: 'Coffee',
      sortBy: 'Title',
      sortDirection: 'Asc',
      page: '0',
      pageSize: '100',
    };
    const parsed = parseListingQuery(params);

    expect(parsed.query).toMatchObject({
      category: null,
      sort: 'newest',
      page: 1,
      pageSize: 6,
    });
    expect(listingQueryNeedsCanonicalUrl(params, parsed.query)).toBe(true);
    expect(listingQueryNeedsCanonicalUrl({}, parseListingQuery({}).query)).toBe(
      false,
    );
  });

  it('reads zero as a bound and drops a price the API would reject', () => {
    expect(parseDraftPrice('0')).toEqual({ ok: true, value: 0 });
    expect(parseDraftPrice('10.5')).toEqual({ ok: true, value: 10.5 });
    expect(parseDraftPrice('')).toEqual({ ok: true, value: null });
    expect(parseDraftPrice('-1').ok).toBe(false);
    expect(parseDraftPrice('abc').ok).toBe(false);
    expect(parseDraftPrice(String(LISTING_MAX_PRICE))).toEqual({
      ok: true,
      value: LISTING_MAX_PRICE,
    });
    expect(parseDraftPrice(String(LISTING_MAX_PRICE + 1)).ok).toBe(false);

    const params = { minPrice: '0', maxPrice: String(LISTING_MAX_PRICE + 1) };
    const parsed = parseListingQuery(params);
    expect(parsed.query.minPrice).toBe(0);
    expect(parsed.query.maxPrice).toBeNull();
    expect(parsed.priceError).toBeNull();
    expect(listingQueryNeedsCanonicalUrl(params, parsed.query)).toBe(true);
  });

  it('keeps an inverted price range and reports it', () => {
    const params = { minPrice: '10', maxPrice: '1' };
    const parsed = parseListingQuery(params);

    expect(parsed.priceError).toBe(
      'Minimum price cannot be greater than the maximum.',
    );
    expect(parsed.query.minPrice).toBe(10);
    expect(parsed.query.maxPrice).toBe(1);
    expect(listingQueryNeedsCanonicalUrl(params, parsed.query)).toBe(false);
  });

  it('preserves unrelated URL parameters when listing keys change', () => {
    expect(
      toRouteQuery(
        { ref: 'newsletter', page: '4', search: 'old' },
        { ...defaultListingQuery, category: 'Retail' },
      ),
    ).toEqual({
      ref: 'newsletter',
      category: 'Retail',
    });
  });

  it('counts pages from the total, with an empty result as one page', () => {
    expect(listingPageCount(0, 6)).toBe(1);
    expect(listingPageCount(6, 6)).toBe(1);
    expect(listingPageCount(8, 6)).toBe(2);
  });
});
