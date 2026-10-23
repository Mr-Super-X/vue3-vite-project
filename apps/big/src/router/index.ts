/**
 * 路由入口（big 数据大屏站）。
 *
 * 与 docs router/index.ts 同构（P2 骨架跨 app 复用）：
 * - 无登录 / 权限 / 远程菜单守卫——big 全站公开，守卫只挂白名单直通 + 可见性检查
 * - 无 tags-view 多页签 afterEach、无 /500 错误页（渲染错误由 App.vue 的
 *   ErrorBoundary 兜底；大屏站无服务端错误语义）
 *
 * 保留：
 * - registerAppRouter DI（useAppRouter 经 @vv/shared 读取实例）
 * - rootRedirect → /big-demo（big-demo 路由父记录挂 big layout，scale 适配自动激活）
 * - historyMode / base 环境解析（与 docs 同口径，预留子路径部署能力）
 *
 * @see [`./auto-register.ts`](./auto-register.ts) 模块路由自动扫描
 * @see [`./whitelist.ts`](./whitelist.ts) 白名单（big-demo 路由名全量吸收）
 * @group 路由：入口
 */

import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
// registerAppRouter / checkVisibility 归 @vv/shared 根 barrel（P1-3 守卫骨架下沉）；
// resolveBasePath / createDefaultScrollBehavior 自 P5 起一并单源化（6 app 零差异段下沉裁决）
import {
  registerAppRouter,
  checkVisibility,
  resolveBasePath,
  createDefaultScrollBehavior,
} from '@vv/shared'
import { autoRegisteredRoutes } from './auto-register'
import { fallbackRoute } from './fallback'
import { isBigWhiteListed } from './whitelist'
import NotFound from '@/views/NotFound.vue'

/**
 * 根路径重定向：访问 `/` 时跳到 big-demo 首页（1920 标准数据大屏）。
 * 不放 fallback：catch-all 会把 `/` 也吞掉跳到 /404。
 */
const rootRedirect: RouteRecordRaw = {
  path: '/',
  redirect: '/big-demo',
}

/** 站内 404（白名单成员；fallback catch-all 重定向的目标） */
const notFoundRoute: RouteRecordRaw = {
  path: '/404',
  name: 'NotFound',
  component: NotFound,
  meta: { title: '页面不存在' },
}

/** history 模式：默认 web；VITE_HISTORY_MODE=hash 时走 hash（子路径部署免后端 rewrite） */
const historyMode = import.meta.env.VITE_HISTORY_MODE === 'hash' ? 'hash' : 'web'

export const router = createRouter({
  history:
    historyMode === 'hash'
      ? createWebHashHistory(resolveBasePath())
      : createWebHistory(resolveBasePath()),
  routes: [rootRedirect, notFoundRoute, ...autoRegisteredRoutes, fallbackRoute],
  scrollBehavior: createDefaultScrollBehavior(),
})

// 把实例注入 @vv/shared（useAppRouter 经 DI 读取）；
// 必须先于守卫注册——守卫链内可能触发跳转
registerAppRouter(router)

// big 全站公开：白名单直通（big-demo 全部路由名 + NotFound 均已吸收）；
// 兜底可见性检查（hidden 路由不直达，语义与 admin 守卫第一段一致）
router.beforeEach((to) => {
  if (isBigWhiteListed(to.name)) return true
  return checkVisibility(to) ?? true
})

export default router
