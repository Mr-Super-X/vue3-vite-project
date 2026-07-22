// 路由组合式函数（业务侧高层 API）
//
// 在 vue-router 的 useRouter() 之上封装业务级常用操作：
//  - pushWithTitle: 跳转路由并写入 document.title（i18n 友好）
//  - pushByName: 按 RouteName 类型安全跳转（无需记字符串）
//  - replaceByName: 同上但用 replace（不留历史）
//  - back: 安全返回（带 fallback）
//  - addDynamicRoute: 远程菜单加载时按 name 注册（wrapper）
//  - withErrorToast: 把 router.push 失败包装为 toast（避免裸 Promise rejection）
//
// 设计要点：
//  - 与 vue-router 的 useRouter() 共存，本 composable 用 useAppRouter() 别名避免命名冲突
//  - 不在 store 添加 router mutation（保持 router 单例由 vue-router 管）
//  - 所有 async 操作都 catch 错误并 toast，避免上层每处重复 try/catch

import { router } from '@router'
import { resolveRouteTitle } from '@router/helpers'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { RouteLocationRaw, RouteLocationNamedRaw, RouteRecordRaw, Router } from 'vue-router'
import type { RouteName } from '@/router/types'

/**
 * 应用层路由 composable。
 *
 * 业务侧推荐使用本 composable 而非直接 import router 实例，以便：
 *  - 集中错误处理（toast）
 *  - i18n title 自动写入 document.title
 *  - 类型安全的 pushByName + RouteName 联合类型检查
 */
export function useAppRouter(): {
  /** vue-router 实例（兼容旧 API） */
  router: Router
  /** 类型安全的按 name 跳转（RouteName 联合类型约束） */
  pushByName: (name: RouteName, params?: RouteLocationNamedRaw['params']) => Promise<void>
  /** 类型安全的按 name replace */
  replaceByName: (name: RouteName, params?: RouteLocationNamedRaw['params']) => Promise<void>
  /** 跳转并设置 document.title（i18n 友好） */
  pushWithTitle: (to: RouteLocationRaw) => Promise<void>
  /** 安全返回（带 fallback） */
  back: (fallback?: RouteLocationRaw) => Promise<void>
  /** 远程菜单动态注入（wrapper） */
  addDynamicRoute: (route: RouteRecordRaw) => void
  /** 把 router 操作失败的 Promise rejection 包成 toast */
  withErrorToast: <T extends (...args: never[]) => Promise<unknown>>(fn: T) => T
} {
  /**
   * 类型安全的按 name 跳转。
   *
   * @example
   *   await pushByName('UserList', { id: 1 })
   */
  async function pushByName(
    name: RouteName,
    params: RouteLocationNamedRaw['params'] = {}
  ): Promise<void> {
    try {
      await router.push({ name, params })
    } catch (err) {
      handleRouterError(err)
    }
  }

  async function replaceByName(
    name: RouteName,
    params: RouteLocationNamedRaw['params'] = {}
  ): Promise<void> {
    try {
      await router.replace({ name, params })
    } catch (err) {
      handleRouterError(err)
    }
  }

  /**
   * 通用跳转 + 设置 document.title。
   *
   * title 来源：route.meta.titleKey 优先（i18n 查找），fallback 到 title / name。
   *
   * 实现要点：用 `router.currentRoute.value` 读取跳转后的路由，而非依赖 `router.push`
   * 的返回值。原因：vue-router 的 push 返回类型是 `NavigationFailure | void | undefined`，
   * 无法在编译期 narrowing 到 RouteLocationNormalized（NavigationFailure 没有 `meta` 字段）。
   * `currentRoute.value` 始终是完整 RouteLocationNormalized 类型，类型安全。
   *
   * 守卫可能二次跳转（return { path: '/login' } 等），此时 currentRoute 反映最终位置，符合预期。
   */
  async function pushWithTitle(to: RouteLocationRaw): Promise<void> {
    try {
      // i18n 在 setup 上下文捕获 t 函数（不传 t 时 resolveRouteTitle 走 fallback 链）
      const { t } = useI18n()
      await router.push(to)
      // 跳转完成后读取当前路由（一定是 RouteLocationNormalized，无需 any 转换）
      const newTitle = resolveRouteTitle(router.currentRoute.value, t)
      if (newTitle) document.title = newTitle
    } catch (err) {
      handleRouterError(err)
    }
  }

  /**
   * 安全返回。如果 history 为空（如直接刷新进入 SPA），fallback 到指定路由。
   *
   * @param fallback 当前 history 为空时的兜底跳转（默认首页 '/'）
   */
  async function back(fallback: RouteLocationRaw = { path: '/' }): Promise<void> {
    try {
      if (window.history.length > 1) {
        router.back()
      } else {
        await router.push(fallback)
      }
    } catch (err) {
      handleRouterError(err)
    }
  }

  /**
   * 远程菜单加载时按 route 对象注入（包装 router.addRoute）。
   * 业务层调用点：路由守卫的 ensureRemoteMenuLoaded。
   */
  function addDynamicRoute(route: RouteRecordRaw): void {
    router.addRoute(route)
  }

  /**
   * 高阶函数：把 router 异步操作的错误统一 toast。
   *
   * @example
   *   const safePush = withErrorToast(router.push)
   *   await safePush({ name: 'UserList' })
   */
  function withErrorToast<T extends (...args: never[]) => Promise<unknown>>(fn: T): T {
    return ((...args: never[]) => {
      try {
        return fn(...args).catch((err: unknown) => handleRouterError(err))
      } catch (err) {
        handleRouterError(err)
        return Promise.resolve()
      }
    }) as T
  }

  /** 统一错误处理：toast + console.error */
  function handleRouterError(err: unknown): void {
    // 跳当前路由（vue-router 在重复导航时抛 NavigationFailure，跳当前路由是正常情况，不报错）
    const errMessage = err instanceof Error ? err.message : String(err)
    if (/Avoided redundant navigation/i.test(errMessage)) return
    console.error('[useAppRouter] 路由操作失败:', err)
    if (typeof ElMessage !== 'undefined') {
      ElMessage.error('路由跳转失败')
    }
  }

  return {
    router,
    pushByName,
    replaceByName,
    pushWithTitle,
    back,
    addDynamicRoute,
    withErrorToast,
  }
}
