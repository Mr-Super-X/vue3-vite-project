/**
 * 应用入口（auth 统一登录应用）：装配全局设施的裁剪版。
 *
 * 相对 admin main.ts 的裁剪：
 * - 无远程菜单（auth 仅登录页静态路由）、无 tags-view
 * - 保留：brandColor 注入 / document.title / prod-mock 挂接 / setDialogAppContext
 *
 * 装配顺序（顺序敏感）：brandColor → title → assertNoMockInProd →
 * createApp →（PROD && VITE_USE_MOCK 时顶层 await 挂 prod mock，必须先于 use(router)）→
 * pinia → router → i18n → GlobalComponents → Directives → Plugins →
 * setDialogAppContext → mount
 *
 * @see [`./App.vue`](./App.vue) 根组件
 * @see [`./router`](./router/index.ts) 路由
 * @group 应用入口
 */
import App from './App.vue'
import router from './router'
import pinia from './store'
// i18n 实例归 @vv/shared（@locales 别名指向包源码）；登录页 $t('auth.*') 文案在用
import i18n from '@locales'
import Directives from '@directives'
// 全局组件注册工厂归 @vv/ui（components/assets 在包内）
import { createGlobalComponents } from '@vv/ui'
import Plugins from '@plugins'
// 弹窗族 composable 随 ProDialog 归 @vv/ui（包子路径经 exports "./*" 解析）
import { setDialogAppContext } from '@vv/ui/composables/useDialog'
import { assertNoMockInProd } from '@api/mock-guard'

// 浏览器基线统一（必须在所有自定义样式之前）
// Element Plus 样式由 vite.config.ts 的 ElementPlusResolver({ importStyle: 'css' }) 按需注入
import 'normalize.css'
import 'virtual:uno.css'
import '@assets/styles/index.scss'

// 品牌色注入在 createApp 之前：避免组件挂载后 CSS 变量未生效导致首屏闪烁
const brandColor = import.meta.env.VITE_BRAND_COLOR || '#409eff'
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--color-primary', brandColor)
}

// 首屏占位标题（与 index.html 静态 title 一致）
document.title = import.meta.env.VITE_APP_TITLE || '统一登录'

// Prod 模式防御层：vite-plugin-mock 在 prod 自动失效，本函数为扩展点
assertNoMockInProd()

const app = createApp(App)

// 生产构建且 VITE_USE_MOCK==='true' 时（gh-pages 演示产物）动态挂接浏览器端 mock。
// 位置强约束：必须早于 app.use(router)——Router install 立即触发初始导航，
// 若挂接在 use 之后，首屏请求会先于 mockjs 激活发出，穿透到静态服务器 404。
// PROD 守卫防 dev 双重劫持；常规生产构建整分支 tree-shake。
if (import.meta.env.PROD && import.meta.env.VITE_USE_MOCK === 'true') {
  const { setupProdMockServer } = await import('@mock/mockProdServer')
  await setupProdMockServer()
}

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(createGlobalComponents())
app.use(Directives)
app.use(Plugins)

// 命令式弹窗（useDialog）的上下文来源：纯 JS 调用（无 setup 实例可捕获）时，
// 动态挂载的弹窗依赖这里注册的全局 appContext 才能访问 Pinia/Router/全局组件。
// 必须在所有 app.use 之后调用——_context 的 provides 由插件 install 写入
setDialogAppContext(app)

app.mount('#app')
