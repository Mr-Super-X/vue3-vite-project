// user 模块路由
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/user',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('../views/List.vue'),
        meta: {
          title: '用户管理',
          icon: 'user',
          requiresAuth: true,
          permissions: ['user:view'],
        },
      },
    ],
  },
]

export default routes
