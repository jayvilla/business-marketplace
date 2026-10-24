import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, ref, type Ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError, NetworkError } from '../../../app/api/get-json';
import type { ListingPage } from '../api/get-listings';
import { businessListing } from '../fixtures/sample-listings';
import { defaultListingQuery } from '../models/listing-query';
import { useListings, type ListingsRequest } from './use-listings';

const getListings = vi.hoisted(() => vi.fn());

vi.mock('../api/get-listings', () => ({
  getListings,
}));

function page(title: string, totalCount = 1): ListingPage {
  return {
    items: [businessListing({ id: title, title })],
    page: 1,
    pageSize: 6,
    totalCount,
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mountListings(source?: Ref<ListingsRequest>) {
  let api!: ReturnType<typeof useListings>;
  const Host = defineComponent({
    setup() {
      api = source === undefined ? useListings() : useListings(source);
      return () => null;
    },
  });
  const wrapper = mount(Host);
  return { api, wrapper };
}

describe('useListings', () => {
  beforeEach(() => {
    getListings.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in loading and then stores a successful page', async () => {
    const pending = deferred<ListingPage>();
    getListings.mockReturnValueOnce(pending.promise);
    const { api, wrapper } = mountListings();

    expect(api.status.value).toBe('loading');
    expect(api.listings.value).toEqual([]);
    expect(getListings).toHaveBeenCalledTimes(1);

    pending.resolve(page('Harbor & Rye', 8));
    await flushPromises();

    expect(api.status.value).toBe('ready');
    expect(api.listings.value[0]?.title).toBe('Harbor & Rye');
    expect(api.totalCount.value).toBe(8);
    wrapper.unmount();
  });

  it('treats an empty page as ready with no rows', async () => {
    getListings.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 6,
      totalCount: 0,
    });
    const { api, wrapper } = mountListings();
    await flushPromises();

    expect(api.status.value).toBe('ready');
    expect(api.listings.value).toEqual([]);
    expect(api.totalCount.value).toBe(0);
    wrapper.unmount();
  });

  it('stores an error for an HTTP failure and for a network failure', async () => {
    getListings.mockRejectedValueOnce(new HttpError(503));
    const http = mountListings();
    await flushPromises();

    expect(http.api.status.value).toBe('error');
    expect(http.api.errorMessage.value).toBe(
      'The listings service had a problem. Try again in a moment.',
    );
    http.wrapper.unmount();

    getListings.mockRejectedValueOnce(new NetworkError());
    const network = mountListings();
    await flushPromises();

    expect(network.api.errorMessage.value).toBe(
      'Listings could not be loaded. Check your connection and try again.',
    );
    network.wrapper.unmount();
  });

  it('retries from the error state and ignores a retry while loading', async () => {
    const pending = deferred<ListingPage>();
    getListings.mockReturnValueOnce(pending.promise);
    const { api, wrapper } = mountListings();

    api.retry();
    expect(getListings).toHaveBeenCalledTimes(1);

    pending.reject(new HttpError(500));
    await flushPromises();
    expect(api.status.value).toBe('error');

    getListings.mockResolvedValueOnce(page('Cedar Bakery'));
    api.retry();
    await flushPromises();

    expect(getListings).toHaveBeenCalledTimes(2);
    expect(api.listings.value[0]?.title).toBe('Cedar Bakery');
    wrapper.unmount();
  });

  it('drops a stale response after a newer request starts', async () => {
    const first = deferred<ListingPage>();
    const second = deferred<ListingPage>();
    getListings.mockReturnValueOnce(first.promise);
    getListings.mockReturnValueOnce(second.promise);
    const { api, wrapper } = mountListings();
    const firstSignal = getListings.mock.calls[0]?.[1] as AbortSignal;

    void api.load();

    expect(firstSignal.aborted).toBe(true);
    expect(getListings).toHaveBeenCalledTimes(2);

    first.resolve(page('Stale'));
    await flushPromises();
    expect(api.status.value).toBe('loading');
    expect(api.listings.value).toEqual([]);

    second.resolve(page('Fresh'));
    await flushPromises();
    expect(api.listings.value[0]?.title).toBe('Fresh');
    wrapper.unmount();
  });

  it('aborts the open request on unmount and does not record an error', async () => {
    const pending = deferred<ListingPage>();
    getListings.mockReturnValueOnce(pending.promise);
    const { wrapper } = mountListings();
    const signal = getListings.mock.calls[0]?.[1] as AbortSignal;

    wrapper.unmount();
    pending.resolve(page('Too late'));
    await flushPromises();

    expect(signal.aborted).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('keeps the previous page visible while the next query loads', async () => {
    const first = deferred<ListingPage>();
    const second = deferred<ListingPage>();
    getListings.mockReturnValueOnce(first.promise);
    getListings.mockReturnValueOnce(second.promise);
    const source = ref<ListingsRequest>({
      query: defaultListingQuery,
      blocked: false,
    });
    const { api, wrapper } = mountListings(source);

    first.resolve(page('Harbor & Rye', 8));
    await flushPromises();

    const firstSignal = getListings.mock.calls[0]?.[1] as AbortSignal;
    source.value = {
      query: { ...defaultListingQuery, search: 'bakery', category: 'Retail' },
      blocked: false,
    };
    await flushPromises();

    expect(api.status.value).toBe('updating');
    expect(api.listings.value[0]?.title).toBe('Harbor & Rye');
    expect(firstSignal.aborted).toBe(true);
    expect(getListings.mock.calls[1]?.[0]).toMatchObject({
      search: 'bakery',
      category: 'Retail',
      page: 1,
    });

    api.retry();
    expect(getListings).toHaveBeenCalledTimes(2);

    second.resolve(page('Cedar Bakery'));
    await flushPromises();
    expect(api.status.value).toBe('ready');
    expect(api.listings.value[0]?.title).toBe('Cedar Bakery');
    wrapper.unmount();
  });

  it('discards the previous page when the update fails', async () => {
    getListings.mockResolvedValueOnce(page('Harbor & Rye'));
    const source = ref<ListingsRequest>({
      query: defaultListingQuery,
      blocked: false,
    });
    const { api, wrapper } = mountListings(source);
    await flushPromises();

    getListings.mockRejectedValueOnce(new HttpError(503));
    source.value = {
      query: { ...defaultListingQuery, search: 'bakery' },
      blocked: false,
    };
    await flushPromises();

    expect(api.status.value).toBe('error');
    expect(api.listings.value).toEqual([]);
    expect(api.errorMessage.value).toContain('problem');
    wrapper.unmount();
  });

  it('does not request an inverted price range', async () => {
    getListings.mockResolvedValue(page('Harbor & Rye'));
    const source = ref<ListingsRequest>({
      query: defaultListingQuery,
      blocked: false,
    });
    const { api, wrapper } = mountListings(source);
    await flushPromises();

    source.value = {
      query: { ...defaultListingQuery, minPrice: 10, maxPrice: 1 },
      blocked: true,
    };
    await flushPromises();

    expect(getListings).toHaveBeenCalledTimes(1);
    expect(api.listings.value).toEqual([]);
    expect(api.status.value).toBe('loading');
    wrapper.unmount();
  });
});
