// 守卫 - 远程菜单懒加载（独立可测的纯函数）
//
// 业务背景：
//  - remote 模式下，登录后从 /api/menu 拉菜单并 router.addRoute() 注入
//  - 每个 token 周期只拉一次（dynamicLoaded 标记）
//  - 加载失败 / 返回空 → 保持 local 菜单（不影响用户当前页）
//
// 模块级状态：
//  - dynamicLoaded：本次登录周期内是否已加载
//  - currentToken：上次加载时的 token（检测登录切换，重置 dynamicLoaded）
//
// 这些状态必须在此文件内（而非上层 auth.ts），便于 resetAuthGuardState 重置。

import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import type { useUserStore } from '@/store/modules/user'
import type { useRouterStore } from '@/store/modules/router'
import { ROUTER_CONFIG } from '../config'
import { fetchRemoteRoutes } from '../remote'

type UserStore = ReturnType<typeof useUserStore>
type RouterStore = ReturnType<typeof useRouterStore>

/** 本次登录周期内是否已加载远程菜单 */
let dynamicLoaded = false

/** 上次加载时的 token，用于检测登录切换 */
let currentToken: string | null = null

/**
 * 确保远程菜单已加载（每个 token 周期只拉一次）。
 *
 * 行为：
 *  - local 模式 → 直接返回 null（无需加载）
 *  - remote 模式 + 未加载 → 拉 /api/menu，注入路由，重新触发守卫
 *  - 加载失败或返回空 → console.warn，保持 local（返回 null 放行）
 *
 * @returns null 表示可以继续走流程；RouteLocationRaw 表示需重新触发守卫
 */
export async function ensureRemoteMenuLoaded(
  to: RouteLocationNormalized,
  userStore: UserStore,
  routerStore: RouterStore,
  router: Router
): Promise<RouteLocationRaw | null> {
  if (ROUTER_CONFIG.source !== 'remote') return null

  // token 变化（登录/登出）→ 重置 dynamicLoaded，下次重新拉取
  if (userStore.token !== currentToken) {
    dynamicLoaded = false
    currentToken = userStore.token
  }

  if (dynamicLoaded) return null

  routerStore.setLoadingRemoteMenu(true)
  try {
    const remoteRoutes = await fetchRemoteRoutes()
    if (remoteRoutes.length === 0) {
      console.warn('[router] remote 菜单为空（接口失败或返回空），保持 local 菜单')
    } else {
      remoteRoutes.forEach((r) => router.addRoute(r))
      console.info(`[router] 远程菜单已注入：${remoteRoutes.length} 个路由`)
    }
    dynamicLoaded = true
    // 重新触发守卫（此时路由已注册，可正常匹配 + 应用可见性检查）
    return { path: to.fullPath, replace: true }
  } finally {
    routerStore.setLoadingRemoteMenu(false)
  }
}

/**
 * 重置远程菜单加载状态（供测试 / 强制刷新场景使用）。
 *
 * 命名说明：本函数曾用 `resetRouterState`，但实际只重置本守卫的 dynamicLoaded +
 * currentToken 模块级状态，不涉及 vue-router 全局状态。改为更精确的语义。
 */
export function resetAuthGuardState(): void {
  dynamicLoaded = false
  currentToken = null
}
