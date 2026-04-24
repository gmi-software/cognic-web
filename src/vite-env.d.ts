/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_AUTH0_AUDIENCE: string;
  /** Auth0 sub (comma-separated) — tylko UX; musi być zgodne z ADMIN_AUTH0_SUBS na API. */
  readonly VITE_ADMIN_AUTH0_SUBS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
