/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_MOCK: string
  /** storage 命名空间（隔离多项目共用 localStorage/sessionStorage 时的冲突） */
  readonly VITE_STORAGE_NAMESPACE: string
  /**
   * 业务品牌色（2026-07-24 审计补齐 P2-3）。
   * 在 .env.development / .env.production 设置，覆盖默认 Element Plus 蓝 #409eff。
   * 留空则沿用 variables.scss 默认值。
   */
  readonly VITE_BRAND_COLOR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
