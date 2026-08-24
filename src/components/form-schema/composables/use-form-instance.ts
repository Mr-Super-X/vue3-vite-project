import { ref, nextTick, type ComponentPublicInstance } from 'vue'
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

/**
 * el-form 实例引用 + 校验 / 重置 / 滚动 等实例方法的封装
 * 暴露 validate / resetFields / clearValidate / getRef / getNames / scrollToField / validateWithZod
 */
export function useFormInstance(
  model: () => Record<string, unknown> | undefined,
  zodSchema: () => ZodType | undefined
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

  function clearValidate(): void {
    elFormRef.value?.clearValidate?.()
  }

  function resetFields(): void {
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

  /**
   * 数组操作：在 model[name] 末尾追加一项
   * - 如果 model[name] 不是数组则先初始化为 []
   * - init 缺省时 push 空对象 {}
   * - 操作后清空校验：避免删除行/移动行后被删项的红色错误提示残留
   */
  function addItem(name: string, init?: Record<string, unknown>): void {
    const m = model()
    if (!m) return
    if (!Array.isArray(m[name])) m[name] = []
    ;(m[name] as unknown[]).push(init ?? {})
    elFormRef.value?.clearValidate?.()
  }

  /**
   * 数组操作：删除 model[name][index]
   * - 越界 / 非数组时静默跳过（命令式 API 容错优先）
   */
  function removeItem(name: string, index: number): void {
    const m = model()
    if (!m || !Array.isArray(m[name])) return
    const arr = m[name] as unknown[]
    if (index < 0 || index >= arr.length) return
    arr.splice(index, 1)
    elFormRef.value?.clearValidate?.()
  }

  /**
   * 数组操作：把 model[name][from] 移到 [to]
   * - from === to 或非数组/越界均静默跳过
   */
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
   * 手动设置某个字段的错误信息(el-form-item 自动展示红字提示)
   * - 必须同时设置 validateState + validateMessage,只设 message 不设 state,el-form-item 不渲染红字
   * - state 默认为 'error';校验中可传 'validating' 显示 loading 图标
   * - 通过 elFormRef.fields 数组按 prop 名找到对应 form-item
   * - fields 中的 field 来自 el-form-item 的 reactive 包装,属性赋值会触发 UI 更新
   * - 找不到对应字段时静默跳过(常见于 array 节点动态变化期间)
   */
  function setFieldError(
    name: string,
    message: string,
    state: '' | 'validating' | 'success' | 'error' = 'error'
  ): void {
    const ef = elFormRef.value as unknown as {
      fields?: Array<{
        prop?: string
        validateState?: '' | 'validating' | 'success' | 'error'
        validateMessage?: string
      }>
    } | null
    if (!ef?.fields) return
    const idx = ef.fields.findIndex((f) => f.prop === name)
    if (idx < 0) return
    const field = ef.fields[idx]
    if (!field) return
    // 1. 立即写入 validateState / validateMessage(formItem reactive 属性)
    field.validateState = state
    field.validateMessage = message
    // 2. element-plus 2.x 内部 elForm.fields 写入后可能再次被字段内校验覆盖
    //    (例如 el-input change 事件会触发字段内 async-validator 重跑 → success 状态覆盖 error)
    //    nextTick 后再次写入,确保覆盖并触发 UI 重渲染
    //    参考 https://github.com/element-plus/element-plus/blob/main/packages/components/form/src/form.vue
    nextTick(() => {
      const ef2 = elFormRef.value as unknown as {
        fields?: Array<{
          prop?: string
          validateState?: '' | 'validating' | 'success' | 'error'
          validateMessage?: string
        }>
      } | null
      if (!ef2?.fields) return
      const idx2 = ef2.fields.findIndex((f) => f.prop === name)
      if (idx2 < 0) return
      const field2 = ef2.fields[idx2]
      if (!field2) return
      // 二次写入 + 用 Object.assign 触发 Proxy set trap,确保 UI 更新
      Object.assign(field2, { validateState: state, validateMessage: message })
    })
  }

  /**
   * 手动标记某个字段为校验中(el-form-item 显示 loading 图标)
   * 典型用法:跨字段异步校验期间展示 loading,完成后用 setFieldError 切到 error 或 clearValidate 清空
   */
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
  }
}
