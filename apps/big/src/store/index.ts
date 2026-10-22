/**
 * Pinia 根配置（big）。
 *
 * big-demo 模块消费 Pinia（useBigDemoStore 模块私有 store，随模块迁入本 app）；
 * 跨模块共享 store 经 @vv/shared barrel re-export（与 admin / docs 同语义）。
 *
 * @see [`@vv/shared/store`](../../../packages/shared/src/store/index.ts) 共享 store 出口
 * @group 状态管理
 */
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
// 共享 store re-export（与 admin / docs 同 barrel 语义，消费方可经 '@/store' 或 '@store/*' 取用）
export * from '@vv/shared/store'
