import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from './header';

describe('Header', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function menuButton(root: ParentNode): HTMLButtonElement {
    const element = root.querySelector('button');
    if (!(element instanceof HTMLButtonElement)) {
      throw new Error('Expected a menu button');
    }
    return element;
  }

  it('starts with the mobile menu closed', async () => {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();

    expect(menuButton(fixture.nativeElement).getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(
      fixture.nativeElement.querySelector('nav')?.classList.contains('is-open'),
    ).toBe(false);
  });

  it('toggles the menu from the button', async () => {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    const button = menuButton(fixture.nativeElement);

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(
      fixture.nativeElement.querySelector('nav')?.classList.contains('is-open'),
    ).toBe(true);

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes an open menu when Escape is pressed', async () => {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    const button = menuButton(fixture.nativeElement);

    button.click();
    await fixture.whenStable();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    // Escape closed a disclosure the keyboard opened. Focus goes back to
    // the button that owns it, instead of disappearing into the document.
    expect(document.activeElement).toBe(button);
  });
});