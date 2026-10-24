<script setup lang="ts">
import { computed } from 'vue';
import ListingsGrid from '../components/ListingsGrid.vue';
import { useListings } from '../composables/use-listings';

/**
 * Listings screen. The composable owns the request. This template only
 * chooses what the grid is told.
 *
 * The count uses both the rows on this page and the API total. When the
 * total is larger, the sentence says so. Six cards are not the catalog.
 */
const { listings, status, errorMessage, totalCount, retry } = useListings();

const countLabel = computed(() => {
  if (status.value !== 'ready') {
    return '';
  }
  const shown = listings.value.length;
  const total = totalCount.value;
  if (shown === 0 || total === 0) {
    return '';
  }
  if (shown === total) {
    return total === 1 ? '1 listing' : `${total} listings`;
  }
  return `Showing ${shown} of ${total} listings`;
});
</script>

<template>
  <div class="page">
    <header class="intro">
      <h1>Businesses for Sale</h1>
      <p>Published listings from the marketplace.</p>
    </header>

    <section class="results" aria-labelledby="results-heading">
      <h2 id="results-heading" tabindex="-1">Listing results</h2>
      <p v-if="countLabel" class="count" role="status">{{ countLabel }}</p>
      <ListingsGrid
        :listings="listings"
        :status="status"
        :error-message="errorMessage"
        @retry="retry"
      />
    </section>
  </div>
</template>

<style scoped>
.intro h1,
.results h2,
.intro p,
.count {
  margin: 0;
}

.intro p {
  max-width: 42rem;
  margin-top: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
}

.results {
  margin-top: var(--space-6);
}

.results h2 {
  font-size: var(--font-size-h2);
  line-height: var(--line-height-heading);
  /*
   * The header is sticky. A later focus of this heading should stop short
   * of sliding underneath that bar.
   */
  scroll-margin-top: var(--space-7);
}

.count {
  margin-top: var(--space-2);
  color: var(--color-text-muted);
}
</style>
