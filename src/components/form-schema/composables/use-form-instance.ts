import { ref, toRaw, watch, type ComponentPublicInstance, type Ref } from 'vue'
import { validateWithZod } from './use-validate'
import type { ZodType } from 'zod'

/** 运行时方法对象（InstanceType<typeof ElForm> 会丢失 validate 等方法） */
export type ElFormInstance = {
  validate?: (callback?: (valid: boolean) => void) => Promise<boolean>
  /**
   * clearValidate 运行时支持 props?: string[] 参数（仅清除指定字段），
   * 但 element-plus 2.x TS 类型声明为 () => void —— 这里用宽松签名补齐
   */
  clearValidate?: (props?: string | string[]) => void
  resetFields?: () => void
  scrollToField?: (name: string) => void
  /**
   * 校验指定字段 —— element-plus 2.x 实际支持但 TS 类型声明不完整
   * validateField(prop?: string | string[]): Promise<void>（校验失败 reject）
   */
  validateField?: (prop?: string | string[]) => Promise<void>
}

/** 阶段 3.1：字段错误状态（走 element-plus 官方 props 路径） */
export type FieldErrorState = {
  error: string
  validateStatus: '' | 'validating' | 'success' | 'error'
}

/**
 * el-form 实例引用 + 校验 / 重置 / 滚动 等实例方法的封装
 * 暴露 validate / resetFields / clearValidate / getRef / getNames / scrollToField / validateWithZod
 *
 * 阶段 3.1 重构：setFieldError 改为更新 externalErrors ref（走 element-plus 官方
 * props.error + props.validateStatus 路径触发红字），不再直接写 elForm.fields[i]
 */
