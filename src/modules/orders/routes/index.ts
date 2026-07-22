// orders 模块路由
//
// 多级菜单演示：一级菜单 Orders 下挂 OrdersList（列表）+ OrdersDetail（详情）
// 详情页用动态参数 `:id`，演示菜单嵌套 + 动态路由。
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。
// 守卫会根据 meta.permissions 校验当前用户权限码。
//
// 设计要点：
//   - 父路由 name='Orders'，让 mock/menu.ts 在 remote 模式下能以 'Orders' 为菜单名注入
//     （router/remote.ts 通过 COMPONENT_REGISTRY[name] 查找 component loader）
//   - 父路由 component 用 layout（与 children 共享 default layout）
//   - children.path='list' 显示二级菜单项 OrdersList；点击进入 /orders/list
//   - children.path='detail/:id' 用动态参数；meta.hidden:true 在 remote 模式下不渲染菜单

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/layouts/default/index.vue'),
    meta: { title: '订单管理', icon: 'list', permissions: ['orders:view'] },
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
        meta: { title: '订单详情', permissions: ['orders:view'], breadcrumb: false, hidden: true },
      },
    ],
  },
]

export default routes
