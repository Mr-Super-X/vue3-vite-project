// error 模块路由
//
// 自动注册：被 src/router/auto-register.ts 扫描到，无需手动 import。
//
// 注意：catch-all 404 兜底路由 `/:pathMatch(.*)*` 必须在所有业务路由之后匹配，
// 由于 import.meta.glob 扫描的文件路径按字典序排列（auth/dashboard/error/user），
// error 模块在 user 之前，catch-all 路由会在 /user/* 之前匹配，可能导致 /user/list 错误跳 /404。
//
// 解决方案：error 模块的 catch-all 路由仍由 src/router/index.ts 单独注册（保证最后）。
// 本文件仅注册具名错误页（403/404/500），catch-all 不在此处。

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
