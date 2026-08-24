/**
 * Schema 节点渲染调度器 —— 阶段 1.4 拆分后主文件
 *
 * 职责：保留 col 响应式包装 + 工具函数 + 主调度入口
 * 拆出去的子模块：
 * - render-array-node.ts —— 数组节点（kind === 'array'）
 * - render-visual-container.ts —— 视觉容器（Card 等带 row/column，无 name）
 * - render-form-item.ts —— formItem 包装 + row+column 布局
 *
 * 主函数 renderToComponentInner 只做 4 类分支委托，不再包含具体渲染细节。
 */
import {
  ElConfigProvider,
  ElForm,
  ElFormItem,
  ElCard,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElSwitch,
  ElDatePicker,
  ElTimePicker,
  ElTimeSelect,
  ElUpload,
  ElTransfer,
  ElTreeSelect,
  ElAutocomplete,
  ElRadioGroup,
  ElRadio,
  ElCheckboxGroup,
  ElCheckbox,
  ElCascader,
  ElInputNumber,
  ElSlider,
} from 'element-plus'
import { resolveComponent, h, type VNode, type ComponentPublicInstance, type Ref } from 'vue'
import type { SchemaNode, XFormProps, ColConfig, SchemaSlot } from '../types'
import { buildVModelBindings } from './build-vmodel-bindings'
import { buildOnBindings } from './build-on-bindings'
import { buildAutocompleteFetcher } from './use-async-options'
import { renderArrayNode } from './render-array-node'
import { renderVisualContainer } from './render-visual-container'
import { renderWithFormItem, renderWithRowColumn } from './render-form-item'

type RenderFn = (
  node: SchemaNode | SchemaNode[] | string | undefined | null
) => VNode | string | VNode[] | undefined
type RuleArr = Array<Record<string, unknown>>

const EL_COMPONENT_MAP: Record<string, unknown> = {
  Input: ElInput,
  Select: ElSelect,
  Option: ElOption,
  Switch: ElSwitch,
  DatePicker: ElDatePicker,
  TimePicker: ElTimePicker,
  TimeSelect: ElTimeSelect,
  Upload: ElUpload,
  Transfer: ElTransfer,
  TreeSelect: ElTreeSelect,
  Autocomplete: ElAutocomplete,
  Button: ElButton,
  RadioGroup: ElRadioGroup,
  Radio: ElRadio,
  CheckboxGroup: ElCheckboxGroup,
  Checkbox: ElCheckbox,
  Cascader: ElCascader,
  InputNumber: ElInputNumber,
  Slider: ElSlider,
  Card: ElCard,
  FormItem: ElFormItem,
  Form: ElForm,
}

export function resolveComponentFor(
  name: string | undefined,
  userComponents?: Record<string, unknown>
): unknown {
  if (!name) return null
  if (userComponents && name in userComponents) return userComponents[name]
  if (name in EL_COMPONENT_MAP) return EL_COMPONENT_MAP[name] ?? null
  if (name.startsWith('El') && name.length > 2) {
    const short = name[2]!.toUpperCase() + name.slice(3)
    if (short in EL_COMPONENT_MAP) return EL_COMPONENT_MAP[short] ?? null
  }
  if (name.startsWith('El')) {
    try {
      const r = resolveComponent(name)
      if (typeof r !== 'string') return r
    } catch {
      /* fallthrough */
    }
  }
  return null
}

export function compileRules(rules: SchemaNode['rules'], propsRules: XFormProps['rules']): RuleArr {
  if (!rules) return []
  return (Array.isArray(rules) ? rules : [rules])
    .map((r) =>
      typeof r === 'string'
        ? (propsRules?.[r] ?? { required: true })
        : (r as Record<string, unknown>)
    )
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
}

export function wrapWithElCol(
  node: SchemaNode,
  inner: VNode,
  currentBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): VNode {
  if (node.col === false) return inner
  if (node.col === undefined) return inner
  const colObj = typeof node.col === 'object' ? node.col : null
  const baseConfig = colObj?.responsive
    ? pickBreakpointConfig(colObj.responsive, currentBreakpoint)
    : null
  const span = baseConfig?.span ?? colObj?.span ?? 24
  const offset = baseConfig?.offset ?? colObj?.offset
  return h(
    ElFormItem as never,
    {
      span,
      offset,
      ...(colObj?.responsive ? { responsive: colObj.responsive } : {}),
    } as never,
    { default: () => inner }
  ) as VNode
}

export function pickBreakpointConfig(
  responsive: NonNullable<ColConfig['responsive']>,
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): { span?: number; offset?: number; push?: number; pull?: number } | undefined {
  const order: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl']
  const currentIdx = current ? order.indexOf(current) : -1
  for (let i = currentIdx; i >= 0; i--) {
    if (responsive[order[i]!]) return responsive[order[i]!]
  }
  for (const k of order) {
    if (responsive[k]) return responsive[k]
  }
  return undefined
}

