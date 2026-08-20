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
})
