/**
 * Pinia 根配置 + 全局 store 出口。
 *
 * 角色：
 * - 创建 Pinia 实例并挂载持久化插件（pinia-plugin-persistedstate）
 * - barrel re-export 所有全局 store（app / user / theme / tags-view / dict），
 *   业务侧 `import { useUserStore } from '@/store'` 即可
 *
 * 业务模块（modules/*）的私有 store **不**在此出口，遵循 §1.3 状态管理分层。
 *
 * @see [`pinia`](https://pinia.vuejs.org/) 状态管理库
 * @see [`pinia-plugin-persistedstate`](https://prazdevs.github.io/pinia-plugin-persistedstate/) 持久化插件
 * @see [`../store/modules/user.ts`](./modules/user.ts) 用户/登录态
 * @see [`../store/modules/app.ts`](./modules/app.ts) UI 状态
 * @group 状态管理
 */
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
export * from './modules/app'
export * from './modules/user'
export * from './modules/theme'
export * from './modules/tags-view'
export * from './modules/dict'
