import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { fixtureListings } from '../fixtures/sample-listings';
import ListingsView from './ListingsView.vue';

describe('ListingsView', () => {
  it('shows the fixture catalog and does not offer filter or retry controls', () => {
    const wrapper = mount(ListingsView);

    expect(wrapper.get('h1').text()).toBe('Businesses for Sale');
    expect(wrapper.get('h2').text()).toBe('Listing results');
    expect(wrapper.get('.count').text()).toBe(
      `${fixtureListings.length} listings`,
    );
    expect(wrapper.findAll('article')).toHaveLength(fixtureListings.length);

    for (const listing of fixtureListings) {
      expect(wrapper.text()).toContain(listing.title);
    }

    expect(wrapper.text()).toContain('Featured');
    expect(wrapper.text()).toContain('Not disclosed');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Try again');
    expect(wrapper.text()).not.toContain('Clear filters');
    expect(wrapper.text()).not.toContain('match these filters');
  });
});
