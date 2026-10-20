import { HttpErrorResponse } from '@angular/common/http';
import {
  listingsErrorLog,
  listingsErrorMessage,
} from './listings-error-message';

describe('listingsErrorMessage', () => {
  it('describes a dropped connection without calling it an empty catalog', () => {
    const error = new HttpErrorResponse({ status: 0, url: 'http://localhost:5000/api/listings' });

    expect(listingsErrorMessage(error)).toContain('connection');
    expect(listingsErrorMessage(error)).not.toContain('No businesses');
  });

  it('uses a different sentence for a rejected query and a server failure', () => {
    expect(listingsErrorMessage(new HttpErrorResponse({ status: 400 }))).toContain(
      'rejected',
    );
    expect(listingsErrorMessage(new HttpErrorResponse({ status: 500 }))).toContain(
      'problem',
    );
    expect(listingsErrorMessage(new HttpErrorResponse({ status: 404 }))).toContain(
      'could not be found',
    );
  });

  it('does not show a problem-details body to the user', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        title: 'An unexpected error occurred.',
        detail: 'Host=localhost;Password=super-secret',
        traceId: '00-abc',
      },
    });

    const message = listingsErrorMessage(error);
    expect(message).not.toContain('super-secret');
    expect(message).not.toContain('00-abc');
    expect(message).not.toContain('Host=');
  });

  it('logs the status and leaves the response body out', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { detail: 'Password=super-secret' },
    });

    expect(listingsErrorLog(error)).toBe('Listing request failed (500).');
    expect(listingsErrorLog(error)).not.toContain('super-secret');
  });
});
