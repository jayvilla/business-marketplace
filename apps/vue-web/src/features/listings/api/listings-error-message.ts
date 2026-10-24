import { HttpError, NetworkError } from '../../../app/api/get-json';

/**
 * Sentence for the results region. The kind of failure chooses it.
 * The response body does not. A 500 from this API is problem details,
 * and a network failure has no body. Either one can carry a trace id
 * or be empty. The page never receives that text.
 */
export function listingsErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Listings could not be loaded. Check your connection and try again.';
  }
  if (error instanceof HttpError) {
    if (error.status === 400) {
      return 'Those filters were rejected. Adjust them and try again.';
    }
    if (error.status === 404) {
      return 'The listings service could not be found.';
    }
    if (error.status >= 500) {
      return 'The listings service had a problem. Try again in a moment.';
    }
  }
  return 'Listings could not be loaded.';
}

/** Status, or a short local sentence. Nothing from the response body. */
export function listingsErrorLog(error: unknown): string {
  if (error instanceof HttpError) {
    return `Listing request failed (${error.status}).`;
  }
  if (error instanceof NetworkError) {
    return 'Listing request failed (network).';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Listing request failed.';
}
