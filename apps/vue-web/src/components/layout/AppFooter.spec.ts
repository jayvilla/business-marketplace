import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import AppFooter from './AppFooter.vue';
import { createAppRouter } from '../../app/router';

describe('AppFooter', () => {
  it('renders the brand, the shared links, and the copyright', async () => {
    const router = createAppRouter(createMemoryHistory());
    await router.push('/');
    const wrapper = mount(AppFooter, {
      global: { plugins: [router] },
    });
    await router.isReady();

    expect(wrapper.get('p.brand').text()).toBe('Business Marketplace');
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Footer');

    const links = wrapper.get('nav').findAll('a');
    expect(links.map((link) => link.text())).toEqual(['Home', 'Listings']);
    expect(links.every((link) => link.attributes('href') === '/listings')).toBe(
      true,
    );
    expect(links[0]?.attributes('aria-current')).toBeUndefined();
    expect(links[0]?.classes()).not.toContain('is-active');
    expect(links[1]?.attributes('aria-current')).toBe('page');
    expect(links[1]?.classes()).toContain('is-active');
    expect(wrapper.get('p.copyright').text()).toBe(
      '© 2026 Business Marketplace',
    );

    wrapper.unmount();
  });
});
