import { HttpErrorResponse } from '@angular/common/http';

/**
 * Sentences for the results region. The HTTP status chooses the sentence.
 * The response body does not. A 500 from this API is problem details with a
 * fixed title, and a network failure has no body at all. Putting either
 * into the page could repeat a trace id or an empty string.
 *
 * The status is logged separately so a developer can see it. The template
 * never receives it.
 */
export function listingsErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Listings could not be loaded.';
  }
  if (error.status === 0) {
    return 'Listings could not be loaded. Check your connection and try again.';
  }
  if (error.status === 400) {
    return 'Those filters were rejected. Adjust them and try again.';
  }
  if (error.status === 404) {
    return 'The listings service could not be found.';
  }
  if (error.status >= 500) {
    return 'The listings service had a problem. Try again in a moment.';
  }
  return 'Listings could not be loaded.';
}

/** Status and nothing from the body. The body can carry a trace id. */
export function listingsErrorLog(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return `Listing request failed (${error.status}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Listing request failed.';
}
