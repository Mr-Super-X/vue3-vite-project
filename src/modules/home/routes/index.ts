/**
 * home 模块路由。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 *
 * 设计：
 * - `/home` 使用 `portal` 布局（含门户头部 / 顶部导航）
 * - meta.affix: true 标记为固定 tab（不可关闭）
 * - 远程菜单模式下，后端返回的菜单项会覆盖本地静态路由
 *
 * @see [`@/router/auto-register.ts`](../../../router/auto-register.ts) 自动注册入口
 * @see [`../views/Index.vue`](../views/Index.vue) 首页视图
 * @group 业务模块：Home
 */

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/home',
    component: () => import('@/layouts/portal/index.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Index.vue'),
        meta: {
          title: '仪表盘',
          titleKey: 'menu.home',
          icon: 'odometer',
          requiresAuth: true,
          affix: true,
        },
      },
    ],
  },
]

export default routes
