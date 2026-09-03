/**
 * use-dev-runtime —— XForm dev 模式运行时
 *
 * 从 use-xform-composer 抽离，仅承载 dev-only 行为：
 * - validateErrors / forbiddenErrors / showDebugBanner refs（供 XFormDebugBanner 消费）
 * - schema 校验失败时 console.error + errorBus.report
 * - 表达式含 forbidden 标识符时 console.warn + errorBus.report（降级为 warn）
 * - model 缺失时 dev warn + errorBus.report
 * - installDevDebugHook —— dev mode 挂 window.__xform_debug（setFieldError / getFieldErrors / getModel）
 *
 * prod 下所有 watch + ref 初始化均会执行但 console / errorBus 静默（依赖 showDebugBanner 门控）。
 */
import { ref, watch, type Ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import { validate } from './use-validate'
import { scanForForbidden } from './use-scan-forbidden'
import { DEFAULT_COMPONENT_MAP } from '../element-plus-adapter'
import type { UseFormErrorBusReturn } from './use-form-error-bus'
import type { FieldErrorState } from './use-form-instance'
import type { SchemaNode, XFormProps } from '../types'

export interface UseDevRuntimeDeps {
  props: XFormProps
  /** dev 模式错误总线（来自 useFormErrorBus） */
  errorBus: UseFormErrorBusReturn
  /** setFieldError 来自 useFormInstance —— debug hook 暴露给 dev console */
  setFieldError: (name: string, message: string) => void
  /** fieldErrors ref —— debug hook 暴露给 dev console */
  fieldErrors: Ref<Record<string, FieldErrorState>>
}

export interface UseDevRuntimeReturn {
  /** schema 静态校验错误（仅 dev 显示在 XFormDebugBanner） */
  validateErrors: Ref<Array<{ keyPath: (string | number)[]; message: string }>>
  /** 表达式沙箱黑名单命中（仅 dev） */
  forbiddenErrors: Ref<string[]>
  /** 是否显示 debug banner（dev = true，prod = false） */
  showDebugBanner: Ref<boolean>
  /** XForm setup 末尾调一次挂 window.__xform_debug（dev only） */
  installDevDebugHook: () => void
}

/**
 * dev 模式运行时：扫描 + 校验 + debug hook + model 缺失 warn
 *
 * prod 下所有 watch + ref 初始化均会执行但 console / errorBus 静默（依赖 showDebugBanner 门控）
 */
export function useDevRuntime(deps: UseDevRuntimeDeps): UseDevRuntimeReturn {
  const { props, errorBus, setFieldError, fieldErrors } = deps

  const validateErrors = ref<Array<{ keyPath: (string | number)[]; message: string }>>([])
  const forbiddenErrors = ref<string[]>([])
  const showDebugBanner = ref(import.meta.env.DEV)

  // 阶段 1.2：model 缺时 dev mode 警告（提醒用户补传 reactive model）
  // 仅 DEV 触发，prod tree-shake 后零运行时开销
  if (import.meta.env.DEV && props.model === undefined) {
    console.warn(
      '[XForm] model prop 未传入。校验、默认值填充、reaction、dirty 追踪均不会生效。' +
        '请传入 reactive() 包装的对象：const form = reactive({...})'
    )
    errorBus.report({
      severity: 'warn',
      code: 'FORM_INSTANCE_NOT_READY',
      message: 'model prop 未传入，校验/默认值填充/reaction/dirty 追踪均不会生效',
      source: 'useDevRuntime',
    })
  }

  if (showDebugBanner.value) {
    watch(
      () => props.schema,
      (val) => {
        const normalized: SchemaNode = Array.isArray(val) ? ({ children: val } as SchemaNode) : val
        // 阶段 1.3：组件名校验 —— 短名 + ElXxx 全名 + userComponents 三类必须命中其一
        const { isValid, errors } = validate(normalized, {
          knownComponents: {
            builtin: new Set(Object.keys(DEFAULT_COMPONENT_MAP)),
            user: new Set(Object.keys(props.components ?? {})),
          },
        })
        validateErrors.value = isValid ? [] : errors
        if (!isValid) {
          console.error('[XForm] schema validation failed:', errors)
          // OPT-7：升级为 user-facing 反馈（dev 弹 OSD）
          errorBus.report({
            severity: 'error',
            code: 'SCHEMA_VALIDATE_FAILED',
            message: `Schema 校验失败 ${errors.length} 项（详见 Debug Banner）`,
            source: 'useDevRuntime',
          })
        }
        const forbidden = scanForForbidden(normalized)
        forbiddenErrors.value = forbidden
        if (forbidden.length > 0) {
          // 降级为 warn：scanForForbidden 是 dev 诊断辅助，重复 0/低危标识符触发的 console.error 噪声大于收益
          // 真实危险（window/document/fetch 等）仍由 Debug Banner + errorBus 上报，不静默
          console.warn('[XForm][SECURITY] forbidden identifiers in expressions:', forbidden)
          errorBus.report({
            severity: 'error',
            code: 'FORBIDDEN_IDENTIFIER',
            message: `检测到危险标识符 ${forbidden.length} 个（详见 Debug Banner）`,
            source: 'useDevRuntime',
          })
        }
      },
      { immediate: true, deep: true }
    )
  }

  function installDevDebugHook(): void {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __xform_debug?: unknown }).__xform_debug = {
      setFieldError: (name: string, message: string) => setFieldError(name, message),
      getFieldErrors: () => JSON.parse(JSON.stringify(fieldErrors.value)),
      getModel: () => JSON.parse(JSON.stringify(props.model)),
    }
  }

  return {
    validateErrors,
    forbiddenErrors,
    showDebugBanner,
    installDevDebugHook,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 类型重导出 —— 防止调用方 import 多路径
// ────────────────────────────────────────────────────────────────────────────
export type { ComponentPublicInstance }
