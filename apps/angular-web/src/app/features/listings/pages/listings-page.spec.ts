import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api-base-url';
import { BusinessListingSummary } from '../api/business-listing-summary';
import { ListingsPage } from './listings-page';

const listingsUrl = 'http://localhost:5000/api/listings';

function summary(
  overrides: Partial<BusinessListingSummary> = {},
): BusinessListingSummary {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    title: 'Elm Street Bistro',
    description: 'A 42-seat dinner restaurant.',
    askingPrice: 875_000,
    annualRevenue: 1_240_000,
    cashFlow: 186_000,
    city: 'Portland',
    state: 'OR',
    category: 'Restaurant',
    imageUrl: null,
    ...overrides,
  };
}

describe('ListingsPage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('shows loading, then the mapped API listings', async () => {
    const fixture = TestBed.createComponent(ListingsPage);
    const request = http.expectOne(listingsUrl);
    expect(request.request.method).toBe('GET');

    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Loading listings.');
    expect(fixture.nativeElement.textContent).not.toContain('Elm Street Bistro');

    request.flush([summary(), summary({ id: 'second', title: 'King Street Bakery' })]);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Elm Street Bistro');
    expect(text).toContain('Portland, OR');
    expect(text).toContain('King Street Bakery');
    expect(text).toContain('2 listings');
    expect(text).not.toContain('Loading listings.');
  });

  it('shows the empty state for an empty 200, not an error', async () => {
    const fixture = TestBed.createComponent(ListingsPage);
    http.expectOne(listingsUrl).flush([]);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No businesses are listed yet.');
    expect(text).not.toContain('Listings could not be loaded.');
    expect(text).not.toContain('0 listings');
  });

  it('shows an error when the request fails and does not treat it as empty', async () => {
    const fixture = TestBed.createComponent(ListingsPage);
    http.expectOne(listingsUrl).flush('unavailable', {
      status: 500,
      statusText: 'Server Error',
    });
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Listings could not be loaded.');
    expect(text).not.toContain('No businesses are listed yet.');
    expect(text).not.toContain('Loading listings.');
  });
});
