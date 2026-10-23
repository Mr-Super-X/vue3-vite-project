/**
 * 路由入口（h5 移动端）。
 *
 * 与 docs router/index.ts 同构（P3-2 照抄骨架）：无登录 / 权限 / 远程菜单
 * 守卫——h5 全站公开（h5-demo 免登录方便真机扫码预览），守卫只挂白名单
 * 直通 + 可见性检查。rootRedirect → /h5-demo（h5 layout 下唯一业务页）。
 *
 * @see [`./auto-register.ts`](./auto-register.ts) 模块路由自动扫描
 * @see [`./whitelist.ts`](./whitelist.ts) 白名单（h5-demo 路由名吸收）
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
import { isH5WhiteListed } from './whitelist'
import NotFound from '@/views/NotFound.vue'

/**
 * 根路径重定向：访问 `/` 时跳到 h5-demo 演示页。
 * 不放 fallback：catch-all 会把 `/` 也吞掉跳到 /404。
 */
const rootRedirect: RouteRecordRaw = {
  path: '/',
  redirect: '/h5-demo',
}

/** 站内 404（白名单成员；fallback catch-all 重定向的目标） */
const notFoundRoute: RouteRecordRaw = {
  path: '/404',
  name: 'NotFound',
  component: NotFound,
  meta: { title: '页面不存在' },
}

/** history 模式：默认 web；VITE_HISTORY_MODE=hash 时走 hash（静态托管部署免后端 rewrite） */
const historyMode = import.meta.env.VITE_HISTORY_MODE === 'hash' ? 'hash' : 'web'

export const router = createRouter({
  history:
    historyMode === 'hash'
      ? createWebHashHistory(resolveBasePath())
      : createWebHistory(resolveBasePath()),
  routes: [rootRedirect, notFoundRoute, ...autoRegisteredRoutes, fallbackRoute],
  scrollBehavior: createDefaultScrollBehavior(),
})

// 把实例注入 @vv/shared（useAppRouter / http 401 登出跳转经 DI 读取）；
// 必须先于守卫注册——守卫链内可能触发跳转
registerAppRouter(router)

// h5 全站公开：白名单直通（h5-demo 路由名 + NotFound 均已吸收）；
// 兜底可见性检查（hidden 路由不直达，语义与 admin 守卫第一段一致）
router.beforeEach((to) => {
  if (isH5WhiteListed(to.name)) return true
  return checkVisibility(to) ?? true
})

export default router
