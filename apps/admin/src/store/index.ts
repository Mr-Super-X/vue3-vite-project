/**
 * Pinia 根配置 + 全局 store 出口。
 *
 * 角色：
 * - 创建 Pinia 实例并挂载持久化插件（pinia-plugin-persistedstate）
 * - barrel re-export 全局 store：app / user / theme / dict 自 P1-3 起归 @vv/shared
 *   （packages/shared/src/store），tags-view 是 admin 私有（多页签与 admin 布局强耦合）
 *
 * 业务模块（modules/*）的私有 store **不**在此出口，遵循 §1.3 状态管理分层。
 *
 * @see [`pinia`](https://pinia.vuejs.org/) 状态管理库
 * @see [`pinia-plugin-persistedstate`](https://prazdevs.github.io/pinia-plugin-persistedstate/) 持久化插件
 * @group 状态管理
 */
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
// 4 个跨 app 共享 store（@vv/shared）
export * from '@vv/shared/store'
// admin 私有：多页签（刻意不持久化，见 modules/tags-view.ts）
export * from './modules/tags-view'
