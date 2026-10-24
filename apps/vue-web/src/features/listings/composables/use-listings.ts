import { computed, onMounted, onUnmounted, ref } from 'vue';
import { isAbortError } from '../../../app/api/get-json';
import { getListings } from '../api/get-listings';
import {
  listingsErrorLog,
  listingsErrorMessage,
} from '../api/listings-error-message';
import type { BusinessListing } from '../models/business-listing';

/**
 * One screen state. A loading flag plus an error flag can both be true.
 * This union cannot. Empty is `ready` with no rows.
 *
 * `totalCount` is the API's match size. `listings` is only the page that
 * came back. Those two numbers are allowed to differ. A page of six is
 * not the whole catalog when the total is larger.
 */
type ListingsState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready';
      readonly listings: readonly BusinessListing[];
      readonly totalCount: number;
    }
  | { readonly kind: 'error'; readonly message: string };

/**
 * Request lifecycle for the listings page.
 *
 * The state lives in this function, not in a store. The page is the only
 * reader. A store would let any component start a second request.
 *
 * `load` is the GET. `retry` calls it again, and ignores a click that
 * arrives while a request is already open. Two clicks would abort the
 * first and start a duplicate of the same URL.
 *
 * Each `load` aborts the previous controller and bumps `generation`.
 * A response applies only when it is still the latest request and the
 * component is still mounted. An abort is not an error: the caller
 * canceled that request on purpose.
 */
export function useListings() {
  const state = ref<ListingsState>({ kind: 'loading' });

  let generation = 0;
  let controller: AbortController | null = null;
  let active = true;

  const listings = computed(() =>
    state.value.kind === 'ready' ? state.value.listings : [],
  );
  const status = computed(() =>
    state.value.kind === 'ready' ? 'ready' : state.value.kind,
  );
  const errorMessage = computed(() =>
    state.value.kind === 'error' ? state.value.message : '',
  );
  const totalCount = computed(() =>
    state.value.kind === 'ready' ? state.value.totalCount : 0,
  );

  async function load(): Promise<void> {
    controller?.abort();
    const requestId = ++generation;
    const next = new AbortController();
    controller = next;
    state.value = { kind: 'loading' };

    try {
      const page = await getListings(next.signal);
      if (!active || requestId !== generation) {
        return;
      }
      state.value = {
        kind: 'ready',
        listings: page.items,
        totalCount: page.totalCount,
      };
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
    if (state.value.kind === 'loading') {
      return;
    }
    void load();
  }

  onMounted(() => {
    void load();
  });

  onUnmounted(() => {
    active = false;
    controller?.abort();
  });

  return { listings, status, errorMessage, totalCount, load, retry };
}
