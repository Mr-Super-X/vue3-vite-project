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
import type { SchemaNode, XFormProps, ColConfig } from '../types'
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
  TimePicker: ElTimePicker,
  TimeSelect: ElTimeSelect,
  Upload: ElUpload,
  Transfer: ElTransfer,
  TreeSelect: ElTreeSelect,
  Autocomplete: ElAutocomplete,
  Button: ElButton,
  Icon: ElIcon,
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

function wrapWithElCol(
  node: SchemaNode,
  inner: VNode,
  currentBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): VNode {
  if (node.col === false) return inner
  if (node.col === undefined) return inner
  // 响应式断点拍平:从 col.responsive[breakpoint] 取实际 span/offset
  // 当前断点的具体配置优先;未匹配时回退到响应式对象第一个非 undefined 断点
  const colObj = typeof node.col === 'object' ? node.col : null
  const baseConfig = colObj?.responsive
    ? pickBreakpointConfig(colObj.responsive, currentBreakpoint)
    : null
  const span = baseConfig?.span ?? colObj?.span ?? 24
  const offset = baseConfig?.offset ?? colObj?.offset
  return h(
    ElCol as never,
    {
      span,
      offset,
      // 始终保留 responsive 字段(若有)—— 调试或运行时切换保留
      ...(colObj?.responsive ? { responsive: colObj.responsive } : {}),
    } as never,
    { default: () => inner }
  ) as VNode
}

/**
 * 根据当前断点从响应式配置中选具体 ColConfig
 * 优先级:xs < sm < md < lg < xl —— 当前断点优先,否则回退到较小断点
 */
function pickBreakpointConfig(
  responsive: NonNullable<ColConfig['responsive']>,
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): { span?: number; offset?: number; push?: number; pull?: number } | undefined {
  const order: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl']
  const currentIdx = current ? order.indexOf(current) : -1
  // 优先当前断点,回退到较小断点
  for (let i = currentIdx; i >= 0; i--) {
    if (responsive[order[i]!]) return responsive[order[i]!]
  }
  // 当前断点之前都没有,取第一个非 undefined
  for (const k of order) {
    if (responsive[k]) return responsive[k]
  }
  return undefined
}

/**
 * 合并 col + 响应式:返回拍平后的 ColConfig(纯 ColConfig,不含 responsive)
 * 用于数组行透传(数组行不再透传 responsive,直接透传已选定的 span/offset)
 */
