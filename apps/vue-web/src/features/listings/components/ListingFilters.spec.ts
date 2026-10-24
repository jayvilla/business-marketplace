import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultListingQuery,
  LISTING_TEXT_DEBOUNCE_MS,
} from '../models/listing-query';
import ListingFilters from './ListingFilters.vue';

describe('ListingFilters', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits to emit a trimmed search and collapses rapid typing', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-search').setValue('  ba');
    await wrapper.get('#listing-search').setValue('  bakery  ');
    expect(wrapper.emitted('change')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS - 1);
    expect(wrapper.emitted('change')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.emitted('change')).toEqual([
      [
        {
          search: 'bakery',
          category: null,
          minPrice: null,
          maxPrice: null,
          sort: 'newest',
        },
      ],
    ]);
  });

  it('commits search immediately when the form is submitted', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-search').setValue('bakery');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      search: 'bakery',
    });
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('applies category and sort without waiting', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-category').setValue('ProfessionalServices');
    await wrapper.get('#listing-sort').setValue('revenue-desc');

    expect(wrapper.emitted('change')).toHaveLength(2);
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      category: 'ProfessionalServices',
    });
    expect(wrapper.emitted('change')?.[1]?.[0]).toMatchObject({
      sort: 'revenue-desc',
    });
  });

  it('does not emit an invalid price, and explains it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-min-price').setValue('10');
    await wrapper.get('#listing-max-price').setValue('1');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);

    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.get('#listing-filter-error').text()).toBe(
      'Minimum price cannot be greater than the maximum.',
    );
    expect(wrapper.get('#listing-min-price').attributes('aria-invalid')).toBe(
      'true',
    );
  });

  it('drops a pending search when the committed query changes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-search').setValue('bakery');
    await wrapper.setProps({
      query: { ...defaultListingQuery, category: 'Retail' },
    });
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);

    expect(wrapper.emitted('change')).toBeUndefined();
    expect(
      (wrapper.get('#listing-search').element as HTMLInputElement).value,
    ).toBe('');
    expect(
      (wrapper.get('#listing-category').element as HTMLSelectElement).value,
    ).toBe('Retail');
  });

  it('clears search, category, and price, and keeps the sort', async () => {
    const wrapper = mount(ListingFilters, {
      props: {
        query: {
          ...defaultListingQuery,
          search: 'bakery',
          category: 'Retail',
          minPrice: 10,
          sort: 'price-desc',
        },
      },
    });

    const clear = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Clear filters');
    expect(clear?.attributes('disabled')).toBeUndefined();
    await clear?.trigger('click');

    expect(wrapper.emitted('change')?.[0]?.[0]).toEqual({
      search: '',
      category: null,
      minPrice: null,
      maxPrice: null,
      sort: 'price-desc',
    });
  });

  it('does not emit a search that was still waiting when the form unmounts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-search').setValue('bakery');
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);

    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('leaves clear disabled when only the sort is set', () => {
    const wrapper = mount(ListingFilters, {
      props: { query: { ...defaultListingQuery, sort: 'price-asc' } },
    });

    const clear = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Clear filters');
    expect(clear?.attributes('disabled')).toBeDefined();
  });
});
