/**
 * 应用入口（admin 中后台主干业务端）：装配编排收敛至 @vv/shared bootstrapApp 工厂。
 *
 * 原逐字重复的装配序列（brandColor → title → assertNoMockInProd → createApp →
 * prod-mock → use 序列 → setDialogAppContext → mount）已单源化至工厂（P6 装配
 * 编排层收敛：6 app main.ts 仅标题/插件 presence 有差异），顺序契约固化在
 * 工厂 JSDoc（prod-mock 必须先于 use(router)、setup 收尾必须在所有 use 之后）。
 * 本文件只保留 app 差异数据：根组件 / router / pinia / i18n / 默认标题 / 插件 /
 * mock 加载回调 / setDialogAppContext 收尾。
 *
 * 浏览器样式基线三件套（normalize.css → virtual:uno.css → @assets/styles/index.scss）
 * 已随 @vv/shared app-bootstrap 模块下沉单源（2026-10-23，原 6 app main.ts 逐字重复）；
 * Element Plus 样式由 vite.config.ts 的 ElementPlusResolver({ importStyle: 'css' }) 按需注入。
 *
 * @see [`./App.vue`](./App.vue) 根组件
 * @see [`./router`](./router/index.ts) 路由
 * @see [`./store`](./store/index.ts) Pinia
 * @group 应用入口
 */
import App from './App.vue'
import router from './router'
import pinia from './store'
// i18n 实例自 P1-3 起归 @vv/shared（@locales 别名指向包源码）
import i18n from '@locales'
import Directives from '@directives'
import Plugins from '@plugins'
// 全局组件注册工厂归 @vv/ui；shared 不得反向依赖 ui，实例由 app 侧创建后经参数注入
import { createGlobalComponents } from '@vv/ui'
// 弹窗族 composable 归 @vv/ui（包子路径经 exports "./*" 解析），经 setup 收尾参数注入
import { setDialogAppContext } from '@vv/ui/composables/useDialog'
// 装配编排工厂（P6 收敛：6 app main.ts 逐字同构段单源，顺序契约固化在工厂内）
import { bootstrapApp } from '@vv/shared'
// 浏览器样式基线三件套（normalize/uno/全局 scss，顺序即契约）单源在 @vv/shared app-styles
import '@vv/shared/app-styles'

await bootstrapApp({
  rootComponent: App,
  router,
  pinia,
  i18n,
  title: '企业中后台管理',
  globalComponents: createGlobalComponents(),
  directives: Directives,
  plugins: Plugins,
  // @mock 别名仅 app 编译上下文可解析，模块加载以回调注入（同 prod-mock 下沉模式）
  loadMockServer: () => import('@mock/mockProdServer'),
  // 命令式弹窗的全局 appContext 来源：必须在所有 app.use 之后（工厂收尾段保证）
  setup: setDialogAppContext,
})
