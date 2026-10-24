import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { createAppRouter } from './router';

/**
 * Memory history starts nowhere. Push the URL under test before mount so
 * the first navigation is that page.
 */
async function mountAt(path: string) {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  const wrapper = mount(App, {
    global: { plugins: [router] },
  });
  await router.isReady();
  return wrapper;
}

describe('App', () => {
  it('renders the shell landmarks around the listings view', async () => {
    const wrapper = await mountAt('/');

    const skip = wrapper.get('.skip-link');
    expect(skip.text()).toBe('Skip to content');
    expect(skip.attributes('href')).toBe('#main-content');

    expect(wrapper.findAll('main')).toHaveLength(1);
    expect(wrapper.get('header').text()).toContain('Business Marketplace');
    expect(wrapper.get('header nav').attributes('aria-label')).toBe('Primary');

    const main = wrapper.get('main#main-content');
    expect(main.attributes('tabindex')).toBe('-1');
    expect(main.get('h1').text()).toBe('Businesses for Sale');
    expect(main.find('header').exists()).toBe(false);
    expect(main.find('footer').exists()).toBe(false);

    const footer = wrapper.get('footer');
    expect(footer.text()).toContain('© 2026 Business Marketplace');
    expect(footer.get('nav').attributes('aria-label')).toBe('Footer');

    wrapper.unmount();
  });
});
