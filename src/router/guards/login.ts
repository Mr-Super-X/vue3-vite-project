// 守卫 - 登录态检查（独立可测的纯函数）
//
// 业务背景：未登录用户访问需登录页面时跳转登录页，并保留 redirect 参数。
// 已登录用户 token 可能在 hard refresh 后丢失，需要从 localStorage 恢复并拉取 profile。
//
// 设计要点：
//  - 函数不直接读 localStorage，而是接受 userStore 与可选的 token 读取器
//  - fetchProfile 失败时清空 token 并跳登录页（防止卡死在半登录态）
//  - 返回 null 表示放行，RouteLocationRaw 表示跳转目标

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { useUserStore } from '@/store/modules/user'
import { Session } from '@/utils/storage'

type UserStore = ReturnType<typeof useUserStore>

const LOGIN_PATH = '/login'

/**
 * 检查登录态，未登录或 token 已过期（fetchProfile 失败）则跳登录页。
 *
 * @returns null 表示已登录放行；RouteLocationRaw 表示跳转到登录页
 */
export async function checkLoginState(
  to: RouteLocationNormalized,
  userStore: UserStore
): Promise<RouteLocationRaw | null> {
  if (userStore.isLoggedIn) return null

  // 未登录 → 从 Session 恢复 token（HMR / hard refresh 场景）
  // Session.get('token') 在 prod 自动走 cookie（HttpOnly + secure + sameSite=lax）
  // dev 模式 HttpOnly 不可读时退化为可读 cookie（storage.ts 兼容）
  const token = Session.get<string>('token')
  if (!token) {
    return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
  }

  // 有 token 但 store 中为空 → 重新拉 profile
  userStore.token = token
  try {
    await userStore.fetchProfile()
  } catch {
    // token 无效（过期/被撤销）→ 清空本地下次重登
    userStore.logout()
    return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
  }

  return null
}
