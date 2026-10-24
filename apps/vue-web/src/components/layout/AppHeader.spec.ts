import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory } from 'vue-router';
import type { Router } from 'vue-router';
import type { VueWrapper } from '@vue/test-utils';
import AppHeader from './AppHeader.vue';
import { createAppRouter } from '../../app/router';

let wrapper: VueWrapper | undefined;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

async function mountHeader(path = '/'): Promise<{
  router: Router;
  wrapper: VueWrapper;
}> {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  wrapper = mount(AppHeader, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await router.isReady();
  return { router, wrapper };
}

function menuButton(root: VueWrapper): HTMLButtonElement {
  const element = root.get('button').element;
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error('Expected a menu button');
  }
  return element;
}

describe('AppHeader', () => {
  it('renders the brand and both primary links, with the menu closed', async () => {
    const { wrapper: header } = await mountHeader();

    expect(header.get('a.brand').text()).toBe('Business Marketplace');
    expect(header.get('a.brand').attributes('href')).toBe('/listings');
    expect(header.get('a.brand').attributes('aria-current')).toBeUndefined();

    const button = menuButton(header);
    expect(button.textContent).toBe('Menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('primary-navigation');

    const nav = header.get('#primary-navigation');
    expect(nav.attributes('aria-label')).toBe('Primary');
    expect(nav.classes()).not.toContain('is-open');
    const links = nav.findAll('a');
    expect(links.map((link) => link.text())).toEqual(['Home', 'Listings']);
    expect(links.every((link) => link.attributes('href') === '/listings')).toBe(
      true,
    );
    expect(links[0]?.attributes('aria-current')).toBeUndefined();
    expect(links[0]?.classes()).not.toContain('is-active');
    expect(links[1]?.attributes('aria-current')).toBe('page');
    expect(links[1]?.classes()).toContain('is-active');
  });

  it('keeps Listings current when the listings URL has a filter query', async () => {
    const { wrapper: header } = await mountHeader('/listings?category=Retail');
    const links = header.get('#primary-navigation').findAll('a');

    expect(links[0]?.attributes('aria-current')).toBeUndefined();
    expect(links[1]?.attributes('aria-current')).toBe('page');
    expect(links[1]?.classes()).toContain('is-active');
  });

  it('does not mark the primary links current on another route', async () => {
    const { wrapper: header } = await mountHeader('/missing-page');
    const links = header.get('#primary-navigation').findAll('a');

    expect(
      links.every((link) => link.attributes('aria-current') === undefined),
    ).toBe(true);
    expect(links.every((link) => !link.classes().includes('is-active'))).toBe(
      true,
    );
  });

  it('toggles the disclosure from the button', async () => {
    const { wrapper: header } = await mountHeader();
    const button = menuButton(header);

    await header.get('button').trigger('click');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toBe('Close');
    expect(header.get('#primary-navigation').classes()).toContain('is-open');

    await header.get('button').trigger('click');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toBe('Menu');
    expect(header.get('#primary-navigation').classes()).not.toContain(
      'is-open',
    );
  });

  it('keeps the links in the document while the disclosure is closed', async () => {
    const { wrapper: header } = await mountHeader();

    expect(header.get('#primary-navigation').findAll('a')).toHaveLength(2);
  });

  it('closes an open menu when Escape is pressed and restores focus', async () => {
    const { wrapper: header } = await mountHeader();
    const button = menuButton(header);

    await header.get('button').trigger('click');
    button.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('ignores Escape while the menu is closed', async () => {
    const { wrapper: header } = await mountHeader();
    const brand = header.get('a.brand').element;
    if (!(brand instanceof HTMLElement)) {
      throw new Error('Expected the brand link');
    }
    brand.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(menuButton(header).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(brand);
  });

  it('closes the menu when focus leaves the header', async () => {
    const { wrapper: header } = await mountHeader();
    await header.get('button').trigger('click');

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    header
      .get('#primary-navigation a')
      .element.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
      );
    await nextTick();

    expect(menuButton(header).getAttribute('aria-expanded')).toBe('false');
    outside.remove();
  });

  it('keeps the menu open while focus moves between header controls', async () => {
    const { wrapper: header } = await mountHeader();
    await header.get('button').trigger('click');
    const links = header.get('#primary-navigation').findAll('a');

    links[0]?.element.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: links[1]?.element ?? null,
      }),
    );
    await nextTick();

    expect(menuButton(header).getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the menu when a primary link is activated', async () => {
    const { router, wrapper: header } = await mountHeader('/missing-page');

    await header.get('button').trigger('click');
    await header.get('#primary-navigation a').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/listings');
    expect(menuButton(header).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu after a navigation that did not click a link', async () => {
    const { router, wrapper: header } = await mountHeader('/');

    await header.get('button').trigger('click');
    await router.push('/missing-page');
    await flushPromises();

    expect(menuButton(header).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu when the current page link is activated again', async () => {
    const { wrapper: header } = await mountHeader('/');

    await header.get('button').trigger('click');
    await header.get('#primary-navigation a').trigger('click');

    expect(menuButton(header).getAttribute('aria-expanded')).toBe('false');
  });
});
