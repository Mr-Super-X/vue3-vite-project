/**
 * useTopLevelFields —— XForm 顶层 schema 自描述字段集合
 *
 * 把 XForm.vue 中 11 个高度相似的 topLevelXxx computed 抽离到独立 composable。
 * 这些 computed 都从 schema 顶层字段读取（如 s.disabled / s.readonly / s.column / s.labelPosition 等），
 * 函数/字符串值通过 resolveFunctionExpression 求值。
 *
 * 顶层 schema 字段为 el-form 实例级属性（labelPosition / disabled / labelWidth / scrollToError /
 * scrollIntoViewOptions），必须从 schema 派生而非 XForm props 配置。
 */
import { computed, type ComputedRef } from 'vue'
import type { SchemaNode, RowConfig } from '../types'

/**
 * 字段错误状态（来自 use-form-instance.ts 的 FieldErrorState）
 * 这里只关心 keys 长度，不读内部结构 —— 用 Record<string, unknown> 避免循环依赖
 */
export type TopLevelFieldErrors = Record<string, unknown>

export interface UseTopLevelFieldsDeps {
  /** schema 响应式视图（来自 useSchemaRenderer） */
  reactiveSchema: { value: SchemaNode | SchemaNode[] | string | undefined }
  /** 表单数据 */
  model: { value: Record<string, unknown> | undefined }
  /** 当前断点（xs/sm/md/lg/xl）—— row.responsive 拍平用 */
  currentBreakpoint: { value: string }
  /** 字段错误状态 ref —— topLevelNodes 读取 keys 长度建立响应式依赖 */
  fieldErrors: { value: TopLevelFieldErrors }
  /** 函数表达式解析器（与 use-expression.ts 的 resolveFunctionExpression 签名兼容） */
  resolveFunctionExpression: <T extends (...args: unknown[]) => unknown>(expr: string) => T | null
  /** row.responsive 拍平工具（与 render-schema-node 的 mergeRowResponsive 签名兼容） */
  mergeRowResponsive: (row: RowConfig | undefined, breakpoint: string) => RowConfig | undefined
}

export interface UseTopLevelFieldsReturn {
  /** 顶层 schema.debounceValidation → 跨字段默认 debounce ms（0 = 实时） */
  debounceValidation: ComputedRef<number>
  /** 顶层节点列表（直接派生自 reactiveSchema，含 reaction 修改后能触发重渲染） */
  nodes: ComputedRef<SchemaNode[]>
  /** 顶层 row 配置（已拍平当前断点） */
  row: ComputedRef<RowConfig | undefined>
  /** 顶层 column 数（每行栅格数） */
  column: ComputedRef<number | undefined>
  /** 自动计算的 col span（24 / column） */
  colSpan: ComputedRef<number>
  /** 顶层 disabled（支持字面量 / 函数 / 表达式） */
  disabled: ComputedRef<boolean>
  /** 顶层 readonly（同 disabled 模式） */
  readonly: ComputedRef<boolean>
  /** 顶层 labelWidth（el-form label-width） */
  labelWidth: ComputedRef<string | number>
  /** 顶层 labelPosition（el-form label-position） */
  labelPosition: ComputedRef<'left' | 'right' | 'top'>
  /** 顶层 scrollToError（校验失败自动滚动到第一个错误字段） */
  scrollToError: ComputedRef<boolean>
  /** 顶层 scrollIntoViewOptions（与 element-plus el-form 一致） */
  scrollIntoViewOptions: ComputedRef<boolean | ScrollIntoViewOptions>
}

/**
 * 共用辅助：从 reactiveSchema 安全获取「顶层节点」形态（容器或单节点）
 * 数组形态（SchemaNode[]）返回 undefined，因为所有顶层字段（disabled / readonly /
 * labelPosition 等）只在容器或单节点形态下生效
 */
function readTopLevelNode(reactiveSchema: {
  value: SchemaNode | SchemaNode[] | string | undefined
}): SchemaNode | undefined {
  const s = reactiveSchema.value
  if (Array.isArray(s)) return undefined
  if (typeof s === 'string') return undefined
  return s
}

