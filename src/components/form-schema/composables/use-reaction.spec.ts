import { describe, it, expect, vi } from 'vitest'
import { effectScope } from 'vue'
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

  it('applies reaction.label as function and registers watchEffect', async () => {
    const node = {
      reaction: { label: (m: { x: boolean }) => (m.x ? 'A' : 'B') },
    } as unknown as SchemaNode
    const stoppers: (() => void)[] = []
    const scope = effectScope()
    scope.run(() => {
      applyReactions(node, { x: true }, stoppers)
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
})
