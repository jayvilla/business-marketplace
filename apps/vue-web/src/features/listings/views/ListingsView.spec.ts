import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import type { Router } from 'vue-router';
import type { VueWrapper } from '@vue/test-utils';
import { HttpError } from '../../../app/api/get-json';
import { createAppRouter } from '../../../app/router';
import type { ListingPage } from '../api/get-listings';
import { businessListing } from '../fixtures/sample-listings';
import { LISTING_TEXT_DEBOUNCE_MS } from '../models/listing-query';
import ListingsView from './ListingsView.vue';

const getListings = vi.hoisted(() => vi.fn());

vi.mock('../api/get-listings', () => ({
  getListings,
}));

function page(
  titles: readonly string[],
  totalCount = titles.length,
): ListingPage {
  return {
    items: titles.map((title) =>
      businessListing({
        id: title,
        title,
        featured: false,
        cashFlow: null,
      }),
    ),
    page: 1,
    pageSize: 6,
    totalCount,
  };
}

function button(wrapper: VueWrapper, name: string) {
  const found = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === name);
  if (found === undefined) {
    throw new Error(`Missing button ${name}`);
  }
  return found;
}

async function mountView(path = '/listings'): Promise<{
  router: Router;
  wrapper: VueWrapper;
}> {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(ListingsView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await flushPromises();
  return { router, wrapper };
}

describe('ListingsView', () => {
  beforeEach(() => {
    getListings.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('shows the loading presentation until the request settles', async () => {
    getListings.mockReturnValue(new Promise(() => undefined));
    const { wrapper } = await mountView();

    expect(wrapper.get('h1').text()).toBe('Businesses for Sale');
    expect(wrapper.text()).toContain('pages run on the server');
    expect(wrapper.get('[role="status"]').text()).toContain(
      'Loading listings.',
    );
    expect(wrapper.findAll('.skeleton')).toHaveLength(6);
    expect(wrapper.find('article').exists()).toBe(false);
    expect(wrapper.find('.count').exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders the returned page, the total, and pager when more pages exist', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye', 'Cedar Bakery'], 8));
    const { wrapper } = await mountView();

    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(wrapper.text()).toContain('Harbor & Rye');
    expect(wrapper.text()).toContain('Not disclosed');
    expect(wrapper.get('.count').text()).toBe('8 listings');
    expect(wrapper.get('nav[aria-label="Pagination"]').text()).toContain(
      'Page 1 of 2',
    );
    expect(wrapper.text()).not.toContain('Featured');
    expect(
      button(wrapper, 'Clear filters').attributes('disabled'),
    ).toBeDefined();
    wrapper.unmount();
  });

  it('shows the empty state when the page has no rows', async () => {
    getListings.mockResolvedValue(page([]));
    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain('No businesses are listed yet.');
    expect(wrapper.find('article').exists()).toBe(false);
    expect(wrapper.find('.count').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('nav[aria-label="Pagination"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the error state and retries with another request', async () => {
    getListings.mockRejectedValueOnce(new HttpError(503));
    const { wrapper } = await mountView();

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'The listings service had a problem. Try again in a moment.',
    );
    expect(wrapper.find('article').exists()).toBe(false);

    getListings.mockResolvedValueOnce(page(['Northbridge Accounting'], 1));
    await button(wrapper, 'Try again').trigger('click');
    await flushPromises();

    expect(getListings).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Northbridge Accounting');
    expect(wrapper.get('.count').text()).toBe('1 listing');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('debounces search into the URL and resets the page', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 8));
    const { router, wrapper } = await mountView('/listings?page=2');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await wrapper.get('#listing-search').setValue('  bakery  ');
    expect(getListings).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    await flushPromises();

    expect(router.currentRoute.value.query['search']).toBe('bakery');
    expect(router.currentRoute.value.query['page']).toBeUndefined();
    expect(getListings).toHaveBeenCalledTimes(2);
    expect(getListings.mock.calls[1]?.[0]).toMatchObject({
      search: 'bakery',
      page: 1,
    });
    wrapper.unmount();
  });

  it('does not let a pending search overwrite Back', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 1));
    const { router, wrapper } = await mountView('/listings?category=Retail');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await router.push('/listings');
    await flushPromises();
    await wrapper.get('#listing-search').setValue('bakery');
    await router.back();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    await flushPromises();

    expect(router.currentRoute.value.query['search']).toBeUndefined();
    expect(router.currentRoute.value.query['category']).toBe('Retail');
    expect(
      (wrapper.get('#listing-search').element as HTMLInputElement).value,
    ).toBe('');
    expect(
      getListings.mock.calls.some(
        (call) => (call[0] as { search: string }).search === 'bakery',
      ),
    ).toBe(false);
    wrapper.unmount();
  });

  it('updates category and sort in the URL and keeps an unrelated parameter', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 1));
    const { router, wrapper } = await mountView('/listings?ref=newsletter');

    await wrapper.get('#listing-category').setValue('Retail');
    await flushPromises();
    await wrapper.get('#listing-sort').setValue('price-asc');
    await flushPromises();

    expect(router.currentRoute.value.query).toMatchObject({
      ref: 'newsletter',
      category: 'Retail',
      sortBy: 'AskingPrice',
      sortDirection: 'Asc',
    });
    expect(getListings.mock.calls.at(-1)?.[0]).toMatchObject({
      category: 'Retail',
      sort: 'price-asc',
      page: 1,
    });
    wrapper.unmount();
  });

  it('clears filters, keeps the sort, and cancels a pending search', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 1));
    const { router, wrapper } = await mountView(
      '/listings?search=bakery&category=Retail&sortBy=AskingPrice&sortDirection=Desc',
    );
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await wrapper.get('#listing-search').setValue('oven');
    await button(wrapper, 'Clear filters').trigger('click');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({
      sortBy: 'AskingPrice',
      sortDirection: 'Desc',
    });
    expect(getListings.mock.calls.at(-1)?.[0]).toMatchObject({
      search: '',
      category: null,
      sort: 'price-desc',
    });
    wrapper.unmount();
  });

  it('pages without dropping the active filters and moves focus to the results', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 8));
    const { router, wrapper } = await mountView('/listings?category=Retail');

    await button(wrapper, 'Next page').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query).toMatchObject({
      category: 'Retail',
      page: '2',
    });
    expect(getListings.mock.calls.at(-1)?.[0]).toMatchObject({
      category: 'Retail',
      page: 2,
    });
    expect(document.activeElement).toBe(
      wrapper.get('#results-heading').element,
    );
    wrapper.unmount();
  });

  it('shows the previous page while the next page is loading', async () => {
    let resolveNext: (page: ListingPage) => void = () => undefined;
    getListings
      .mockResolvedValueOnce(page(['Harbor & Rye'], 8))
      .mockReturnValueOnce(
        new Promise<ListingPage>((resolve) => {
          resolveNext = resolve;
        }),
      );
    const { wrapper } = await mountView();

    await button(wrapper, 'Next page').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Updating listings.');
    expect(wrapper.text()).toContain('Harbor & Rye');
    expect(wrapper.get('ul').attributes('aria-busy')).toBe('true');
    expect(wrapper.text()).toContain('Loading page 2');

    resolveNext(page(['Cedar Bakery'], 8));
    await flushPromises();
    expect(wrapper.text()).toContain('Cedar Bakery');
    expect(wrapper.text()).not.toContain('Updating listings.');
    wrapper.unmount();
  });

  it('says when a requested page is past the results and steps back onto the last page', async () => {
    getListings.mockResolvedValue(page([], 8));
    const { router, wrapper } = await mountView('/listings?page=9');

    expect(wrapper.text()).toContain('This page is outside the results.');
    expect(getListings.mock.calls[0]?.[0]).toMatchObject({ page: 9 });

    await button(wrapper, 'Previous page').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query['page']).toBe('2');
    wrapper.unmount();
  });

  it('rewrites an invalid URL once and does not loop', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 1));
    const { router, wrapper } = await mountView(
      '/listings?category=Coffee&sortBy=Title&sortDirection=Asc&page=0&pageSize=100',
    );

    expect(router.currentRoute.value.query).toEqual({});
    expect(getListings).toHaveBeenCalledTimes(1);
    expect(getListings.mock.calls[0]?.[0]).toMatchObject({
      category: null,
      sort: 'newest',
      page: 1,
      pageSize: 6,
    });
    wrapper.unmount();
  });

  it('blocks an inverted price link and does not request it', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye'], 1));
    const { router, wrapper } = await mountView(
      '/listings?minPrice=10&maxPrice=1',
    );

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Minimum price cannot be greater than the maximum.',
    );
    expect(wrapper.find('article').exists()).toBe(false);
    expect(wrapper.find('.skeleton').exists()).toBe(false);
    expect(getListings).not.toHaveBeenCalled();
    expect(router.currentRoute.value.query).toMatchObject({
      minPrice: '10',
      maxPrice: '1',
    });
    wrapper.unmount();
  });

  it('offers clear filters when the committed search matches nothing', async () => {
    getListings.mockResolvedValue(page([]));
    const { router, wrapper } = await mountView();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await wrapper.get('#listing-search').setValue('missing');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    await flushPromises();

    expect(wrapper.text()).toContain('No businesses match these filters.');
    const clears = wrapper
      .findAll('button')
      .filter((candidate) => candidate.text() === 'Clear filters');
    expect(clears).toHaveLength(2);
    await clears[1]?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({});
    wrapper.unmount();
  });
});
