// 守卫 - 菜单可见性检查（独立可测的纯函数）
//
// 业务背景：后端菜单 hidden: true 由 src/router/remote.ts 转换为 meta.visible: false，
// 本检查在守卫最早期拦截，避免用户直接输入 URL 访问被隐藏的菜单。
//
// 设计要点：
//  - 纯函数：仅依赖入参，便于单测
//  - 返回 null 表示放行；返回 RouteLocationRaw 表示跳转到该位置
//  - 不修改任何全局状态（无副作用）

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

const NOT_FOUND_PATH = '/404'

/**
 * 检查路由 meta.visible，false 时跳转 /404。
 *
 * @returns null 表示放行；RouteLocationRaw 表示跳转目标
 */
export function checkVisibility(to: RouteLocationNormalized): RouteLocationRaw | null {
  const visible = (to.meta as { visible?: boolean }).visible
  if (visible === false) {
    return { path: NOT_FOUND_PATH }
  }
  return null
}
