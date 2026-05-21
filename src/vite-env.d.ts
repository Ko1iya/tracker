/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL бэкенда budget-api, см. .env */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
