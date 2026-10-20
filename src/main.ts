/**
 * 应用入口：装配所有全局设施。
 *
 * 装配顺序（顺序敏感）：
 * 1. brandColor 注入：必须在 createApp 之前完成，避免首屏闪烁
 * 2. document.title：与守卫并行设置，避免标题短暂停留在 index.html 默认值
 * 3. assertNoMockInProd：prod 环境防 mock 残留
 * 4. pinia → router → i18n → GlobalComponents → Directives → Plugins
 * 5. 生产 mock 挂接：PROD && VITE_USE_MOCK==='true' 才执行（mount 之前，顶层 await）
 *
 * 浏览器基线：
 * - normalize.css：跨浏览器默认值统一
 * - virtual:uno.css：UnoCSS 按需原子类
 * - `@/assets/styles/index.scss`：项目 SCSS 入口
 *
 * @see [`./App.vue`](./App.vue) 根组件
 * @see [`./router`](./router/index.ts) 路由
 * @see [`./store`](./store/index.ts) Pinia
 * @see [`./locales`](./locales/index.ts) i18n
 * @see [`@directives`](./directives/index.ts) 指令注册
 * @see [`@components`](./components/index.ts) 组件注册
 * @see [`@plugins`](./plugins/index.ts) 插件注册
 * @group 应用入口
 */
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './locales'
import Directives from '@directives'
import GlobalComponents from '@components'
import Plugins from '@plugins'
import { setDialogAppContext } from '@composables/useDialog'
import { assertNoMockInProd } from '@/api/mock-guard'

// 浏览器基线统一（必须在所有自定义样式之前）。
// 详见 https://necolas.github.io/normalize.css/
// Element Plus 样式由 vite.config.ts 的 ElementPlusResolver({ importStyle: 'css' })
// 按组件/API 自动注入（2026-08-12 按需化），不再全量引入 index.css。
import 'normalize.css'
import 'virtual:uno.css'
import '@/assets/styles/index.scss'

/**
 * 业务品牌色注入（2026-07-24 审计补齐 P2-3）。
 *
 * 在 createApp 之前应用：避免组件挂载后 CSS 变量未生效导致首屏闪烁。
 * 优先级：VITE_BRAND_COLOR > 默认 #409eff（Element Plus 默认蓝）。
 *
 * 配合 element-overwrite/index.scss 的灯色阶 mixin，
 * 业务侧改品牌色即可全局生效（含 Element Plus 按钮/标签等组件）。
 */
const brandColor = import.meta.env.VITE_BRAND_COLOR || '#409eff'
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--color-primary', brandColor)
}

/**
 * 应用标题初始化（接通 env.d.ts 的 VITE_APP_TITLE，2026-07-27）。
 *
 * 在 createApp 之前注入：与路由守卫 / 远程菜单异步加载并行，
 * 避免首屏 document.title 短暂停留在 index.html 默认值。
 *
 * 优先级：VITE_APP_TITLE > 默认 '企业中后台管理'。
 *
 * 与 useAppRouter.pushWithTitle 的关系：登录完成、首次跳转后，
 * router 会按目标路由的 meta.title（或 i18n key）覆盖 document.title；
 * 本设置仅作为首屏占位，不影响运行时动态切换。
 */
document.title = import.meta.env.VITE_APP_TITLE || '企业中后台管理'

// Prod 模式防御层：vite-plugin-mock 在 prod 自动失效，本函数为扩展点
assertNoMockInProd()

const app = createApp(App)

// 生产构建且 VITE_USE_MOCK==='true' 时（CI gh-pages 产物）动态挂接浏览器端 mock。
// 位置强约束：必须早于 app.use(router)——Vue Router install 会立即触发初始导航，
// 守卫的 fetchProfile 与 main.ts 后续语句并行执行；若挂接在 use 之后，
// 守卫请求会先于 mockjs 激活发出，穿透到静态服务器（404 → 资源不存在 toast）。
// PROD 守卫防 dev 双重劫持（dev 下 node 中间件与本分支同时命中，auth rawResponse
// 被 client 侧解构为 undefined → dev 登录必挂）；常规生产构建整分支 tree-shake。
if (import.meta.env.PROD && import.meta.env.VITE_USE_MOCK === 'true') {
  const { setupProdMockServer } = await import('../mock/mockProdServer')
  await setupProdMockServer()
}

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(GlobalComponents)
app.use(Directives)
app.use(Plugins)

// 命令式弹窗（useDialog）的上下文来源：纯 JS 调用（无 setup 实例可捕获）时，
// 动态挂载的弹窗依赖这里注册的全局 appContext 才能访问 Pinia/Router/全局组件。
// 必须在所有 app.use 之后调用——_context 的 provides 由插件 install 写入
setDialogAppContext(app)

app.mount('#app')
