// 菜单 API
//
// 设计要点：
//   - 仅返回业务路由 name（不返回组件路径，避免泄露前端源码结构）
//   - 由前端 src/router/auto-register.ts 派生 COMPONENT_REGISTRY（name → 组件）
//   - 后端按用户角色过滤可见菜单，前端无需再校验可见性
//
// 重试 / 超时：
//   - timeout: 通过 axios config 传入（毫秒）
//   - retries: 在 src/router/remote.ts 的 fetchRemoteRoutes 用 withRetry 包装

import { request } from '../http'
import type { RemoteMenuItem } from '@/router/types'

export const menuApi = {
  /**
   * 获取当前用户的可见菜单树（按角色权限过滤后）。
   *
   * 支持的 config 字段：
   *   - timeout?: 单次请求超时（毫秒）
   */
  getMenu: (config: { timeout?: number } = {}) =>
    request<RemoteMenuItem[]>({ url: '/menu', method: 'get', ...config }),
}
