import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ListingPagination from './ListingPagination.vue';

function button(wrapper: ReturnType<typeof mount>, name: string) {
  const found = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === name);
  if (found === undefined) {
    throw new Error(`Missing button ${name}`);
  }
  return found;
}

describe('ListingPagination', () => {
  it('disables previous on the first page and moves forward', async () => {
    const wrapper = mount(ListingPagination, {
      props: { page: 1, pageSize: 6, totalCount: 8 },
    });

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Pagination');
    expect(wrapper.get('p').text()).toBe('Page 1 of 2');
    expect(
      button(wrapper, 'Previous page').attributes('disabled'),
    ).toBeDefined();
    expect(button(wrapper, 'Next page').attributes('disabled')).toBeUndefined();

    await button(wrapper, 'Next page').trigger('click');
    expect(wrapper.emitted('pageChange')).toEqual([[2]]);
  });

  it('disables next on the last page and moves back', async () => {
    const wrapper = mount(ListingPagination, {
      props: { page: 2, pageSize: 6, totalCount: 8 },
    });

    expect(button(wrapper, 'Next page').attributes('disabled')).toBeDefined();
    await button(wrapper, 'Previous page').trigger('click');
    expect(wrapper.emitted('pageChange')).toEqual([[1]]);
  });

  it('sends previous to the last real page when the request is past the end', async () => {
    const wrapper = mount(ListingPagination, {
      props: { page: 9, pageSize: 6, totalCount: 8 },
    });

    expect(wrapper.get('p').text()).toBe('Page 9 of 2');
    await button(wrapper, 'Previous page').trigger('click');
    expect(wrapper.emitted('pageChange')).toEqual([[2]]);
  });

  it('disables both actions and says the page is loading while a request is open', async () => {
    const wrapper = mount(ListingPagination, {
      props: { page: 2, pageSize: 6, totalCount: 20, pending: true },
    });

    expect(wrapper.get('p').text()).toBe('Loading page 2');
    expect(
      button(wrapper, 'Previous page').attributes('disabled'),
    ).toBeDefined();
    expect(button(wrapper, 'Next page').attributes('disabled')).toBeDefined();
    await button(wrapper, 'Next page').trigger('click');
    expect(wrapper.emitted('pageChange')).toBeUndefined();
  });

  it('treats an empty result as a single page', () => {
    const wrapper = mount(ListingPagination, {
      props: { page: 1, pageSize: 6, totalCount: 0 },
    });

    expect(wrapper.get('p').text()).toBe('Page 1 of 1');
    expect(
      button(wrapper, 'Previous page').attributes('disabled'),
    ).toBeDefined();
    expect(button(wrapper, 'Next page').attributes('disabled')).toBeDefined();
  });
});
