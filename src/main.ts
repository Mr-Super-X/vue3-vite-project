import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './locales'
import Directives from '@directives'
import GlobalComponents from '@components'
import Plugins from '@plugins'
import { assertNoMockInProd } from '@/api/mock-guard'

// 浏览器基线统一（必须在所有自定义样式之前）。
// 详见 https://necolas.github.io/normalize.css/
import 'normalize.css'
import 'element-plus/dist/index.css'
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
 * 优先级：VITE_APP_TITLE > 默认 '工贸统一登录门户'。
 *
 * 与 useAppRouter.pushWithTitle 的关系：登录完成、首次跳转后，
 * router 会按目标路由的 meta.title（或 i18n key）覆盖 document.title；
 * 本设置仅作为首屏占位，不影响运行时动态切换。
 */
document.title = import.meta.env.VITE_APP_TITLE || '工贸统一登录门户'

// Prod 模式防御层：vite-plugin-mock 在 prod 自动失效，本函数为扩展点
assertNoMockInProd()

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(GlobalComponents)
app.use(Directives)
app.use(Plugins)

app.mount('#app')
