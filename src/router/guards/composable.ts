// 守卫 - 统一编排器（chain guards）
//
// 把多个 guard 串成一个调用链，任一 guard 返回非 null 即终止。
//
// 设计要点：
//  - 类似 koa / express 的 middleware chain，返回 RouteLocationRaw 即 next('error')
//  - 支持 async guards（fetchProfile / ensureRemoteMenuLoaded 都需要异步）
//  - 任何 guard 抛错时记录 console.error 并放行（避免守卫自身错误阻塞整个 SPA）

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export type RouteGuard = (
  to: RouteLocationNormalized,
  ...args: unknown[]
) => RouteLocationRaw | null | Promise<RouteLocationRaw | null>

/**
 * 顺序执行 guards 链，返回第一个非 null 的跳转目标或 null。
 *
 * 调用方按顺序传入 guards，链中任一 guard 返回 RouteLocationRaw 即终止。
 * 不修改路由或路由状态，不抛错（错误被吞并 console.error）。
 */
export async function composeGuards(
  to: RouteLocationNormalized,
  guards: ReadonlyArray<RouteGuard>,
  context: ReadonlyArray<unknown> = []
): Promise<RouteLocationRaw | null> {
  for (const guard of guards) {
    try {
      const result = await guard(to, ...context)
      if (result !== null) return result
    } catch (err) {
      console.error('[router/guards] guard 执行失败:', err)
      // 不中断链路，继续执行下一个 guard
    }
  }
  return null
}
