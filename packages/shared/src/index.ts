/**
 * @vv/shared 根 barrel。
 *
 * 消费场景：unplugin-auto-import 的 `from: '@vv/shared'` 包名注入
 * （useAuth / useRequest / useDict / useAppRouter / createNamespace 等），
 * 以及 app 侧少量 `import { ... } from '@vv/shared'` 直接引用。
 *
 * 刻意不聚合：
 * - `./locales`（模块加载即 createI18n 副作用 + default export，app 经 `@locales` 别名消费）
 * - `./directives`（index 是 import.meta.glob 自动注册插件，仅 Vite 上下文可执行）
 * - `./api`（http.ts 模块加载即创建 axios 实例挂拦截器，按需在 app 内经 `@api/*` 别名消费）
 *
 * @group 包出口
 */
export * from './utils/index.ts'
export * from './enums/httpEnum.ts'
export * from './enums/roleEnum.ts'
export * from './types/dict.ts'
export * from './composables/useAuth.ts'
export * from './composables/useRequest.ts'
export * from './composables/useDict.ts'
export * from './composables/useTheme.ts'
export * from './composables/useAppRouter.ts'
export * from './app-router.ts'
export * from './router-title.ts'
// 6 app 骨架零差异段单源化（P5）：router base 解析 / 统一 scroll 行为 / prod-mock 挂接守卫
export * from './router/base.ts'
// catch-all 404 兜底路由工厂（原 6 app 逐字拷贝收敛，根治 h5 残留 docs 文案漂移）
export * from './router/fallback.ts'
export * from './prod-mock.ts'
// 首屏装配段（P5 骨架下沉）：品牌色 CSS 变量注入 / document.title 占位初始化
// （6 app main.ts 逐字重复段单源化，默认标题由调用方传入）
export * from './app-bootstrap.ts'
export * from './store/index.ts'
export * from './router-guards/index.ts'
// 跨应用统一登录协议（P4）：redirectToAuthLogin / resolvePostLoginRedirect
export * from './auth/redirect.ts'
// REM 适配 viewport 幂等插件（P5 下沉：admin / h5 双拷贝收敛单源；模块加载无副作用，install 才碰 DOM）
export { default as remAdaptationPlugin, ensureViewportMeta } from './plugins/remAdaptation.ts'
