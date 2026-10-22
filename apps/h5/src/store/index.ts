/**
 * Pinia 根配置（h5）。
 *
 * h5-demo 消费 @vv/shared 的 4 个共享 store（app / user / theme / dict）；
 * h5 自身无 app 私有 store（tags-view 多页签与 admin 布局强耦合，不随迁）。
 * h5-demo 模块私有 store（useH5DemoStore）经模块内 defineStore 自注册，不在此列。
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
