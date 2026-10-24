<script setup lang="ts">
/**
 * Placeholder for the listings feature.
 *
 * The router lazy-loads this file. Cards, filters, and the API call belong
 * here or beside this file, under `features/listings`. They do not belong
 * in the shell. This component does not request data. The response contract
 * and the loading states are a later phase.
 */
</script>

<template>
  <section class="page" aria-labelledby="listings-heading">
    <h1 id="listings-heading">Businesses for Sale</h1>
    <p>
      Published listings will appear here. This screen is the placeholder for
      the marketplace list.
    </p>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--space-3);
}

p {
  color: var(--color-text-muted);
}
</style>
