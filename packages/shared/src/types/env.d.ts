/// <reference types="vite/client" />
// unplugin-icons 虚拟模块声明（virtual:icons/* 与 ~icons/* → FunctionalComponent）——
// v24 类型包仅含模块声明、无 GlobalComponents 通配，不影响「错误图标名 IDE 报错」的拦截设计
/// <reference types="unplugin-icons/types/vue" />

interface ImportMetaEnv {
  /** BEM 类名前缀；空串表示无前缀。详见 src/utils/bem.ts。 */
  readonly VITE_BEM_PREFIX?: string
  readonly VITE_APP_TITLE: string
  /**
   * axios baseURL（@vv/shared api/http.ts 消费）。由 @vv/config 工厂 define 注入。
   * 2026-11-09 起「单开关派生」：随 VITE_USE_MOCK + mode 自动得出——
   * dev 下 mock 开（!== 'false'）→ '/mock'，关 → '/api'；prod 下 === 'true' → '/mock'，
   * 否则 '/api'。一般无需配置；仅联调非标路径后端时经 shell env 显式覆盖（最高优先）。
   */
  readonly VITE_API_BASE_URL: string
  /**
   * mock 总开关（单一事实源，三条消费链共用）：
   * - dev：viteMockServe 中间件 enable（!== 'false' 即开，缺省开）
   * - prod：main.ts 浏览器端 mockjs 挂接（prod-mock.ts，=== 'true' 才挂，缺省关）
   * - baseURL 派生（见 VITE_API_BASE_URL 注释）
   *
   * 2026-11-09 起 .env 文件（根共享默认 / app 私有）与 shell env 均生效
   * （工厂经 loadEnv 三层 merge 读取）；此前 dev 中间件只认 shell env。
   */
  readonly VITE_USE_MOCK?: string
  /**
   * 演示模式开关（gh-pages CI 构建置 `'true'`，`src/router/guards/login.ts` 与
   * `permission.ts` 读取，2026-10-20 接通）。
   *
   * 命中时：登录守卫跳过校验（仍拉 profile 供演示账号全链路）、路由级权限校验跳过；
   * 按钮级 v-auth 仍按真实 permissions 渲染。prod 版 auth mock 由 mock/mockProdServer.ts 内联提供。
   * 常规构建开关缺省/false，相关分支被静态消除。
   */
  readonly VITE_DEMO_NO_AUTH?: string
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
  /**
   * app 标识（@vv/config 工厂经 define 注入，如 admin='admin'）。
   * 用途：monorepo 多 app 共存时给 persist localStorage key 加前缀隔离
   * （`store/modules/{app,theme}.ts`，D6/R8）；未注入时回落 'app'。
   */
  readonly VITE_APP_ID?: string
  /**
   * 统一登录应用（apps/auth）的 origin/路径前缀（P4 跨应用登录协议，
   * `auth/redirect.ts` 读取，由各 app env 注入——包内不硬编码 app 名）。
   * 缺省 '/auth'（同源子路径语义）；生产按部署形态覆盖
   * （如 gh-pages 子路径 '/vue3-vite-project/auth' 或独立域名绝对 URL）。
   */
  readonly VITE_AUTH_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
