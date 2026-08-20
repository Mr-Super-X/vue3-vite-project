import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate, validateWithZod } from './use-validate'

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
