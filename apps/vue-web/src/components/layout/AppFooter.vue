<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { primaryNavLinks } from './primary-nav';

/**
 * Site footer. It has no state, so it has no `ref`.
 *
 * It stays a component so the shell template remains a list of landmarks.
 * The links come from `primaryNavLinks`, the same list the header renders.
 * A second footer inside a feature would be a reason to move this file.
 * One footer stays under `layout/`.
 */
</script>

<template>
  <footer class="bar">
    <div class="inner">
      <p class="brand">Business Marketplace</p>
      <nav aria-label="Footer">
        <!--
          Same current-page rule as the header. A default active class
          would mark Home and Listings both current.
        -->
        <RouterLink
          v-for="link in primaryNavLinks"
          :key="link.label"
          v-slot="{ href, navigate, isExactActive }"
          :to="link.to"
          custom
        >
          <a
            :href="href"
            :class="{ 'is-active': link.currentPage && isExactActive }"
            :aria-current="
              link.currentPage && isExactActive ? 'page' : undefined
            "
            @click="navigate"
          >
            {{ link.label }}
          </a>
        </RouterLink>
      </nav>
      <p class="copyright">© 2026 Business Marketplace</p>
    </div>
  </footer>
</template>

<style scoped>
/*
 * `margin-top: auto` consumes free space in the shell's column. A short
 * page keeps the footer at the bottom of the viewport. A tall page scrolls
 * the footer after the content, because auto margins do not overlay it.
 */
.bar {
  display: block;
  margin-top: auto;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: var(--container-max);
  margin-inline: auto;
  padding: var(--space-5) var(--container-padding);
}

.brand {
  font-weight: 700;
}

.copyright {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
}

a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

a:hover {
  color: var(--color-primary);
}

a.is-active {
  color: var(--color-primary);
}

@media (min-width: 48rem) {
  .inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
