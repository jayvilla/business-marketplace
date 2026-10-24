<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { formatDollars } from '../formatting/format-dollars';
import { placeholderForCategory } from '../images/listing-placeholder';
import type { BusinessListing } from '../models/business-listing';

/**
 * One listing. It does not know about the grid, the page, or HTTP.
 *
 * There is no click handler and no link. A detail route does not exist,
 * and a control that navigates nowhere would look like a broken link.
 *
 * The title is an `h3` because the page renders this card under the
 * "Listing results" `h2`.
 */
const props = defineProps<{
  listing: BusinessListing;
}>();

/**
 * A failed photo stays failed when the parent rebuilds an equivalent
 * listing. A retry creates a new object with the same URL. Watching the
 * object would clear the flag and start the same broken request again.
 * Watching `imageUrl` clears the flag only when the source actually
 * changes, so that new URL can load.
 */
const imageFailed = ref(false);

watch(
  () => props.listing.imageUrl,
  () => {
    imageFailed.value = false;
  },
);

const imageSource = computed(() => {
  if (imageFailed.value) {
    return placeholderForCategory(props.listing.category);
  }
  return props.listing.imageUrl;
});

function money(amount: number | null): string {
  return amount === null ? 'Not disclosed' : formatDollars(amount);
}

/** Asking price is always a number. The other two figures may be withheld. */
const figures = computed(() => ({
  askingPrice: formatDollars(props.listing.askingPrice),
  annualRevenue: money(props.listing.annualRevenue),
  cashFlow: money(props.listing.cashFlow),
}));

function onImageError(): void {
  imageFailed.value = true;
}
</script>

<template>
  <article class="card">
    <div class="media">
      <!--
        Decorative. The category and the title are already text. An empty
        alt removes the image from the accessibility tree. A photograph
        later needs its own description, not the business name repeated.
      -->
      <img
        :src="imageSource"
        alt=""
        width="640"
        height="400"
        loading="lazy"
        decoding="async"
        @error="onImageError"
      />
      <p v-if="listing.featured" class="badge">Featured</p>
    </div>

    <div class="body">
      <p class="category">{{ listing.category }}</p>
      <h3>{{ listing.title }}</h3>
      <p class="location">{{ listing.location }}</p>
      <p class="description">{{ listing.description }}</p>

      <dl class="figures">
        <div>
          <dt>Asking price</dt>
          <dd>{{ figures.askingPrice }}</dd>
        </div>
        <div>
          <dt>Annual revenue</dt>
          <dd>{{ figures.annualRevenue }}</dd>
        </div>
        <div>
          <dt>Cash flow</dt>
          <dd>{{ figures.cashFlow }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--color-surface-muted);
}

img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.category,
.location,
.description,
h3 {
  margin: 0;
  max-width: none;
}

.category {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h3 {
  font-size: var(--font-size-h2);
  line-height: var(--line-height-heading);
  overflow-wrap: break-word;
}

.location,
.description {
  color: var(--color-text-muted);
}

.description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.figures {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
}

/*
 * At large zoom the label and the amount need a second line. A single
 * row that cannot wrap scrolls sideways.
 */
.figures div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
  overflow-wrap: anywhere;
}
</style>
