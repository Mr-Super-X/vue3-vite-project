/**
 * useExpressionFunctions —— 表达式沙箱白名单函数表生命周期管理
 *
 * 从 use-xform-composer 抽离，~30 行独立可复用单元。
 *
 * 职责：
 * - watch props.expressionFunctions → 写入模块级 setExpressionFunctions 状态
 * - scope 销毁时清理 setExpressionFunctions(undefined) —— 避免跨实例污染
 *
 * 不变量：
 * - 表达式沙箱白名单是模块级全局状态，多 XForm 实例共享同一份注册表
 * - 每个实例 scope 销毁必须清理，否则下一个 mount 的实例会"继承"上次的白名单
 * - immediate: true 保证 setup 期同步注册一次（首屏 {{ fn }} 表达式可用）
 *
 * @see ./use-expression.ts setExpressionFunctions —— 模块级注册 API
 * @see ../types/xform.ts XFormProps.expressionFunctions —— 业务入参契约
 */
import { onScopeDispose, watch } from 'vue'

import { setExpressionFunctions } from './use-expression'

/**
 * useExpressionFunctions 入参 —— 业务侧的函数表（getter 形式保证运行时变更可被追踪）
 */
export interface UseExpressionFunctionsDeps {
  /** getter 形式：props.expressionFunctions 可能在运行时改变（demo 模式切换等） */
  expressionFunctions: () => Record<string, (...args: never[]) => unknown> | undefined
}

/**
 * useExpressionFunctions —— 注册白名单 + scope 清理
 *
 * 用法（XForm 顶层 setup）：
 * ```ts
 * useExpressionFunctions({ expressionFunctions: () => props.expressionFunctions })
 * ```
 *
 * 不返回值（注册是副作用）。
 */
export function useExpressionFunctions(deps: UseExpressionFunctionsDeps): void {
  watch(
    () => deps.expressionFunctions(),
    (fns) => setExpressionFunctions(fns as never),
    { immediate: true }
  )
  onScopeDispose(() => setExpressionFunctions(undefined))
}
