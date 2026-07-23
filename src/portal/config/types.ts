import type { RouteRecordName } from 'vue-router'

export interface PortalNavItem {
  key: string
  label: string
  routeName?: RouteRecordName
  path?: string
  active?: boolean
}

export interface SearchTypeOption {
  label: string
  value: string
}

export interface FooterLinkGroup {
  title: string
  links: { label: string; href: string }[]
}

export interface HeroConfig {
  slogan: string
  hotSearches: string[]
  searchTypes: SearchTypeOption[]
  searchPlaceholder: string
}
