import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate, validateWithZod, runCrossFieldValidation } from './use-validate'

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
  it('returns isValid=true when no crossValidator rules', () => {
    const schema = { component: 'Input', name: 'email' }
    const result = runCrossFieldValidation(schema, { email: 'a@b.com' })
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('passes when crossValidator returns true', () => {
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
    expect(runCrossFieldValidation(schema, model).isValid).toBe(true)
  })

  it('fails with returned message when crossValidator returns string', () => {
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
    const result = runCrossFieldValidation(schema, model)
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toBe('两次密码不一致')
    expect(result.errors[0]?.keyPath).toContain('confirmPassword')
  })

  it('handles multiple dependsOn fields (array form)', () => {
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
    expect(runCrossFieldValidation(schema, { a: 1, b: 2, c: 3 }).isValid).toBe(true)
    const fail = runCrossFieldValidation(schema, { a: 1, b: 2, c: 1 })
    expect(fail.isValid).toBe(false)
  })

  it('handles single dependsOn (string form)', () => {
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
    expect(runCrossFieldValidation(schema, { a: 1, b: 2 }).isValid).toBe(true)
    expect(runCrossFieldValidation(schema, { a: 5, b: 2 }).isValid).toBe(false)
  })

  it('expands array nodes: applies itemSchema rules per array element', () => {
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
    expect(runCrossFieldValidation(schema, model).isValid).toBe(true)

    const failModel = {
      items: [{ min: 1 }, { min: 9 }],
      max: 5,
    }
    const result = runCrossFieldValidation(schema, failModel)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.keyPath).toContain('items[1].min')
  })

  it('skips rules that have crossValidator but no dependsOn', () => {
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
    const result = runCrossFieldValidation(schema, { a: null })
    expect(result.isValid).toBe(true)
  })

  it('console.error and skips rule when crossValidator throws', () => {
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
    const result = runCrossFieldValidation(schema, { a: 1, b: 2 })
    expect(result.isValid).toBe(true)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('aggregates multiple errors', () => {
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
    const result = runCrossFieldValidation(schema, { a: 1, b: 2, c: 3, d: 4 })
    expect(result.errors).toHaveLength(2)
  })

  it('uses lodash path resolution (keys with dots)', () => {
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
    expect(runCrossFieldValidation(schema, model).isValid).toBe(true)
    const fail = runCrossFieldValidation(schema, { items: [{ qty: 9 }], maxQty: 5 })
    expect(fail.isValid).toBe(false)
  })

  it('skips crossValidator when node has no name', () => {
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
    const result = runCrossFieldValidation(schema, { a: 1 })
    expect(result.isValid).toBe(true)
  })
})
