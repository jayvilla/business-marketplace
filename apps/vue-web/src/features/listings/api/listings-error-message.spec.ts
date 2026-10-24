import { describe, expect, it } from 'vitest';
import { HttpError, NetworkError } from '../../../app/api/get-json';
import {
  listingsErrorLog,
  listingsErrorMessage,
} from './listings-error-message';

describe('listingsErrorMessage', () => {
  it('describes a network failure without a status code', () => {
    expect(listingsErrorMessage(new NetworkError())).toBe(
      'Listings could not be loaded. Check your connection and try again.',
    );
  });

  it('chooses a sentence from the HTTP status and leaves the body out', () => {
    expect(listingsErrorMessage(new HttpError(404))).toBe(
      'The listings service could not be found.',
    );
    expect(listingsErrorMessage(new HttpError(503))).toBe(
      'The listings service had a problem. Try again in a moment.',
    );
    expect(listingsErrorMessage(new HttpError(400))).toBe(
      'Listings could not be loaded.',
    );
    expect(listingsErrorLog(new HttpError(503))).toBe(
      'Listing request failed (503).',
    );
  });

  it('uses a generic sentence for a malformed payload', () => {
    expect(
      listingsErrorMessage(new Error('Listing response was not a page.')),
    ).toBe('Listings could not be loaded.');
  });
});
