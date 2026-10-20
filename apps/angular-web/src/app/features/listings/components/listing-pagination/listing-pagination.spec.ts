import { TestBed } from '@angular/core/testing';
import { ListingPagination } from './listing-pagination';

describe('ListingPagination', () => {
  it('disables previous on the first page and next on the last', async () => {
    await TestBed.configureTestingModule({
      imports: [ListingPagination],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListingPagination);
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => pages.push(page));

    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 6);
    fixture.componentRef.setInput('totalCount', 8);
    await fixture.whenStable();

    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 2');
    const status = fixture.nativeElement.querySelector('p');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(buttons.every((button) => button.type === 'button')).toBe(true);

    buttons[1]?.click();
    expect(pages).toEqual([2]);

    fixture.componentRef.setInput('page', 2);
    await fixture.whenStable();
    const onLast = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(onLast[0]?.disabled).toBe(false);
    expect(onLast[1]?.disabled).toBe(true);
  });

  it('sends an out-of-range page back to the last page that has rows', async () => {
    await TestBed.configureTestingModule({
      imports: [ListingPagination],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListingPagination);
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => pages.push(page));
    fixture.componentRef.setInput('page', 9);
    fixture.componentRef.setInput('pageSize', 6);
    fixture.componentRef.setInput('totalCount', 8);
    await fixture.whenStable();

    const previous = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(previous.disabled).toBe(false);
    previous.click();
    expect(pages).toEqual([2]);
  });

  it('disables both buttons and withholds the old total while a page is loading', async () => {
    await TestBed.configureTestingModule({
      imports: [ListingPagination],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListingPagination);
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => pages.push(page));
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 6);
    fixture.componentRef.setInput('totalCount', 8);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading page 2');
    expect(fixture.nativeElement.textContent).not.toContain('Page 2 of 2');
    buttons[1]?.click();
    expect(pages).toEqual([]);
  });
});