function mergeColResponsive(
  col: SchemaNode['col'],
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): SchemaNode['col'] {
  if (col === undefined || col === false) return col
  if (typeof col !== 'object') return col
  const responsive = col.responsive
  if (!responsive) return col
  const picked = pickBreakpointConfig(responsive, current)
  if (!picked) return col
  // exactOptionalPropertyTypes:true 不允许 undefined 字段 —— 显式用 Object.assign 构建
  const merged: ColConfig = { ...col }
  if (picked.span !== undefined) merged.span = picked.span
  else if (merged.span === undefined) delete merged.span
  if (picked.offset !== undefined) merged.offset = picked.offset
  if (picked.push !== undefined) merged.push = picked.push
  if (picked.pull !== undefined) merged.pull = picked.pull
  delete (merged as { responsive?: unknown }).responsive
  return merged
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
  componentProps?: XFormProps['componentProps']
  render: RenderFn
  /** ArrayNode 命令式操作（来自 XFormExpose） */
  arrayActions?: {
    addItem: (name: string, init?: Record<string, unknown>) => void
    removeItem: (name: string, index: number) => void
    moveItem: (name: string, from: number, to: number) => void
  }
  /** 字段事件触发跨字段校验(node + 事件类型) */
  triggerCrossFieldValidator?: (
    node: SchemaNode,
    eventType: 'blur' | 'change'
  ) => Promise<void> | void
  /** v-model 值写入后主动触发(node + 新值)—— 用于跨字段校验,绕过 watch 不可靠问题 */
  onValueChange?: (node: SchemaNode, newValue: unknown) => void
  /**
   * 当前响应式断点(xs/sm/md/lg/xl),由 XForm.vue 注入 useCurrentBreakpoint()
   * render-schema-node 根据当前断点拍平 col.responsive / row.responsive 的字段
   * 未提供时回退到响应式对象中最接近的较小断点(默认 sm → md 找不到时取 sm)
   */
  currentBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
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
    // 数组行的 col 响应式断点拍平(opts.currentBreakpoint 在外层 useRenderSchemaNode 闭包)
    const inner = rewritten
      ? opts.render({
          ...(rewritten as object),
          col: mergeColResponsive((rewritten as SchemaNode).col, opts.currentBreakpoint),
        } as SchemaNode)
      : undefined
    return h(
      'div',
      {
        key: `array-${listName}-${index}`,
        class: `${typeof node.component === 'string' ? node.component.toLowerCase() : 'array-node'}__row`,
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

/** 取节点对应组件的默认 props；仅对 string component 生效，对象组件无默认注入 */
function getComponentDefaultProps(
  node: SchemaNode,
  componentProps?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  if (typeof node.component !== 'string') return {}
  return componentProps?.[node.component] ?? {}
}

/** 渲染单个 schema 节点为 VNode：含视觉容器 / formItem / row / 默认 4 个分支 */
export function useRenderSchemaNode(opts: RenderSchemaNodeOptions) {
  function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
    // ← 注意:currentBreakpoint 已在外部捕获(闭包),通过 wrapWithElCol 传入
    // 数组节点走独立分支（不参与 formItem/row/Col 默认分支）
    if (node.kind === 'array') {
      return renderArrayNode(node, opts)
    }
    // component 字段支持 string(走映射)或 object(直接 Vue 组件对象)
    const Comp =
      typeof node.component === 'string'
        ? resolveComponentFor(node.component, opts.components)
        : node.component
    const eventBindings = {
      ...buildVModelBindings(node, opts.model, opts.beforeChange, opts.onValueChange),
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
        {
          ...getComponentDefaultProps(node, opts.componentProps),
          ...node.props,
          ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
          ...(node.key !== undefined && { key: node.key }),
        } as never,
        slotMap
      ) as never
    }
    const wrapWithFormItem =
      (node.name !== undefined && node.formItem !== false) || node.formItem === true
    if (wrapWithFormItem) {
      const fi = typeof node.formItem === 'object' ? node.formItem : null
      const FormItemComp = fi?.component
        ? typeof fi.component === 'string'
          ? (resolveComponentFor(fi.component, opts.components) ?? ElFormItem)
          : fi.component
        : ElFormItem
      const fiProps = fi?.props ?? {}
      // 跨字段校验在 blur 时主动触发(否则 trigger: 'blur' 对 crossValidator 无效,
      // 见 P0-4 文档说明)。triggerCrossFieldValidator 由 XForm.vue 注入,
      // 内部读 model 跑 cross rules,成功清空错误,失败 setFieldError 红字
      const triggerFn = opts.triggerCrossFieldValidator
      const onBlur =
        triggerFn && node.name
          ? () => {
              triggerFn(node, 'blur')
            }
          : undefined
      const onChange =
        triggerFn && node.name
          ? () => {
              triggerFn(node, 'change')
            }
          : undefined
      return h(
        FormItemComp as never,
        {
          label: node.label,
          prop: node.name,
          rules: compileRules(node.rules, opts.rules) as never,
          ...(onBlur ? { onBlur } : {}),
          ...(onChange ? { onChange } : {}),
          ...fiProps,
          ...(node.name || node.key ? { key: `fi-${node.name ?? node.key}` } : {}),
        } as never,
        Comp
          ? {
              default: () => {
                // formItem 默认 default 来自 node.children(向后兼容)
                const defaultSlot = () => renderChildren(node.children, opts.render) as never
                // formItem 还要把 node.slots 转发给 Comp(如 el-upload 的 tip 槽位)——否则 slots 被吞
                const extraSlots: Record<string, () => unknown> = {}
                if (node.slots) {
                  for (const [k, v] of Object.entries(node.slots)) {
                    extraSlots[k] = () => opts.render(v as never)
                  }
                }
                const inner = h(
                  Comp as never,
                  {
                    ...eventBindings,
                    ...getComponentDefaultProps(node, opts.componentProps),
                    ...node.props,
                    ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
                    ...(node.key !== undefined && { key: node.key }),
                  } as never,
                  { default: defaultSlot, ...extraSlots }
                )
                return wrapWithElCol(node, inner, opts.currentBreakpoint)
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
              {
                span: colSpan,
                // 数组节点 col.responsive 透传(element-plus 响应式)
                ...(node.col && typeof node.col === 'object' && node.col.responsive
                  ? { responsive: node.col.responsive }
                  : {}),
                ...(node.key !== undefined && { key: node.key }),
              } as never,
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
          ...getComponentDefaultProps(node, opts.componentProps),
          ...node.props,
          ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
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
