/**
 * error 模块路由（具名错误页 + 注释掉的 catch-all 兜底说明）。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 *
 * **catch-all 404 路由的特殊处理**：
 * `/:pathMatch(.*)*` 必须在所有业务路由之后匹配。但 import.meta.glob 扫描的文件按字典序
 * 排列（auth/dashboard/error/user），error 在 user 之前 → catch-all 会在 /user/* 之前匹配，
 * 导致 /user/list 错误跳 /404。
 *
 * 解决方案：catch-all 路由由 `src/router/index.ts` 单独注册（保证最后），本文件仅注册具名
 * 错误页（403/404/500），catch-all 不在此处。
 *
 * @see [`@/router/index.ts`](../../../router/index.ts) catch-all 注册
 * @see [`../views/Forbidden.vue`](../views/Forbidden.vue) 403 页
 * @see [`../views/NotFound.vue`](../views/NotFound.vue) 404 页
 * @see [`../views/ServerError.vue`](../views/ServerError.vue) 500 页
 * @group 业务模块：Error
 */

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('../views/Forbidden.vue'),
    meta: { title: '403' },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404' },
  },
  {
    path: '/500',
    name: 'ServerError',
    component: () => import('../views/ServerError.vue'),
    meta: { title: '500' },
  },
]

export default routes
