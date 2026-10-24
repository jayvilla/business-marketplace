import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { businessListing } from '../fixtures/sample-listings';
import { placeholderForCategory } from '../images/listing-placeholder';
import ListingCard from './ListingCard.vue';

describe('ListingCard', () => {
  it('renders the listing fields and whole-dollar amounts', () => {
    const wrapper = mount(ListingCard, {
      props: { listing: businessListing({ featured: true }) },
    });

    expect(wrapper.get('h3').text()).toBe('Harbor & Rye');
    expect(wrapper.text()).toContain('Restaurant');
    expect(wrapper.text()).toContain('Seattle, WA');
    expect(wrapper.text()).toContain('fictional neighborhood restaurant');
    expect(wrapper.text()).toContain('Asking price');
    expect(wrapper.text()).toContain('$875,000');
    expect(wrapper.text()).toContain('$1,420,000');
    expect(wrapper.text()).toContain('$186,000');
    expect(wrapper.text()).toContain('Featured');

    const image = wrapper.get('img');
    expect(image.attributes('src')).toBe('/listings/restaurant.svg');
    expect(image.attributes('alt')).toBe('');
    expect(image.attributes('loading')).toBe('lazy');
    expect(wrapper.find('a, button').exists()).toBe(false);
  });

  it('omits the badge and says withheld figures were not disclosed', () => {
    const wrapper = mount(ListingCard, {
      props: {
        listing: businessListing({
          featured: false,
          annualRevenue: null,
          cashFlow: null,
        }),
      },
    });

    expect(wrapper.text()).not.toContain('Featured');
    expect(wrapper.text()).toContain('$875,000');
    expect(wrapper.text()).toContain('Not disclosed');
    expect(wrapper.text()).not.toContain('$1,420,000');
    expect(wrapper.text()).not.toContain('$186,000');
  });

  it('replaces a failed image with the category placeholder', async () => {
    const wrapper = mount(ListingCard, {
      props: {
        listing: businessListing({
          imageUrl: 'https://images.example/harbor.jpg',
        }),
      },
    });

    await wrapper.get('img').trigger('error');

    expect(wrapper.get('img').attributes('src')).toBe(
      placeholderForCategory('Restaurant'),
    );
  });

  it('uses the retail stand-in when the category has no illustration', async () => {
    const wrapper = mount(ListingCard, {
      props: {
        listing: businessListing({
          category: 'Coffee',
          imageUrl: 'https://images.example/missing.jpg',
        }),
      },
    });

    await wrapper.get('img').trigger('error');

    expect(wrapper.get('img').attributes('src')).toBe('/listings/retail.svg');
  });

  it('clears a failed image when the listing changes', async () => {
    const wrapper = mount(ListingCard, {
      props: {
        listing: businessListing({
          featured: true,
          imageUrl: 'https://images.example/harbor.jpg',
        }),
      },
    });

    await wrapper.get('img').trigger('error');
    expect(wrapper.get('img').attributes('src')).toBe(
      placeholderForCategory('Restaurant'),
    );

    await wrapper.setProps({
      listing: businessListing({
        id: 'lst-elm',
        title: 'Elm Street Bistro',
        category: 'Retail',
        location: 'Portland, OR',
        askingPrice: 540_000,
        featured: false,
        imageUrl: '/listings/retail.svg',
      }),
    });

    expect(wrapper.text()).toContain('Elm Street Bistro');
    expect(wrapper.text()).toContain('Portland, OR');
    expect(wrapper.text()).toContain('$540,000');
    expect(wrapper.text()).not.toContain('Harbor & Rye');
    expect(wrapper.text()).not.toContain('Featured');
    expect(wrapper.get('img').attributes('src')).toBe('/listings/retail.svg');
  });
});
