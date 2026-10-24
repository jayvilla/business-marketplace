<script setup lang="ts">
import { getCurrentInstance } from 'vue';
import ListingCard from './ListingCard.vue';
import type { BusinessListing } from '../models/business-listing';

/**
 * How a collection is drawn, including the states around it.
 *
 * The parent chooses the status and the array. This component does not
 * fetch, filter, or sort. Loading, empty, and error are props so a test
 * can show each one without a timer.
 *
 * Empty is `ready` with no rows. A separate empty status could disagree
 * with an array that still has items.
 *
 * `updating` keeps the previous page visible while a newer query is in
 * flight. The error state replaces that page. The retry button emits,
 * and it is rendered only when the parent listens. Clear filters is the
 * empty state's action, and only when the parent asked for it.
 */
export type ListingsGridStatus = 'loading' | 'updating' | 'ready' | 'error';

const props = withDefaults(
  defineProps<{
    listings?: readonly BusinessListing[];
    status?: ListingsGridStatus;
    errorMessage?: string;
    emptyMessage?: string;
    showClear?: boolean;
  }>(),
  {
    listings: () => [],
    status: 'ready',
    errorMessage: 'Sample listings could not be loaded.',
    emptyMessage: 'No businesses are listed yet.',
    showClear: false,
  },
);

const emit = defineEmits<{
  retry: [];
  clear: [];
}>();

/**
 * One placeholder per card on the API's default page of 6. Fewer skeletons
 * than that page would make the grid jump when a later phase fills it.
 * The list is constant so rendering does not allocate a new array.
 */
const skeletonSlots = [1, 2, 3, 4, 5, 6] as const;

function onRetry(): void {
  emit('retry');
}

function onClear(): void {
  emit('clear');
}

/**
 * The button exists only when a parent passed `@retry`. Emitting with
 * nobody listening is a control that does nothing. The listings page
 * passes that listener. A parent that sets `error` without one gets the
 * message and no button.
 *
 * Declared emits are removed from `$attrs`, so the listener is read from
 * the vnode. Vue names it `onRetry` for an emit called `retry`.
 */
function retryListenerAttached(): boolean {
  const vnodeProps = getCurrentInstance()?.vnode.props;
  if (vnodeProps == null || !('onRetry' in vnodeProps)) {
    return false;
  }

  const listener: unknown = vnodeProps.onRetry;
  return typeof listener === 'function' || Array.isArray(listener);
}
</script>

<template>
  <div v-if="props.status === 'loading'" class="loading">
    <p class="visually-hidden" role="status">Loading listings.</p>
    <div class="grid" aria-hidden="true">
      <div v-for="slot in skeletonSlots" :key="slot" class="skeleton">
        <div class="skeleton-media"></div>
        <div class="skeleton-body">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-figure"></div>
          <div class="skeleton-figure"></div>
          <div class="skeleton-figure"></div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="props.status === 'error'" class="state" role="alert">
    <p>{{ props.errorMessage }}</p>
    <button v-if="retryListenerAttached()" type="button" @click="onRetry">
      Try again
    </button>
  </div>

  <div v-else-if="props.status === 'updating'">
    <p class="updating" role="status">Updating listings.</p>
    <ul class="grid is-updating" aria-busy="true">
      <li v-for="listing in props.listings" :key="listing.id">
        <ListingCard :listing="listing" />
      </li>
    </ul>
  </div>

  <div v-else-if="props.listings.length === 0" class="state">
    <p>{{ props.emptyMessage }}</p>
    <button v-if="props.showClear" type="button" @click="onClear">
      Clear filters
    </button>
  </div>

  <!--
    `listing.id` is the item's identity. An index key would reuse the
    component at that position, so reordering the array could keep one
    card's failed-image flag on a different business.
  -->
  <ul v-else class="grid">
    <li v-for="listing in props.listings" :key="listing.id">
      <ListingCard :listing="listing" />
    </li>
  </ul>
</template>

<style scoped>
.loading {
  position: relative;
}

.grid {
  display: grid;
  gap: var(--space-4);
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  min-width: 0;
}

.skeleton {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.skeleton-media {
  aspect-ratio: 16 / 10;
  background: var(--color-surface-muted);
}

.skeleton-body {
  padding: 0 var(--space-4) var(--space-4);
}

.skeleton-line {
  height: 0.75rem;
  margin-top: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.skeleton-line.short {
  width: 28%;
  height: 0.625rem;
}

.skeleton-line.title {
  width: 70%;
  height: 1.125rem;
}

.skeleton-figure {
  height: 0.875rem;
  margin-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.skeleton-media,
.skeleton-line,
.skeleton-figure {
  background: linear-gradient(
    90deg,
    var(--color-surface-muted) 0%,
    var(--color-surface) 50%,
    var(--color-surface-muted) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-media,
  .skeleton-line,
  .skeleton-figure {
    animation: none;
    background: var(--color-surface-muted);
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

.state {
  margin: var(--space-4) 0 0;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.state p {
  margin: 0;
}

.state button {
  margin-top: var(--space-3);
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.is-updating {
  opacity: 0.55;
}

.updating {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  font-weight: 700;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 48rem) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
