/**
 * One GET that returns the response body as `unknown`.
 *
 * The return type is `unknown` on purpose. A generic `<T>` would only
 * change the compile-time claim. `response.json()` does not check that
 * the payload is `T`. The caller that knows the contract narrows
 * `unknown` before using a field.
 */

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Network request failed.');
    this.name = 'NetworkError';
  }
}

/**
 * Fetch rejects an aborted request with a `DOMException` named
 * `AbortError`. In this test environment that object is not an `Error`,
 * so `instanceof Error` would miss it and the caller would show a
 * network failure for a request it canceled.
 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

export async function getJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new NetworkError();
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  try {
    const body: unknown = await response.json();
    return body;
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error('Response was not JSON.');
  }
}
