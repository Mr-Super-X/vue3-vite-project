// 路由类型定义（集中管理所有路由的 name 与 meta）
//
// - whitelist.ts 用 RouteName 校验白名单拼写
// - components/meta <RouteView> + Header / Sidebar 通过 `to.meta.title` 等自动补全
// - 新增路由时必须在此追加 RouteName，否则 TS 报错
// - 注：原 component-registry.ts 已合并到 auto-register.ts 派生，
//   无需再单独维护 name → component 映射。
//
// 校验脚本：scripts/check-routes.ts（pnpm check:routes）

import type { RouteMeta } from 'vue-router'

/**
 * 扩展 vue-router 内置 RouteMeta，使所有路由声明处 meta 自动获得类型补全。
 *
 * 设计要点：
 *  - 直接 `declare module 'vue-router'` 让 vue-router 的 RouteMeta 在 .ts 类型空间内被推断
 *  - 索引签名 `[key: string]: unknown` 允许业务自定义 meta 字段（如 `meta.tabs` / `meta.dialog`）
 *  - `hidden` 不出现在 RouteMeta 中——仅用于后端菜单 JSON 协议（RemoteMenuItem.meta.hidden），
 *    远程加载时由 src/router/remote.ts 转换为前端的 `meta.visible: false`
 *  - `permissions` 用字符串数组，AND 语义（全部满足才放行），由 useAuth().hasPerm(code) 校验
 *
 * 业务侧使用：
 *  ```ts
 *  const { titleKey, requiresAuth, permissions } = to.meta
 *  ```
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 菜单标题（兜底字符串，i18n 模式优先用 titleKey） */
    title?: string
    /** 菜单标题的 i18n key（推荐做法，i18n 不可用时 fallback 到 title） */
    titleKey?: string
    /** 菜单图标（Element Plus icon 名，如 'odometer' / 'user'） */
    icon?: string
    /** 是否需要登录态（true = 必须登录；false 或缺失 = 视为白名单同等，仅是宽松标记） */
    requiresAuth?: boolean
    /** 业务权限码数组（AND 语义：所有权限都满足才放行） */
    permissions?: string[]
    /** 路由可见性，false 时菜单隐藏且禁止直接访问（hidden 后端菜单转换目标） */
    visible?: boolean
    /** keepAlive 缓存开关（业务页面切换时是否保留组件实例） */
    keepAlive?: boolean
    /** 面包屑是否展示（侧边栏无关，紧凑型页面用 false） */
    breadcrumb?: boolean
    /** 多页签固定（设为 true 后 tags-view 该 tag 不显示关闭按钮且不可关闭，如 Dashboard） */
    affix?: boolean
    /** 业务自定义字段透传（adapter / 标签页 / 对话框路由等） */
    [key: string]: unknown
  }
}

/** 类型别名：便于代码阅读（AppRouteMeta / RouteMeta 等价） */
export type AppRouteMeta = RouteMeta

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
  | 'Login'
  | 'Dashboard'
  | 'UserList'
  | 'Orders'
  | 'OrdersList'
  | 'OrdersDetail'
  | 'Reports'
  | 'Forbidden'
  | 'NotFound'
  | 'ServerError'

/**
 * 后端返回的菜单项 JSON 格式（与后端约定）。
 *
 * 设计要点：
 *  - name 是业务路由名（前端通过 auto-register.ts 派生的 COMPONENT_REGISTRY 校验）
 *  - 不返回 component 路径（避免泄露前端源码结构）
 *  - children 嵌套支持多级菜单
 *  - hidden: true → 前端转换为 meta.visible: false（守卫拦截）
 */
export interface RemoteMenuItem {
  name: RouteName
  path: string
  meta?: AppRouteMeta & {
    /**
     * 后端标记菜单是否隐藏。后端用 `hidden: true`（行业惯例），
     * 前端转换为 `meta.visible: false`（统一内部约定）。
     */
    hidden?: boolean
  }
  children?: RemoteMenuItem[]
}
