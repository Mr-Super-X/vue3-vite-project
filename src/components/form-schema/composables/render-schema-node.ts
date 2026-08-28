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
  ElInputTag,
  ElMention,
  ElColorPicker,
  ElRate,
  ElSlider,
  ElIcon,
} from 'element-plus'
import { Plus, UploadFilled } from '@element-plus/icons-vue'
import { resolveComponent, h, type VNode, type ComponentPublicInstance, type Ref } from 'vue'
import { createNamespace } from '@/utils/bem'
import type { SchemaNode, XFormProps, ColConfig, RowConfig, SchemaSlot } from '../types'
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
  InputPassword: ElInput,
  ElInputPassword: ElInput,
  InputTextArea: ElInput,
  ElInputTextArea: ElInput,
  InputTag: ElInputTag,
  ColorPicker: ElColorPicker,
  Mention: ElMention,
  Rate: ElRate,
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
  // 原生 HTML 标签（全小写，如 'a' / 'span' / 'div'）→ 返回字符串标签名，
  // h() 对字符串直接渲染原生元素（与 EL 组件名的 PascalCase/ElXxx 约定不冲突）
  if (name === name.toLowerCase()) return name
  return null
}

/** 命名字符串规则未注册时静默降级为必填，排障极其困难 —— 必须显式告警暴露（通常是拼写错误） */
function warnUnknownRule(name: string): Record<string, unknown> {
  // 'required' 是 DSL 惯用简写（rules: 'required' ≡ [{ required: true }]，文档化行为），
  // 不属于拼写错误，静默放行；其余未命中名才告警
  if (name === 'required') return { required: true }
  console.error(
    `[XForm] 命名校验规则 "${name}" 未在 props.rules 中注册，已降级为 { required: true }（请检查拼写或注册该规则）`
  )
  return { required: true }
}

