<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  filtersEqual,
  LISTING_CATEGORIES,
  LISTING_MAX_SEARCH_LENGTH,
  LISTING_SORTS,
  LISTING_TEXT_DEBOUNCE_MS,
  listingCategoryLabel,
  listingSortLabel,
  type ListingCategory,
  type ListingFilters,
  type ListingQuery,
  type ListingSort,
} from '../models/listing-query';

/**
 * Search, category, price, and sort. This form does not call HTTP and
 * does not read the router. The page owns the URL. The form tells the
 * page when the committed filters should change.
 *
 * Search and the two prices wait `LISTING_TEXT_DEBOUNCE_MS`. A select
 * applies immediately. One timer covers the text fields, so a second
 * keystroke replaces the first deadline instead of stacking requests.
 *
 * The timer is cleared when the committed query changes underneath the
 * draft. That is Back, Forward, and Clear. A keystroke that has not
 * been committed yet must not write over the URL those actions restored.
 */
const props = defineProps<{
  query: ListingQuery;
}>();

const emit = defineEmits<{
  change: [filters: ListingFilters];
}>();

const search = ref('');
const category = ref<ListingCategory | ''>('');
const minPrice = ref('');
const maxPrice = ref('');
const sort = ref<ListingSort>('newest');
const fieldError = ref<FilterFieldError | null>(null);

/**
 * Derived from the draft, not stored beside it. A ref updated from every
 * keystroke can miss one call site and leave Clear filters disabled
 * after the field already has text.
 */
const filtersActive = computed(
  () =>
    search.value.trim() !== '' ||
    category.value !== '' ||
    minPrice.value.trim() !== '' ||
    maxPrice.value.trim() !== '',
);

let textTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.query,
  (query) => {
    const current = readFilters();
    if (current !== null && filtersEqual(current, query)) {
      return;
    }
    clearTextTimer();
    search.value = query.search;
    category.value = query.category ?? '';
    minPrice.value = query.minPrice === null ? '' : String(query.minPrice);
    maxPrice.value = query.maxPrice === null ? '' : String(query.maxPrice);
    sort.value = query.sort;
    fieldError.value = null;
  },
  { immediate: true },
);

onUnmounted(() => {
  clearTextTimer();
});

function onSearchInput(event: Event): void {
  search.value = inputValue(event);
  scheduleText();
}

function onMinPriceInput(event: Event): void {
  minPrice.value = inputValue(event);
  scheduleText();
}

function onMaxPriceInput(event: Event): void {
  maxPrice.value = inputValue(event);
  scheduleText();
}

function onCategoryChange(event: Event): void {
  const value = inputValue(event);
  category.value = isCategory(value) ? value : '';
  applyNow();
}

function onSortChange(event: Event): void {
  const value = inputValue(event);
  sort.value = isSort(value) ? value : 'newest';
  applyNow();
}

function applyNow(): void {
  clearTextTimer();
  publish();
}

function clear(): void {
  clearTextTimer();
  search.value = '';
  category.value = '';
  minPrice.value = '';
  maxPrice.value = '';
  fieldError.value = null;
  publish();
}

function invalid(target: FilterErrorTarget): 'true' | undefined {
  return fieldError.value?.target === target ? 'true' : undefined;
}

function describedBy(target: FilterErrorTarget): string | undefined {
  return fieldError.value?.target === target
    ? 'listing-filter-error'
    : undefined;
}

function scheduleText(): void {
  clearTextTimer();
  textTimer = setTimeout(() => {
    textTimer = undefined;
    publish();
  }, LISTING_TEXT_DEBOUNCE_MS);
}

function clearTextTimer(): void {
  if (textTimer !== undefined) {
    clearTimeout(textTimer);
    textTimer = undefined;
  }
}

function publish(): void {
  const filters = readFilters();
  if (filters === null) {
    return;
  }
  fieldError.value = null;
  emit('change', filters);
}

