import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { businessListing } from '../fixtures/sample-listings';
import ListingCard from './ListingCard.vue';
import ListingsGrid from './ListingsGrid.vue';

function listing(id: string, title: string) {
  return businessListing({
    id,
    title,
    description: 'Fictional sample used by the grid test.',
    category: 'Retail',
    location: 'Austin, TX',
  });
}

describe('ListingsGrid', () => {
  it('renders one card per listing', () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        listings: [
          listing('lst-a', 'Elm Street Bistro'),
          listing('lst-b', 'King Street Bakery'),
        ],
      },
    });

    expect(wrapper.findAllComponents(ListingCard)).toHaveLength(2);
    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('Elm Street Bistro');
    expect(wrapper.text()).toContain('King Street Bakery');

    const images = wrapper.findAll('img');
    expect(images[0]?.attributes('loading')).toBe('eager');
    expect(images[0]?.attributes('fetchpriority')).toBe('high');
    expect(images[1]?.attributes('loading')).toBe('lazy');
    expect(images[1]?.attributes('fetchpriority')).toBeUndefined();
  });

  it('keeps a failed image when the same listing finishes updating', async () => {
    const harbor = businessListing({
      id: 'lst-a',
      title: 'Harbor & Rye',
      imageUrl: 'https://images.example/harbor.jpg',
    });
    const wrapper = mount(ListingsGrid, {
      props: { status: 'updating', listings: [harbor] },
    });

    await wrapper.get('img').trigger('error');
    expect(wrapper.get('img').attributes('src')).toBe(
      '/listings/restaurant.svg',
    );

    await wrapper.setProps({
      status: 'ready',
      listings: [businessListing({ ...harbor })],
    });

    expect(wrapper.text()).toContain('Harbor & Rye');
    expect(wrapper.get('img').attributes('src')).toBe(
      '/listings/restaurant.svg',
    );
    expect(wrapper.find('.updating').exists()).toBe(false);
    expect(wrapper.get('ul').attributes('aria-busy')).toBeUndefined();
  });

  it('keeps a failed image with its listing when the collection is reordered', async () => {
    const alpha = businessListing({
      id: 'lst-a',
      title: 'Alpha',
      category: 'Restaurant',
      imageUrl: 'https://images.example/alpha.jpg',
    });
    const beta = businessListing({
      id: 'lst-b',
      title: 'Beta',
      category: 'Retail',
      imageUrl: 'https://images.example/beta.jpg',
    });
    const wrapper = mount(ListingsGrid, {
      props: { listings: [alpha, beta] },
    });

    await wrapper.findAll('img')[0]?.trigger('error');

    await wrapper.setProps({ listings: [beta, alpha] });

    const cards = wrapper.findAll('article');
    expect(cards[0]?.text()).toContain('Beta');
    expect(cards[0]?.get('img').attributes('src')).toBe(
      'https://images.example/beta.jpg',
    );
    expect(cards[1]?.text()).toContain('Alpha');
    expect(cards[1]?.get('img').attributes('src')).toBe(
      '/listings/restaurant.svg',
    );
  });

  it('renders loading placeholders instead of the listings it was given', () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        status: 'loading',
        listings: [listing('lst-a', 'Should Stay Hidden')],
      },
    });

    expect(wrapper.get('[role="status"]').text()).toContain(
      'Loading listings.',
    );
    expect(wrapper.text()).not.toContain('Should Stay Hidden');
    expect(wrapper.findAll('.skeleton')).toHaveLength(6);
    expect(wrapper.find('ul').exists()).toBe(false);
    expect(wrapper.get('.grid').attributes('aria-hidden')).toBe('true');
  });

  it('renders the empty state when the ready collection has no rows', () => {
    const wrapper = mount(ListingsGrid, {
      props: { status: 'ready', listings: [] },
    });

    expect(wrapper.text()).toContain('No businesses are listed yet.');
    expect(wrapper.find('article').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('renders the error message without a button when nobody handles retry', () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        status: 'error',
        listings: [listing('lst-a', 'Should Stay Hidden')],
        errorMessage: 'The sample feed failed.',
      },
    });

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'The sample feed failed.',
    );
    expect(wrapper.text()).not.toContain('No businesses are listed yet.');
    expect(wrapper.text()).not.toContain('Should Stay Hidden');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('emits retry when the parent handles it', async () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        status: 'error',
        listings: [],
        onRetry: () => undefined,
      },
    });

    const button = wrapper.get('button');
    expect(button.text()).toBe('Try again');
    expect(button.attributes('type')).toBe('button');

    await button.trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('shows the updating message when the previous page was empty', () => {
    const wrapper = mount(ListingsGrid, {
      props: { status: 'updating', listings: [] },
    });

    expect(wrapper.get('.updating').text()).toContain('Updating listings.');
    expect(wrapper.text()).not.toContain('No businesses are listed yet.');
    expect(wrapper.find('article').exists()).toBe(false);
  });

  it('keeps the previous cards visible while results are updating', () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        status: 'updating',
        listings: [listing('lst-a', 'Harbor & Rye')],
      },
    });

    expect(wrapper.get('[role="status"]').text()).toContain(
      'Updating listings.',
    );
    expect(wrapper.text()).toContain('Harbor & Rye');
    expect(wrapper.get('ul').attributes('aria-busy')).toBe('true');
    expect(wrapper.findAll('.skeleton')).toHaveLength(0);
    expect(wrapper.get('.updating').attributes('role')).toBe('status');
  });

  it('keeps the updating text visible without a second live region', () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        status: 'updating',
        listings: [listing('lst-a', 'Harbor & Rye')],
        announceUpdate: false,
      },
    });

    expect(wrapper.get('.updating').text()).toContain('Updating listings.');
    expect(wrapper.get('.updating').attributes('role')).toBeUndefined();
  });

  it('offers clear filters only when the empty state asks for it', async () => {
    const wrapper = mount(ListingsGrid, {
      props: {
        status: 'ready',
        listings: [],
        emptyMessage: 'No businesses match these filters.',
        showClear: true,
        onClear: () => undefined,
      },
    });

    expect(wrapper.text()).toContain('No businesses match these filters.');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });
});