export function useTopLevelFields(deps: UseTopLevelFieldsDeps): UseTopLevelFieldsReturn {
  const {
    reactiveSchema,
    model,
    currentBreakpoint,
    fieldErrors,
    resolveFunctionExpression,
    mergeRowResponsive,
  } = deps

  /**
   * 顶层节点列表（直接从 reactiveSchema 派生，含 reaction 修改后能触发重渲染）
   * 读 fieldErrors.value 建立响应式依赖 —— 否则 setFieldError 写 fieldErrors 后
   * computed 命中缓存，模板不重渲染
   */
  const nodes = computed<SchemaNode[]>(() => {
    void Object.keys(fieldErrors.value).length
    const s = reactiveSchema.value
    if (Array.isArray(s)) return s as SchemaNode[]
    if (typeof s === 'string') return []
    // s 此时已 narrow 为 SchemaNode | undefined；undefined 时返回空数组兜底
    if (s === undefined) return []
    if (s.children !== undefined)
      return (Array.isArray(s.children) ? s.children : [s.children]) as SchemaNode[]
    return [s]
  })

  const row = computed<RowConfig | undefined>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s || s.children === undefined) return undefined
    // 阶段 2.4：row.responsive 拍平 —— 当前断点的 gutter/type/align/justify 覆盖基础配置
    // mergeRowResponsive 第二参数签名是 specific union，currentBreakpoint.value 是 string —— cast
    return mergeRowResponsive(s.row, currentBreakpoint.value as 'xs' | 'sm' | 'md' | 'lg' | 'xl')
  })

  const column = computed(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s || s.children === undefined) return undefined
    return s.column
  })

  /** 自动计算 col span（24 / column，默认 24 = 不分列） */
  const colSpan = computed(() => (column.value ? Math.floor(24 / column.value) : 24))

  /**
   * 自描述 disabled（顶层 schema.disabled）
   * - 字面量 boolean：直接返回
   * - 函数：调用 (model) => boolean
   * - {{ }} 表达式：resolveFunctionExpression 求值
   * - undefined/null：默认 false
   */
  const disabled = computed<boolean>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s) return false
    const d = s.disabled
    if (d === undefined || d === null) return false
    if (typeof d === 'boolean') return d
    if (typeof d === 'function')
      return Boolean((d as (m: Record<string, unknown>) => unknown)(model.value ?? {}))
    if (typeof d === 'string') {
      const fn = resolveFunctionExpression<(m: unknown) => unknown>(d)
      return fn ? Boolean(fn(model.value ?? {})) : false
    }
    return false
  })

  /** 自描述 readonly（同 disabled 模式） */
  const readonly = computed<boolean>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s) return false
    const d = s.readonly
    if (d === undefined || d === null) return false
    if (typeof d === 'boolean') return d
    if (typeof d === 'function')
      return Boolean((d as (m: Record<string, unknown>) => unknown)(model.value ?? {}))
    if (typeof d === 'string') {
      const fn = resolveFunctionExpression<(m: unknown) => unknown>(d)
      return fn ? Boolean(fn(model.value ?? {})) : false
    }
    return false
  })

  const labelWidth = computed<string | number>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s) return ''
    return s.labelWidth ?? ''
  })

  const labelPosition = computed<'left' | 'right' | 'top'>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s || s.children === undefined) return 'left'
    return s.labelPosition ?? 'left'
  })

  const scrollToError = computed<boolean>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s) return false
    return s.scrollToError ?? false
  })

  const scrollIntoViewOptions = computed<boolean | ScrollIntoViewOptions>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s) return true
    return s.scrollIntoViewOptions ?? true
  })

  /** 顶层 schema.debounceValidation → 跨字段默认 debounce ms（0 = 实时） */
  const debounceValidation = computed<number>(() => {
    const s = readTopLevelNode(reactiveSchema)
    if (!s) return 0
    return typeof s.debounceValidation === 'number' && s.debounceValidation >= 0
      ? s.debounceValidation
      : 0
  })

  return {
    debounceValidation,
    nodes,
    row,
    column,
    colSpan,
    disabled,
    readonly,
    labelWidth,
    labelPosition,
    scrollToError,
    scrollIntoViewOptions,
  }
}
