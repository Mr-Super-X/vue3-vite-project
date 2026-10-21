/**
 * home 模块路由。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 *
 * 设计（2026-10-20 企业官网改造）：
 * - `/home` 使用 `portal` 布局（简约顶栏 + 锚点导航的企业官网）
 * - 公开访问：经 `src/router/whitelist.ts` 的 ROUTE_WHITE_LIST 按 name 豁免登录/权限检查
 *   （守卫 checkLoginState 不读 meta.requiresAuth，白名单是唯一公开机制）
 * - 首页刻意不进多页签（meta.noTags: true），portal 落地页通过顶部锚点导航返回即可
 * - 远程菜单模式下，后端返回的菜单项会覆盖本地静态路由
 *
 * @see [`@/router/auto-register.ts`](../../../router/auto-register.ts) 自动注册入口
 * @see [`@/router/whitelist.ts`](../../../router/whitelist.ts) 公开访问白名单
 * @see [`../views/index.vue`](../views/index.vue) 官网首页视图
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
        component: () => import('../views/index.vue'),
        meta: {
          title: '首页',
          titleKey: 'menu.home',
          icon: 'odometer',
          noTags: true,
        },
      },
    ],
  },
]

export default routes
