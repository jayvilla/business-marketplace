import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The outlet and the header links inject Router. An empty table is
      // enough to render the shell; route behavior is covered separately.
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the shell landmarks around the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.skip-link')?.textContent).toContain(
      'Skip to content',
    );
    expect(compiled.querySelector('app-header')).not.toBeNull();
    expect(compiled.querySelector('main#main-content')).not.toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-footer')?.textContent).toContain(
      '© 2026 Business Marketplace',
    );
  });
});
