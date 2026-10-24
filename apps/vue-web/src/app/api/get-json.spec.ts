import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJson, HttpError, isAbortError, NetworkError } from './get-json';

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('getJson', () => {
  it('returns the parsed JSON body', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ items: [] })));
    vi.stubGlobal('fetch', fetchMock);

    const body = await getJson('http://localhost:5000/api/listings');

    expect(body).toEqual({ items: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/listings',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: undefined,
      },
    );
  });

  it('throws an HTTP error for a non-success status and ignores the body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ title: 'trace-should-not-surface' }, 503),
        ),
      ),
    );

    const error = await getJson('http://localhost:5000/api/listings').catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503 });
    expect(error instanceof Error ? error.message : '').not.toContain(
      'trace-should-not-surface',
    );
  });

  it('throws a network error when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    await expect(
      getJson('http://localhost:5000/api/listings'),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('rethrows an abort instead of treating it as a network failure', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(abort)),
    );

    const error = await getJson(
      'http://localhost:5000/api/listings',
      new AbortController().signal,
    ).catch((caught: unknown) => caught);

    expect(isAbortError(error)).toBe(true);
    expect(error).not.toBeInstanceOf(NetworkError);
  });

  it('throws when a success body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('not-json', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      ),
    );

    await expect(getJson('http://localhost:5000/api/listings')).rejects.toThrow(
      'Response was not JSON.',
    );
  });
});
