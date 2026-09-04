// reports 模块路由
//
// 隐藏菜单演示：远程菜单返回 hidden: true 时，守卫 /404 拦截直接 URL 访问。
// 本地 local 模式默认渲染（menu 列表不展示这个），需手动访问 /reports。
//
// 自动注册：被 src/router/auto-register.ts 扫描到。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/reports',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: '',
        name: 'Reports',
        component: () => import('../views/Index.vue'),
        meta: {
          title: '运营报表',
          icon: 'data-analysis',
          permissions: ['reports:view'],
          // 菜单隐藏但允许 URL 直访（场景：客服通过邮件链接直达报表页）。
          // 注意：用 menuVisible 而非 visible，因为 visible: false 会被守卫拦截直访。
          menuVisible: false,
        },
      },
    ],
  },
]

export default routes
