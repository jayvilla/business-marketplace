import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from './app.routes';
import { ListingsPage } from './features/listings/pages/listings-page';
import { NotFoundPage } from './pages/not-found-page';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes)],
    });
  });

  it('redirects / to /listings and shows the listings page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/listings');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Business listings',
    );
  });

  it('renders the listings page at /listings', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/listings', ListingsPage);

    expect(page).toBeInstanceOf(ListingsPage);
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
