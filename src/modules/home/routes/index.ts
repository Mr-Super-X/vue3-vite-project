/**
 * home 模块路由。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 *
 * 设计：
 * - `/home` 使用 `portal` 布局（含门户头部 / 顶部导航）
 * - 首页刻意不进多页签：portal 落地页通过顶部导航/Logo 返回即可，
 *   无页签上下文切换需求（排除名单见 `store/modules/tags-view.ts` NO_TAGS_ROUTE_NAMES）
 * - 不在此标记 meta.affix：affix 预置走 filterAffixRoutes 直读路由表，
 *   不受 NO_TAGS 名单约束，残留 affix 会把首页重新钉回页签
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
          title: '首页',
          titleKey: 'menu.home',
          icon: 'odometer',
          requiresAuth: true,
        },
      },
    ],
  },
]

export default routes
