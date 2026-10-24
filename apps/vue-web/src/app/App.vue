<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';

/**
 * Application shell. It stays mounted for the life of the page.
 *
 * The template lists the landmarks and the outlet. The header is a sibling
 * of `RouterView`, so a navigation does not recreate it. This file has no
 * state of its own. There is nothing for it to track.
 *
 * There is one `<main>`. A routed view must not render another, or
 * assistive technology reports two main landmarks. `tabindex="-1"` lets
 * the skip link move focus to `main` without putting `main` in the tab
 * order. The active view is rendered inside `main`, so every route picks
 * up the same width and padding.
 */
</script>

<template>
  <div class="shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <AppHeader />
    <main id="main-content" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/*
 * Scoped so these rules stay with the shell. A `main` element inside a
 * view does not pick them up. Custom properties still apply, because they
 * inherit and scoped selectors do not block inheritance.
 */
.shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.skip-link {
  position: absolute;
  left: var(--space-4);
  top: var(--space-4);
  z-index: 20;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: none;
}

main {
  flex: 1 0 auto;
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding: var(--space-6) var(--container-padding) var(--space-8);
}
</style>
