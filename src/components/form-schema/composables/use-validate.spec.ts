import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import {
  validate,
  validateWithZod,
  runCrossFieldValidation,
  collectCrossRuleFields,
} from './use-validate'

describe('validate(schema, opts?)', () => {
  it('returns isValid=true for valid schema', () => {
    const schema = {
      component: 'Input',
      name: 'name',
      label: '名称',
    }
    const result = validate(schema)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('returns isValid=false when on.* is not function/string', () => {
    const schema = {
      component: 'Input',
      on: { change: 123 as unknown as never },
    }
    const result = validate(schema)
    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([
      { keyPath: ['on', 'change'], message: '事件回调必须为函数或函数表达式' },
    ])
  })

  it('returns isValid=false when component is not string or Component', () => {
    const schema = {
      component: 999 as unknown as never,
    }
    const result = validate(schema)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.keyPath).toEqual(['component'])
  })

  it('returns isValid=false when children is neither SchemaNode nor array nor string', () => {
    const schema = {
      children: 42 as unknown as never,
    }
    const result = validate(schema)
    expect(result.isValid).toBe(false)
  })

  it('recurses into children array', () => {
    const schema = {
      children: [{ component: 'Input' }, { component: 1 as unknown as never }],
    }
    const result = validate(schema)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.keyPath).toEqual(['children', 1, 'component'])
  })

  it('全小写原生 HTML 标签（a/span）通过组件名校验', () => {
    const schema = {
      children: [
        { component: 'a', children: '链接' },
        { component: 'span', children: '文本' },
      ],
    }
    const result = validate(schema, {
      knownComponents: { builtin: new Set(['Input']), user: new Set() },
    })
    expect(result.isValid).toBe(true)
  })

  it('未知 PascalCase 组件名（拼写错误）仍报错', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const schema = { component: 'Inpurt' }
    const result = validate(schema, {
      knownComponents: { builtin: new Set(['Input']), user: new Set() },
    })
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.keyPath).toEqual(['component'])
    warnSpy.mockRestore()
  })

  it('with validateFirst:true stops on first error', () => {
    const schema = {
      component: 1 as unknown as never,
      on: { change: 2 as unknown as never },
    }
    const result = validate(schema, { validateFirst: true })
    expect(result.errors).toHaveLength(1)
  })

  it('validates rules string is allowed', () => {
    const schema = { rules: 'required' }
    expect(validate(schema).isValid).toBe(true)
  })

  it('validates rules RuleItem is allowed', () => {
    const schema = { rules: { required: true, message: '必填' } }
    expect(validate(schema).isValid).toBe(true)
  })

  it('validates rules array of string is allowed', () => {
    const schema = { rules: ['required', { max: 6 }] }
    expect(validate(schema).isValid).toBe(true)
  })

  it('rejects rules that is neither string nor object nor array', () => {
    const schema = { rules: 999 as unknown as never }
    expect(validate(schema).isValid).toBe(false)
  })
})

describe('validateWithZod(zodSchema, formData)', () => {
  it('returns success=true on valid data', () => {
    const zodSchema = z.object({ name: z.string() })
    const result = validateWithZod(zodSchema, { name: 'foo' })
    expect(result.success).toBe(true)
    expect(result.errors).toBeNull()
  })

  it('returns success=false with ZodError on invalid data', () => {
    const zodSchema = z.object({ name: z.string() })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = validateWithZod(zodSchema, {})
    expect(result.success).toBe(false)
    expect(result.errors).not.toBeNull()
    spy.mockRestore()
  })

  it('returns success=true for empty schema with valid empty data', () => {
    const zodSchema = z.object({})
    const result = validateWithZod(zodSchema, {})
    expect(result.success).toBe(true)
  })
})

