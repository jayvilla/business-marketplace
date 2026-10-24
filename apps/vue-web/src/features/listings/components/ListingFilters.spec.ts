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
    expect(
      wrapper.get('#listing-min-price').attributes('aria-describedby'),
    ).toBe('listing-filter-error');
    expect(wrapper.get('#listing-max-price').attributes('aria-invalid')).toBe(
      'true',
    );
    expect(
      wrapper.get('#listing-search').attributes('aria-invalid'),
    ).toBeUndefined();
  });

  it('commits zero, a decimal, and the largest allowed price', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-min-price').setValue('0');
    await wrapper.get('#listing-max-price').setValue('10.5');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);

    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      minPrice: 0,
      maxPrice: 10.5,
    });

    await wrapper.get('#listing-max-price').setValue('1000000000');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.emitted('change')?.[1]?.[0]).toMatchObject({
      minPrice: 0,
      maxPrice: 1_000_000_000,
    });
  });

  it('explains a negative, a word, and a price above the maximum without emitting', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-min-price').setValue('-5');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.get('#listing-filter-error').text()).toBe(
      'Minimum price must be zero or greater.',
    );
    expect(wrapper.get('#listing-max-price').attributes('aria-invalid')).toBe(
      undefined,
    );

    await wrapper.get('#listing-min-price').setValue('12');
    await wrapper.get('#listing-max-price').setValue('abc');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.get('#listing-filter-error').text()).toBe(
      'Enter a price as a number zero or greater.',
    );
    expect(
      wrapper.get('#listing-max-price').attributes('aria-describedby'),
    ).toBe('listing-filter-error');

    await wrapper.get('#listing-max-price').setValue('1000000001');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.get('#listing-filter-error').text()).toBe(
      'Maximum price cannot exceed $1,000,000,000.',
    );
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('commits a 200 character search and refuses one more character', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });
    const limit = 'a'.repeat(200);

    await wrapper.get('#listing-search').setValue(limit);
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      search: limit,
    });

    await wrapper.get('#listing-search').setValue(`${limit}b`);
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.get('#listing-filter-error').text()).toBe(
      'Search must be 200 characters or fewer.',
    );
    expect(wrapper.get('#listing-search').attributes('aria-invalid')).toBe(
      'true',
    );
    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('commits a pending search when the category changes, and only once', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    await wrapper.get('#listing-search').setValue('bakery');
    await wrapper.get('#listing-category').setValue('Retail');

    expect(wrapper.emitted('change')).toEqual([
      [
        {
          search: 'bakery',
          category: 'Retail',
          minPrice: null,
          maxPrice: null,
          sort: 'newest',
        },
      ],
    ]);
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('clears an invalid draft without waiting for the timer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mount(ListingFilters, {
      props: {
        query: { ...defaultListingQuery, sort: 'price-asc' },
      },
    });

    await wrapper.get('#listing-min-price').setValue('-2');
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.find('#listing-filter-error').exists()).toBe(true);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Clear filters')
      ?.trigger('click');

    expect(wrapper.find('#listing-filter-error').exists()).toBe(false);
    expect(wrapper.emitted('change')?.[0]?.[0]).toEqual({
      search: '',
      category: null,
      minPrice: null,
      maxPrice: null,
      sort: 'price-asc',
    });
    await vi.advanceTimersByTimeAsync(LISTING_TEXT_DEBOUNCE_MS);
    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('uses a submit button for Search and a button for Clear filters', () => {
    const wrapper = mount(ListingFilters, {
      props: { query: defaultListingQuery },
    });

    expect(wrapper.get('label[for="listing-search"]').text()).toBe('Search');
    expect(wrapper.get('label[for="listing-min-price"]').text()).toBe(
      'Minimum asking price',
    );
    expect(wrapper.get('label[for="listing-category"]').text()).toBe(
      'Category',
    );
    expect(wrapper.get('button.primary').attributes('type')).toBe('submit');
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === 'Clear filters')
        ?.attributes('type'),
    ).toBe('button');
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
