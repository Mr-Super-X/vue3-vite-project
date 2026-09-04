/**
 * useExpressionFunctions —— 表达式沙箱白名单函数表生命周期管理
 *
 * watch props.expressionFunctions → 写入模块级 setExpressionFunctions；scope 销毁时清理避免跨实例污染。
 * immediate: true 保证 setup 期同步注册一次（首屏 {{ fn }} 表达式可用）。
 *
 * @see ./use-expression.ts setExpressionFunctions —— 模块级注册 API
 * @see ../types/xform.ts XFormProps.expressionFunctions —— 业务入参契约
 */
import { onScopeDispose, watch } from 'vue'

import { setExpressionFunctions } from './use-expression'

/** useExpressionFunctions 入参 */
export interface UseExpressionFunctionsDeps {
  /** getter 形式：props.expressionFunctions 可能在运行时改变（demo 模式切换等） */
  expressionFunctions: () => Record<string, (...args: never[]) => unknown> | undefined
}

/**
 * 注册白名单 + scope 清理（副作用函数，不返回值）
 *
 * 用法：useExpressionFunctions({ expressionFunctions: () => props.expressionFunctions })
 */
export function useExpressionFunctions(deps: UseExpressionFunctionsDeps): void {
  watch(
    () => deps.expressionFunctions(),
    (fns) => setExpressionFunctions(fns as never),
    { immediate: true }
  )
  onScopeDispose(() => setExpressionFunctions(undefined))
}
