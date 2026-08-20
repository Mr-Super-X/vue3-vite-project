import { h, resolveComponent, type VNode, type ComponentPublicInstance } from 'vue'
import {
  ElConfigProvider,
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
  ElCard,
  ElButton,
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
  /** ArrayNode 命令式操作（来自 XFormExpose） */
  arrayActions?: {
    addItem: (name: string, init?: Record<string, unknown>) => void
    removeItem: (name: string, index: number) => void
    moveItem: (name: string, from: number, to: number) => void
  }
}

/**
 * 把子 schema 的 name 路径前缀化,让 el-form 能按 list.0.qty 形式做嵌套校验
 * - 递归处理 children / formItem.slots / slots
 * - 子节点为空 / 字符串时原样返回
 */
function rewriteNamePath(
  sub: SchemaNode | SchemaNode[] | string | undefined,
  prefix: string,
  sep: string
): SchemaNode | SchemaNode[] | string | undefined {
  if (sub === undefined || sub === null) return sub
  if (typeof sub === 'string') return sub
  if (Array.isArray(sub)) {
    return sub.map((s) => rewriteNamePath(s, prefix, sep) as SchemaNode)
  }
  const cloned: SchemaNode = { ...sub }
  if (cloned.name) cloned.name = `${prefix}${sep}${cloned.name}`
  if (cloned.children !== undefined) {
    cloned.children = rewriteNamePath(cloned.children, prefix, sep) as never
  }
  if (cloned.slots) {
    const newSlots: Record<string, SchemaNode | SchemaNode[] | string | undefined> = {}
    for (const [k, v] of Object.entries(cloned.slots)) {
      if (v && typeof v === 'object') {
        newSlots[k] = rewriteNamePath(v, prefix, sep) as never
      } else {
        newSlots[k] = v
      }
    }
    cloned.slots = newSlots
  }
  if (cloned.formItem && typeof cloned.formItem === 'object' && cloned.formItem.slots) {
    const newFormItemSlots: Record<string, SchemaNode | SchemaNode[] | string | undefined> = {}
    for (const [k, v] of Object.entries(cloned.formItem.slots)) {
      if (v && typeof v === 'object') {
        newFormItemSlots[k] = rewriteNamePath(v, prefix, sep) as never
      } else {
        newFormItemSlots[k] = v
      }
    }
    cloned.formItem = { ...cloned.formItem, slots: newFormItemSlots }
  }
  return cloned
}

/**
 * 渲染数组节点(kind === 'array')
 * - 外层 ElCard + 标题 + 添加按钮(顶部)
 * - 每行 ElFormItem(继承父数组节点的 label) + itemSchema 渲染 + 行尾按钮(上移/下移/删除)
 * - min/max 边界禁用对应按钮
 */
function renderArrayNode(node: SchemaNode, opts: RenderSchemaNodeOptions): VNode | undefined {
  if (!node.array) return undefined
  const listName = node.name
  if (!listName) return undefined
  const cfg = node.array
  // el-form prop 路径必须用 items[0].qty 语法(方括号包裹数字索引),不能用 items.0.qty
  // 数组索引固定为 [i] 语法不可配置;对象内部嵌套仍用 '.' 分隔
  const sep = '.'
  const showActions = cfg.showActions ?? true
  const showAdd = typeof showActions === 'object' ? showActions.add !== false : showActions
  const showRemove = typeof showActions === 'object' ? showActions.remove !== false : showActions
  const showMove = typeof showActions === 'object' ? showActions.move !== false : showActions
  const labelAdd = cfg.labels?.add ?? '添加'
  const labelRemove = cfg.labels?.remove ?? '删除'
  const labelUp = cfg.labels?.moveUp ?? '上移'
  const labelDown = cfg.labels?.moveDown ?? '下移'

  const listRaw = opts.model?.[listName]
  const list: unknown[] = Array.isArray(listRaw) ? listRaw : []
  const min = cfg.minItems ?? 0
  const max = cfg.maxItems ?? Infinity

  const renderRow = (row: unknown, index: number): VNode => {
    // 行容器:每个数组元素克隆 itemSchema 并把 name 路径前缀化为 items[i].subName
    // 注意数组索引必须用 [i] 语法（el-form prop 路径要求），不能写 items.i.qty
    const rewritten = rewriteNamePath(cfg.itemSchema, `${listName}[${index}]`, sep)
    const inner = rewritten ? opts.render(rewritten as SchemaNode) : undefined
    return h(
      'div',
      {
        key: `array-${listName}-${index}`,
        class: `${node.component?.toLowerCase() ?? 'array-node'}__row`,
      } as never,
      {
        default: () => [
          h('div', { class: 'array-node__row-body' } as never, {
            default: () => (inner && !Array.isArray(inner) ? [inner] : (inner as never)),
          }) as VNode,
          h('div', { class: 'array-node__row-actions' } as never, {
            default: () =>
              [
                showMove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      disabled: index === 0,
                      onClick: () => opts.arrayActions?.moveItem(listName, index, index - 1),
                    } as never,
                    { default: () => labelUp }
                  ),
                showMove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      disabled: index >= list.length - 1,
                      onClick: () => opts.arrayActions?.moveItem(listName, index, index + 1),
                    } as never,
                    { default: () => labelDown }
                  ),
                showRemove &&
                  h(
                    ElButton as never,
                    {
                      size: 'small',
                      type: 'danger',
                      disabled: list.length <= min,
                      onClick: () => opts.arrayActions?.removeItem(listName, index),
                    } as never,
                    { default: () => labelRemove }
                  ),
              ].filter(Boolean) as never,
          }) as VNode,
        ],
      }
    ) as VNode
  }

  return h(
    ElCard as never,
    {
      shadow: 'never',
      class: 'array-node',
      ...(node.props ?? {}),
    } as never,
    {
      default: () => [
        h('div', { class: 'array-node__header' } as never, {
          default: () =>
            [
              h('span', { class: 'array-node__title' } as never, {
                default: () => cfg.title ?? node.label ?? listName,
              }) as VNode,
              showAdd &&
                h(
                  ElButton as never,
                  {
                    type: 'primary',
                    size: 'small',
                    disabled: list.length >= max,
                    onClick: () => opts.arrayActions?.addItem(listName),
                  } as never,
                  { default: () => labelAdd }
                ),
            ].filter(Boolean) as never,
        }) as VNode,
        h('div', { class: 'array-node__body' } as never, {
          default: () =>
            list.length === 0
              ? [
                  h('div', { class: 'array-node__empty' } as never, {
                    default: () => '暂无数据,点击右上角「添加」按钮新增',
                  }) as VNode,
                ]
              : (list.map((row, i) => renderRow(row, i)) as never),
        }) as VNode,
      ],
    }
  ) as VNode
}

/** 渲染单个 schema 节点为 VNode：含视觉容器 / formItem / row / 默认 4 个分支 */
export function useRenderSchemaNode(opts: RenderSchemaNodeOptions) {
  function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
    // 数组节点走独立分支（不参与 formItem/row/Col 默认分支）
    if (node.kind === 'array') {
      return renderArrayNode(node, opts)
    }
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
