import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../../app/api/get-json';
import type { ListingPage } from '../api/get-listings';
import { businessListing } from '../fixtures/sample-listings';
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

describe('ListingsView', () => {
  beforeEach(() => {
    getListings.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the loading presentation until the request settles', () => {
    getListings.mockReturnValue(new Promise(() => undefined));
    const wrapper = mount(ListingsView);

    expect(wrapper.get('h1').text()).toBe('Businesses for Sale');
    expect(wrapper.get('[role="status"]').text()).toContain(
      'Loading listings.',
    );
    expect(wrapper.findAll('.skeleton')).toHaveLength(6);
    expect(wrapper.find('article').exists()).toBe(false);
    expect(wrapper.find('.count').exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders the returned page and says when the catalog is larger', async () => {
    getListings.mockResolvedValue(page(['Harbor & Rye', 'Cedar Bakery'], 8));
    const wrapper = mount(ListingsView);
    await flushPromises();

    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(wrapper.text()).toContain('Harbor & Rye');
    expect(wrapper.text()).toContain('Cedar Bakery');
    expect(wrapper.text()).toContain('Not disclosed');
    expect(wrapper.get('.count').text()).toBe('Showing 2 of 8 listings');
    expect(wrapper.text()).not.toContain('Featured');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Clear filters');
    expect(wrapper.text()).not.toContain('match these filters');
    wrapper.unmount();
  });

  it('shows the empty state when the page has no rows', async () => {
    getListings.mockResolvedValue(page([]));
    const wrapper = mount(ListingsView);
    await flushPromises();

    expect(wrapper.text()).toContain('No businesses are listed yet.');
    expect(wrapper.find('article').exists()).toBe(false);
    expect(wrapper.find('.count').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the error state and retries with another request', async () => {
    getListings.mockRejectedValueOnce(new HttpError(503));
    const wrapper = mount(ListingsView);
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'The listings service had a problem. Try again in a moment.',
    );
    expect(wrapper.find('article').exists()).toBe(false);

    getListings.mockResolvedValueOnce(page(['Northbridge Accounting'], 1));
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(getListings).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Northbridge Accounting');
    expect(wrapper.get('.count').text()).toBe('1 listing');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
