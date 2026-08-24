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
import { resolvePermission, renderViewPlaceholder } from './use-field-permission'

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
  /**
   * 触发 el-form 字段内 async-validator 校验（onBlur/onChange handler 需要手动调用）
   * 为什么需要：覆盖 el-form-item 内部 emit 的 onBlur 后,el-form 不会自动跑字段内规则
   * XForm 必须**显式**调用此函数才能保证字段内 min/max/required 等规则生效
   */
  validateField?: (name: string) => Promise<void>
  /** v-model 值写入后主动触发 */
  onValueChange?: (node: SchemaNode, newValue: unknown) => void
  /** 当前响应式断点 */
  currentBreakpoint?: Ref<'xs' | 'sm' | 'md' | 'lg' | 'xl'>
  /**
   * 权限码 → 状态 映射（阶段 2.3）
   * 业务可注入 useAuth().hasPerm 实现的 resolver：
   *   'user.edit' → hasPerm('user.edit') ? 'edit' : 'hidden'
   * 默认 identity（字符串字面量直接返回）
   */
  permissionResolver?: (perm: string) => 'view' | 'edit' | 'hidden'
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
    // 阶段 2.3：权限 gate（位于最前面，所有渲染分支前）
    // - hidden:不渲染,直接返回 undefined（DOM 中不出现）
    // - view:渲染为纯文本占位,跳过 formItem 包装与校验
    // - edit:正常走原有分支
    const permission = resolvePermission(node, {
      model: () => opts.model ?? {},
      ...(opts.permissionResolver ? { permissionResolver: opts.permissionResolver } : {}),
    })
    if (permission === 'hidden') return undefined
    if (permission === 'view' && node.name) {
      // view 态:渲染 label + 纯文本占位（不包 formItem,不走校验）
      return h(
        'div',
        {
          key: `view-${node.name}`,
          class: 'x-form-view-field',
          'data-permission': 'view',
        } as never,
        {
          default: () =>
            [
              node.label
                ? h('label', { class: 'x-form-view-field__label' } as never, {
                    default: () => `${node.label}：`,
                  })
                : null,
              h('span', { class: 'x-form-view-field__value' } as never, {
                default: () => renderViewPlaceholder(node, opts.model),
              }),
            ].filter(Boolean) as never,
        }
      ) as VNode
    }

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