describe('runCrossFieldValidation(schema, model)', () => {
  it('returns isValid=true when no crossValidator rules', async () => {
    const schema = { component: 'Input', name: 'email' }
    const result = await runCrossFieldValidation(schema, { email: 'a@b.com' })
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('passes when crossValidator returns true', async () => {
    const schema = {
      component: 'Input',
      name: 'confirmPassword',
      rules: [
        {
          dependsOn: ['password'],
          crossValidator: (value: unknown, password: unknown) =>
            value === password || '两次密码不一致',
        },
      ],
    }
    const model = { password: 'abc', confirmPassword: 'abc' }
    expect((await runCrossFieldValidation(schema, model)).isValid).toBe(true)
  })

  it('fails with returned message when crossValidator returns string', async () => {
    const schema = {
      component: 'Input',
      name: 'confirmPassword',
      rules: [
        {
          dependsOn: ['password'],
          crossValidator: (value: unknown, password: unknown) =>
            value === password || '两次密码不一致',
        },
      ],
    }
    const model = { password: 'abc', confirmPassword: 'xyz' }
    const result = await runCrossFieldValidation(schema, model)
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toBe('两次密码不一致')
    expect(result.errors[0]?.keyPath).toContain('confirmPassword')
  })

  it('handles multiple dependsOn fields (array form)', async () => {
    const schema = {
      component: 'Input',
      name: 'c',
      rules: [
        {
          dependsOn: ['a', 'b'],
          crossValidator: (value: unknown, a: unknown, b: unknown) =>
            value !== a && value !== b ? (true as const) : 'c 不能等于 a 或 b',
        },
      ],
    }
    expect((await runCrossFieldValidation(schema, { a: 1, b: 2, c: 3 })).isValid).toBe(true)
    const fail = await runCrossFieldValidation(schema, { a: 1, b: 2, c: 1 })
    expect(fail.isValid).toBe(false)
  })

  it('handles single dependsOn (string form)', async () => {
    const schema = {
      component: 'Input',
      name: 'b',
      rules: [
        {
          dependsOn: 'a',
          crossValidator: (value: unknown, a: unknown) =>
            (value as number) > (a as number) || 'b 必须大于 a',
        },
      ],
    }
    expect((await runCrossFieldValidation(schema, { a: 1, b: 2 })).isValid).toBe(true)
    expect((await runCrossFieldValidation(schema, { a: 5, b: 2 })).isValid).toBe(false)
  })

  it('expands array nodes: applies itemSchema rules per array element', async () => {
    const schema = {
      component: 'Card',
      children: [
        {
          kind: 'array' as const,
          name: 'items',
          array: {
            itemSchema: {
              component: 'Input',
              name: 'min',
              rules: [
                {
                  dependsOn: 'max',
                  crossValidator: (value: unknown, max: unknown) =>
                    (value as number) <= (max as number) || 'min 必须 ≤ max',
                },
              ],
            },
          },
        },
      ],
    }
    const model = {
      items: [{ min: 1 }, { min: 2 }, { min: 3 }],
      max: 5,
    }
    expect((await runCrossFieldValidation(schema, model)).isValid).toBe(true)

    const failModel = {
      items: [{ min: 1 }, { min: 9 }],
      max: 5,
    }
    const result = await runCrossFieldValidation(schema, failModel)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.keyPath).toContain('items[1].min')
  })

  it('skips rules that have crossValidator but no dependsOn', async () => {
    const schema = {
      component: 'Input',
      name: 'a',
      rules: [
        {
          crossValidator: (value: unknown) => Boolean(value) || 'required',
          // // dependsOn 缺失
        } as never,
      ],
    }
    const result = await runCrossFieldValidation(schema, { a: null })
    expect(result.isValid).toBe(true)
  })

  it('console.error and skips rule when crossValidator throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const schema = {
      component: 'Input',
      name: 'a',
      rules: [
        {
          dependsOn: 'b',
          crossValidator: () => {
            throw new Error('boom')
          },
        },
      ],
    }
    const result = await runCrossFieldValidation(schema, { a: 1, b: 2 })
    expect(result.isValid).toBe(true)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('aggregates multiple errors', async () => {
    const schema = {
      component: 'Card',
      children: [
        {
          component: 'Input',
          name: 'a',
          rules: [
            { dependsOn: 'b', crossValidator: (v: unknown, b: unknown) => v === b || 'a!=b' },
          ],
        },
        {
          component: 'Input',
          name: 'c',
          rules: [
            { dependsOn: 'd', crossValidator: (v: unknown, d: unknown) => v === d || 'c!=d' },
          ],
        },
      ],
    }
    const result = await runCrossFieldValidation(schema, { a: 1, b: 2, c: 3, d: 4 })
    expect(result.errors).toHaveLength(2)
  })

  it('uses lodash path resolution (keys with dots)', async () => {
    const schema = {
      component: 'Input',
      name: 'items[0].qty',
      rules: [
        {
          dependsOn: 'maxQty',
          crossValidator: (value: unknown, max: unknown) =>
            (value as number) <= (max as number) || 'qty 超过上限',
        },
      ],
    }
    const model = { items: [{ qty: 3 }], maxQty: 5 }
    expect((await runCrossFieldValidation(schema, model)).isValid).toBe(true)
    const fail = await runCrossFieldValidation(schema, { items: [{ qty: 9 }], maxQty: 5 })
    expect(fail.isValid).toBe(false)
  })

  it('skips crossValidator when node has no name', async () => {
    const schema = {
      component: 'Card',
      children: [
        {
          component: 'Input',
          // // 无 name
          rules: [{ dependsOn: 'a', crossValidator: () => 'fail' }],
        },
      ],
    }
    const result = await runCrossFieldValidation(schema, { a: 1 })
    expect(result.isValid).toBe(true)
  })

  // ============ 异步 crossValidator 测试 ============

  it('awaits crossValidator returning Promise<true>', async () => {
    const schema = {
      component: 'Input',
      name: 'username',
      rules: [
        {
          dependsOn: 'reserved',
          crossValidator: async (value: unknown) => {
            await new Promise((r) => setTimeout(r, 10))
            return (value === 'admin' ? '用户名已保留' : true) as true | string
          },
        },
      ],
    }
    expect(
      (await runCrossFieldValidation(schema, { username: 'admin', reserved: '' })).isValid
    ).toBe(false)
    expect((await runCrossFieldValidation(schema, { username: 'foo', reserved: '' })).isValid).toBe(
      true
    )
  })

  it('console.error and skips when async crossValidator rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const schema = {
      component: 'Input',
      name: 'a',
      rules: [
        {
          dependsOn: 'b',
          crossValidator: async () => {
            throw new Error('remote down')
          },
        },
      ],
    }
    const result = await runCrossFieldValidation(schema, { a: 1, b: 2 })
    expect(result.isValid).toBe(true)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('awaits multiple async crossValidators sequentially', async () => {
    const order: string[] = []
    const schema = {
      component: 'Card',
      children: [
        {
          component: 'Input',
          name: 'a',
          rules: [
            {
              dependsOn: 'b',
              crossValidator: async () => {
                await new Promise((r) => setTimeout(r, 5))
                order.push('a')
                return true as const
              },
            },
          ],
        },
        {
          component: 'Input',
          name: 'c',
          rules: [
            {
              dependsOn: 'd',
              crossValidator: async () => {
                await new Promise((r) => setTimeout(r, 5))
                order.push('c')
                return true as const
              },
            },
          ],
        },
      ],
    }
    await runCrossFieldValidation(schema, { a: 1, b: 2, c: 3, d: 4 })
    expect(order).toEqual(['a', 'c'])
  })
})

describe('collectCrossRuleFields(schema)', () => {
  it('空 schema 返回空数组', () => {
    expect(collectCrossRuleFields({ component: 'Input', name: 'a' })).toEqual([])
    expect(collectCrossRuleFields(undefined)).toEqual([])
    expect(collectCrossRuleFields('text')).toEqual([])
  })

  it('顶层节点含 cross rule 被收集', () => {
    const schema = {
      component: 'Input',
      name: 'a',
      rules: [{ dependsOn: ['b'], crossValidator: () => true as const }],
    }
    expect(collectCrossRuleFields(schema)).toEqual([schema])
  })

  it('无 cross rule 的节点不收集', () => {
    const schema = {
      component: 'Input',
      name: 'a',
      rules: [{ required: true }], // 无 crossValidator
    }
    expect(collectCrossRuleFields(schema)).toEqual([])
  })

  it('递归 children 中的 cross rule 节点', () => {
    const a = {
      component: 'Input',
      name: 'a',
      rules: [{ dependsOn: ['b'], crossValidator: () => true as const }],
    }
    const schema = {
      children: [a, { component: 'Input', name: 'b' }],
    }
    expect(collectCrossRuleFields(schema)).toEqual([a])
  })

  it('递归 array.itemSchema 中的 cross rule 节点', () => {
    const item = {
      component: 'Input',
      name: 'qty',
      rules: [{ dependsOn: ['max'], crossValidator: () => true as const }],
    }
    const schema = {
      children: [
        {
          kind: 'array' as const,
          name: 'items',
          array: { itemSchema: item },
        },
      ],
    }
    expect(collectCrossRuleFields(schema)).toEqual([item])
  })

  it('收集多个 cross rule 节点', () => {
    const a = {
      component: 'Input',
      name: 'a',
      rules: [{ dependsOn: ['b'], crossValidator: () => true as const }],
    }
    const c = {
      component: 'Input',
      name: 'c',
      rules: [{ dependsOn: ['d'], crossValidator: () => true as const }],
    }
    const schema = {
      children: [a, { component: 'Input', name: 'b' }, c],
    }
    expect(collectCrossRuleFields(schema)).toHaveLength(2)
    expect(collectCrossRuleFields(schema)).toContain(a)
    expect(collectCrossRuleFields(schema)).toContain(c)
  })

  it('无 name 的节点即使有 cross rule 也不收集(无法定位字段)', () => {
    const schema = {
      component: 'Card',
      // 无 name
      rules: [{ dependsOn: ['x'], crossValidator: () => 'fail' }],
    }
    expect(collectCrossRuleFields(schema)).toEqual([])
  })

  it('数组 schema 自动 wrap children 后递归', () => {
    const a = {
      component: 'Input',
      name: 'a',
      rules: [{ dependsOn: ['b'], crossValidator: () => true as const }],
    }
    expect(collectCrossRuleFields([a])).toEqual([a])
  })
})
