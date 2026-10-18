import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { API_BASE_URL } from '../../../core/api-base-url';
import { BusinessListingPageResponse } from '../api/business-listing-page';
import { BusinessListingSummary } from '../api/business-listing-summary';
import { ListingsPage } from './listings-page';

function summary(title: string, id = title): BusinessListingSummary {
  return {
    id,
    title,
    description: `${title} description`,
    askingPrice: 100_000,
    annualRevenue: 200_000,
    cashFlow: 30_000,
    city: 'Portland',
    state: 'OR',
    category: 'Restaurant',
    imageUrl: null,
  };
}

function envelope(
  titles: readonly string[],
  totalCount = titles.length,
  page = 1,
): BusinessListingPageResponse {
  return {
    items: titles.map((title) => summary(title)),
    page,
    pageSize: 6,
    totalCount,
  };
}

async function nextRequest(
  http: HttpTestingController,
  match: (request: HttpRequest<unknown>) => boolean = () => true,
): Promise<TestRequest> {
  return vi.waitFor(() => http.expectOne((request) => match(request)));
}

describe('ListingsPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'listings', component: ListingsPage }]),
        { provide: Location, useClass: SpyLocation },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the first page from the API and announces the total', async () => {
    const pending = harness.navigateByUrl('/listings');
    const request = await nextRequest(http);
    expect(request.request.params.keys()).toEqual([]);
    expect(harness.routeNativeElement?.textContent).toContain('Loading listings.');

    request.flush(envelope(['King Street Bakery', 'Gulf Breeze Car Wash'], 8));
    await pending;
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('King Street Bakery');
    expect(text).toContain('8 listings');
    expect(text).toContain('Page 1 of 2');
  });

  it('initializes search, category, and page from the URL', async () => {
    const pending = harness.navigateByUrl(
      '/listings?search=bakery&category=Restaurant&page=2',
    );
    const request = await nextRequest(http);
    expect(request.request.params.get('search')).toBe('bakery');
    expect(request.request.params.get('category')).toBe('Restaurant');
    expect(request.request.params.get('page')).toBe('2');
    request.flush(envelope(['King Street Bakery'], 8, 2));
    await pending;
    await harness.fixture.whenStable();

    const search = harness.routeNativeElement?.querySelector(
      '#listing-search',
    ) as HTMLInputElement;
    const category = harness.routeNativeElement?.querySelector(
      '#listing-category',
    ) as HTMLSelectElement;
    expect(search.value).toBe('bakery');
    expect(category.value).toBe('Restaurant');
    expect(harness.routeNativeElement?.textContent).toContain('Page 2 of 2');
  });

  it('asks for the next page and disables next on the last page', async () => {
    const pending = harness.navigateByUrl('/listings');
    (await nextRequest(http)).flush(
      envelope(['King Street Bakery'], 8),
    );
    await pending;
    await harness.fixture.whenStable();

    const next = [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find(
      (button) => button.textContent?.includes('Next page'),
    ) as HTMLButtonElement;
    next.click();
    const request = await nextRequest(
      http,
      (candidate) => candidate.params.get('page') === '2',
    );
    request.flush(envelope(['Northline Software'], 8, 2));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toContain('page=2');
    expect(harness.routeNativeElement?.textContent).toContain('Northline Software');
    const nextAfter = [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find(
      (button) => button.textContent?.includes('Next page'),
    ) as HTMLButtonElement;
    expect(nextAfter.disabled).toBe(true);
  });

  it('cancels the in-flight request when the query changes', async () => {
    const pending = harness.navigateByUrl('/listings');
    const first = await nextRequest(http);
    const nextNavigation = harness.navigateByUrl('/listings?category=Retail');
    await vi.waitFor(() => {
      expect(first.cancelled).toBe(true);
    });
    const second = await nextRequest(
      http,
      (candidate) => candidate.params.get('category') === 'Retail',
    );
    second.flush(envelope(['Highline Outfitters']));
    await pending;
    await nextNavigation;
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Highline Outfitters');
    expect(text).not.toContain('King Street Bakery');
  });

  it('follows the Back button to the previous query', async () => {
    const firstNavigation = harness.navigateByUrl('/listings');
    (await nextRequest(http)).flush(envelope(['King Street Bakery'], 8));
    await firstNavigation;

    const secondNavigation = harness.navigateByUrl('/listings?category=Retail');
    (await nextRequest(
      http,
      (candidate) => candidate.params.get('category') === 'Retail',
    )).flush(envelope(['Highline Outfitters']));
    await secondNavigation;
    await harness.fixture.whenStable();

    const location = TestBed.inject(Location) as SpyLocation;
    expect(location.urlChanges).toEqual([
      '/listings',
      '/listings?category=Retail',
    ]);
    location.back();
    expect(location.path()).toBe('/listings');
    // This router's listener is the platform location, so the spy's popstate
    // does not move Router.url on its own. Activate the URL Back restored.
    const restoredNavigation = harness.navigateByUrl(location.path());
    const restored = await nextRequest(
      http,
      (candidate) => !candidate.params.has('category'),
    );
    restored.flush(envelope(['King Street Bakery'], 8));
    await restoredNavigation;
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/listings');
    expect(harness.routeNativeElement?.textContent).toContain('King Street Bakery');
  });

  it('does not request an inverted price range', async () => {
    await harness.navigateByUrl('/listings?minPrice=10&maxPrice=1');
    await harness.fixture.whenStable();

    http.expectNone(() => true);
    expect(harness.routeNativeElement?.textContent).toContain(
      'Minimum price cannot be greater than the maximum.',
    );
  });

  it('shows an HTTP failure and retries the same query', async () => {
    const pending = harness.navigateByUrl('/listings?search=bakery');
    (await nextRequest(http)).flush('unavailable', {
      status: 500,
      statusText: 'Server Error',
    });
    await pending;
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Listings could not be loaded.');
    expect(text).not.toContain('No businesses match these filters.');

    const retry = [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find(
      (button) => button.textContent?.includes('Try again'),
    ) as HTMLButtonElement;
    retry.click();
    const again = await nextRequest(
      http,
      (candidate) => candidate.params.get('search') === 'bakery',
    );
    again.flush(envelope(['King Street Bakery']));
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement?.textContent).toContain('King Street Bakery');
  });

  it('shows the empty copy for a successful page with no rows', async () => {
    const pending = harness.navigateByUrl('/listings?search=missing');
    (await nextRequest(http)).flush(envelope([], 0));
    await pending;
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('No businesses match these filters.');
    expect(text).not.toContain('Listings could not be loaded.');
  });
});
