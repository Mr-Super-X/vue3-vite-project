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
export * from './store/index.ts'
export * from './router-guards/index.ts'
