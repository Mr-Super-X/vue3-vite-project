/**
 * auth 模块路由。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 * 新增业务模块时按 `docs/07-路由模块设计.md` §新增路由流程 操作即可。
 *
 * 设计：
 * - `/login` 使用 `blank` 布局（无侧边栏 / 顶部）
 * - meta.requiresAuth: false 允许未登录访问（守卫白名单）
 * - P4 变更：auth 模块从 apps/admin 独立为 apps/auth（跨应用统一登录协议落地），
 *   其他 app 未登录时经 `redirectToAuthLogin` 整页跳转到此
 *
 * @see [`@/router/auto-register.ts`](../../../router/auto-register.ts) 自动注册入口
 * @see [`@/router/whitelist.ts`](../../../router/whitelist.ts) 白名单吸收方（routeNames）
 * @see [`@/layouts/blank`](../../../layouts/blank/index.vue) 空白布局
 * @group 业务模块：Auth
 */

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/blank/index.vue'),
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { title: '登录', requiresAuth: false, noTags: true },
      },
    ],
  },
]

/**
 * 自动从 routes 数组提取所有 auth 路由名（供 auth 白名单吸收）。
 * 递归处理嵌套 children，输出扁平 name 列表。
 */
export const routeNames: readonly string[] = (() => {
  const names: string[] = []
  const visit = (rs: RouteRecordRaw[]): void => {
    for (const r of rs) {
      if (typeof r.name === 'string') names.push(r.name)
      if (r.children?.length) visit(r.children)
    }
  }
  visit(routes)
  return names
})()

export default routes
