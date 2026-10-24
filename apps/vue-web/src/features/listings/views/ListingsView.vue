<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ListingFilters from '../components/ListingFilters.vue';
import ListingPagination from '../components/ListingPagination.vue';
import ListingsGrid from '../components/ListingsGrid.vue';
import { useListings } from '../composables/use-listings';
import {
  listingPageCount,
  listingQueryEqual,
  listingQueryNeedsCanonicalUrl,
  parseListingQuery,
  toRouteQuery,
  type ListingFilters as ListingFilterValues,
  type ListingQuery,
} from '../models/listing-query';

/**
 * Listings screen. The address bar is the committed query.
 *
 * Draft text lives in the filter form until the debounce, a select, or
 * Search commits it. This view writes that commit with `push`, so Back
 * returns to the previous filters. A URL that spells a default or an
 * unknown value is `replace`d, so it does not add a history entry and
 * does not become a 400.
 *
 * The composable watches the parsed query. It does not watch the raw
 * string, so rewriting `page=1` to nothing does not start a second GET.
 * This view's canonical rewrite reads that same computed, so the URL
 * correction and the request cannot parse the address differently.
 */
const route = useRoute();
const router = useRouter();

const parsed = computed(() => parseListingQuery(route.query));
const query = computed(() => parsed.value.query);
const priceError = computed(() => parsed.value.priceError);

const { listings, status, errorMessage, totalCount, retry } = useListings(
  computed(() => ({
    query: query.value,
    blocked: priceError.value !== null,
  })),
);

const resultsHeading = useTemplateRef<HTMLHeadingElement>('resultsHeading');

watch(
  parsed,
  (next) => {
    if (next.priceError !== null) {
      return;
    }
    if (!listingQueryNeedsCanonicalUrl(route.query, next.query)) {
      return;
    }
    commit(next.query, 'replace');
  },
  { immediate: true },
);

const filtersActive = computed(
  () =>
    query.value.search !== '' ||
    query.value.category !== null ||
    query.value.minPrice !== null ||
    query.value.maxPrice !== null,
);

const emptyMessage = computed(() => {
  const pages = listingPageCount(totalCount.value, query.value.pageSize);
  if (
    status.value === 'ready' &&
    totalCount.value > 0 &&
    query.value.page > pages
  ) {
    return 'This page is outside the results.';
  }
  if (filtersActive.value) {
    return 'No businesses match these filters.';
  }
  return 'No businesses are listed yet.';
});

const showCount = computed(
  () => status.value === 'ready' && totalCount.value > 0,
);

const countLabel = computed(() =>
  totalCount.value === 1 ? '1 listing' : `${totalCount.value} listings`,
);

const showPagination = computed(() => {
  if (priceError.value !== null) {
    return false;
  }
  if (
    status.value === 'loading' ||
    status.value === 'error' ||
    status.value === 'blocked'
  ) {
    return false;
  }
  const pages = listingPageCount(totalCount.value, query.value.pageSize);
  return pages > 1 || query.value.page > 1;
});

const paginationPending = computed(() => status.value === 'updating');

/**
 * The grid's status union has no `blocked` member. An inverted URL
 * takes the price alert branch, so this value is not rendered then.
 * Folding `blocked` into `loading` here would put skeletons back if
 * that branch were ever skipped.
 */
const gridStatus = computed(() => {
  if (
    status.value === 'updating' ||
    status.value === 'ready' ||
    status.value === 'error'
  ) {
    return status.value;
  }
  return 'loading' as const;
});

function onFiltersChange(filters: ListingFilterValues): void {
  const next: ListingQuery = {
    ...filters,
    page: 1,
    pageSize: query.value.pageSize,
  };
  if (listingQueryEqual(next, query.value)) {
    return;
  }
  commit(next, 'push');
}

function onPageChange(page: number): void {
  const next: ListingQuery = { ...query.value, page };
  if (listingQueryEqual(next, query.value)) {
    return;
  }
  commit(next, 'push');
  // Next can become disabled on the last page and leave the tab order.
  // The results heading is the start of what changed. Filter changes do
  // not move focus. The person is still in the form.
  resultsHeading.value?.focus();
}

function onClear(): void {
  onFiltersChange({
    search: '',
    category: null,
    minPrice: null,
    maxPrice: null,
    sort: query.value.sort,
  });
}

/**
 * `push` records a filter or page change. `replace` corrects a URL the
 * user did not type as a new step, such as `page=0` or an unknown sort.
 */
function commit(next: ListingQuery, mode: 'push' | 'replace'): void {
  const location = { query: toRouteQuery(route.query, next) };
  const result =
    mode === 'push' ? router.push(location) : router.replace(location);
  void result.catch(() => undefined);
}
</script>

<template>
  <div class="page">
    <header class="intro">
      <h1>Businesses for Sale</h1>
      <p>
        Published listings from the marketplace API. Search, filters, sort, and
        pages run on the server.
      </p>
    </header>

    <div class="layout">
      <ListingFilters :query="query" @change="onFiltersChange" />

      <section class="results" aria-labelledby="results-heading">
        <h2 id="results-heading" ref="resultsHeading" tabindex="-1">
          Listing results
        </h2>

        <!--
          The range is already in the URL, so this alert is the whole
          result. The grid stays unmounted: skeletons would say a
          request is running, and it is not.
        -->
        <p v-if="priceError" class="state" role="alert">{{ priceError }}</p>
        <template v-else>
          <p v-if="showCount" class="count" role="status">{{ countLabel }}</p>
          <ListingsGrid
            :listings="listings"
            :status="gridStatus"
            :error-message="errorMessage"
            :empty-message="emptyMessage"
            :show-clear="
              filtersActive && listings.length === 0 && status === 'ready'
            "
            @retry="retry"
            @clear="onClear"
          />
          <ListingPagination
            v-if="showPagination"
            :page="query.page"
            :page-size="query.pageSize"
            :total-count="totalCount"
            :pending="paginationPending"
            @page-change="onPageChange"
          />
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.intro h1,
.results h2,
.intro p,
.count,
.state {
  margin: 0;
}

.intro p {
  max-width: 42rem;
  margin-top: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
}

.layout {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-6);
}

.results h2 {
  font-size: var(--font-size-h2);
  line-height: var(--line-height-heading);
  /*
   * The header is sticky. Focusing this heading after a page change
   * should stop short of sliding underneath that bar.
   */
  scroll-margin-top: var(--space-7);
}

.count,
.state {
  margin-top: var(--space-2);
  color: var(--color-text-muted);
}

.state {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 700;
}

@media (min-width: 64rem) {
  .layout {
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
