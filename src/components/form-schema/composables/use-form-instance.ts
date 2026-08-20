import { ref, type ComponentPublicInstance } from 'vue'
import { validateWithZod } from './use-validate'
import type { ZodType } from 'zod'

/** 运行时方法对象（InstanceType<typeof ElForm> 会丢失 validate 等方法） */
export type ElFormInstance = {
  validate?: (callback?: (valid: boolean) => void) => Promise<boolean>
  clearValidate?: () => void
  resetFields?: () => void
  scrollToField?: (name: string) => void
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
  }
}
