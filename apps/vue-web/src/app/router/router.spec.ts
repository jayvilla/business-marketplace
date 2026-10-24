import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import App from '../App.vue';
import { createAppRouter, routes } from './index';

async function mountAt(path: string) {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  const wrapper = mount(App, {
    global: { plugins: [router] },
  });
  await router.isReady();
  return wrapper;
}

describe('routes', () => {
  it('keeps the unknown-url record last and titles every record', () => {
    expect(routes.at(-1)?.name).toBe('not-found');
    expect(routes.at(-1)?.path).toBe('/:pathMatch(.*)*');
    expect(routes.every((route) => route.meta.title.length > 0)).toBe(true);
  });

  it('renders the listings placeholder at / and names the tab', async () => {
    const wrapper = await mountAt('/');

    expect(wrapper.get('h1').text()).toBe('Businesses for Sale');
    const primaryLinks = wrapper.get('header nav').findAll('a');
    expect(
      primaryLinks.every((link) => link.attributes('aria-current') === 'page'),
    ).toBe(true);
    expect(wrapper.get('a.brand').attributes('aria-current')).toBeUndefined();
    expect(document.title).toBe('Businesses for Sale');

    wrapper.unmount();
  });

  it('renders the not-found view for an unknown url', async () => {
    const wrapper = await mountAt('/missing-page');

    expect(wrapper.get('main h1').text()).toBe('Page not found');
    expect(wrapper.get('main a').attributes('href')).toBe('/');
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
