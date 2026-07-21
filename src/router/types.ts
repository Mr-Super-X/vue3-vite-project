// 路由类型定义（集中管理所有路由的 name）
//
// - whitelist.ts 用 RouteName 校验白名单拼写
// - component-registry.ts 用 RouteName 校验 key 拼写
// - 新增路由时必须在此追加，否则 TS 报错

import type { RouteMeta } from 'vue-router'

/**
 * 业务路由 name 联合类型。
 *
 * 命名约定：与路由配置中的 `name` 字段一致。
 * 新增路由时：
 *   1. 在 router/modules/*.ts 中定义 name
 *   2. 在此联合类型追加
 *   3. 在 component-registry.ts 追加同名映射
 */
export type RouteName =
  'Login' | 'Dashboard' | 'UserList' | 'Forbidden' | 'NotFound' | 'ServerError'

/**
 * 后端返回的菜单项 JSON 格式（与后端约定）。
 *
 * 设计要点：
 *   - name 是业务路由名，对应 component-registry 的 key（前端可校验）
 *   - 不返回 component 路径（避免泄露前端源码结构）
 *   - children 嵌套支持多级菜单
 */
export interface RemoteMenuItem {
  name: RouteName
  path: string
  meta?: RouteMeta
  children?: RemoteMenuItem[]
}
