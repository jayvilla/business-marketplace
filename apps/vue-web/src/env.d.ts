/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origin of the ASP.NET Core API, with no trailing slash.
   * A browser will send this on every listings request, so it is not a secret.
   */
  readonly VITE_API_BASE_URL?: string;
}
