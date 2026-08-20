import { h, resolveComponent, type VNode, type ComponentPublicInstance } from 'vue'
import {
  ElConfigProvider,
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
  ElCard,
  ElInput,
  ElSelect,
  ElOption,
  ElSwitch,
  ElDatePicker,
  ElRadioGroup,
  ElRadio,
  ElCheckboxGroup,
  ElCheckbox,
  ElCascader,
  ElInputNumber,
  ElSlider,
} from 'element-plus'
import type { SchemaNode, XFormProps } from '../types'
import { buildVModelBindings } from './build-vmodel-bindings'
import { buildOnBindings } from './build-on-bindings'
import { renderToComponentWithGrid } from './render-with-grid'

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

function resolveComponentFor(
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

function compileRules(rules: SchemaNode['rules'], propsRules: XFormProps['rules']): RuleArr {
  if (!rules) return []
  return (Array.isArray(rules) ? rules : [rules])
    .map((r) =>
      typeof r === 'string'
        ? (propsRules?.[r] ?? { required: true })
        : (r as Record<string, unknown>)
    )
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
}

function wrapWithElCol(node: SchemaNode, inner: VNode): VNode {
  if (node.col === false) return inner
  if (node.col === undefined) return inner
  const span = node.col && typeof node.col === 'object' ? (node.col.span ?? 24) : 24
  const offset = node.col && typeof node.col === 'object' ? node.col.offset : undefined
  return h(ElCol as never, { span, offset } as never, { default: () => inner }) as VNode
}

function renderChildren(
  children: SchemaNode['children'],
  render: RenderFn
): VNode | string | VNode[] | undefined {
  if (children === undefined) return undefined
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(render) as VNode[]
  return render(children)
}

export interface RenderSchemaNodeOptions {
  model: XFormProps['model']
  components: XFormProps['components']
  beforeChange: XFormProps['beforeChange']
  rules: XFormProps['rules']
  render: RenderFn
}

/** 渲染单个 schema 节点为 VNode：含视觉容器 / formItem / row / 默认 4 个分支 */
export function useRenderSchemaNode(opts: RenderSchemaNodeOptions) {
  function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
    const Comp = resolveComponentFor(node.component, opts.components)
    const eventBindings = {
      ...buildVModelBindings(node, opts.model, opts.beforeChange),
      ...buildOnBindings(node, opts.model),
    }
    // 视觉容器（Card 等）
    if (Comp && (node.slots || node.children !== undefined) && !node.name) {
      const slotMap: Record<string, () => unknown> = {}
      if (node.slots)
        for (const [k, v] of Object.entries(node.slots)) slotMap[k] = () => opts.render(v as never)
      const useGrid = !!(node.row || node.column !== undefined)
      slotMap.default = useGrid
        ? () => renderToComponentWithGrid(node, opts.render)
        : () => opts.render(node.children as never) as never
      return h(
        Comp as never,
        { ...node.props, ...(node.key !== undefined && { key: node.key }) } as never,
        slotMap
      ) as never
    }
    const wrapWithFormItem =
      (node.name !== undefined && node.formItem !== false) || node.formItem === true
    if (wrapWithFormItem) {
      const fi = typeof node.formItem === 'object' ? node.formItem : null
      const FormItemComp = fi?.component
        ? (resolveComponentFor(fi.component, opts.components) ?? ElFormItem)
        : ElFormItem
      const fiProps = fi?.props ?? {}
      return h(
        FormItemComp as never,
        {
          label: node.label,
          prop: node.name,
          rules: compileRules(node.rules, opts.rules) as never,
          ...fiProps,
          ...(node.name || node.key ? { key: `fi-${node.name ?? node.key}` } : {}),
        } as never,
        Comp
          ? {
              default: () => {
                const inner = h(
                  Comp as never,
                  {
                    ...eventBindings,
                    ...node.props,
                    ...(node.key !== undefined && { key: node.key }),
                  } as never,
                  { default: () => renderChildren(node.children, opts.render) as never }
                )
                return wrapWithElCol(node, inner)
              },
            }
          : undefined
      ) as never
    }
    if (node.row || node.column !== undefined) {
      const colSpan =
        node.col && typeof node.col === 'object'
          ? (node.col.span ?? 24)
          : node.column
            ? Math.floor(24 / node.column)
            : 24
      return h(
        ElRow as never,
        { ...node.row, ...(node.key !== undefined && { key: node.key }) } as never,
        {
          default: () =>
            h(
              ElCol as never,
              { span: colSpan, ...(node.key !== undefined && { key: node.key }) } as never,
              {
                default: () => opts.render(node.children as never),
              }
            ),
        }
      ) as never
    }
    if (!Comp) return undefined
    return wrapWithElCol(
      node,
      h(
        Comp as never,
        {
          ...eventBindings,
          ...node.props,
          ...(node.key !== undefined && { key: node.key }),
        } as never,
        { default: () => renderChildren(node.children, opts.render) as never }
      ) as VNode
    )
  }
  return renderToComponentInner
}

// 抑制未使用导入告警：ElConfigProvider/ElForm 是 XForm.vue 模板中用到的
void [ElConfigProvider, ElForm]
export type { ComponentPublicInstance }
