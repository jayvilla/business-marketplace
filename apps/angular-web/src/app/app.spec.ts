import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The outlet injects Router. An empty table is enough for this test;
      // route behavior is covered in app.routes.spec.ts.
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the outlet the router fills with the active page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
