import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from './core/api-base-url';
import { appRoutes } from './app.routes';
import { ListingsPage } from './features/listings/pages/listings-page';
import { NotFoundPage } from './pages/not-found-page';

const listingsUrl = 'http://localhost:5000/api/listings';

/**
 * The listings route is lazy. The GET is issued when that chunk's page
 * class is constructed, which is after `navigateByUrl` has started and
 * before its promise resolves. `expectOne` has to wait for that moment.
 */
async function nextListingsRequest(http: HttpTestingController): Promise<TestRequest> {
  return vi.waitFor(() => http.expectOne((request) => request.url === listingsUrl));
}

describe('app routes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('redirects / to /listings and shows the listings page', async () => {
    const harness = await RouterTestingHarness.create();
    const pending = harness.navigateByUrl('/');
    (await nextListingsRequest(http)).flush({
      items: [],
      page: 1,
      pageSize: 6,
      totalCount: 0,
    });
    await pending;

    expect(TestBed.inject(Router).url).toBe('/listings');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Businesses for Sale',
    );
  });

  it('renders the listings page at /listings from the API payload', async () => {
    const harness = await RouterTestingHarness.create();
    const pending = harness.navigateByUrl('/listings', ListingsPage);
    (await nextListingsRequest(http)).flush({
      items: [
        {
          id: '01900000-0000-7000-8000-000000000001',
          title: 'Elm Street Bistro',
          description: 'A 42-seat dinner restaurant.',
          askingPrice: 875000,
          annualRevenue: 1240000,
          cashFlow: 186000,
          city: 'Portland',
          state: 'OR',
          category: 'Restaurant',
          imageUrl: null,
        },
      ],
      page: 1,
      pageSize: 6,
      totalCount: 1,
    });
    const page = await pending;
    await harness.fixture.whenStable();

    expect(page).toBeInstanceOf(ListingsPage);
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Search and filters');
    expect(text).toContain('Listing results');
    expect(text).toContain('Elm Street Bistro');
    expect(text).toContain('1 listing');
  });

  it('renders the not found page for an unknown url', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/missing-page', NotFoundPage);

    expect(page).toBeInstanceOf(NotFoundPage);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Page not found',
    );
  });
});
