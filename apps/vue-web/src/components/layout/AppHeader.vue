<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { primaryNavLinks } from './primary-nav';

/**
 * Site header. The shell only composes landmarks. Menu state stays here so
 * a feature view does not learn that the menu exists.
 *
 * `menuOpen` is a `ref`. The template reads it as a boolean. Script reads
 * and writes `menuOpen.value`, because the ref object itself is not the
 * boolean.
 *
 * The panel is a disclosure in normal flow, not a dialog and not a menu
 * widget. There is no focus trap and no `role="menu"`. Links and the toggle
 * use the browser's tab order.
 */
const menuOpen = ref(false);

/**
 * Filled after mount from `ref="menuButton"`. Escape handling uses it to
 * return focus to the toggle. `useTemplateRef` is that binding. A
 * `document.querySelector` would reach outside the component.
 */
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton');
const route = useRoute();

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value;
}

function closeMenu(): void {
  menuOpen.value = false;
}

/**
 * Close first, then navigate. The click handler still runs when the URL
 * does not change, which is the Home link on this page. `navigate` keeps
 * modified clicks with the browser, so this handler must not call
 * `preventDefault` itself.
 */
function followLink(
  event: MouseEvent,
  navigate: (event?: MouseEvent) => void,
): void {
  closeMenu();
  navigate(event);
}

/**
 * A click on a link misses the browser Back button, so the path is watched
 * as well. The click handler still runs: activating the link for the page
 * you are already on does not change `fullPath`, and the disclosure should
 * still close.
 */
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);

/**
 * Escape is not a native behavior of `<button>`. This is the one custom
 * key listener. It acts only while the disclosure is open, then returns
 * focus to the toggle. Arrow keys stay with the browser.
 */
function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !menuOpen.value) {
    return;
  }

  menuOpen.value = false;
  menuButton.value?.focus();
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown);
});
</script>

<template>
  <header class="bar">
    <div class="inner">
      <!--
        Custom slot so the brand navigates without `aria-current`. The nav
        links are the current-page controls. `navigate` keeps modified
        clicks (Ctrl, middle button) on the browser.
      -->
      <RouterLink v-slot="{ href, navigate }" to="/listings" custom>
        <a class="brand" :href="href" @click="navigate">Business Marketplace</a>
      </RouterLink>

      <button
        ref="menuButton"
        type="button"
        class="menu-toggle"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        aria-controls="primary-navigation"
        @click="toggleMenu"
      >
        {{ menuOpen ? 'Close' : 'Menu' }}
      </button>

      <nav
        id="primary-navigation"
        class="nav"
        :class="{ 'is-open': menuOpen }"
        aria-label="Primary"
      >
        <!--
          Custom slot, not `exact-active-class`. Home and Listings share a
          URL, and the default class would mark both as the current page.
          `currentPage` is the one that may carry `aria-current`.
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
            @click="followLink($event, navigate)"
          >
            {{ link.label }}
          </a>
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
/*
 * Closed mobile nav uses `display: none`, not `v-show` and not `v-if`.
 * `v-show` writes an inline display value, and an inline value beats the
 * desktop media query, so the links would stay hidden at every width.
 * `v-if` would remove the links that query needs to show. `display: none`
 * also drops the closed links from the tab order. A height animation can
 * leave them focusable.
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

.menu-toggle {
  min-height: 2.75rem;
  min-width: 2.75rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.menu-toggle:hover {
  background: var(--color-surface-muted);
}

.nav {
  display: none;
  flex: 1 0 100%;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: var(--space-2);
}

.nav.is-open {
  display: flex;
}

.nav a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding-inline: var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

.nav a:hover {
  background: var(--color-surface-muted);
}

/*
 * `is-active` is applied in the template only for the link that may be
 * the current page. Home shares the URL and stays unmarked.
 */
.nav a.is-active {
  color: var(--color-primary);
  box-shadow: inset 0 -2px 0 var(--color-primary);
}

@media (min-width: 48rem) {
  .menu-toggle {
    display: none;
  }

  .nav,
  .nav.is-open {
    display: flex;
    flex: 0 1 auto;
    flex-direction: row;
    align-items: center;
    padding-bottom: 0;
  }
}
</style>
