/**
 * Origin of the ASP.NET Core API, with no trailing slash.
 *
 * `import.meta.env` is Vite's environment. Only `VITE_` names are visible
 * here. The value is read when a request is built, not when this module
 * is first imported, so a test can stub it.
 *
 * The fallback is the local Kestrel origin. It is the same origin the
 * Angular client provides in development. A deployed build should set
 * `VITE_API_BASE_URL` so this fallback is not baked into production.
 */
const LOCAL_API_ORIGIN = 'http://localhost:5000';

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const value = typeof configured === 'string' ? configured.trim() : '';
  const base = value.length > 0 ? value : LOCAL_API_ORIGIN;
  return base.replace(/\/+$/, '');
}
