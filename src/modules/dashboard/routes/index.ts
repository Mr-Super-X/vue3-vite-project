// dashboard 模块路由
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: () => import('@/layouts/portal/index.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/home/Index.vue'),
        meta: { title: '仪表盘', icon: 'odometer', requiresAuth: true, affix: true },
      },
    ],
  },
]

export default routes
