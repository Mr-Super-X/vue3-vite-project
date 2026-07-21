// 路由兜底（catch-all 404）
//
// 必须注册在所有业务路由之后（保证最后匹配）。
// 单独从 auto-register 抽出来，避免错误页模块的字典序导致 /user/* 被错误拦截。

import type { RouteRecordRaw } from 'vue-router'

export const fallbackRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  redirect: '/404',
}
