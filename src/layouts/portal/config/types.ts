import type { RouteRecordName } from 'vue-router'

/**
 * 顶部导航项（PortalHeaderNav 使用）
 */
export interface PortalNavItem {
  key: string
  label: string
  routeName?: RouteRecordName
  path?: string
  active?: boolean
}

/**
 * 底部链接分组（PortalFooter 使用）
 */
export interface FooterLinkGroup {
  title: string
  links: { label: string; href: string }[]
}
