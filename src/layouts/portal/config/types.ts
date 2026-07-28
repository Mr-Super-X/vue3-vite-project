import type { RouteRecordName } from 'vue-router'

/**
 * 顶部导航项（PortalHeader 使用）
 */
export interface PortalNavItem {
  key: string
  label: string
  routeName?: RouteRecordName
  path?: string
  active?: boolean
}
