// 路由守卫：登录态 + 白名单 + 远程菜单加载 + 权限校验 + 可见性拦截
//
// 处理流程：
//   1. 白名单（按 name 匹配） → 直接放行
//   2. 路由 meta.visible === false → 跳 /404（收紧"菜单不可见 ≠ 路由不可访问"的双轨）
//   3. 未登录 → 跳登录页
//   4. 已登录 + remote 模式 → 按需拉取后端菜单（每个 token 周期一次，UI 显示 Loading）
//   5. 权限校验 → 无权限跳 /403
//
// 错误处理：
//   - 远程菜单加载失败 → console.warn + 保持 local（fetchRemoteRoutes 内部已捕获）
//   - 动态 import 失败 → router/index.ts 的 router.onError 处理

import type { Router } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { useRouterStore } from '@/store/modules/router'
import { isWhiteListed } from '../whitelist'
import { ROUTER_CONFIG } from '../config'
import { fetchRemoteRoutes } from '../remote'

/**
 * 模块级状态：跟踪每个 token 周期的远程菜单加载状态。
 *
 * - dynamicLoaded：本次登录周期内是否已加载远程菜单
 * - currentToken：上次加载时的 token（检测登录切换，重置 dynamicLoaded）
 */
let dynamicLoaded = false
let currentToken: string | null = null

export function setupAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    // 1. 白名单：跳过所有检查（按路由 name 匹配）
    if (isWhiteListed(to.name)) return true

    // 2. 菜单可见性检查：收紧"菜单不可见 → 路由不可访问"的双轨设计
    //    后端返回 hidden: true 的菜单会在 remote.ts 转换为 meta.visible: false
    //    业务路由如需隐藏可手动设置 meta: { visible: false }
    const visible = (to.meta as { visible?: boolean }).visible
    if (visible === false) {
      return { path: '/404' }
    }

    const userStore = useUserStore()

    // 3. 未登录：从 localStorage 恢复 token + 拉 profile
    if (!userStore.isLoggedIn) {
      const token = localStorage.getItem('token')
      if (!token) return { path: '/login', query: { redirect: to.fullPath } }
      userStore.token = token
      try {
        await userStore.fetchProfile()
      } catch {
        userStore.logout()
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }

    // 4. remote 模式：按需拉取后端菜单（每个 token 周期一次）
    //    token 变化时（登录/登出）重置 dynamicLoaded，下次重新拉取
    if (ROUTER_CONFIG.source === 'remote') {
      if (userStore.token !== currentToken) {
        dynamicLoaded = false
        currentToken = userStore.token
      }

      if (!dynamicLoaded) {
        const routerStore = useRouterStore()
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
          // 重新触发守卫（此时路由已注册，可正常匹配 + 应用 meta.visible 检查）
          return { path: to.fullPath, replace: true }
        } finally {
          routerStore.setLoadingRemoteMenu(false)
        }
      }
    }

    // 5. 权限校验：检查路由 meta.permissions 是否全部满足
    const requiredPerms = to.meta.permissions as string[] | undefined
    if (requiredPerms?.length) {
      const hasAll = requiredPerms.every((p) => userStore.permissions.includes(p))
      if (!hasAll) return { path: '/403' }
    }

    return true
  })
}

/**
 * 重置远程菜单加载状态（供测试 / 强制刷新场景使用）。
 */
export function resetRouterState(): void {
  dynamicLoaded = false
  currentToken = null
}
