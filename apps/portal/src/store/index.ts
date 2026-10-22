/**
 * Pinia 根配置（portal）。
 *
 * PortalHeader 消费 @vv/shared 的 user store（登录/用户双态头部）；
 * portal 自身无 app 私有 store（home 模块为纯静态展示页，无业务状态）。
 *
 * @see [`@vv/shared/store`](../../../packages/shared/src/store/index.ts) 共享 store 出口
 * @group 状态管理
 */
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
// 共享 store re-export（与 admin 同 barrel 语义，消费方可经 '@/store' 或 '@store/*' 取用）
export * from '@vv/shared/store'
