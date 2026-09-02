/**
 * use-zod-validator —— zod 顶层校验编排（P1-2 重做，内部委托）
 *
 * 为什么独立成文件（保留 useFormInstance 公开签名前提下）：
 * - use-form-instance.ts 303 行主要职责是 el-form 实例 + 字段操作编排，zod 是独立的
 *   顶层 schema 校验子系统（依赖 zod 包 vs element-plus 内部 API）
 * - validateFormWithZod 通过 XFormExpose 暴露给用户，调用入口与 el-form.validate
 *   平行但不重叠（一个走 async-validator，一个走 zod.safeParse）
 * - 抽到独立单元后便于单独测试（未来补 spec），职责边界更清晰
 *
 * 重做策略（区别于首次 P1-2）：
 * - useFormInstance 内部委托本 composable → 公开签名 100% 不变（4 参数 + validateFormWithZod 返回）
 * - spec 不改、demo 不改、composer 集成不变
 *
 * 行为 100% 等价首次实现：未配置 zodSchema 时返回 { success: true, errors: null }。
 */
import type { ZodError, ZodType } from 'zod'
import { validateWithZod } from './use-validate'

export interface UseZodValidatorReturn {
  /**
   * 顶层 zod 校验 —— 与 el-form.validate 并行入口
   * - 未配置 zodSchema 时静默成功（与原行为一致）
   * - 配置后跑 zod.safeParse；失败时 errors 含完整 ZodError
   */
  validateFormWithZod: () => { success: boolean; errors: ZodError | null }
}

/**
 * 构造 zod 顶层校验器
 * @param model reactive model getter（来自 XForm.props.model）
 * @param zodSchema zod schema getter（来自 XForm.props.zodSchema）
 */
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
