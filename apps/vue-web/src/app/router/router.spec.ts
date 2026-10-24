import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import App from '../App.vue';
import { createAppRouter, routes } from './index';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => undefined)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function mountAt(path: string) {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  const wrapper = mount(App, {
    global: { plugins: [router] },
  });
  await router.isReady();
  return { router, wrapper };
}

describe('routes', () => {
  it('keeps the unknown-url record last and titles every record', () => {
    expect(routes.at(-1)?.name).toBe('not-found');
    expect(routes.at(-1)?.path).toBe('/:pathMatch(.*)*');
    expect(routes.every((route) => route.meta.title.length > 0)).toBe(true);
  });

  it('redirects / to /listings and marks only the Listings link current', async () => {
    const { router, wrapper } = await mountAt('/');

    expect(router.currentRoute.value.path).toBe('/listings');
    expect(wrapper.get('h1').text()).toBe('Businesses for Sale');
    expect(wrapper.text()).toContain('Loading listings.');
    const primaryLinks = wrapper.get('header nav').findAll('a');
    expect(primaryLinks[0]?.attributes('aria-current')).toBeUndefined();
    expect(primaryLinks[1]?.text()).toBe('Listings');
    expect(primaryLinks[1]?.attributes('aria-current')).toBe('page');
    const footerLinks = wrapper.get('footer nav').findAll('a');
    expect(footerLinks[0]?.attributes('aria-current')).toBeUndefined();
    expect(footerLinks[1]?.attributes('aria-current')).toBe('page');
    expect(wrapper.get('a.brand').attributes('aria-current')).toBeUndefined();
    expect(document.title).toBe('Businesses for Sale');

    wrapper.unmount();
  });

  it('renders the listings page at /listings', async () => {
    const { router, wrapper } = await mountAt('/listings');

    expect(router.currentRoute.value.path).toBe('/listings');
    expect(wrapper.get('main h1').text()).toBe('Businesses for Sale');
    expect(document.title).toBe('Businesses for Sale');

    wrapper.unmount();
  });

  it('renders the not-found view for an unknown url', async () => {
    const { wrapper } = await mountAt('/missing-page');

    expect(wrapper.get('main h1').text()).toBe('Page not found');
    expect(wrapper.get('main a').attributes('href')).toBe('/listings');
    expect(
      wrapper
        .get('header nav')
        .findAll('a')
        .every((link) => link.attributes('aria-current') === undefined),
    ).toBe(true);
    expect(document.title).toBe('Page not found');

    wrapper.unmount();
  });
});
