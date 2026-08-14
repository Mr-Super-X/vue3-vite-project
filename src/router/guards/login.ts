// 守卫 - 登录态检查（独立可测的纯函数）
//
// 业务背景：未登录用户访问需登录页面时跳转登录页，并保留 redirect 参数。
// httpOnly 模式（2026-08-12 改造）：凭证 cookie 前端不可读，用 sessionStorage
// 登录标记做同步初判；hard refresh 后标记仍在但 store 状态丢失时，
// 通过 fetchProfile 让后端用 cookie 凭证完成真正的校验。
//
// 设计要点：
//  - 函数不直接读 storage，而是接受 userStore 与可选的标记读取器
//  - fetchProfile 失败时清本地登录标记并跳登录页（防止卡死在半登录态）
//  - 返回 null 表示放行，RouteLocationRaw 表示跳转目标

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { useUserStore } from '@/store/modules/user'
import { Session } from '@/utils/storage'

type UserStore = ReturnType<typeof useUserStore>

const LOGIN_PATH = '/login'

/**
 * 检查登录态，未登录或凭证已失效（fetchProfile 失败）则跳登录页。
 *
 * @returns null 表示已登录放行；RouteLocationRaw 表示跳转到登录页
 */
export async function checkLoginState(
  to: RouteLocationNormalized,
  userStore: UserStore
): Promise<RouteLocationRaw | null> {
  // 已登录且 profile 已恢复 → 直接放行
  if (userStore.isLoggedIn && userStore.profile) return null

  // 未登录 → 读 sessionStorage 登录标记（hard refresh 场景标记可能仍在）
  const hasAuthMark = Session.get<boolean>('auth')
  if (!hasAuthMark) {
    return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
  }

  // 有标记但 profile 未恢复 → 拉 profile，由后端通过 cookie 凭证完成真实校验
  userStore.authenticated = true
  try {
    await userStore.fetchProfile()
  } catch {
    // 凭证失效（cookie 过期/被撤销）→ 清本地标记，下次重登
    userStore.resetLocalState()
    return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
  }

  return null
}
