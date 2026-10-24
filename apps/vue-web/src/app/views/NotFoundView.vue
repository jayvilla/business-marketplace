<script setup lang="ts">
import { RouterLink } from 'vue-router';

/**
 * Fallback for a URL that matched no earlier route.
 *
 * Rendered inside the shell's `<main>`, so this template has no main of its
 * own. It lives next to the router rather than under `features/listings`
 * because an unknown address is an application concern. It is also not a
 * shared widget: nothing embeds it. The router is its only caller.
 *
 * `RouterLink` changes the URL through the router. A plain `href` would ask
 * the browser for a new document and boot the application again.
 */
</script>

<template>
  <section class="page" aria-labelledby="not-found-heading">
    <h1 id="not-found-heading">Page not found</h1>
    <p>That address does not match a page in this application.</p>
    <RouterLink class="back" to="/"> Back to listings </RouterLink>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

p {
  color: var(--color-text-muted);
}

.back {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 600;
}
</style>
