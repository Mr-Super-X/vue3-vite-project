import type { PortalNavItem } from './types'

/**
 * 顶部导航配置
 *
 * 父项含 children → 渲染为 el-sub-menu（hover 弹出，无点击交互）
 * 父项 external=true → 点击新窗口打开 path（外链）
 *
 * 注：sub-menu 条目为占位实现，待业务方给出具体二级页面后再细化 path / 增删
 */
export const PORTAL_NAV: PortalNavItem[] = [
  { key: 'home', label: '首页', path: '/home' },
  // 执法大屏：外链（具体 URL 待对接，临时占位 https://example.com/law-screen）
  {
    key: 'law',
    label: '执法大屏',
    path: 'https://example.com/law-screen',
    external: true,
  },
  // 知识学习：hover 子菜单（无点击交互）
  {
    key: 'knowledge',
    label: '知识学习',
    children: [
      { key: 'knowledge-laws', label: '法律法规', path: '/knowledge/laws' },
      { key: 'knowledge-cases', label: '典型案例', path: '/knowledge/cases' },
      { key: 'knowledge-docs', label: '文档资料', path: '/knowledge/docs' },
    ],
  },
  // 月度填报：hover 子菜单（无点击交互）
  {
    key: 'monthly',
    label: '月度填报',
    children: [
      { key: 'monthly-company', label: '企业填报', path: '/monthly/company' },
      { key: 'monthly-person', label: '机构填报', path: '/monthly/person' },
    ],
  },
  // 系统管理：hover 子菜单（无点击交互）
  {
    key: 'admin',
    label: '系统管理',
    children: [
      { key: 'admin-user', label: '用户管理', path: '/admin/user' },
      { key: 'admin-role', label: '角色管理', path: '/admin/role' },
      { key: 'admin-menu', label: '菜单管理', path: '/admin/menu' },
    ],
  },
]
