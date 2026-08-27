import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
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
    it('resolves false + console.error when elFormRef is null（M2：不再静默通过）', async () => {
      // 此前 resolve(true) 会把"配置/时序错误"伪装成"校验通过"，提交链路带病继续
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { validateForm } = useFormInstance(
        () => ({}),
        () => undefined
      )
      await expect(validateForm()).resolves.toBe(false)
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('el-form 实例未绑定'))
      errSpy.mockRestore()
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

    it('addItem 追加不清任何校验态（末尾追加无索引位移，既有红字保留）', () => {
      const modelStore: Record<string, unknown> = { items: [] }
      const { addItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = {
        ...createMockElForm(),
        fields: [{ propString: { value: 'items[0].qty' } }],
      }
      elFormRef.value = mock as never
      addItem('items')
      expect(mock.clearValidate).not.toHaveBeenCalled()
    })

    it('M1：removeItem 只清理该数组子树的校验态，不误伤其他字段', () => {
      const modelStore: Record<string, unknown> = { items: [{}, {}] }
      const { removeItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = {
        ...createMockElForm(),
        // 模拟 el-form 已注册的字段：两个 items 子树字段 + 一个无关字段
        fields: [
          { propString: { value: 'items[0].qty' } },
          { propString: { value: 'items[1].qty' } },
          { propString: { value: 'other' } },
        ],
      }
      elFormRef.value = mock as never
      removeItem('items', 0)
      // 此前为无参调用（清空全表单）；现在只传 items 子树路径
      expect(mock.clearValidate).toHaveBeenCalledWith(['items[0].qty', 'items[1].qty'])
      expect(mock.clearValidate).not.toHaveBeenCalledWith()
    })

    it('M1：removeItem 只清被删行及之后的行，前面的行错误保留', () => {
      const modelStore: Record<string, unknown> = { items: [{}, {}, {}] }
      const { removeItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = {
        ...createMockElForm(),
        fields: [
          { propString: { value: 'items[0].qty' } },
          { propString: { value: 'items[1].qty' } },
          { propString: { value: 'items[2].qty' } },
        ],
      }
      elFormRef.value = mock as never
      removeItem('items', 1) // 删第 2 行 → 仅 items[1]/items[2] 路径失效
      expect(mock.clearValidate).toHaveBeenCalledWith(['items[1].qty', 'items[2].qty'])
    })

    it('M1：一个匹配字段都提不到时不调用 clearValidate（EP 空数组=清全部）', () => {
      // element-plus filterFields：clearValidate([]) 语义是清空全表单，必须守卫
      const modelStore: Record<string, unknown> = { items: [{}] }
      const { removeItem, elFormRef } = useFormInstance(
        () => modelStore,
        () => undefined
      )
      const mock = createMockElForm() // 无 fields 属性 → 提取不到任何字段名
      elFormRef.value = mock as never
      removeItem('items', 0)
      expect(mock.clearValidate).not.toHaveBeenCalled()
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
      const mock = {
        ...createMockElForm(),
        fields: [{ propString: { value: 'items[0].a' } }],
      }
      elFormRef.value = mock as never
      removeItem('items', 0)
      expect(mock.clearValidate).toHaveBeenCalledWith(['items[0].a'])
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
      const mock = {
        ...createMockElForm(),
        fields: [{ propString: { value: 'items[0].a' } }, { propString: { value: 'items[1].a' } }],
      }
      elFormRef.value = mock as never
      moveItem('items', 0, 1)
      expect(mock.clearValidate).toHaveBeenCalledWith(['items[0].a', 'items[1].a'])
    })
  })

  describe('setFieldError(name, message)', () => {
    // 阶段 3.1:setFieldError 改为走 externalErrors ref(官方 props 路径),
    // 不再直接修改 elForm.fields[i]。测试相应更新:检查 externalErrors ref 值
    it('writes message to externalErrors ref (走 element-plus 官方 props 路径)', () => {
      const { setFieldError, externalErrors } = useFormInstance(
        () => ({}),
        () => undefined,
        ref({}) as never
      )
      setFieldError('email', '邮箱格式错误')
      expect(externalErrors!.value.email).toEqual({
        error: '邮箱格式错误',
        validateStatus: 'error',
      })
    })

    it('writes default validateStatus when state omitted', () => {
      const { setFieldError, externalErrors } = useFormInstance(
        () => ({}),
        () => undefined,
        ref({}) as never
      )
      setFieldError('email', '错误信息')
      expect(externalErrors!.value.email?.validateStatus).toBe('error')
    })

    it('clears entry when message empty or state cleared', () => {
      const { setFieldError, externalErrors } = useFormInstance(
        () => ({}),
        () => undefined,
        ref({ email: { error: '旧', validateStatus: 'error' } }) as never
      )
      setFieldError('email', '')
      expect(externalErrors!.value.email).toBeUndefined()
    })

    it('is silent when externalErrors ref not provided', () => {
      // 不传 externalErrors 时 setFieldError 应为 no-op(兼容老调用)
      const { setFieldError } = useFormInstance(
        () => ({}),
        () => undefined
      )
      expect(() => setFieldError('a', 'b')).not.toThrow()
    })

    it('supports nested path (items[0].qty) for array items', () => {
      const { setFieldError, externalErrors } = useFormInstance(
        () => ({}),
        () => undefined,
        ref({}) as never
      )
      setFieldError('items[0].qty', '数量必须大于 0')
      expect(externalErrors!.value['items[0].qty']).toEqual({
        error: '数量必须大于 0',
        validateStatus: 'error',
      })
    })
  })
})

describe('useFormInstance / guard watcher 泄漏修复（⑥ 回归）', () => {
  it('scope 销毁后 guard watcher 不再纠正字段状态', async () => {
    const { effectScope, nextTick, ref } = await import('vue')
    const externalErrors = ref<Record<string, { error: string; validateStatus: string }>>({})
    const validateState = ref('success')
    const validateMessage = ref('')
    const scope = effectScope()
    scope.run(() => {
      const inst = useFormInstance(
        () => ({}),
        () => undefined,
        externalErrors as never
      )
      const mock = {
        ...createMockElForm(),
        fields: [{ propString: 'a', validateState, validateMessage }],
      }
      inst.elFormRef.value = mock as never
    })
    // 触发外层 watch → guardField 注册 inner watch
    externalErrors.value = { a: { error: '服务端错误', validateStatus: 'error' } }
    await nextTick()
    // guard 生效验证：字段被改成 success 时应被纠正回 error
    validateState.value = 'success'
    await nextTick()
    expect(validateState.value).toBe('error')
    // 销毁 scope 后再改 —— 泄漏修复后不应再被纠正
    scope.stop()
    validateState.value = 'success'
    await nextTick()
    expect(validateState.value).toBe('success')
  })
})
