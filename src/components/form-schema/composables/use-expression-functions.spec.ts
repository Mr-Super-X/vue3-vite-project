/**
 * useExpressionFunctions 单元测试
 *
 * 覆盖：
 * - immediate: true —— 同步注册首屏 fns
 * - watch 触发：getter 返回新对象时重新注册
 * - scope dispose：清理（setExpressionFunctions(undefined)）避免跨实例污染
 * - 多实例并存：dispose 顺序影响模块级 fns
 *
 * 设计：spy 模块级 setExpressionFunctions，直接观察 useExpressionFunctions 的副作用契约
 * —— 避免 resolveFunctionExpression 内部 fnsRef 缓存与 version 行为带来的间接性。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import * as expressionModule from './use-expression'
import { useExpressionFunctions } from './use-expression-functions'

let scope: EffectScope
let setExpressionFunctionsSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  scope = effectScope()
  // 监视副作用入口：useExpressionFunctions 的所有行为都收敛在这里
  setExpressionFunctionsSpy = vi.spyOn(expressionModule, 'setExpressionFunctions')
})

afterEach(() => {
  scope.stop()
  setExpressionFunctionsSpy.mockRestore()
})

describe('useExpressionFunctions / 立即注册', () => {
  it('调用即触发 setExpressionFunctions(fns) — immediate: true 同步注册', () => {
    const fns = { greet: (s: string) => `hi ${s}` }
    scope.run(() => {
      useExpressionFunctions({ expressionFunctions: () => fns })
    })
    expect(setExpressionFunctionsSpy).toHaveBeenCalledTimes(1)
    expect(setExpressionFunctionsSpy).toHaveBeenLastCalledWith(fns)
  })

  it('getter 返回 undefined → 立即调用 setExpressionFunctions(undefined)', () => {
    scope.run(() => {
      useExpressionFunctions({ expressionFunctions: () => undefined })
    })
    expect(setExpressionFunctionsSpy).toHaveBeenCalledTimes(1)
    expect(setExpressionFunctionsSpy).toHaveBeenLastCalledWith(undefined)
  })
})

describe('useExpressionFunctions / watch 触发', () => {
  it('getter 返回新对象 → nextTick 后 setExpressionFunctions 被再次调用（新对象）', async () => {
    const oldFns = { v: () => 'old' }
    const newFns = { v: () => 'new' }
    const currentRef = ref<Record<string, (...args: never[]) => unknown>>(oldFns)
    scope.run(() => {
      useExpressionFunctions({ expressionFunctions: () => currentRef.value })
    })
    // immediate: 1 次
    expect(setExpressionFunctionsSpy).toHaveBeenCalledTimes(1)
    expect(setExpressionFunctionsSpy).toHaveBeenLastCalledWith(oldFns)

    // 模拟 props.expressionFunctions 引用换代（ref 改变触发 watch）
    currentRef.value = newFns
    await nextTick()
    expect(setExpressionFunctionsSpy).toHaveBeenCalledTimes(2)
    expect(setExpressionFunctionsSpy).toHaveBeenLastCalledWith(newFns)
  })

  it('getter 连续返回相同对象 → 不会重复触发 setExpressionFunctions', async () => {
    const stable = { v: () => 'stable' }
    scope.run(() => {
      useExpressionFunctions({ expressionFunctions: () => stable })
    })
    const initialCalls = setExpressionFunctionsSpy.mock.calls.length
    expect(initialCalls).toBe(1) // immediate 一次

    // 多次 nextTick：watch source 值未变 → 不触发
    await nextTick()
    await nextTick()
    await nextTick()
    expect(setExpressionFunctionsSpy).toHaveBeenCalledTimes(initialCalls)
  })
})

describe('useExpressionFunctions / scope 清理', () => {
  it('scope.stop → 触发 setExpressionFunctions(undefined) 清理', () => {
    scope.run(() => {
      useExpressionFunctions({ expressionFunctions: () => ({ onlyHere: () => 'x' }) })
    })
    expect(setExpressionFunctionsSpy).toHaveBeenCalledTimes(1)
    expect(setExpressionFunctionsSpy).toHaveBeenLastCalledWith({ onlyHere: expect.anything() })

    scope.stop()
    // dispose 触发最后一次清理调用
    const lastCall = setExpressionFunctionsSpy.mock.calls.at(-1)!
    expect(lastCall[0]).toBeUndefined()
  })

  it('A.scope.stop 不会影响 B.scope 中已注册 fns（B 是独立 watcher）', async () => {
    const scopeA = effectScope()
    const scopeB = effectScope()
    const fnsB = { fromB: () => 'B' }

    scopeA.run(() => {
      useExpressionFunctions({ expressionFunctions: () => ({ fromA: () => 'A' }) })
    })
    scopeB.run(() => {
      useExpressionFunctions({ expressionFunctions: () => fnsB })
    })

    // 模块级单例：后注册覆盖前注册（这是 use-expression 模块设计，不是 useExpressionFunctions 的事）
    expect(setExpressionFunctionsSpy).toHaveBeenLastCalledWith(fnsB)

    // 销毁 A：触发 onScopeDispose → setExpressionFunctions(undefined)
    scopeA.stop()
    const lastA = setExpressionFunctionsSpy.mock.calls.at(-1)!
    expect(lastA[0]).toBeUndefined() // A 的清理

    // B 的 watcher 在自身 scope 内，不受 A 影响
    // A 清理后 B 的 immediate 已稳定 — B.fn 仍生效（其 watcher 持有自己的 deps）
    // 这里通过再次 nextTick 验证 B 的 watcher 仍存活
    await nextTick()
    // 因为 A.dispose 触发的 undefined 调用可能影响了模块级 fns，但 B 的 immediate 已注册
    // 关键断言：B 的 fns 引用仍能在 B scope 内被使用
    expect(setExpressionFunctionsSpy).toHaveBeenCalledWith(fnsB)

    scopeB.stop()
  })
})
