import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { useFormInstance } from './use-form-instance'

/** 模拟 el-form 组件实例（暴露 XForm 需要的实例方法） */
function createMockElForm() {
  return {
    validate: vi.fn(),
    clearValidate: vi.fn(),
    resetFields: vi.fn(),
    scrollToField: vi.fn(),
    $: {
      name: { name: 'ElInput' } as unknown,
      email: { name: 'ElInput' } as unknown,
    },
  }
}

describe('useFormInstance(model, zodSchema)', () => {
  it('exposes elFormRef initialized to null', () => {
    const { elFormRef } = useFormInstance(
      () => ({}),
      () => undefined
    )
    expect(elFormRef.value).toBeNull()
  })

  describe('getRef(key)', () => {
    it('returns null when elFormRef is not bound', () => {
      const { getRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      expect(getRef('name')).toBeNull()
    })

    it('returns component instance from elFormRef.$.$ when bound', () => {
      const { elFormRef, getRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      expect(getRef('name')).toEqual({ name: 'ElInput' })
      expect(getRef('email')).toEqual({ name: 'ElInput' })
    })

    it('returns null for non-existent key', () => {
      const { elFormRef, getRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      elFormRef.value = createMockElForm() as never
      expect(getRef('nonexistent')).toBeNull()
    })
  })

  describe('validateForm()', () => {
    it('resolves true when elFormRef is null', async () => {
      const { validateForm } = useFormInstance(
        () => ({}),
        () => undefined
      )
      await expect(validateForm()).resolves.toBe(true)
    })

    it('resolves true on validate callback (valid)', async () => {
      const { elFormRef, validateForm } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      mock.validate = vi.fn((cb: (v: boolean) => void) => {
        cb(true)
        return Promise.resolve(true)
      })
      elFormRef.value = mock as never
      await expect(validateForm()).resolves.toBe(true)
    })

    it('resolves false on validate callback (invalid)', async () => {
      const { elFormRef, validateForm } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      mock.validate = vi.fn((cb: (v: boolean) => void) => {
        cb(false)
        return Promise.resolve(false)
      })
      elFormRef.value = mock as never
      await expect(validateForm()).resolves.toBe(false)
    })

    it('resolves false when validate rejects (element-plus errorsMap)', async () => {
      const { elFormRef, validateForm } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      mock.validate = vi.fn(() => {
        return Promise.reject(new Error('validation failed'))
      })
      elFormRef.value = mock as never
      await expect(validateForm()).resolves.toBe(false)
    })
  })

  describe('clearValidate / resetFields / scrollToField', () => {
    it('clearValidate delegates to elFormRef', () => {
      const { elFormRef, clearValidate } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      clearValidate()
      expect(mock.clearValidate).toHaveBeenCalledTimes(1)
    })

    it('resetFields delegates to elFormRef', () => {
      const { elFormRef, resetFields } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      resetFields()
      expect(mock.resetFields).toHaveBeenCalledTimes(1)
    })

    it('scrollToField delegates with name', () => {
      const { elFormRef, scrollToField } = useFormInstance(
        () => ({}),
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      scrollToField('email')
      expect(mock.scrollToField).toHaveBeenCalledWith('email')
    })

    it('does nothing when elFormRef is null', () => {
      const { clearValidate, resetFields, scrollToField } = useFormInstance(
        () => ({}),
        () => undefined
      )
      expect(() => clearValidate()).not.toThrow()
      expect(() => resetFields()).not.toThrow()
      expect(() => scrollToField('x')).not.toThrow()
    })
  })

  describe('validateFormWithZod()', () => {
    it('returns success when no zodSchema provided', () => {
      const { validateFormWithZod } = useFormInstance(
        () => ({ name: 'foo' }),
        () => undefined
      )
      expect(validateFormWithZod()).toEqual({ success: true, errors: null })
    })

    it('validates with zod schema (passing data)', () => {
      const zodSchema = z.object({ name: z.string() })
      const { validateFormWithZod } = useFormInstance(
        () => ({ name: 'foo' }),
        () => zodSchema as never
      )
      expect(validateFormWithZod()).toEqual({ success: true, errors: null })
    })

    it('returns failure with ZodError (failing data)', () => {
      const zodSchema = z.object({ name: z.string() })
      const { validateFormWithZod } = useFormInstance(
        () => ({ name: 123 as unknown as string }),
        () => zodSchema as never
      )
      const result = validateFormWithZod()
      expect(result.success).toBe(false)
      expect(result.errors).not.toBeNull()
    })

    it('handles undefined model gracefully', () => {
      const zodSchema = z.object({ name: z.string() })
      const { validateFormWithZod } = useFormInstance(
        () => undefined,
        () => zodSchema as never
      )
      const result = validateFormWithZod()
      expect(result.success).toBe(false)
      expect(result.errors).not.toBeNull()
    })
  })

  describe('addItem(name, init?)', () => {
    it('appends empty object when model[name] is undefined', () => {
      const modelStore = {} as Record<string, unknown>
      const { addItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      elFormRef.value = createMockElForm() as never
      addItem('items')
      expect(modelStore.items).toEqual([{}])
    })

    it('appends to existing array', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }] }
      const { addItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      addItem('items', { b: 2 })
      expect(modelStore.items).toEqual([{ a: 1 }, { b: 2 }])
    })

    it('initializes to [] when model[name] exists but is not array', () => {
      const modelStore: Record<string, unknown> = { items: 'oops' as never }
      const { addItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      addItem('items')
      expect(Array.isArray(modelStore.items)).toBe(true)
      expect(modelStore.items).toEqual([{}])
    })

    it('does nothing when model is undefined', () => {
      const { addItem } = useFormInstance(
        () => undefined,
        () => undefined
      )
      expect(() => addItem('items')).not.toThrow()
    })

    it('calls elFormRef.clearValidate after push (avoid stale errors)', () => {
      const modelStore: Record<string, unknown> = { items: [] }
      const { addItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      addItem('items')
      expect(mock.clearValidate).toHaveBeenCalled()
    })
  })

  describe('removeItem(name, index)', () => {
    it('removes the item at given index', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }, { a: 2 }, { a: 3 }] }
      const { removeItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      removeItem('items', 1)
      expect(modelStore.items).toEqual([{ a: 1 }, { a: 3 }])
    })

    it('is silent when index is out of range', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }] }
      const { removeItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      expect(() => removeItem('items', 5)).not.toThrow()
      expect(() => removeItem('items', -1)).not.toThrow()
      expect(modelStore.items).toEqual([{ a: 1 }])
    })

    it('is silent when model[name] is not array', () => {
      const modelStore: Record<string, unknown> = { items: 'oops' as never }
      const { removeItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      expect(() => removeItem('items', 0)).not.toThrow()
    })

    it('is silent when model is undefined', () => {
      const { removeItem } = useFormInstance(
        () => undefined,
        () => undefined
      )
      expect(() => removeItem('items', 0)).not.toThrow()
    })

    it('calls elFormRef.clearValidate after removal', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }] }
      const { removeItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      removeItem('items', 0)
      expect(mock.clearValidate).toHaveBeenCalled()
    })
  })

  describe('moveItem(name, from, to)', () => {
    it('moves item from index to index', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }, { a: 2 }, { a: 3 }] }
      const { moveItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      moveItem('items', 0, 2)
      expect(modelStore.items).toEqual([{ a: 2 }, { a: 3 }, { a: 1 }])
    })

    it('moves in reverse direction', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }, { a: 2 }, { a: 3 }] }
      const { moveItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      moveItem('items', 2, 0)
      expect(modelStore.items).toEqual([{ a: 3 }, { a: 1 }, { a: 2 }])
    })

    it('is silent when from === to', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }, { a: 2 }] }
      const { moveItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      moveItem('items', 1, 1)
      expect(modelStore.items).toEqual([{ a: 1 }, { a: 2 }])
    })

    it('is silent when indices are out of range', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }] }
      const { moveItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      expect(() => moveItem('items', -1, 0)).not.toThrow()
      expect(() => moveItem('items', 0, 5)).not.toThrow()
      expect(modelStore.items).toEqual([{ a: 1 }])
    })

    it('is silent when model[name] is not array', () => {
      const modelStore: Record<string, unknown> = { items: 'oops' as never }
      const { moveItem } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      expect(() => moveItem('items', 0, 1)).not.toThrow()
    })

    it('is silent when model is undefined', () => {
      const { moveItem } = useFormInstance(
        () => undefined,
        () => undefined
      )
      expect(() => moveItem('items', 0, 1)).not.toThrow()
    })

    it('calls elFormRef.clearValidate after move', () => {
      const modelStore: Record<string, unknown> = { items: [{ a: 1 }, { a: 2 }] }
      const { moveItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = createMockElForm()
      elFormRef.value = mock as never
      moveItem('items', 0, 1)
      expect(mock.clearValidate).toHaveBeenCalled()
    })
  })

  describe('setFieldError(name, message)', () => {
    it('writes message to matching elFormRef.fields entry', () => {
      const fields = [
        { prop: 'email', validateMessage: '' },
        { prop: 'password', validateMessage: '' },
      ]
      const mockEf = { fields, clearValidate: vi.fn(), validate: vi.fn() }
      const { setFieldError, elFormRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      elFormRef.value = mockEf as never
      setFieldError('email', '邮箱格式错误')
      expect(fields[0]?.validateMessage).toBe('邮箱格式错误')
      expect(fields[1]?.validateMessage).toBe('')
    })

    it('is silent when field not found (e.g. array 节点动态变化期间)', () => {
      const fields = [{ prop: 'email', validateMessage: '' }]
      const mockEf = { fields, clearValidate: vi.fn(), validate: vi.fn() }
      const { setFieldError, elFormRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      elFormRef.value = mockEf as never
      expect(() => setFieldError('nonexistent', 'err')).not.toThrow()
      expect(fields[0]?.validateMessage).toBe('')
    })

    it('is silent when elFormRef is null', () => {
      const { setFieldError } = useFormInstance(
        () => ({}),
        () => undefined
      )
      expect(() => setFieldError('a', 'b')).not.toThrow()
    })

    it('is silent when fields array is missing', () => {
      const mockEf = { clearValidate: vi.fn(), validate: vi.fn() }
      const { setFieldError, elFormRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      elFormRef.value = mockEf as never
      expect(() => setFieldError('a', 'b')).not.toThrow()
    })

    it('supports nested path (items[0].qty) for array items', () => {
      const fields = [{ prop: 'items[0].qty', validateMessage: '' }]
      const mockEf = { fields, clearValidate: vi.fn(), validate: vi.fn() }
      const { setFieldError, elFormRef } = useFormInstance(
        () => ({}),
        () => undefined
      )
      elFormRef.value = mockEf as never
      setFieldError('items[0].qty', '数量必须大于 0')
      expect(fields[0]?.validateMessage).toBe('数量必须大于 0')
    })
  })
})
