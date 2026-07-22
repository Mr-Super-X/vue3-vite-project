// 路由守卫 - 编排入口
//
// 把 5 段检查（白名单 → 可见性 → 登录态 → 远程菜单 → 权限）串成一个流水线。
// 每个段都是独立可测的纯函数（见 *.ts 同目录其他文件）。
//
// 顺序说明（顺序敏感）：白名单必须最前，否则登录页本身会被拦截；
// 可见性必须在登录前否则未登录用户访问 hidden 路由会看到 /login 重定向，体验糟糕。
//
// 错误处理：
//   - 远程菜单加载失败 → console.warn + 保持 local（fetchRemoteRoutes 内部已捕获）
//   - 动态 import 失败 → src/router/index.ts 的 error-boundary.ts 处理

import type { Router } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { useRouterStore } from '@/store/modules/router'
import { isWhiteListed } from '../whitelist'
import { checkVisibility } from './visibility'
import { checkLoginState } from './login'
import { ensureRemoteMenuLoaded, resetAuthGuardState } from './remote-menu'
import { checkPermission } from './permission'
import { composeGuards } from './composable'

export { resetAuthGuardState }

/**
 * 注册路由守卫到 vue-router。
 *
 * 调用一次（在 src/router/index.ts 创建 router 后）。
 * 守卫内部用 composeGuards 串接所有 check，确保顺序、可测性、可中断。
 */
export function setupAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    // 1. 白名单：跳过所有检查（按路由 name 匹配）
    if (isWhiteListed(to.name)) return true

    const userStore = useUserStore()
    const routerStore = useRouterStore()

    // 2-5. 顺序检查：可见性 → 登录态 → 远程菜单 → 权限
    // 任一返回 RouteLocationRaw 立即终止（vue-router 跳转到该路由）
    const result = await composeGuards(to, [
      (route) => checkVisibility(route),
      (route) => checkLoginState(route, userStore),
      (route) => ensureRemoteMenuLoaded(route, userStore, routerStore, router),
      (route) => checkPermission(route, userStore),
    ])

    // null = 放行；非 null = vue-router 内部跳转到 RouteLocationRaw
    return result ?? true
  })
}
