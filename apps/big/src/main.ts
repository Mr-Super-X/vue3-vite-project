/**
 * 应用入口（big 数据大屏站）：装配全局设施的裁剪版。
 *
 * 相对 admin main.ts 的裁剪：
 * - 无远程菜单 / tags-view / 登录权限守卫（big 全站公开，白名单直通，见 router/index.ts）
 * - 无 src/plugins 目录（docs 的 errorHandler/webVitals 裁剪版随 P2 归 docs；
 *   big-demo 为纯静态 mock 展示页，渲染错误由 App.vue 的 ErrorBoundary 兜底）
 *
 * 装配顺序（顺序敏感）：brandColor → title → assertNoMockInProd →
 * createApp →（PROD && VITE_USE_MOCK 时顶层 await 挂 prod mock，必须先于 use(router)）→
 * pinia → router → i18n → GlobalComponents → Directives →
 * setDialogAppContext → mount
 *
 * @see [`./App.vue`](./App.vue) 根组件
 * @see [`./router`](./router/index.ts) 路由
 * @group 应用入口
 */
import App from './App.vue'
import router from './router'
import pinia from './store'
// i18n 实例归 @vv/shared（@locales 别名指向包源码）；保留装配与 docs 同口径
import i18n from '@locales'
import Directives from '@directives'
// 全局组件注册工厂归 @vv/ui（components/assets 在包内）
import { createGlobalComponents } from '@vv/ui'
// 弹窗族 composable 随 ProDialog 归 @vv/ui（包子路径经 exports "./*" 解析）
import { setDialogAppContext } from '@vv/ui/composables/useDialog'
import { assertNoMockInProd } from '@api/mock-guard'
// prod-mock 挂接守卫自 P5 起归 @vv/shared（6 app 同款高危不变量单源化）；
// @mock 别名仅 app 编译上下文可解析，故模块加载以回调注入
import { setupProdMockIfNeeded } from '@vv/shared'

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
document.title = import.meta.env.VITE_APP_TITLE || '数据大屏'

// Prod 模式防御层：vite-plugin-mock 在 prod 自动失效，本函数为扩展点
assertNoMockInProd()

const app = createApp(App)

// 生产 mock 挂接：完整条件语义与「必须先于 app.use(router)」位置强约束见
// @vv/shared setupProdMockIfNeeded——router install 即触发初始导航，挂接晚于
// use 则首屏请求先于 mockjs 激活发出，穿透到静态服务器 404。
await setupProdMockIfNeeded(() => import('@mock/mockProdServer'))

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(createGlobalComponents())
app.use(Directives)

// 命令式弹窗（useDialog）的上下文来源：纯 JS 调用（无 setup 实例可捕获）时，
// 动态挂载的弹窗依赖这里注册的全局 appContext 才能访问 Pinia/Router/全局组件。
// 必须在所有 app.use 之后调用——_context 的 provides 由插件 install 写入
setDialogAppContext(app)

app.mount('#app')
