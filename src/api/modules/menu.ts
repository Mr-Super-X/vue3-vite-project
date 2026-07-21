// 菜单 API
//
// 设计要点：
//   - 仅返回业务路由 name（不返回组件路径，避免泄露前端源码结构）
//   - 由前端 src/router/auto-register.ts 派生 COMPONENT_REGISTRY（name → 组件）
//   - 后端按用户角色过滤可见菜单，前端无需再校验可见性

import { request } from '../http'
import type { RemoteMenuItem } from '@/router/types'

export const menuApi = {
  /**
   * 获取当前用户的可见菜单树（按角色权限过滤后）
   */
  getMenu: () => request<RemoteMenuItem[]>({ url: '/menu', method: 'get' }),
}
