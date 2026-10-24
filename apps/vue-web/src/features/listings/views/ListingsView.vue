<script setup lang="ts">
import ListingsGrid from '../components/ListingsGrid.vue';
import { fixtureListings } from '../fixtures/sample-listings';

/**
 * Listings screen. The grid receives the fixture array and the default
 * `ready` status. Loading, empty, and error are covered by grid tests.
 * This view does not add a control that switches those states, and it does
 * not call the API.
 *
 * The count is a constant derived from that array. It is not a `computed`,
 * because nothing here changes the array after setup.
 */
const listingCountLabel =
  fixtureListings.length === 1
    ? '1 listing'
    : `${fixtureListings.length} listings`;
</script>

<template>
  <div class="page">
    <header class="intro">
      <h1>Businesses for Sale</h1>
      <!--
        Angular's second sentence names search, filters, sort, and paging.
        Those controls are on the Angular page. They are not on this one,
        so the sentence would advertise actions the page does not have.
      -->
      <p>Published listings from the marketplace.</p>
    </header>

    <section class="results" aria-labelledby="results-heading">
      <h2 id="results-heading" tabindex="-1">Listing results</h2>
      <p class="count" role="status">{{ listingCountLabel }}</p>
      <ListingsGrid :listings="fixtureListings" />
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