export function compileRules(rules: SchemaNode['rules'], propsRules: XFormProps['rules']): RuleArr {
  if (!rules) return []
  return (Array.isArray(rules) ? rules : [rules])
    .map((r) =>
      typeof r === 'string'
        ? (propsRules?.[r] ?? warnUnknownRule(r))
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
  // 关键修复:使用 ElCol 而非 ElFormItem —— ElFormItem 在 el-form 内响应栅格,
  // 但 el-row 内的 gutter(padding-left/right)只对 ElCol 生效
  return h(
    ElCol as never,
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

/**
 * 阶段 2.4：row.responsive 拍平
 * 与 mergeColResponsive 同逻辑 —— 但 row 没有 span/offset/push/pull,gutter/type/align/justify 是可选覆盖
 */
export function mergeRowResponsive(
  row: RowConfig | undefined,
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): RowConfig | undefined {
  if (!row) return row
  const responsive = row.responsive
  if (!responsive) return row
  const picked = pickBreakpointConfig(responsive as never, current)
  if (!picked) return row
  const merged: RowConfig = { ...row, ...picked }
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

/** schema 名与解析结果双向确认，避免业务用 components 覆盖 Upload 后误注入默认图标 */
function isElUpload(node: SchemaNode, Comp: unknown): boolean {
  const name = typeof node.component === 'string' ? node.component : ''
  if (name !== 'Upload' && name !== 'ElUpload') return false
  return Comp === ElUpload
}

/** 判断当前节点是否为 listType='picture-card' 的 ElUpload */
export function isPictureCardUpload(node: SchemaNode, Comp: unknown): boolean {
  return isElUpload(node, Comp) && node.props?.listType === 'picture-card'
}

/** 判断当前节点是否为开启 drag 拖拽的 ElUpload */
export function isDragUpload(node: SchemaNode, Comp: unknown): boolean {
  return isElUpload(node, Comp) && Boolean(node.props?.drag)
}

/**
 * 两类默认图标的 class —— 带 modifier 区分类型，业务覆盖样式时可精确命中其中一类。
 * drag 额外保留 Element Plus 原生 `el-icon--upload` / `el-upload__text`，继承官方拖拽区图标与文案样式。
 */
const bem = createNamespace('x-form') // 与 XForm.vue 同一 block，保证注入的类名落在 XForm 命名空间下
const UPLOAD_ICON_CLASS = {
  pictureCard: [bem.e('upload-icon'), bem.em('upload-icon', 'picture-card')].join(' '),
  drag: ['el-icon--upload', bem.e('upload-icon'), bem.em('upload-icon', 'drag')].join(' '),
}
const UPLOAD_DRAG_TEXT_CLASS = ['el-upload__text', bem.e('upload-text')].join(' ')

/**
 * 构建 Upload 默认插槽内容。
 * 用户未提供 default slot / children 时按类型注入默认触发区内容：
 * - `listType: 'picture-card'` → `<el-icon><Plus /></el-icon>`
 * - `drag: true` → `<el-icon class="el-icon--upload"><UploadFilled /></el-icon>` + 拖拽提示文案
 * 保证这两类上传组件无需业务在 schema 中手动配置触发元素。
 *
 * 注意 DOM 结构：`el-form-item__content` 下会多出一层无类名的 `<div>`，它是 ElUpload 组件自身的
 * 模板根节点（element-plus/upload.vue 用它收拢 upload-list 与 upload-content 两个兄弟节点），
 * 不是 XForm 的包裹层，也无法从 XForm 侧移除；需要调整该层样式时用 `.el-form-item__content > div` 定位。
 */
export function buildUploadDefaultSlot(
  node: SchemaNode,
  Comp: unknown,
  render: RenderFn
): () => VNode | string | VNode[] | undefined {
  return () => {
    // 用户已自定义默认插槽时优先使用，不覆盖
    if (node.slots?.default !== undefined) {
      // 统一用 buildSlotFn 处理函数 / 字符串 / SchemaNode / SchemaNode[]
      return buildSlotFn(node.slots.default, render)() as never
    }
    const children = renderChildren(node.children, render) as never
    if (children) return children
    if (isPictureCardUpload(node, Comp)) {
      return h(
        ElIcon,
        { class: UPLOAD_ICON_CLASS.pictureCard },
        { default: () => h(Plus) }
      ) as VNode
    }
    // drag 排在 picture-card 之后：两者同时开启时卡片触发区仅 148px，
    // UploadFilled 的官方 67px 大图标会溢出，此时保留 Plus 更合适
    if (isDragUpload(node, Comp)) {
      return [
        h(ElIcon, { class: UPLOAD_ICON_CLASS.drag }, { default: () => h(UploadFilled) }),
        h('div', { class: UPLOAD_DRAG_TEXT_CLASS }, '拖拽文件到这里或点击上传'),
      ] as VNode[]
    }
    return children
  }
}

export function buildSlotFn(value: SchemaSlot, render: RenderFn): (scope?: unknown) => unknown {
  if (typeof value === 'function') {
    return (scope?: unknown) => value(scope as Record<string, unknown>)
  }
  // 字符串 / SchemaNode / SchemaNode[] 统一走 renderChildren，
  // 避免直接调用 renderToComponentInner 处理字符串时返回 undefined
  return () => renderChildren(value as SchemaNode['children'], render)
}

/**
 * 构建 Upload 的 tip 插槽内容。
 * 当用户传入字符串时，自动包裹在 <div class="el-upload__tip"> 中，
 * 使字符串 tip 默认获得 Element Plus 的提示文案样式；
 * SchemaNode / 函数形式保持原样，由用户自行控制 wrapper。
 */
export function buildUploadTipSlot(
  value: SchemaSlot,
  render: RenderFn
): (scope?: unknown) => unknown {
  if (typeof value === 'function') {
    return (scope?: unknown) => value(scope as Record<string, unknown>)
  }
  if (typeof value === 'string') {
    return () => h('div', { class: 'el-upload__tip' }, value)
  }
  return () => renderChildren(value as SchemaNode['children'], render)
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
  /**
   * 整体只读（顶层 schema readonly 字段解析结果，由 XForm 注入）：
   * 返回 true 时未 hidden 的字段一律按 view 态纯文本展示（hidden 优先级仍最高）
   */
  globalReadonly?: () => boolean
  /**
   * 阶段 3.1：外部字段错误状态（由 XForm.vue 注入）
   * 走 el-form-item 的 props.error + props.validateStatus 官方路径触发红字
   * （避免直接修改 elForm.fields[i] 的隐患）
   * key: 字段名;value: { error: string; validateStatus: '' | 'validating' | 'success' | 'error' }
   */
  externalErrors?: () => Record<
    string,
    { error: string; validateStatus: '' | 'validating' | 'success' | 'error' }
  >
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
    // 整体只读（顶层 schema readonly）：未 hidden 的字段一律按 view 态展示（P2-1）
    const readonly = opts.globalReadonly?.() === true
    if ((permission === 'view' || readonly) && node.name) {
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
        { default: buildUploadDefaultSlot(node, Comp, opts.render) as never }
      ) as VNode,
      opts.currentBreakpoint?.value
    )
  }
  return renderToComponentInner
}

// 抑制未使用导入告警：ElConfigProvider/ElForm 是 XForm.vue 模板中用到的
void [ElConfigProvider, ElForm]
export type { ComponentPublicInstance }
