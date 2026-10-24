<script setup lang="ts">
import { computed } from 'vue';
import { listingPageCount } from '../models/listing-query';

/**
 * Previous and next for a server page.
 *
 * `pageCount` is `ceil(total / size)`. The API does not send that
 * quotient. A page past the end still renders so Previous can move
 * back onto a page that has rows. The buttons stay disabled while a
 * request is open, so a second click cannot ask for a total that is
 * still the previous query's.
 */
const props = defineProps<{
  page: number;
  pageSize: number;
  totalCount: number;
  pending?: boolean;
}>();

const emit = defineEmits<{
  pageChange: [page: number];
}>();

const pageCount = computed(() =>
  listingPageCount(props.totalCount, props.pageSize),
);

const previousTarget = computed(() =>
  props.page > pageCount.value ? pageCount.value : props.page - 1,
);

function go(page: number): void {
  if (props.pending) {
    return;
  }
  emit('pageChange', page);
}
</script>

<template>
  <nav class="pagination" aria-label="Pagination">
    <button
      type="button"
      :disabled="pending || page <= 1"
      @click="go(previousTarget)"
    >
      Previous page
    </button>
    <!--
      One element, so the live region survives the text change. Replacing
      the node on each page would give assistive tech a new region.
      `polite` waits until the user pauses. This text changes on a page
      click, not on each search keystroke.
    -->
    <p aria-live="polite" aria-atomic="true">
      <template v-if="pending">Loading page {{ page }}</template>
      <template v-else>Page {{ page }} of {{ pageCount }}</template>
    </p>
    <button
      type="button"
      :disabled="pending || page >= pageCount"
      @click="go(page + 1)"
    >
      Next page
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

p {
  margin: 0;
  max-width: none;
  font-weight: 700;
}

button {
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
