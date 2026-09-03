/**
 * useSetFieldError —— setFieldError 双路径机制
 *
 * 从 use-form-instance 抽离，~140 行独立可复用单元。
 *
 * 双路径（OPT-7 衍生约束）：
 * - 路径 A：element-plus 官方 props 路径 —— externalErrors ref 写入 → renderWithFormItem
 *   通过 props.error/validateStatus 透传给 el-form-item → 触发红字
 *   失败场景：el-form.validateField / validate 内部 setValidationState('success')
 *   覆盖 path A 写入的 error 状态；或 error 字符串未变化时 props watch 不触发
 * - 路径 B：watch 守护 —— 监听 externalErrors 变化，强制把 el-form-item 内部
 *   validateState/validateMessage ref 同步成 externalErrors 的当前值
 *   覆盖 el-form 自身 validate-success 回调，确保红字状态不被复位
 *
 * OSD 上报（OPT-7）：
 * - realtime 路径（crossValidator 反向触发 / 服务端 422）默认上报 toast
 * - validateForm 批量场景由 applyCrossErrors 发汇总 toast，setFieldError 用
 *   silent=true 避免 N 条独立 toast 弹出
 */

import { getCurrentScope, onScopeDispose, toRaw, watch, type Ref } from 'vue'

import type { UseFormErrorBusReturn } from './use-form-error-bus'

/** 字段错误状态（与 use-form-instance 同步导出，保持向后兼容） */
export type FieldErrorState = {
  error: string
  validateStatus: '' | 'validating' | 'success' | 'error'
}

/**
 * el-form fields 数组元素的运行时结构（element-plus 2.x 通过 defineExpose 暴露）
 * prop / propString / validateState / validateMessage 都是 ref-like（ref 或 computed）
 */
interface ElFormFieldRaw {
  prop?: string | { value?: string }
  propString?: string | { value?: string }
  validateState?: { value?: string }
  validateMessage?: { value?: string }
}

/** 解包 ref-like 字符串字段 */
function readRefStr(v: ElFormFieldRaw['propString']): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string') return v
  if (typeof v === 'object' && 'value' in v) {
    const x = v.value
    return typeof x === 'string' ? x : undefined
  }
  return undefined
}

/** 取 el-form 内部 fields 数组（懒读取，避免 setup 期间 ref 为空时崩溃） */
type FieldsGetter = () => ElFormFieldRaw[] | undefined

/**
 * useSetFieldError 入参 —— setFieldError 双路径机制依赖
 *
 * - externalErrors: 阶段 3.1 外部字段错误 ref（XForm.vue 创建并传入）
 * - getFields: 懒读取 el-form fields 数组（elFormRef.value?.fields）
 * - errorBus: 显式 deps 传入（避免 provide/inject 在嵌套 composable 中失效）
 */
export interface UseSetFieldErrorOptions {
  /** 阶段 3.1：外部字段错误状态 ref（XForm.vue 创建并传入） */
  externalErrors: Ref<Record<string, FieldErrorState>>
  /** 懒读取 el-form fields 数组（elFormRef.value?.fields） */
  getFields: FieldsGetter
  /** OPT-7：错误事件总线 —— 显式 deps 传入 */
  errorBus?: UseFormErrorBusReturn
}

/**
 * useSetFieldError 返回值 —— 双路径 setFieldError 函数
 */
export interface UseSetFieldErrorReturn {
  /**
   * 设置字段错误状态
   * @param name 字段名
   * @param message 错误信息（空字符串表示清除）
   * @param state 校验状态
   * @param silent true 跳过 OSD 上报（用于 applyCrossErrors 批量汇总场景）
   */
  setFieldError(
    name: string,
    message: string,
    state?: '' | 'validating' | 'success' | 'error',
    silent?: boolean
  ): void
}

/**
 * 初始化 setFieldError 双路径 + watch 守护
 * 在 setup 期间调用一次，返回的 setFieldError 直接传给上层
 */
