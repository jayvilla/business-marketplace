import { provideHttpClient } from '@angular/common/http';
import { Subject, switchMap } from 'rxjs';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api-base-url';
import { BusinessListingPageResponse } from '../api/business-listing-page';
import { BusinessListingSummary } from '../api/business-listing-summary';
import { defaultListingQuery } from '../models/listing-query';
import { BusinessListingsService } from './business-listings.service';

const listingsUrl = 'http://localhost:5000/api/listings';

function summary(
  overrides: Partial<BusinessListingSummary> = {},
): BusinessListingSummary {
  return {
    id: '01900000-0000-7000-8000-000000000006',
    title: 'Northbridge Accounting',
    description: 'A bookkeeping firm.',
    askingPrice: 690_000,
    annualRevenue: 1_050_000,
    cashFlow: null,
    city: 'Chicago',
    state: 'IL',
    category: 'ProfessionalServices',
    imageUrl: null,
    ...overrides,
  };
}

function page(
  items: readonly BusinessListingSummary[],
  totalCount = items.length,
): BusinessListingPageResponse {
  return { items, page: 1, pageSize: 6, totalCount };
}

/**
 * `provideHttpClientTesting` replaces the real network. `HttpTestingController`
 * is the request the service would have sent. `flush` is the response we
 * choose. Nothing here opens a socket, so the spec does not need the API
 * or PostgreSQL.
 */
describe('BusinessListingsService', () => {
  let service: BusinessListingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000' },
      ],
    });
    service = TestBed.inject(BusinessListingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('GETs the listings collection and maps each summary', () => {
    let titles: readonly string[] = [];
    service.getListings(defaultListingQuery).subscribe((result) => {
      titles = result.items.map((listing) => listing.title);
      expect(result.totalCount).toBe(1);
      expect(result.items[0]?.location).toBe('Chicago, IL');
      expect(result.items[0]?.category).toBe('Professional services');
      expect(result.items[0]?.cashFlow).toBeNull();
      expect(result.items[0]?.imageUrl).toBe('/listings/services.svg');
      expect(result.items[0]?.featured).toBe(false);
    });

    const request = http.expectOne((candidate) => candidate.url === listingsUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(page([summary()]));

    expect(titles).toEqual(['Northbridge Accounting']);
  });

  it('sends the supported query parameters and no defaults', () => {
    service
      .getListings({
        ...defaultListingQuery,
        search: 'bakery',
        category: 'Restaurant',
        minPrice: 1000,
        maxPrice: 9000,
        sort: 'price-asc',
        page: 2,
      })
      .subscribe();

    const request = http.expectOne((candidate) => candidate.url === listingsUrl);
    expect(request.request.params.get('search')).toBe('bakery');
    expect(request.request.params.get('category')).toBe('Restaurant');
    expect(request.request.params.get('minPrice')).toBe('1000');
    expect(request.request.params.get('maxPrice')).toBe('9000');
    expect(request.request.params.get('sortBy')).toBe('AskingPrice');
    expect(request.request.params.get('sortDirection')).toBe('Asc');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.has('pageSize')).toBe(false);
    request.flush(page([]));
  });

  it('emits an empty page when the API returns one', () => {
    let count = -1;
    let total = -1;
    service.getListings(defaultListingQuery).subscribe((result) => {
      count = result.items.length;
      total = result.totalCount;
    });

    http.expectOne((candidate) => candidate.url === listingsUrl).flush(page([], 0));
    expect(count).toBe(0);
    expect(total).toBe(0);
  });

  it('forwards an HTTP failure instead of emitting an empty catalog', () => {
    let failed = false;
    let received = false;
    service.getListings(defaultListingQuery).subscribe({
      next: () => {
        received = true;
      },
      error: () => {
        failed = true;
      },
    });

    http.expectOne((candidate) => candidate.url === listingsUrl).flush('unavailable', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(failed).toBe(true);
    expect(received).toBe(false);
  });

  it('forwards an HTTP 400 instead of emitting an empty catalog', () => {
    let status = -1;
    let received = false;
    service.getListings(defaultListingQuery).subscribe({
      next: () => {
        received = true;
      },
      error: (error: { status: number }) => {
        status = error.status;
      },
    });

    http.expectOne((candidate) => candidate.url === listingsUrl).flush(
      { title: 'One or more validation errors occurred.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(status).toBe(400);
    expect(received).toBe(false);
  });

  it('drops an in-flight request when a newer query replaces it', () => {
    // The listings page uses switchMap for the same reason. Unsubscribing
    // aborts the browser request. The API receives that abort as a
    // CancellationToken, but a command that has already reached PostgreSQL
    // may still finish. The guarantee is that the late response is not
    // applied to the screen.
    const queries = new Subject<typeof defaultListingQuery>();
    const titles: string[] = [];
    queries
      .pipe(switchMap((query) => service.getListings(query)))
      .subscribe((result) => {
        const title = result.items[0]?.title;
        if (title !== undefined) {
          titles.push(title);
        }
      });

    queries.next({ ...defaultListingQuery, search: 'bakery' });
    queries.next({ ...defaultListingQuery, category: 'Retail' });

    const requests = http.match((candidate) => candidate.url === listingsUrl);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.cancelled).toBe(true);
    expect(requests[1]?.request.params.get('category')).toBe('Retail');
    requests[1]?.flush(
      page([
        summary({
          title: 'Highline Outfitters',
          category: 'Retail',
          city: 'Bozeman',
          state: 'MT',
        }),
      ]),
    );

    expect(titles).toEqual(['Highline Outfitters']);
  });

  it('rejects a 200 that is not a page instead of treating it as no listings', () => {
    let failed = false;
    let received = false;
    service.getListings(defaultListingQuery).subscribe({
      next: () => {
        received = true;
      },
      error: () => {
        failed = true;
      },
    });

    http.expectOne((candidate) => candidate.url === listingsUrl).flush({ items: null });

    expect(failed).toBe(true);
    expect(received).toBe(false);
  });
});
