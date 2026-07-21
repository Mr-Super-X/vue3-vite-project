/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_MOCK: string
  /** storage 命名空间（隔离多项目共用 localStorage/sessionStorage 时的冲突） */
  readonly VITE_STORAGE_NAMESPACE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
