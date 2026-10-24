import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from '../../../app/api/api-base-url';

const getJson = vi.hoisted(() => vi.fn());

vi.mock('../../../app/api/get-json', () => ({
  getJson,
}));

import { getListings } from './get-listings';

const summary = {
  id: '01900000-0000-7000-8000-000000000006',
  title: 'Northbridge Accounting',
  description: 'A bookkeeping firm.',
  askingPrice: 690_000,
  annualRevenue: 1_050_000,
  cashFlow: null,
  city: 'Chicago',
  state: 'IL',
  category: 'ProfessionalServices',
  imageUrl: null,
};

describe('getListings', () => {
  beforeEach(() => {
    getJson.mockReset();
  });

  it('GETs the listings page and maps each summary', async () => {
    getJson.mockResolvedValue({
      items: [summary],
      page: 1,
      pageSize: 6,
      totalCount: 8,
    });
    const signal = new AbortController().signal;

    const page = await getListings(signal);

    expect(getJson).toHaveBeenCalledWith(
      `${apiBaseUrl()}/api/listings`,
      signal,
    );
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(6);
    expect(page.totalCount).toBe(8);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      title: 'Northbridge Accounting',
      location: 'Chicago, IL',
      category: 'Professional services',
      cashFlow: null,
      imageUrl: '/listings/services.svg',
      featured: false,
    });
  });

  it('rejects a body that is not a page', async () => {
    getJson.mockResolvedValue([]);

    await expect(getListings()).rejects.toThrow(
      'Listing response was not a page.',
    );
  });

  it('rejects a page whose item is missing a required field', async () => {
    getJson.mockResolvedValue({
      items: [{ ...summary, city: null }],
      page: 1,
      pageSize: 6,
      totalCount: 1,
    });

    await expect(getListings()).rejects.toThrow(
      'Listing response was not a page.',
    );
  });
});
