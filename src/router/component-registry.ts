// 路由 name → 视图组件的映射表
//
// 用途：供远程菜单加载使用（router/remote.ts）
// 设计要点：
//   - 后端菜单 JSON 不返回前端源码路径（避免泄露内部结构）
//   - 后端返回业务路由 name，前端按 name 查找组件 loader
//   - 类型严格匹配 RouteName 联合类型（拼写错误 TS 立即报错）
//
// 新增视图的 3 步操作：
//   1. 在 src/router/modules/*.ts 定义路由（含 name + component）
//   2. 在 src/router/types.ts 的 RouteName 联合类型追加
//   3. 在本文件追加同名映射

import type { RouteName } from './types'

/**
 * 路由组件异步加载器。
 *
 * 注意：使用 `() => import('...')` 而非静态 import，
 * 确保组件按路由访问时再加载（懒加载）。
 */
export const COMPONENT_REGISTRY: Record<RouteName, () => Promise<unknown>> = {
  Login: () => import('@/modules/auth/views/Login.vue'),
  Dashboard: () => import('@/modules/dashboard/views/Index.vue'),
  UserList: () => import('@/modules/user/views/List.vue'),
  Forbidden: () => import('@/modules/error/views/Forbidden.vue'),
  NotFound: () => import('@/modules/error/views/NotFound.vue'),
  ServerError: () => import('@/modules/error/views/ServerError.vue'),
}
