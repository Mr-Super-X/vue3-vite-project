// dashboard 模块路由
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Index.vue'),
        meta: { title: '仪表盘', icon: 'odometer', requiresAuth: true },
      },
    ],
  },
]

export default routes
