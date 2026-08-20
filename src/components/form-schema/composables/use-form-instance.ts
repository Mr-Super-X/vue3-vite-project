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

  return {
    elFormRef,
    getRef,
    validateForm,
    clearValidate,
    resetFields,
    scrollToField,
    validateFormWithZod,
  }
}
