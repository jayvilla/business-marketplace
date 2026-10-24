import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from './api-base-url';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('apiBaseUrl', () => {
  it('uses the configured origin and drops a trailing slash', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/');

    expect(apiBaseUrl()).toBe('https://api.example.test');
  });

  it('falls back to the local API when the variable is empty', () => {
    vi.stubEnv('VITE_API_BASE_URL', '   ');

    expect(apiBaseUrl()).toBe('http://localhost:5000');
  });
});