function readFilters(): ListingFilters | null {
  const trimmedSearch = search.value.trim();
  if (trimmedSearch.length > LISTING_MAX_SEARCH_LENGTH) {
    fieldError.value = {
      target: 'search',
      message: `Search must be ${LISTING_MAX_SEARCH_LENGTH} characters or fewer.`,
    };
    return null;
  }

  const parsedMin = readDraftPrice(minPrice.value);
  const parsedMax = readDraftPrice(maxPrice.value);
  if (parsedMin === undefined || parsedMax === undefined) {
    fieldError.value = {
      target: 'price',
      message: 'Enter a price as a number zero or greater.',
    };
    return null;
  }
  if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
    fieldError.value = {
      target: 'price',
      message: 'Minimum price cannot be greater than the maximum.',
    };
    return null;
  }

  return {
    search: trimmedSearch,
    category: category.value === '' ? null : category.value,
    minPrice: parsedMin,
    maxPrice: parsedMax,
    sort: sort.value,
  };
}

function inputValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement
    ? target.value
    : '';
}

function isCategory(value: string): value is ListingCategory {
  return (LISTING_CATEGORIES as readonly string[]).includes(value);
}

function isSort(value: string): value is ListingSort {
  return (LISTING_SORTS as readonly string[]).includes(value);
}

/** `null` is an empty field. `undefined` is text that is not a price. */
function readDraftPrice(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return undefined;
  }
  return Number(trimmed);
}

type FilterErrorTarget = 'search' | 'price';

interface FilterFieldError {
  readonly target: FilterErrorTarget;
  readonly message: string;
}
</script>

<template>
  <form
    class="filters"
    aria-labelledby="search-heading"
    @submit.prevent="applyNow"
  >
    <h2 id="search-heading">Search and filters</h2>

    <div class="field">
      <label for="listing-search">Search</label>
      <input
        id="listing-search"
        type="search"
        :value="search"
        :maxlength="LISTING_MAX_SEARCH_LENGTH"
        autocomplete="off"
        :aria-invalid="invalid('search')"
        :aria-describedby="describedBy('search')"
        @input="onSearchInput"
      />
    </div>

    <div class="field">
      <label for="listing-category">Category</label>
      <select
        id="listing-category"
        :value="category"
        @change="onCategoryChange"
      >
        <option value="">All categories</option>
        <option v-for="item in LISTING_CATEGORIES" :key="item" :value="item">
          {{ listingCategoryLabel(item) }}
        </option>
      </select>
    </div>

    <div class="field">
      <label for="listing-min-price">Minimum asking price</label>
      <input
        id="listing-min-price"
        type="text"
        inputmode="decimal"
        :value="minPrice"
        autocomplete="off"
        :aria-invalid="invalid('price')"
        :aria-describedby="describedBy('price')"
        @input="onMinPriceInput"
      />
    </div>

    <div class="field">
      <label for="listing-max-price">Maximum asking price</label>
      <input
        id="listing-max-price"
        type="text"
        inputmode="decimal"
        :value="maxPrice"
        autocomplete="off"
        :aria-invalid="invalid('price')"
        :aria-describedby="describedBy('price')"
        @input="onMaxPriceInput"
      />
    </div>

    <div class="field">
      <label for="listing-sort">Sort</label>
      <select id="listing-sort" :value="sort" @change="onSortChange">
        <option v-for="item in LISTING_SORTS" :key="item" :value="item">
          {{ listingSortLabel(item) }}
        </option>
      </select>
    </div>

    <p v-if="fieldError" id="listing-filter-error" class="error" role="alert">
      {{ fieldError.message }}
    </p>

    <div class="actions">
      <button type="submit" class="primary">Search</button>
      <button type="button" :disabled="!filtersActive" @click="clear">
        Clear filters
      </button>
    </div>
  </form>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

h2 {
  margin: 0;
  font-size: var(--font-size-h2);
  line-height: var(--line-height-heading);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  font-size: var(--font-size-sm);
  font-weight: 700;
}

input,
select {
  width: 100%;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}

.error {
  margin: 0;
  max-width: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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

.primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}
</style>