export function useSetFieldError(opts: UseSetFieldErrorOptions): UseSetFieldErrorReturn {
  const { externalErrors, getFields, errorBus } = opts

  function setFieldError(
    name: string,
    message: string,
    state: '' | 'validating' | 'success' | 'error' = 'error',
    /** 静默标志：true 时不触发 OSD 上报（applyCrossErrors 批量汇总场景） */
    silent?: boolean
  ): void {
    // 路径 A：element-plus 官方 props 路径
    if (state === 'error' && message) {
      externalErrors.value[name] = { error: message, validateStatus: state }
      // OPT-7：realtime 路径触发 OSD；validateForm 批量场景传 silent=true 跳过
      // OPT-C：setFieldError 是单字段错误的通用入口（realtime cross / 服务端 422 都可能调用），
      // 用通用 FIELD_ERROR code；区分来源由调用方的 source 字段标识
      if (!silent) {
        errorBus?.report({
          severity: 'error',
          code: 'FIELD_ERROR',
          message,
          fields: [name],
          source: 'useFormInstance',
        })
      }
    } else {
      delete externalErrors.value[name]
    }
  }

  // 路径 B：watch 守护
  // 1) 订阅 externalErrors 变化（crossValidator 重算 / setFieldError 调用）
  // 2) 订阅 fields 数组变化（新字段注册），给每个新字段的 validateState/validateMessage 装 watch：
  //    当外部错误仍存在但 el-form-item 内部 validateField(success) 把状态改回 success 时，
  //    立即纠正为 error —— 这是 element-plus validateStateDebounced(100ms) 之外的同步纠正。
  //    debounced 最终会跟随 validateState 显示 error，所以红字保留。
  const watchedFields = new WeakSet<object>()
  // guardField 在 watch 回调内创建 watcher —— 脱离 setup effect scope，组件卸载后仍存活（泄漏）。
  // 收集 stop 句柄，scope 销毁时统一清理；getCurrentScope 守卫单测中无 scope 的裸调用
  const guardStops: (() => void)[] = []
  if (getCurrentScope()) {
    onScopeDispose(() => {
      for (const s of guardStops) s()
      guardStops.length = 0
    })
  }

  const guardField = (field: object): void => {
    if (watchedFields.has(field)) return
    watchedFields.add(field)
    const rawField = toRaw(field) as ElFormFieldRaw
    // 从 field 推字段名（优先 propString，没有用 prop）
    const fieldName = readRefStr(rawField.propString) || readRefStr(rawField.prop)
    if (typeof fieldName !== 'string') return
    const vs = rawField.validateState
    const vm = rawField.validateMessage
    if (vs && typeof vs === 'object' && 'value' in vs) {
      guardStops.push(
        watch(
          () => (vs as { value: string }).value,
          (newState) => {
            const err = externalErrors.value?.[fieldName]
            if (err?.error && newState !== 'error') {
              ;(vs as { value: string }).value = 'error'
              if (vm && typeof vm === 'object' && 'value' in vm) {
                ;(vm as { value: string }).value = err.error
              }
            }
          }
        )
      )
    }
  }

  watch(
    () => externalErrors.value,
    (errors) => {
      const fields = getFields()
      if (!fields) return
      for (const field of fields) {
        if (!field || typeof field !== 'object') continue
        const rawField = toRaw(field) as ElFormFieldRaw
        const fieldName = readRefStr(rawField.propString) || readRefStr(rawField.prop)
        if (typeof fieldName !== 'string') continue
        const target = errors[fieldName]
        const vs = rawField.validateState
        const vm = rawField.validateMessage
        if (target?.error) {
          if (vs && typeof vs === 'object' && 'value' in vs && vs.value !== 'error') {
            ;(vs as { value: string }).value = 'error'
          }
          if (vm && typeof vm === 'object' && 'value' in vm && vm.value !== target.error) {
            ;(vm as { value: string }).value = target.error
          }
        } else {
          if (vs && typeof vs === 'object' && 'value' in vs && vs.value === 'error') {
            ;(vs as { value: string }).value = ''
          }
          if (vm && typeof vm === 'object' && 'value' in vm && vm.value) {
            ;(vm as { value: string }).value = ''
          }
        }
        guardField(field)
      }
    },
    { deep: true, immediate: true }
  )

  // fields 数组本身可能变化（el-form-item 注册新字段）
  watch(
    () => getFields(),
    (fields) => {
      if (!fields) return
      for (const field of fields) {
        if (field && typeof field === 'object') guardField(field)
      }
    },
    { immediate: true }
  )

  return { setFieldError }
}
