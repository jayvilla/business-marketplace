import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api-base-url';
import { BusinessListingSummary } from '../api/business-listing-summary';
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
    service.getListings().subscribe((listings) => {
      titles = listings.map((listing) => listing.title);
      expect(listings[0]?.location).toBe('Chicago, IL');
      expect(listings[0]?.category).toBe('Professional services');
      expect(listings[0]?.cashFlow).toBeNull();
      expect(listings[0]?.imageUrl).toBe('/listings/services.svg');
      expect(listings[0]?.featured).toBe(false);
    });

    const request = http.expectOne(listingsUrl);
    expect(request.request.method).toBe('GET');
    request.flush([summary()]);

    expect(titles).toEqual(['Northbridge Accounting']);
  });

  it('emits an empty array when the API returns one', () => {
    let count = -1;
    service.getListings().subscribe((listings) => {
      count = listings.length;
    });

    http.expectOne(listingsUrl).flush([]);
    expect(count).toBe(0);
  });

  it('forwards an HTTP failure instead of emitting an empty catalog', () => {
    let failed = false;
    let received: unknown[] | undefined;
    service.getListings().subscribe({
      next: (listings) => {
        received = [...listings];
      },
      error: () => {
        failed = true;
      },
    });

    http.expectOne(listingsUrl).flush('unavailable', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(failed).toBe(true);
    expect(received).toBeUndefined();
  });
});
