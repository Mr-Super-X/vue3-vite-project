/**
 * 守卫 —— 登录态检查（独立可测的纯函数）。
 *
 * 业务背景：未登录用户访问需登录页面时跳统一登录应用（apps/auth），并保留 `redirect` 参数。
 * httpOnly 模式（2026-08-12 改造）：凭证 cookie 前端不可读，用 sessionStorage
 * 登录标记做同步初判；hard refresh 后标记仍在但 store 状态丢失时，
 * 通过 `fetchProfile` 让后端用 cookie 凭证完成真正的校验。
 *
 * 设计要点：
 * - 函数不直接读 storage，而是接受 `userStore` 与可选的标记读取器
 * - `fetchProfile` 失败时清本地登录标记并跳登录页（防止卡死在半登录态）
 * - P4 变更：未登录不再返回 app 内 /login 路由（auth 已独立为 apps/auth，
 *   消费方 app 内无登录路由），改 `redirectToAuthLogin` 整页跳转——该函数
 *   赋 location.href 后抛 AUTH_REDIRECTING 中断守卫链（见 ../auth/redirect.ts）
 * - 返回 null 表示放行；跳转路径由 redirectToAuthLogin 的 never 语义承载
 *
 * @see 编排器位于各 app 的 `router/guards/auth.ts`（如 apps/admin）—— `checkLoginState` 调用点
 * @see [`../auth/redirect.ts`](../auth/redirect.ts) 跨应用统一登录协议（P4）
 * @see [`src/utils/storage.ts`](../../utils/storage.ts) `Session.get('auth')` 标记来源
 * @see [`@vv/mock/src/mockProdServer.ts`](../../../mock/src/mockProdServer.ts) VITE_DEMO_NO_AUTH 演示模式说明
 * @group 路由：登录守卫
 */

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { useUserStore } from '../store/modules/user.ts'
import { Session } from '../utils/storage.ts'
import { redirectToAuthLogin } from '../auth/redirect.ts'

type UserStore = ReturnType<typeof useUserStore>

/**
 * 检查登录态，未登录或凭证已失效（fetchProfile 失败）则整页跳 apps/auth 登录页。
 *
 * @returns null 表示已登录放行；未登录时 redirectToAuthLogin 抛 AUTH_REDIRECTING
 *          中断守卫链（composeGuards 透传，app 编排器 catch 后 return false 取消导航）
 */
export async function checkLoginState(
  to: RouteLocationNormalized,
  userStore: UserStore
): Promise<RouteLocationRaw | null> {
  // 演示模式（gh-pages CI 构建 VITE_DEMO_NO_AUTH=true）：跳过登录校验直接放行。
  // 仍尝试拉一次 profile——prod 版 auth mock（mock/mockProdServer.ts 内联）返回演示账号，
  // 拉取成功则用户名/权限码/按钮级 v-auth 全链路可演示；拉取失败降级放行（演示站不卡人）。
  // 常规构建开关缺省/false 时本分支被静态消除，行为与现状一致。
  if (import.meta.env.VITE_DEMO_NO_AUTH === 'true') {
    userStore.authenticated = true
    try {
      if (!userStore.profile) await userStore.fetchProfile()
    } catch {
      userStore.resetLocalState()
    }
    return null
  }

  // 已登录且 profile 已恢复 → 直接放行
  if (userStore.isLoggedIn && userStore.profile) return null

  // 未登录 → 读 sessionStorage 登录标记（hard refresh 场景标记可能仍在）
  const hasAuthMark = Session.get<boolean>('auth')
  if (!hasAuthMark) {
    redirectToAuthLogin(to.fullPath)
  }

  // 有标记但 profile 未恢复 → 拉 profile，由后端通过 cookie 凭证完成真实校验
  userStore.authenticated = true
  try {
    await userStore.fetchProfile()
  } catch {
    // 凭证失效（cookie 过期/被撤销）→ 清本地标记，下次重登
    userStore.resetLocalState()
    redirectToAuthLogin(to.fullPath)
  }

  return null
}
