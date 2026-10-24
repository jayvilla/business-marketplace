<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  draftPriceMessage,
  filtersEqual,
  LISTING_CATEGORIES,
  LISTING_MAX_SEARCH_LENGTH,
  LISTING_PRICE_ORDER_ERROR,
  LISTING_SORTS,
  LISTING_TEXT_DEBOUNCE_MS,
  listingCategoryLabel,
  listingSortLabel,
  parseDraftPrice,
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
 *
 * Text fields use `v-model` so the draft ref and the input stay paired.
 * The commit still waits on the timer or on submit. `v-model.trim`
 * would eat a space the user has not finished typing. `v-model.number`
 * would turn an empty price into `0` and a word into `NaN`. Prices stay
 * strings until `parseDraftPrice`. Selects stay on `@change` so a value
 * that is not one of the options cannot land in the ref.
 *
 * There is no touched flag. The error appears when a commit is attempted
 * and refused. Hiding it until blur would leave the URL unchanged with
 * no explanation while the debounce had already given up.
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

function invalid(
  target: 'search' | 'minPrice' | 'maxPrice',
): 'true' | undefined {
  return fieldMarked(target) ? 'true' : undefined;
}

function describedBy(
  target: 'search' | 'minPrice' | 'maxPrice',
): string | undefined {
  return fieldMarked(target) ? 'listing-filter-error' : undefined;
}

function fieldMarked(target: 'search' | 'minPrice' | 'maxPrice'): boolean {
  const error = fieldError.value;
  if (error === null) {
    return false;
  }
  if (error.target === 'range') {
    return target !== 'search';
  }
  return error.target === target;
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

  const parsedMin = parseDraftPrice(minPrice.value);
  const parsedMax = parseDraftPrice(maxPrice.value);
  if (!parsedMin.ok) {
    fieldError.value = {
      target: 'minPrice',
      message: draftPriceMessage('Minimum price', parsedMin.reason),
    };
    return null;
  }
  if (!parsedMax.ok) {
    fieldError.value = {
      target: 'maxPrice',
      message: draftPriceMessage('Maximum price', parsedMax.reason),
    };
    return null;
  }
  if (
    parsedMin.value !== null &&
    parsedMax.value !== null &&
    parsedMin.value > parsedMax.value
  ) {
    fieldError.value = {
      target: 'range',
      message: LISTING_PRICE_ORDER_ERROR,
    };
    return null;
  }

  return {
    search: trimmedSearch,
    category: category.value === '' ? null : category.value,
    minPrice: parsedMin.value,
    maxPrice: parsedMax.value,
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

type FilterErrorTarget = 'search' | 'minPrice' | 'maxPrice' | 'range';

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
        v-model="search"
        type="search"
        :maxlength="LISTING_MAX_SEARCH_LENGTH"
        autocomplete="off"
        :aria-invalid="invalid('search')"
        :aria-describedby="describedBy('search')"
        @input="scheduleText"
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
        v-model="minPrice"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :aria-invalid="invalid('minPrice')"
        :aria-describedby="describedBy('minPrice')"
        @input="scheduleText"
      />
    </div>

    <div class="field">
      <label for="listing-max-price">Maximum asking price</label>
      <input
        id="listing-max-price"
        v-model="maxPrice"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :aria-invalid="invalid('maxPrice')"
        :aria-describedby="describedBy('maxPrice')"
        @input="scheduleText"
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
  border: 1px solid var(--color-control-border);
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
  border: 1px solid var(--color-control-border);
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
