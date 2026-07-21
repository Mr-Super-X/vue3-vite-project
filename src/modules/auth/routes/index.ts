// auth 模块路由
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。
// 新增业务模块时按 docs/07-路由模块设计.md §新增路由流程 操作即可。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/blank/index.vue'),
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { title: '登录', requiresAuth: false },
      },
    ],
  },
]

export default routes
