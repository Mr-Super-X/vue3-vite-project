import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveFunctionExpression, setExpressionFunctions } from './use-expression'
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

  it('事件参数按位置透传到表达式第二个形参（build-on-bindings 回归）', () => {
    const fn = resolveFunctionExpression<(m: unknown, v: unknown) => string>(
      '{{ (m, v) => m.feeType + ":" + v }}'
    )
    expect(fn).not.toBeNull()
    expect(fn!({ feeType: '费用' }, '其他')).toBe('费用:其他')
  })

  it('单参求值路径（reaction / permission / readonly）行为不变（向后兼容）', () => {
    const fn = resolveFunctionExpression<(m: unknown) => boolean>('{{ (m) => m.on === true }}')
    expect(fn).not.toBeNull()
    expect(fn!({ on: true })).toBe(true)
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

describe('use-expression / 白名单函数表（P2-2 回归）', () => {
  afterEach(() => setExpressionFunctions(undefined))

  it('注册后表达式可直接引用注册函数名', () => {
    setExpressionFunctions({
      formatMoney: (v: unknown) => `¥${Number(v).toFixed(2)}`,
    } as never)
    const fn = resolveFunctionExpression<(m: unknown) => string>(
      '{{ (m) => formatMoney(m.price) }}'
    )
    expect(fn).not.toBeNull()
    expect(fn!({ price: 5 })).toBe('¥5.00')
  })

  it('未注册时引用同名函数 → 运行时 ReferenceError（编译期不拦截）', () => {
    const fn = resolveFunctionExpression<(m: unknown) => string>(
      '{{ (m) => formatMoney(m.price) }}'
    )
    expect(fn).not.toBeNull() // 名字解析在运行时，编译期通过
    expect(() => fn!({ price: 5 })).toThrow(ReferenceError)
  })

  it('函数表变更后同字符串表达式使用新作用域（缓存按版本失效）', () => {
    setExpressionFunctions({ f: () => 'v1' } as never)
    const fn1 = resolveFunctionExpression<(m: unknown) => string>('{{ () => f() }}')
    expect(fn1!({})).toBe('v1')
    setExpressionFunctions({ f: () => 'v2' } as never)
    const fn2 = resolveFunctionExpression<(m: unknown) => string>('{{ () => f() }}')
    expect(fn2).not.toBe(fn1) // fnsVersion 变化 → 重新编译
    expect(fn2!({})).toBe('v2')
  })
})
