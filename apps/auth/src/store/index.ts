/**
 * Pinia 根配置（auth）。
 *
 * auth 是唯一需要登录态读写的应用（登录/登出入口）：消费 @vv/shared 的
 * user store（login/logout）与 dict store（登录后字典预加载）；
 * auth 自身无 app 私有全局 store（auth 模块私有 store 归 modules/auth/store）。
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
