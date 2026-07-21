// 路由类型定义（集中管理所有路由的 name）
//
// - whitelist.ts 用 RouteName 校验白名单拼写
// - 新增路由时必须在此追加，否则 TS 报错
// - 注：原 component-registry.ts 已合并到 auto-register.ts 派生，
//   无需再单独维护 name → component 映射。
//
// 校验脚本：scripts/check-routes.ts（pnpm check:routes）

import type { RouteMeta } from 'vue-router'

/**
 * 业务路由 name 联合类型。
 *
 * 命名约定：与路由配置中的 `name` 字段一致。
 * 新增路由时：
 *   1. 在 src/modules/<feature>/routes/index.ts 中定义 name
 *   2. 在此联合类型追加
 *   完成后路由自动可用，remote 模式自动可用（component 由 auto-register.ts 派生）
 */
export type RouteName =
  'Login' | 'Dashboard' | 'UserList' | 'Forbidden' | 'NotFound' | 'ServerError'

/**
 * 后端返回的菜单项 JSON 格式（与后端约定）。
 *
 * 设计要点：
 *   - name 是业务路由名（前端通过 auto-register.ts 派生的 COMPONENT_REGISTRY 校验）
 *   - 不返回 component 路径（避免泄露前端源码结构）
 *   - children 嵌套支持多级菜单
 *   - hidden: true → 前端转换为 meta.visible: false（守卫拦截）
 */
export interface RemoteMenuItem {
  name: RouteName
  path: string
  meta?: RouteMeta & {
    /**
     * 后端标记菜单是否隐藏。后端用 `hidden: true`（行业惯例），
     * 前端转换为 `meta.visible: false`（统一内部约定）。
     */
    hidden?: boolean
  }
  children?: RemoteMenuItem[]
}
