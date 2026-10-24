<script setup lang="ts">
import { RouterLink } from 'vue-router';

/**
 * Site header. It is its own component so the shell only composes
 * landmarks. A feature view should not know how the brand is marked up.
 *
 * The brand uses the custom slot so it can navigate without `aria-current`.
 * The listings link is the current-page control. Vue Router sets
 * `aria-current="page"` on that anchor when the URL is exactly `/`.
 *
 * The brand's click handler is Vue Router's `navigate`. It calls
 * `preventDefault` for a plain click and leaves modified clicks alone, so
 * Ctrl-click and a middle click still open a new tab. A `.prevent` modifier
 * on the listener would cancel those clicks too.
 *
 * The nav stays in normal flow and wraps under the brand on a narrow row.
 * A disclosure menu belongs with the fuller layout, once more than one
 * destination needs hiding.
 */
</script>

<template>
  <header class="bar">
    <div class="inner">
      <RouterLink v-slot="{ href, navigate }" to="/" custom>
        <a class="brand" :href="href" @click="navigate">Business Marketplace</a>
      </RouterLink>

      <nav aria-label="Primary">
        <RouterLink to="/" exact-active-class="is-active">
          Listings
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
/*
 * `exact-active-class` is `is-active` only when this URL is the current
 * one. `router-link-active` would also match a future child of `/`, which
 * is a different statement ("this section" rather than "this page").
 */
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  max-width: var(--container-max);
  margin-inline: auto;
  padding: var(--space-2) var(--container-padding);
}

.brand {
  margin-right: auto;
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  color: var(--color-text);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: var(--line-height-heading);
  text-decoration: none;
}

.brand:hover {
  color: var(--color-primary);
}

nav {
  display: flex;
  align-items: center;
}

nav a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding-inline: var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

nav a:hover {
  background: var(--color-surface-muted);
}

nav a.is-active {
  color: var(--color-primary);
  box-shadow: inset 0 -2px 0 var(--color-primary);
}

@media (min-width: 48rem) {
  .inner {
    flex-wrap: nowrap;
  }
}
</style>
