import { describe, it, expect, vi } from 'vitest'
import { resolveFunctionExpression } from './use-expression'
import { scanForForbidden } from './use-scan-forbidden'

describe('resolveFunctionExpression(raw)', () => {
  it('parses valid {{ (m) => m.x }} into executable function', () => {
    const fn = resolveFunctionExpression('{{ (m) => m.x }}')
    expect(fn).not.toBeNull()
    expect(fn!({ x: 42 })).toBe(42)
  })

  it('parses {{(m) => m.x + 1}} without spaces', () => {
    const fn = resolveFunctionExpression('{{(m) => m.x + 1}}')
    expect(fn!({ x: 10 })).toBe(11)
  })

  it('returns null for non-string input', () => {
    expect(resolveFunctionExpression(123 as unknown as string)).toBeNull()
    expect(resolveFunctionExpression(null as unknown as string)).toBeNull()
    expect(resolveFunctionExpression(undefined as unknown as string)).toBeNull()
  })

  it('returns null for string without {{ }}', () => {
    expect(resolveFunctionExpression('plain text')).toBeNull()
  })

  it('returns null + console.error for invalid expression syntax', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fn = resolveFunctionExpression('{{ (( }}')
    expect(fn).toBeNull()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  // ---- 编译缓存回归 ----

  it('同一表达式命中缓存返回同一函数实例', () => {
    const f1 = resolveFunctionExpression('{{ (m) => m.n * 2 }}')
    const f2 = resolveFunctionExpression('{{ (m) => m.n * 2 }}')
    expect(f1).not.toBeNull()
    expect(f1).toBe(f2)
    expect(f1!({ n: 3 })).toBe(6)
  })

  it('同一非法表达式只 console.error 一次（失败结果同样缓存）', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(resolveFunctionExpression('{{ @@ }}')).toBeNull()
    expect(resolveFunctionExpression('{{ @@ }}')).toBeNull()
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})

describe('scanForForbidden(schema)', () => {
  it('returns errors for on.change containing "window"', () => {
    const errors = scanForForbidden({
      on: { change: '{{ (m) => window.alert(m.x) }}' },
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('window')
  })

  it('returns errors for on.* containing "eval"', () => {
    const errors = scanForForbidden({
      on: { click: '{{() => eval("alert(1)")}}' },
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('returns empty array for safe expressions', () => {
    const errors = scanForForbidden({
      on: { change: '{{ (m) => m.x }}' },
    })
    expect(errors).toEqual([])
  })

  it('recurses into children', () => {
    const errors = scanForForbidden({
      children: [{ on: { focus: '{{() => document.cookie }}' } }],
    })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('recurses into formItem.slots', () => {
    const errors = scanForForbidden({
      formItem: {
        slots: {
          default: { on: { click: '{{() => fetch("/x") }}' } },
        },
      },
    })
    expect(errors.length).toBeGreaterThan(0)
  })
})
