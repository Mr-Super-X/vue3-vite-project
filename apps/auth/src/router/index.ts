/**
 * 路由入口（auth 统一登录应用）。
 *
 * 相对 admin router/index.ts 的裁剪：
 * - 无登录 / 权限 / 远程菜单守卫——auth 自身守卫为白名单直通
 *   （登录页本身公开；auth 是登录态读写入口，不做登录态拦截）
 * - 无 tags-view 多页签 afterEach、无 /500 错误页（渲染错误由 App.vue 的
 *   ErrorBoundary 兜底；auth 无服务端错误语义）
 *
 * 保留：
 * - registerAppRouter DI（useAppRouter / http 401 登出跳转经 @vv/shared 读取实例）
 * - rootRedirect → /login（auth 唯一业务页）
 * - historyMode / base 环境解析（gh-pages 演示构建走 hash + 子路径 base）
 *
 * @see [`./auto-register.ts`](./auto-register.ts) 模块路由自动扫描
 * @see [`./whitelist.ts`](./whitelist.ts) 白名单（auth 路由名全量吸收）
 * @group 路由：入口
 */

import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw, RouterScrollBehavior } from 'vue-router'
// registerAppRouter / checkVisibility 归 @vv/shared 根 barrel（P1-3 守卫骨架下沉）
import { registerAppRouter, checkVisibility } from '@vv/shared'
import { autoRegisteredRoutes } from './auto-register'
import { fallbackRoute } from './fallback'
import { isAuthWhiteListed } from './whitelist'
import NotFound from '@/views/NotFound.vue'

/**
 * 根路径重定向：访问 `/` 时跳到登录页 /login。
 * 不放 fallback：catch-all 会把 `/` 也吞掉跳到 /404。
 */
const rootRedirect: RouteRecordRaw = {
  path: '/',
  redirect: '/login',
}

/** 站内 404（白名单成员；fallback catch-all 重定向的目标） */
const notFoundRoute: RouteRecordRaw = {
  path: '/404',
  name: 'NotFound',
  component: NotFound,
  meta: { title: '页面不存在' },
}

/** history 模式：默认 web；VITE_HISTORY_MODE=hash 时走 hash（gh-pages 子路径部署免后端 rewrite） */
const historyMode = import.meta.env.VITE_HISTORY_MODE === 'hash' ? 'hash' : 'web'

/** base 路径（VITE_BASE，必须以 / 开头、/ 结尾——vue-router basename 要求） */
function resolveBasePath(): string {
  const raw = import.meta.env.VITE_BASE ?? '/'
  if (!raw.startsWith('/')) return `/${raw}`
  if (!raw.endsWith('/')) return `${raw}/`
  return raw
}

// 路由切换后的滚动行为：前进/后退用 savedPosition；hash 锚点平滑滚动；其余回顶部
const scrollBehavior: RouterScrollBehavior = (to, _from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash, behavior: 'smooth' }
  return { top: 0, left: 0 }
}

export const router = createRouter({
  history:
    historyMode === 'hash'
      ? createWebHashHistory(resolveBasePath())
      : createWebHistory(resolveBasePath()),
  routes: [rootRedirect, notFoundRoute, ...autoRegisteredRoutes, fallbackRoute],
  scrollBehavior,
})

// 把实例注入 @vv/shared（useAppRouter / http 401 登出跳转经 DI 读取）；
// 必须先于守卫注册——守卫链内可能触发跳转
registerAppRouter(router)

// auth 自身守卫：白名单直通（登录页本身公开，全部 auth 路由名 + NotFound 已吸收）；
// 兜底可见性检查（hidden 路由不直达，语义与 admin 守卫第一段一致）
router.beforeEach((to) => {
  if (isAuthWhiteListed(to.name)) return true
  return checkVisibility(to) ?? true
})

export default router
