import { convertToParamMap } from '@angular/router';
import {
  defaultListingQuery,
  listingPageCount,
  listingQueryNeedsCanonicalUrl,
  parseListingQuery,
  serializeListingQuery,
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

  it('reads a shared URL and trims the search', () => {
    const parsed = parseListingQuery(
      convertToParamMap({
        search: '  bakery  ',
        category: 'Restaurant',
        minPrice: '540000',
        maxPrice: '875000',
        sortBy: 'AskingPrice',
        sortDirection: 'Asc',
        page: '2',
      }),
    );

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
    const params = convertToParamMap({
      category: 'Coffee',
      sortBy: 'Title',
      sortDirection: 'Asc',
      page: '0',
      pageSize: '100',
    });
    const parsed = parseListingQuery(params);

    expect(parsed.query).toMatchObject({
      category: null,
      sort: 'newest',
      page: 1,
      pageSize: 6,
    });
    expect(listingQueryNeedsCanonicalUrl(params, parsed.query)).toBe(true);
    expect(
      listingQueryNeedsCanonicalUrl(
        convertToParamMap({}),
        parseListingQuery(convertToParamMap({})).query,
      ),
    ).toBe(false);
  });

  it('keeps an inverted price range and reports it', () => {
    const params = convertToParamMap({ minPrice: '10', maxPrice: '1' });
    const parsed = parseListingQuery(params);

    expect(parsed.priceError).toBe(
      'Minimum price cannot be greater than the maximum.',
    );
    expect(parsed.query.minPrice).toBe(10);
    expect(parsed.query.maxPrice).toBe(1);
    expect(listingQueryNeedsCanonicalUrl(params, parsed.query)).toBe(false);
  });

  it('counts pages from the total, with an empty result as one page', () => {
    expect(listingPageCount(0, 6)).toBe(1);
    expect(listingPageCount(6, 6)).toBe(1);
    expect(listingPageCount(8, 6)).toBe(2);
  });
});
