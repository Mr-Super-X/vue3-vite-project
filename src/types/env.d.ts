/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** BEM 类名前缀；空串表示无前缀。详见 src/utils/bem.ts。 */
  readonly VITE_BEM_PREFIX?: string
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  /**
   * 是否启用 mock 数据（`vite.config.ts` viteMockServe.enable 读取，2026-07-27 接通）。
   * - 未设置（undefined）/ `'true'` / 其他非 `'false'` 值 → 启用
   * - `'false'` → 关闭（用于联调真实后端）
   *
   * 用户 clone 后未建 .env 文件时，dev 默认开启（与 NODE_ENV 历史行为一致）。
   * 同时被 `import.meta.env.VITE_USE_MOCK` 与 `process.env.VITE_USE_MOCK` 两端读取：
   * 前者在 client 端可见，后者 vite-config 在构建期读取。
   */
  readonly VITE_USE_MOCK?: string
  /** storage 命名空间（隔离多项目共用 localStorage/sessionStorage 时的冲突） */
  readonly VITE_STORAGE_NAMESPACE: string
  /**
   * 业务品牌色（2026-07-24 审计补齐 P2-3）。
   * 在 .env.development / .env.production 设置，覆盖默认 Element Plus 蓝 #409eff。
   * 留空则沿用 variables.scss 默认值。
   */
  readonly VITE_BRAND_COLOR?: string
  /**
   * 菜单加载模式（`src/router/config.ts` 读取）。
   * - `remote`：默认，从接口拉取菜单（贴近生产）
   * - `local`：纯本地静态（通过 `pnpm dev:local` 脚本自动注入）
   * 留空或非法值时默认 `remote`。
   */
  readonly VITE_MENU_SOURCE?: string
  /**
   * 路由历史模式（`src/router/config.ts` 读取）。
   * - `web`：createWebHistory（主流，需后端 SPA fallback）
   * - `hash`：createWebHashHistory（适合子路径部署 / 静态托管）
   * 留空或非法值时默认 `web`。
   */
  readonly VITE_HISTORY_MODE?: string
  /**
   * 路由部署基础路径（`src/router/config.ts` 读取）。
   * 必须以 `/` 开头与结尾（vue-router basename 要求）；留空或未设时默认 `/`。
   * @example 子路径部署：VITE_BASE=/vue3-vite-project/
   */
  readonly VITE_BASE?: string
  /**
   * 关闭 dev 徽章汇总（`src/components/index.ts:48` 读取）。
   * dev 模式默认显示 GlobalComponents 自动注册结果的 GitHub 风格徽章；专注调试时设 `1` 关闭。
   * 仅 dev 模式生效；prod 构建 tree-shake 掉相关分支。
   */
  readonly VITE_QUIET_DEV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
