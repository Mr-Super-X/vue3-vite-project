/**
 * 应用入口（auth 统一登录应用）：装配编排收敛至 @vv/shared bootstrapApp 工厂。
 *
 * auth 差异点：无远程菜单（仅登录页静态路由）、无 tags-view；登录页 $t('auth.*')
 * 文案在用 i18n。装配顺序契约固化在工厂 JSDoc。
 *
 * 浏览器基线（必须在所有自定义样式之前）；
 * Element Plus 样式由 ElementPlusResolver({ importStyle: 'css' }) 按需注入。
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
import Plugins from '@plugins'
import { createGlobalComponents } from '@vv/ui'
import { setDialogAppContext } from '@vv/ui/composables/useDialog'
import { bootstrapApp } from '@vv/shared'

import 'normalize.css'
import 'virtual:uno.css'
import '@assets/styles/index.scss'

await bootstrapApp({
  rootComponent: App,
  router,
  pinia,
  i18n,
  title: '统一登录',
  globalComponents: createGlobalComponents(),
  directives: Directives,
  plugins: Plugins,
  loadMockServer: () => import('@mock/mockProdServer'),
  setup: setDialogAppContext,
})
