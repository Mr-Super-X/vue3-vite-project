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
 * - `@assets/styles/index.scss`：项目 SCSS 入口（P1-4 起物理位置在 @vv/ui 包）
 *
 * @see [`./App.vue`](./App.vue) 根组件
 * @see [`./router`](./router/index.ts) 路由
 * @see [`./store`](./store/index.ts) Pinia
 * @see [`./locales`](./locales/index.ts) i18n
 * @see [`@directives`](./directives/index.ts) 指令注册
 * @see `@vv/ui` createGlobalComponents —— 组件注册（P1-4 起归包工厂）
 * @see [`@plugins`](./plugins/index.ts) 插件注册
 * @group 应用入口
 */
import App from './App.vue'
import router from './router'
import pinia from './store'
// i18n 实例自 P1-3 起归 @vv/shared（@locales 别名指向包源码）
import i18n from '@locales'
import Directives from '@directives'
// 全局组件注册工厂自 P1-4 起归 @vv/ui（components/assets 随包迁移）
import { createGlobalComponents } from '@vv/ui'
import Plugins from '@plugins'
// 弹窗族 composable 自 P1-4 起随 ProDialog 一并归 @vv/ui（包子路径经 exports "./*" 解析）
import { setDialogAppContext } from '@vv/ui/composables/useDialog'
import { assertNoMockInProd } from '@api/mock-guard'
// prod-mock 挂接守卫自 P5 起归 @vv/shared（6 app 同款高危不变量单源化）；
// @mock 别名仅 app 编译上下文可解析，故模块加载以回调注入
import { setupProdMockIfNeeded } from '@vv/shared'
// 品牌色注入 / 首屏标题初始化自 P5 起归 @vv/shared app-bootstrap
//（6 app main.ts 逐字重复装配段单源化，默认标题由调用方传入）
import { injectBrandColor, initDocumentTitle } from '@vv/shared'

// 浏览器基线统一（必须在所有自定义样式之前）。
// 详见 https://necolas.github.io/normalize.css/
// Element Plus 样式由 vite.config.ts 的 ElementPlusResolver({ importStyle: 'css' })
// 按组件/API 自动注入（2026-08-12 按需化），不再全量引入 index.css。
import 'normalize.css'
import 'virtual:uno.css'
import '@assets/styles/index.scss'

// 品牌色注入 + 首屏标题占位：6 app 逐字重复装配段单源化至 @vv/shared app-bootstrap（P5 骨架下沉）。
// 必须在 createApp 之前调用——避免首屏闪烁 / 标题短暂停留 index.html 默认值（完整语义见包内 JSDoc）；
// 标题仅作首屏占位，登录后由 router 按 meta.title 覆盖（与 useAppRouter.pushWithTitle 的关系见包内 JSDoc）
injectBrandColor()
initDocumentTitle('企业中后台管理')

// Prod 模式防御层：vite-plugin-mock 在 prod 自动失效，本函数为扩展点
assertNoMockInProd()

const app = createApp(App)

// 生产 mock 挂接：完整条件语义与「必须先于 app.use(router)」位置强约束见
// @vv/shared setupProdMockIfNeeded——router install 即触发初始导航，守卫的
// fetchProfile 与 main.ts 后续语句并行执行；挂接晚于 use 则首屏请求先于
// mockjs 激活发出，穿透到静态服务器（SPA fallback 返回 HTML → 404 toast）。
await setupProdMockIfNeeded(() => import('@mock/mockProdServer'))

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