export function mergeColResponsive(
  col: SchemaNode['col'],
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): SchemaNode['col'] {
  if (col === undefined || col === false) return col
  if (typeof col !== 'object') return col
  const responsive = col.responsive
  if (!responsive) return col
  const picked = pickBreakpointConfig(responsive, current)
  if (!picked) return col
  const merged: ColConfig = { ...col }
  if (picked.span !== undefined) merged.span = picked.span
  else if (merged.span === undefined) delete merged.span
  if (picked.offset !== undefined) merged.offset = picked.offset
  if (picked.push !== undefined) merged.push = picked.push
  if (picked.pull !== undefined) merged.pull = picked.pull
  delete (merged as { responsive?: unknown }).responsive
  return merged
}

export function renderChildren(
  children: SchemaNode['children'],
  render: RenderFn
): VNode | string | VNode[] | undefined {
  if (children === undefined) return undefined
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(render) as VNode[]
  return render(children)
}

export function buildSlotFn(value: SchemaSlot, render: RenderFn): (scope?: unknown) => unknown {
  if (typeof value === 'function') {
    return (scope?: unknown) => value(scope as Record<string, unknown>)
  }
  return () => render(value as never)
}

export interface RenderSchemaNodeOptions {
  model: XFormProps['model']
  components: XFormProps['components']
  beforeChange: XFormProps['beforeChange']
  rules: XFormProps['rules']
  componentProps?: XFormProps['componentProps']
  render: RenderFn
  /** ArrayNode 命令式操作（来自 XFormExpose） */
  arrayActions?: {
    addItem: (name: string, init?: Record<string, unknown>) => void
    removeItem: (name: string, index: number) => void
    moveItem: (name: string, from: number, to: number) => void
  }
  /** 字段事件触发跨字段校验 */
  triggerCrossFieldValidator?: (
    node: SchemaNode,
    eventType: 'blur' | 'change'
  ) => Promise<void> | void
  /** v-model 值写入后主动触发 */
  onValueChange?: (node: SchemaNode, newValue: unknown) => void
  /** 当前响应式断点 */
  currentBreakpoint?: Ref<'xs' | 'sm' | 'md' | 'lg' | 'xl'>
}

/** 取节点对应组件的默认 props；仅对 string component 生效 */
export function getComponentDefaultProps(
  node: SchemaNode,
  componentProps?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  if (typeof node.component !== 'string') return {}
  return componentProps?.[node.component] ?? {}
}

/** 构造 Autocomplete 异步选项所需的 props */
export function buildAsyncProps(node: SchemaNode): Record<string, unknown> {
  if (!node.asyncOptions) return {}
  const name = typeof node.component === 'string' ? node.component : null
  if (name !== 'Autocomplete' && name !== 'ElAutocomplete') return {}
  return {
    fetchSuggestions: buildAutocompleteFetcher(node.asyncOptions),
  }
}

/** 主调度入口 —— 4 类分支委托给子模块 */
export function useRenderSchemaNode(opts: RenderSchemaNodeOptions) {
  function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
    // 1) 数组节点独立分支
    if (node.kind === 'array') {
      return renderArrayNode(node, opts)
    }
    const Comp =
      typeof node.component === 'string'
        ? resolveComponentFor(node.component, opts.components)
        : node.component
    const eventBindings = {
      ...buildVModelBindings(node, opts.model, opts.beforeChange, opts.onValueChange),
      ...buildOnBindings(node, opts.model),
    }
    const asyncProps = buildAsyncProps(node)
    // 2) 视觉容器（Card 等带 row/column，无 name）
    if (Comp && (node.slots || node.children !== undefined) && !node.name) {
      return renderVisualContainer(node, Comp as object, opts, asyncProps)
    }
    // 3) FormItem 包装（含 name 或 formItem: true）
    const wrapWithFormItem =
      (node.name !== undefined && node.formItem !== false) || node.formItem === true
    if (wrapWithFormItem) {
      const result = renderWithFormItem(node, Comp as object, opts)
      if (result) return result
    }
    // 4) 纯 row+column 布局（无 formItem）
    if (node.row || node.column !== undefined) {
      return renderWithRowColumn(node, opts)
    }
    // 5) 默认分支：直接渲染 Comp
    if (!Comp) return undefined
    return wrapWithElCol(
      node,
      h(
        Comp as never,
        {
          ...eventBindings,
          ...getComponentDefaultProps(node, opts.componentProps),
          ...node.props,
          ...asyncProps,
          ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
          ...(node.key !== undefined && { key: node.key }),
        } as never,
        { default: () => renderChildren(node.children, opts.render) as never }
      ) as VNode,
      opts.currentBreakpoint?.value
    )
  }
  return renderToComponentInner
}

// 抑制未使用导入告警：ElConfigProvider/ElForm 是 XForm.vue 模板中用到的
void [ElConfigProvider, ElForm]
export type { ComponentPublicInstance }
