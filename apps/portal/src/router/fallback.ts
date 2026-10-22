/**
 * 路由兜底（catch-all 404）。
 *
 * 必须注册在所有业务路由之后（保证最后匹配）。
 * 与 admin fallback.ts 同语义；404 目标页是 portal 自带的 src/views/NotFound.vue。
 *
 * @see [`./index.ts`](./index.ts) 路由注册顺序
 * @group 路由：兜底
 */

import type { RouteRecordRaw } from 'vue-router'

export const fallbackRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  redirect: '/404',
}
