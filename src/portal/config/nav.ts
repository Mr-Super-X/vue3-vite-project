import type { PortalNavItem } from './types'

export const PORTAL_NAV: PortalNavItem[] = [
  { key: 'home', label: '首页', path: '/dashboard' },
  { key: 'law', label: '执法大屏', path: '/law-screen' },
  { key: 'knowledge', label: '知识学习', path: '/knowledge' },
  { key: 'monthly', label: '月度填报', path: '/monthly-fill' },
  { key: 'admin', label: '系统管理', path: '/admin' },
]
