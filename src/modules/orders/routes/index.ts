// orders 模块路由
//
// 多级菜单演示：一级菜单 Orders 下挂 OrdersList（列表）+ OrdersDetail（详情）
// 详情页用动态参数 `:id`，演示菜单嵌套 + 动态路由。
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。
// 守卫会根据 meta.permissions 校验当前用户权限码。

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/orders',
    component: () => import('@/layouts/default/index.vue'),
    meta: { title: '订单管理', icon: 'list' },
    children: [
      {
        path: 'list',
        name: 'OrdersList',
        component: () => import('../views/List.vue'),
        meta: { title: '订单列表', permissions: ['orders:view'] },
      },
      {
        path: 'detail/:id',
        name: 'OrdersDetail',
        component: () => import('../views/Detail.vue'),
        meta: { title: '订单详情', permissions: ['orders:view'], breadcrumb: false },
      },
    ],
  },
]

export default routes
