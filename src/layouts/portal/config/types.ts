import type { RouteRecordName } from 'vue-router'

/**
 * 顶部导航子项（PortalNav 使用）
 */
export interface PortalNavSubItem {
  key: string
  label: string
  /** 子项跳转路径；配合 external=true 时可填外链 URL */
  path: string
  /** 子项点击是否打开外链（true 用 path 当 URL；或显式给 URL 覆盖） */
  external?: boolean | string
}

/**
 * 顶部导航项（PortalNav 使用）
 *
 * - 无 children → 直接渲染为 el-menu-item
 *   - external=true 时点击新窗口打开 path（外链）
 * - 有 children → 渲染为 el-sub-menu，hover 弹出子菜单
 *   - 父项本身无点击交互（用户要求）
 */
export interface PortalNavItem {
  key: string
  label: string
  routeName?: RouteRecordName
  /** 顶层项跳转路径；当 external=true 时为外链 URL */
  path?: string
  active?: boolean
  /** 父项含子菜单时不参与点击跳转 */
  children?: PortalNavSubItem[]
  /** true → 点击新窗口打开 path；显式给字符串 → 用此 URL 覆盖 */
  external?: boolean | string
}
