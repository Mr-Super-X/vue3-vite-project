/**
 * use-zod-validator —— zod 顶层校验编排
 *
 * 从 useFormInstance 抽离（zod 校验与 el-form 编排关注点不同），内部委托，公开签名 100% 不变。
 * 未配置 zodSchema 时返回 { success: true, errors: null }。
 */
import type { ZodError, ZodType } from 'zod'
import { validateWithZod } from './use-validate'

/**
 * useZodValidator 返回值 —— 顶层 zod 校验入口
 *
 * validateFormWithZod(): 与 el-form.validate 并行入口，未配置 zodSchema 时静默成功
 */
export interface UseZodValidatorReturn {
  /**
   * 顶层 zod 校验 —— 与 el-form.validate 并行入口
   * - 未配置 zodSchema 时静默成功（与原行为一致）
   * - 配置后跑 zod.safeParse；失败时 errors 含完整 ZodError
   */
  validateFormWithZod: () => { success: boolean; errors: ZodError | null }
}

/** 构造 zod 顶层校验器 */
export function useZodValidator(
  model: () => Record<string, unknown> | undefined,
  zodSchema: () => ZodType | undefined
): UseZodValidatorReturn {
  function validateFormWithZod(): { success: boolean; errors: ZodError | null } {
    const zs = zodSchema()
    if (!zs) return { success: true, errors: null }
    return validateWithZod(zs, model() ?? {})
  }

  return { validateFormWithZod }
}