export function useFormInstance(
  model: () => Record<string, unknown> | undefined,
  zodSchema: () => ZodType | undefined,
  /** 阶段 3.1：外部字段错误状态 ref（XForm.vue 创建并传入） */
  externalErrors?: Ref<Record<string, FieldErrorState>>
) {
  const elFormRef = ref<ElFormInstance | null>(null)

  function getRef(key: string): ComponentPublicInstance | HTMLElement | null {
    const map = (elFormRef.value as unknown as { $?: Record<string, unknown> } | null)?.$ ?? {}
    return (map[key] as ComponentPublicInstance | HTMLElement) ?? null
  }

  function validateForm(): Promise<boolean> {
    return new Promise((resolve) => {
      const ef = elFormRef.value
      if (!ef?.validate) return resolve(true)
      // element-plus 2.x 即使传 callback 仍 reject errorsMap（微任务），需 Promise.catch 接住
      Promise.resolve(ef.validate((valid: boolean) => resolve(valid))).catch(() => resolve(false))
    })
  }

  function clearValidate(names?: string[]): void {
    // 阶段 3.1：clearValidate 同时清理 externalErrors（保持与 setFieldError 同步）
    if (names && externalErrors) {
      for (const name of names) delete externalErrors.value[name]
    } else if (externalErrors) {
      externalErrors.value = {}
    }
    elFormRef.value?.clearValidate?.(names)
  }

  function resetFields(): void {
    // resetFields 同时清空 externalErrors
    if (externalErrors) externalErrors.value = {}
    elFormRef.value?.resetFields?.()
  }

  function scrollToField(name: string): void {
    elFormRef.value?.scrollToField?.(name)
  }

  function validateFormWithZod(): { success: boolean; errors: import('zod').ZodError | null } {
    const zs = zodSchema()
    if (!zs) return { success: true, errors: null }
    return validateWithZod(zs, model() ?? {})
  }

  /** 数组操作：在 model[name] 末尾追加一项 */
  function addItem(name: string, init?: Record<string, unknown>): void {
    const m = model()
    if (!m) return
    if (!Array.isArray(m[name])) m[name] = []
    ;(m[name] as unknown[]).push(init ?? {})
    elFormRef.value?.clearValidate?.()
  }

  /** 数组操作：删除 model[name][index] */
  function removeItem(name: string, index: number): void {
    const m = model()
    if (!m || !Array.isArray(m[name])) return
    const arr = m[name] as unknown[]
    if (index < 0 || index >= arr.length) return
    arr.splice(index, 1)
    elFormRef.value?.clearValidate?.()
  }

  /** 数组操作：把 model[name][from] 移到 [to] */
  function moveItem(name: string, from: number, to: number): void {
    const m = model()
    if (!m || !Array.isArray(m[name])) return
    const arr = m[name] as unknown[]
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    elFormRef.value?.clearValidate?.()
  }

  /**
   * 阶段 3.1：手动设置字段错误状态
   * 双路径：
   * 路径 A：element-plus 官方 props 路径（externalErrors → form-item props.error/validateStatus → watch → setValidationState）
   * 路径 B：watch 守护（监听 externalErrors 变化，强制把对应字段内部 ref 同步成 error，
   *        覆盖 el-form-item 内部任何后续 validate(success) 回调）
   *
   * 为什么需要双路径：
   * 1. el-form.validateField / el-form.validate 成功后会调 setValidationState('success')，覆盖路径 A 写入的 error
   * 2. 路径 A 依赖 props.error 的 watch；当 error 字符串未变化时 watch 不会重新触发，导致状态无法从 success 恢复为 error
   * 3. 路径 B 用 deep + immediate watch 守护，任何 externalErrors 变更（无论 setFieldError 还是 crossValidator 重算）
   *    都会同步强制 el-form-item 内部 validateState/validateMessage 到正确值
   *
   * element-plus 2.x el-form.fields 通过 defineExpose 暴露，数组元素是 formItemContext（reactive 对象）。
   * 其中的 prop/propString/validateState/validateMessage 都是 ref，需用 toRaw 取原始 ref 后再改 .value。
   *
   * 注意：element-plus 内部有 validateStateDebounced（100ms debounce）驱动实际 DOM class 显示，
   * 我们的 watch 是同步触发，validateState 值变更后 100ms 内 debounced 会同步过来 —— 我们在
   * validateField('blur') 触发的 validate-success 回调执行后立即把状态恢复为 error，
   * 保证 debounced 也最终显示 error。
   */
  function setFieldError(
    name: string,
    message: string,
    state: '' | 'validating' | 'success' | 'error' = 'error'
  ): void {
    // 路径 A：element-plus 官方 props 路径
    if (externalErrors) {
      if (state === 'error' && message) {
        externalErrors.value[name] = { error: message, validateStatus: state }
      } else {
        delete externalErrors.value[name]
      }
    }
  }

  // 路径 B：watch 守护
  // 1) 订阅 externalErrors 变化（crossValidator 重算 / setFieldError 调用）
  // 2) 订阅 fields 数组变化（新字段注册），给每个新字段的 validateState/validateMessage 装 watch：
  //    当外部错误仍存在但 el-form-item 内部 validateField(success) 把状态改回 success 时，
  //    立即纠正为 error —— 这是 element-plus validateStateDebounced(100ms) 之外的同步纠正。
  //    debounced 最终会跟随 validateState 显示 error，所以红字保留。
  if (externalErrors) {
    const watchedFields = new WeakSet<object>()

    const guardField = (field: object): void => {
      if (watchedFields.has(field)) return
      watchedFields.add(field)
      const rawField = toRaw(field) as {
        prop?: string | Ref<string>
        propString?: string | Ref<string>
        validateState?: { value?: string }
        validateMessage?: { value?: string }
      }
      // 从 field 推字段名（优先 propString，没有用 prop）
      const propString =
        rawField.propString &&
        typeof rawField.propString === 'object' &&
        'value' in rawField.propString
          ? rawField.propString.value
          : rawField.propString
      const prop =
        rawField.prop && typeof rawField.prop === 'object' && 'value' in rawField.prop
          ? rawField.prop.value
          : rawField.prop
      const fieldName = typeof propString === 'string' ? propString : prop
      if (typeof fieldName !== 'string') return
      const vs = rawField.validateState
      const vm = rawField.validateMessage
      if (vs && typeof vs === 'object' && 'value' in vs) {
        watch(
          () => (vs as Ref<string>).value,
          (newState) => {
            const err = externalErrors.value?.[fieldName]
            if (err?.error && newState !== 'error') {
              ;(vs as Ref<string>).value = 'error'
              if (vm && typeof vm === 'object' && 'value' in vm) {
                ;(vm as Ref<string>).value = err.error
              }
            }
          }
        )
      }
    }

    watch(
      () => externalErrors.value,
      (errors) => {
        const ef = elFormRef.value as unknown as {
          fields?: Array<{
            prop?: string | Ref<string>
            propString?: string | Ref<string>
            validateState?: string | Ref<string>
            validateMessage?: string | Ref<string>
          }>
        } | null
        if (!ef?.fields) return
        for (const field of ef.fields) {
          const propString =
            field.propString && typeof field.propString === 'object' && 'value' in field.propString
              ? field.propString.value
              : field.propString
          const prop =
            field.prop && typeof field.prop === 'object' && 'value' in field.prop
              ? field.prop.value
              : field.prop
          const fieldName = typeof propString === 'string' ? propString : prop
          if (typeof fieldName !== 'string') continue
          const target = errors[fieldName]
          const rawField = toRaw(field)
          if (!rawField) continue
          const vs = rawField.validateState
          const vm = rawField.validateMessage
          if (target?.error) {
            if (vs && typeof vs === 'object' && 'value' in vs && vs.value !== 'error') {
              ;(vs as Ref<string>).value = 'error'
            }
            if (vm && typeof vm === 'object' && 'value' in vm && vm.value !== target.error) {
              ;(vm as Ref<string>).value = target.error
            }
          } else {
            if (vs && typeof vs === 'object' && 'value' in vs && vs.value === 'error') {
              ;(vs as Ref<string>).value = ''
            }
            if (vm && typeof vm === 'object' && 'value' in vm && vm.value) {
              ;(vm as Ref<string>).value = ''
            }
          }
          guardField(field)
        }
      },
      { deep: true, immediate: true }
    )

    // fields 数组本身可能变化（el-form-item 注册新字段）
    watch(
      () => {
        const ef = elFormRef.value as unknown as { fields?: unknown[] } | null
        return ef?.fields
      },
      (fields) => {
        if (!fields) return
        for (const field of fields) {
          if (field && typeof field === 'object') guardField(field)
        }
      },
      { immediate: true }
    )
  }

  /** 手动标记某个字段为校验中(el-form-item 显示 loading 图标) */
  function setFieldValidating(name: string): void {
    setFieldError(name, '', 'validating')
  }

  return {
    elFormRef,
    getRef,
    validateForm,
    clearValidate,
    resetFields,
    scrollToField,
    validateFormWithZod,
    addItem,
    removeItem,
    moveItem,
    setFieldError,
    setFieldValidating,
    // 阶段 3.1：暴露 externalErrors ref 让调用方（如 XForm.vue）能直接读状态
    externalErrors,
  }
}
