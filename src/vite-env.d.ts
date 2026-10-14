/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  /** SPA app registration client ID; set per environment by the deploy workflows. */
  readonly VITE_SPA_CLIENT_ID?: string;
  readonly VITE_INVITATIONS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
