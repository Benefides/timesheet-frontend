/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_AUTH_MODE?: string;
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_API_SCOPE?: string;
  /** Expected hours per week; defaults to 40. */
  readonly VITE_WEEKLY_TARGET_HOURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
