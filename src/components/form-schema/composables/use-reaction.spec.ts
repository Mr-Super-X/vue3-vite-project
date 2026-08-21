import { describe, it, expect, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import type { SchemaNode } from '../types'
import { containsReaction, applyReactions } from './use-reaction'

describe('containsReaction(schema)', () => {
  it('returns true if any node has reaction field', () => {
    expect(containsReaction({ reaction: { label: 'x' } })).toBe(true)
    expect(containsReaction({ children: [{ reaction: { label: 'x' } }] })).toBe(true)
    expect(containsReaction({ slots: { default: { reaction: { hidden: true } } } })).toBe(true)
  })

  it('returns false otherwise', () => {
    expect(containsReaction({ component: 'Input' })).toBe(false)
    expect(containsReaction({ children: [{ component: 'Input' }] })).toBe(false)
    expect(containsReaction({})).toBe(false)
  })

  it('returns false for empty array', () => {
    expect(containsReaction([])).toBe(false)
  })
})

describe('applyReactions(node, model, stoppers)', () => {
  it('applies reaction.label as literal string', () => {
    const node = {
      reaction: { label: '新标签' },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    applyReactions(node, {}, stoppers)
    expect(node.label).toBe('新标签')
    expect(node.reaction).toBeUndefined()
    expect(stoppers.length).toBe(0)
  })

  it('applies reaction.label as function and registers watcher', async () => {
    const node = {
      reaction: { label: (m: { x: boolean }) => (m.x ? 'A' : 'B') },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, { x: true }, stoppers)
      // sync 模式 setup 立即跑一次
      expect(node.label).toBe('A')
      expect(stoppers.length).toBeGreaterThan(0)
    })
    scope.stop()
    expect(stoppers.length).toBe(1)
    stoppers.forEach((s) => s())
  })

  it('applies reaction as function expression string', async () => {
    const node = {
      reaction: { label: '{{ (m) => m.x ? "A" : "B" }}' },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, { x: true }, stoppers)
      expect(node.label).toBe('A')
    })
    scope.stop()
    stoppers.forEach((s) => s())
  })

  it('recurses into children array', () => {
    const node = {
      children: [{ reaction: { label: 'child label' } }],
    }
    const stoppers: (() => void)[] = []
    applyReactions(node, {}, stoppers)
    expect((node.children as Array<{ label?: string }>)[0]!.label).toBe('child label')
  })

  it('recurses into single child object', () => {
    const node = {
      children: { reaction: { label: 'single child' } },
    }
    const stoppers: (() => void)[] = []
    applyReactions(node, {}, stoppers)
    expect((node.children as { label?: string }).label).toBe('single child')
  })

  it('catches evaluation error and keeps last value', () => {
    const node = {
      reaction: {
        label: () => {
          throw new Error('boom')
        },
      },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => applyReactions(node, {}, stoppers)).not.toThrow()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    stoppers.forEach((s) => s())
  })

  it('does not crash on nodes without reaction', () => {
    const node = { component: 'Input', name: 'x' }
    const stoppers: (() => void)[] = []
    expect(() => applyReactions(node, {}, stoppers)).not.toThrow()
    expect(stoppers.length).toBe(0)
  })

  // ============ strategy + delay 测试(简化版) ============

  it('strategy="sync"(默认): setup 立即同步执行 + watch 后续变化', async () => {
    const m = reactive({ x: 1 })
    const node = {
      reaction: {
        // strategy 未指定,默认 sync
        label: () => (m.x > 0 ? 'positive' : 'zero'),
      },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, m, stoppers)
      expect(node.label).toBe('positive')
      // mutate model,触发 watch
      m.x = -1
    })
    await nextTick()
    expect(node.label).toBe('zero')
    scope.stop()
    stoppers.forEach((s) => s())
  })

  it('strategy="sync" 显式声明: 行为同上', async () => {
    const m = reactive({ x: 1 })
    const node = {
      reaction: {
        strategy: 'sync' as const,
        delay: 999, // sync 时 delay 被忽略
        label: () => 'explicit',
      },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, m, stoppers)
      expect(node.label).toBe('explicit')
    })
    scope.stop()
    stoppers.forEach((s) => s())
  })

  it('strategy="debounce" + delay: 注册 watcher 且 setup 不跑', () => {
    // 集成测试(fake timers + deep watch 在 vue 3 + vitest 下不稳定),
    // 这里只验证策略分支:debounce 模式 setup 不跑,只注册 watcher
    const callCount = vi.fn()
    const node = {
      reaction: {
        strategy: 'debounce' as const,
        delay: 300,
        label: () => {
          callCount()
          return 'x'
        },
      },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, {}, stoppers)
      // debounce 模式 setup 不跑,只注册 watcher
      expect(callCount).toHaveBeenCalledTimes(0)
      expect(stoppers.length).toBeGreaterThan(0)
    })
    scope.stop()
    stoppers.forEach((s) => s())
  })

  it('strategy="throttle" + delay: 注册 watcher 且 setup 不跑', () => {
    const callCount = vi.fn()
    const node = {
      reaction: {
        strategy: 'throttle' as const,
        delay: 100,
        label: () => {
          callCount()
          return 'x'
        },
      },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, {}, stoppers)
      expect(callCount).toHaveBeenCalledTimes(0)
      expect(stoppers.length).toBeGreaterThan(0)
    })
    scope.stop()
    stoppers.forEach((s) => s())
  })

  it('delay: 0 时即使 strategy=debounce 也走 sync 路径(立即同步执行)', () => {
    const callCount = vi.fn()
    const node = {
      reaction: {
        strategy: 'debounce' as const,
        delay: 0, // 0 delay 退化
        label: () => {
          callCount()
          return 'x'
        },
      },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, {}, stoppers)
      // delay=0 时走 sync 分支,runner 立即跑
      expect(callCount).toHaveBeenCalledTimes(1)
    })
    scope.stop()
    stoppers.forEach((s) => s())
  })
})
