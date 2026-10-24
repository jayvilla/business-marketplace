import {
  computed,
  onUnmounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import { isAbortError } from '../../../app/api/get-json';
import { getListings, type ListingPage } from '../api/get-listings';
import {
  listingsErrorLog,
  listingsErrorMessage,
} from '../api/listings-error-message';
import type { BusinessListing } from '../models/business-listing';
import {
  defaultListingQuery,
  listingQueryEqual,
  type ListingQuery,
} from '../models/listing-query';

/**
 * One screen state. Loading and error cannot both be true.
 * Empty is `ready` with no rows.
 *
 * `updating` keeps the previous page on screen while a newer query is
 * in flight, and marks it busy. Those rows are the previous answer,
 * not the new one. The status text says so.
 *
 * An error discards that previous page. Showing it under the new query
 * would claim those businesses matched a search they were not fetched
 * for. Retry then starts from skeletons.
 *
 * `blocked` is an inverted price range. Nothing is fetched. The next
 * valid query starts from skeletons, because there is no honest page
 * to keep.
 */
type ListingsState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'updating'; readonly page: ListingPage }
  | { readonly kind: 'ready'; readonly page: ListingPage }
  | { readonly kind: 'error'; readonly message: string };

export interface ListingsRequest {
  readonly query: ListingQuery;
  readonly blocked: boolean;
}

/**
 * `blocked` is an inverted price already in the URL. No request is
 * running. Reporting it as `loading` would be permission to show
 * skeletons and "Loading listings." The view draws the price alert
 * instead, and does not pass `blocked` to the grid.
 */
export type ListingsStatus =
  | 'loading'
  | 'updating'
  | 'ready'
  | 'error'
  | 'blocked';

/**
 * Public surface. Every data field is a computed, which Vue will not
 * let the caller assign. The state ref stays in this function.
 * `retry` is the only command. A public load would let a caller fetch
 * a query the address bar does not show.
 */
export interface ListingsSnapshot {
  readonly listings: ComputedRef<readonly BusinessListing[]>;
  readonly status: ComputedRef<ListingsStatus>;
  readonly errorMessage: ComputedRef<string>;
  readonly totalCount: ComputedRef<number>;
  retry(): void;
}

/**
 * Request lifecycle for the listings page.
 *
 * `source` is the committed query, usually a computed of the URL.
 * This function does not read the router. The page does.
 *
 * One watch owns the GET. A query change and Retry both come through
 * it, so a single committed change produces one request. `load` aborts
 * the previous controller and bumps `generation`. A response applies
 * only when it is still the latest request and the component is still
 * mounted. An abort is not an error.
 *
 * `onUnmounted` covers the race `AbortController` does not: the body
 * can already have resolved, with the assignment still queued. The
 * `active` flag drops that assignment. The watch itself stops with the
 * component, which is Vue's cleanup for a watch created in setup.
 */
export function useListings(
  source?: MaybeRefOrGetter<ListingsRequest>,
): ListingsSnapshot {
  const state = ref<ListingsState>({ kind: 'loading' });
  const retryNonce = ref(0);

  let generation = 0;
  let controller: AbortController | null = null;
  let active = true;
  let latestQuery = defaultListingQuery;

  const listings = computed(() => visiblePage(state.value)?.items ?? []);
  const status = computed((): ListingsStatus => {
    if (state.value.kind === 'blocked') {
      return 'blocked';
    }
    if (state.value.kind === 'updating') {
      return 'updating';
    }
    if (state.value.kind === 'ready') {
      return 'ready';
    }
    if (state.value.kind === 'error') {
      return 'error';
    }
    return 'loading';
  });
  const errorMessage = computed(() =>
    state.value.kind === 'error' ? state.value.message : '',
  );
  const totalCount = computed(() => visiblePage(state.value)?.totalCount ?? 0);

  const request = computed(() => {
    const value =
      source === undefined
        ? { query: defaultListingQuery, blocked: false }
        : toValue(source);
    return {
      query: value.query,
      blocked: value.blocked,
      nonce: retryNonce.value,
    };
  });

  watch(
    request,
    (next, previous) => {
      latestQuery = next.query;
      if (
        previous &&
        next.blocked === previous.blocked &&
        next.nonce === previous.nonce &&
        listingQueryEqual(next.query, previous.query)
      ) {
        return;
      }
      if (next.blocked) {
        controller?.abort();
        generation += 1;
        state.value = { kind: 'blocked' };
        return;
      }
      void load(next.query);
    },
    { immediate: true },
  );

  async function load(query: ListingQuery = latestQuery): Promise<void> {
    controller?.abort();
    const requestId = ++generation;
    const next = new AbortController();
    controller = next;
    const previous = visiblePage(state.value);
    state.value =
      previous === null
        ? { kind: 'loading' }
        : { kind: 'updating', page: previous };

    try {
      const page = await getListings(query, next.signal);
      if (!active || requestId !== generation) {
        return;
      }
      state.value = { kind: 'ready', page };
    } catch (error: unknown) {
      if (!active || requestId !== generation || isAbortError(error)) {
        return;
      }
      console.error(listingsErrorLog(error));
      state.value = {
        kind: 'error',
        message: listingsErrorMessage(error),
      };
    }
  }

  function retry(): void {
    if (state.value.kind === 'loading' || state.value.kind === 'updating') {
      return;
    }
    retryNonce.value += 1;
  }

  onUnmounted(() => {
    active = false;
    controller?.abort();
  });

  return { listings, status, errorMessage, totalCount, retry };
}

function visiblePage(state: ListingsState): ListingPage | null {
  if (state.kind === 'ready' || state.kind === 'updating') {
    return state.page;
  }
  return null;
}
