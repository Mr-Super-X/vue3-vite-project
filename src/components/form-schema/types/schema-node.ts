/**
 * Schema 节点定义 —— XForm schema DSL 的核心接口
 *
 * 业务入口推荐 `SchemaNodeFor<C>` 泛型版本（按 component 字段推导 props 类型）：
 *   const node: SchemaNodeFor<'Input'> = { component: 'Input', props: { placeholder: 'x' } }
 */
import type {
  ElAutocomplete,
  ElCard,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElColorPicker,
  ElDatePicker,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElInputTag,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTimeSelect,
  ElTransfer,
  ElTreeSelect,
  ElUpload,
  MentionProps,
} from 'element-plus'

import type { EventFn, FunctionExpression, SchemaSlot } from './base'
import type { RuleItem } from './rule'
import type { ReactionConfig } from './reaction'
import type { DirectiveConfig, FormItemConfig } from './directive'
import type { ArrayNodeConfig } from './array'
import type { ColConfig, RowConfig } from './layout'
import type { AsyncOptionsConfig } from './async-options'

/**
 * 从 element-plus 组件构造器中提取 props 类型
 * 利用 vue 3 ComponentCustomOptions['props'] 的派生
 */
type ComponentProps<T> = T extends new (...args: never[]) => infer R
  ? NonNullable<R extends { $props: infer P } ? P : never>
  : NonNullable<T extends { props: infer P } ? P : never>

/**
 * SchemaNode —— XForm schema DSL 的核心节点定义（30 字段接口）
 *
 * 字段分组：节点标识（component/name/label/key）、渲染属性（props/on/children/slots/directives）、
 * 布局（row/column/col/formItem）、校验（rules/defaultValue）、响应式（reaction/disabled/permission/...）、
 * 数组节点（kind/array）、数据加载（asyncOptions）、v-model 适配（modelProp）、顶层配置（labelPosition/...）
 *
 * 业务入口推荐 `SchemaNodeFor<C>` 泛型版本（按 component 字段推导 props 类型）：
 *   const node: SchemaNodeFor<'Input'> = { component: 'Input', props: { placeholder: 'x' } }
 *
 * 完整字段表 + 每个字段的业务说明见本文件 interface 体内的 JSDoc
 *
 * @see ./base.ts EventFn / FunctionExpression / SchemaSlot
 * @see ./rule.ts RuleItem（async-validator 兼容 + 跨字段）
 * @see ./reaction.ts ReactionConfig / ReactionValue
 * @see ./xform.ts XFormProps / XFormExpose / beforeChange
 */
export interface SchemaNode {
  /**
   * 组件 —— 支持三种形式：
   * - EL 组件名：string（内置短名如 'Input' / 全名 'ElInput' / components prop 注册名）
   * - 原生 HTML 标签：string（全小写，如 'a' / 'span' / 'div'），直接渲染原生元素
   * - Component 对象：直接传入 Vue 组件实例/选项对象（无需在 XForm 的 components prop 注册）
   *
   * 推荐：EL 组件用 string 形式 + XForm 集中注册；slots 内的 trigger 元素也支持直接传 Component 对象
   * @group 节点标识
   */
  component?: string | object
  /**
   * 透传给 component 的属性对象（element-plus 组件对应 ElXxxProps）
   * 推荐：使用 `SchemaNodeFor<C>` 泛型版本按 component 字段推导 props 类型
   * @group 节点标识
   */
  props?: Record<string, unknown>
  /**
   * 事件绑定 —— 键为事件名（如 'change' / 'blur'），值可为函数或 `{{ fn }}` 表达式
   * @group 渲染属性
   */
  on?: Record<string, EventFn | FunctionExpression>
  /**
   * 子节点（递归 SchemaNode） / 子节点数组 / 字符串文本（用于 slot 内 text 内容）
   * @group 渲染属性
   */
  children?: SchemaNode | SchemaNode[] | string
  /**
   * 表单字段名 —— 绑定 model[name] 用于 el-form 数据收集与校验路径
   * 数组节点必填（items[*] 等）；纯 UI 节点（如 Card）可不填
   * @group 节点标识
   */
  name?: string
  /**
   * el-form-item label 文本（左侧/上方/右侧 由 labelPosition 决定）
   * @group 节点标识
   */
  label?: string
  /**
   * 字段级校验规则（async-validator 兼容 + 跨字段扩展）
   * - string：命名规则名（在 XFormProps.rules 中查找）
   * - RuleItem：单个规则对象（required / pattern / validator / crossValidator 等）
   * - Array<string | RuleItem>：多个规则按顺序串行校验
   * @group 校验
   */
  rules?: string | RuleItem | Array<string | RuleItem>
  /**
   * 是否包 el-form-item（label + prop + rules 注册到 el-form）
   * - true：自动包（默认 name 字段自动包）
   * - false：明确不包（如 Card 视觉容器、纯展示节点）
   * - FormItemConfig：详细配置（指定 component / props / slots / rules 等覆盖默认值）
   * @group 渲染属性
   */
  formItem?: boolean | FormItemConfig
  /**
   * v-model 绑定的属性名（默认 'modelValue'，Upload 节点用 'file-list'）
   * @group v-model 适配
   */
  modelProp?: string
  /**
   * 字段初始默认值（mount 时填充 model[name]，仅当 model 中字段未定义时生效）
   * 用户编辑后值会被替换；resetFields() 时回到此值
   * @group 校验
   */
  defaultValue?: unknown
  /**
   * el-row 栅格行配置（gutter / type / align / justify / responsive）
   * 透传 element-plus ElRow；responsive 按当前 viewport 自动拍平（mobile-first）
   * @group 布局
   */
  row?: RowConfig
  /**
   * 每行栅格数（auto-spans: 24/column 计算各列 span）
   * 数组节点不生效；与 col.span 二选一
   * @group 布局
   */
  column?: number
  /**
   * el-col 栅格列配置（span / offset / push / pull / responsive）
   * - true：自动用 24/column 计算 span
   * - false / undefined：不包 el-col（节点直出）
   * - ColConfig：详细配置（span + offset + responsive）
   * @group 布局
   */
  col?: boolean | ColConfig
  /**
   * 反应式配置 —— 覆盖节点任意字段（rules / props / label / hidden / disabled / ...）
   * - strategy: sync（默认）/ debounce / throttle + delay
   * - deps: 精确监听路径数组（避免 deep watch 整棵 model）
   * @group 响应式
   */
  reaction?: ReactionConfig
  /**
   * 自定义指令数组（vue withDirectives 对应）
   * - directive 字段支持 string 指令名（待注册表接线）或直接传 Directive 对象
   * - 当前以 path-only 形式应用在渲染层 vnode 上
   * @group 渲染属性
   */
  directives?: DirectiveConfig[]
  /**
   * 异步选项数据源（Select/Cascader/TreeSelect/Autocomplete）
   * @group 数据加载
   */
  asyncOptions?: AsyncOptionsConfig
  /**
   * 节点插槽内容 —— 键为 slot 名（如 'default' / 'tip'），值为 SchemaSlot（节点/字符串/渲染函数）
   * @group 渲染属性
   */
  slots?: Record<string, SchemaSlot>
  /**
   * 是否从 getNames() 排除（不参与校验 / dirty 追踪 / 反应式索引），但仍会渲染
   * 与 hidden 不同：hidden 不渲染；ignore 渲染但不参与表单数据收集
   * @group 响应式
   */
  ignore?: boolean
  /**
   * 是否渲染（false 时不创建 DOM 节点，el-form-item 也不注册）；支持字面量 / 函数 / 函数表达式
   * 与 ignore 不同：ignore 仍渲染但不参与数据收集
   * @group 响应式
   */
  hidden?: boolean
  /**
   * v-for key（数组行用行对象身份前缀派生稳定 key；详见 array-row-key.ts）
   * key 优先级 > name（数组删/移行后 name 漂移会导致 form-item 重挂载）
   * @group 节点标识
   */
  key?: string | number
  /**
   * 节点类型标识 —— 固定 'array'，标记该节点为数组容器
   * 数组节点走 renderArrayNode 分支，独立于普通字段渲染
   * @group 数组节点
   */
  kind?: 'array'
  /**
   * 数组容器配置（kind='array' 时必填）—— itemSchema / minItems / maxItems / showActions / labels / draggable
   * @see ./array.ts ArrayNodeConfig 完整字段表
   * @group 数组节点
   */
  array?: ArrayNodeConfig
  /**
   * 字段禁用状态（支持反应式：boolean / 函数 / 函数表达式）
   *
   * - 数组节点：仅控制容器按钮（行内控件需通过 reaction 自行级联）
   * - props.disabled 优先级更高：用户显式写在 props 里的 disabled 会覆盖本字段
   * - el-form 自动跳过 disabled 字段的校验（async-validator 行为）
   *
   * 【双层语义】字段级 = 字段禁用；顶层 schema = 整体禁用整个表单（透传 el-form disabled，与 labelPosition 同模式）
   * @group 响应式
   */
  disabled?: import('./reaction').ReactionValue<boolean>
  /**
   * 字段权限（view / edit / hidden 三态）：
   * - 'edit'：正常渲染为可编辑控件（默认值，不配置等同 edit）
   * - 'view'：渲染为只读纯文本（model value 展示），跳过校验
   * - 'hidden'：不渲染该字段（DOM 中不出现）
   *
   * 动态权限：函数形式 (model) => 'view' | 'edit' | 'hidden'，根据当前 model 动态决定。
   * 权限码形式：字符串 'user.edit' 等，需配合 XForm 的 permissionResolver 配置；
   * 用户可注入 useAuth().hasPerm 实现权限码 → 状态映射。
   * @group 响应式
   */
  permission?: import('./reaction').ReactionValue<'view' | 'edit' | 'hidden'>
  /**
   * 字段级 beforeChange（第 3 层：业务内聚）
   * - 与 Props.beforeChange 同签名（多 allValues + ctx 两可选参在尾部）
   * - 数组元素字段（items[i].phone）直接写在 array.children[i].phone 上即可
   * - 可通过 ctx.setFieldValue 联动修改其他兄弟字段（ctx 完全开放）
   * @group 响应式
   */
  beforeChange?: import('./xform').BeforeChangeFn
  /**
   * el-form label 位置 —— 顶层为默认值，字段级可 override
   *
   * element-plus ElFormItem 与 ElForm 共享 label-position prop，所以字段级可独立设置；
   * 字段级未设置时 el-form-item 自动继承 el-form 顶层配置（element-plus 原生行为）。
   *
   * 【双层语义】顶层 schema 配置 = 表单整体默认值；字段级 override = 个别字段差异化布局
   * @group 布局
   */
  labelPosition?: 'left' | 'right' | 'top'
  /**
   * 整体只读模式（仅顶层 schema 生效，与 labelPosition/disabled 同模式）：
   * - true 时所有字段按 view 态纯文本展示（复用 permission: 'view' 渲染链路，不包 formItem、不走校验）
   * - hidden 优先级更高（hidden 字段仍不渲染）
   * - 支持字面量 / 函数 / 函数表达式 / reaction 动态求值
   * - 字段级只读请用 permission: 'view'（本字段仅顶层生效）
   * @group 响应式
   */
  readonly?: import('./reaction').ReactionValue<boolean>
  /**
   * el-form label 宽度 —— 顶层为默认值，字段级可 override
   * - 顶层配置：表单整体 label 宽度（透传 el-form label-width）
   * - 字段级配置：该字段独立 label 宽度（透传 el-form-item label-width）
   * - 如 '120px' 或 120；数组形式 schema 无顶层节点，配置不生效
   *
   * 【双层语义】顶层默认 / 字段级 override
   * @group 布局
   */
  labelWidth?: string | number
  /**
   * 校验失败自动滚动到第一个错误字段（仅顶层 schema 生效，与 labelPosition 同模式）：
   * - 字段规则失败：ElForm 原生滚动到第一个 .el-form-item.is-error
   * - 跨字段 crossValidator 失败：XForm 内部滚动到第一个错误字段（keyPath 末段）
   * - 默认 false（与 element-plus 原生一致）
   * @group 顶层 schema
   */
  scrollToError?: boolean
  /**
   * 滚动行为选项（仅顶层 schema 生效，默认 true），如 { behavior: 'smooth', block: 'center' }
   * @group 顶层 schema
   */
  scrollIntoViewOptions?: ScrollIntoViewOptions | boolean
  /**
   * 跨字段校验的全局默认 debounce 时延（毫秒，仅顶层 schema 生效）
   * - 0（默认）：实时校验（每键触发 crossValidator）
   * - >0：依赖字段停止变化 delay ms 后跑一次 crossValidator（高频输入场景减负）
   *
   * 字段级 rules[i].debounceMs 可覆盖本配置。
   * @group 顶层 schema
   */
  debounceValidation?: number
}

/**
 * element-plus 业务组件 props 类型提取（vue 3.5+ ComponentProps）
 * 用于 SchemaNodeFor 泛型按 component 字段推导 props 类型
 */
type ElInputProps = ComponentProps<typeof ElInput>
type ElSelectProps = ComponentProps<typeof ElSelect>
type ElOptionProps = ComponentProps<typeof ElOption>
type ElSwitchProps = ComponentProps<typeof ElSwitch>
type ElDatePickerProps = ComponentProps<typeof ElDatePicker>
type ElTimePickerProps = ComponentProps<typeof ElTimePicker>
type ElTimeSelectProps = ComponentProps<typeof ElTimeSelect>
type ElTreeSelectProps = ComponentProps<typeof ElTreeSelect>
type ElUploadProps = ComponentProps<typeof ElUpload>
type ElAutocompleteProps = ComponentProps<typeof ElAutocomplete>
type ElInputTagProps = ComponentProps<typeof ElInputTag>
type ElMentionProps = MentionProps
type ElColorPickerProps = ComponentProps<typeof ElColorPicker>
type ElRateProps = ComponentProps<typeof ElRate>
type ElTransferProps = ComponentProps<typeof ElTransfer>
type ElRadioGroupProps = ComponentProps<typeof ElRadioGroup>
type ElRadioProps = ComponentProps<typeof ElRadio>
type ElCheckboxGroupProps = ComponentProps<typeof ElCheckboxGroup>
type ElCheckboxProps = ComponentProps<typeof ElCheckbox>
type ElCascaderProps = ComponentProps<typeof ElCascader>
type ElInputNumberProps = ComponentProps<typeof ElInputNumber>
type ElSliderProps = ComponentProps<typeof ElSlider>
type ElCardProps = ComponentProps<typeof ElCard>
type ElFormItemProps = ComponentProps<typeof ElFormItem>

/**
 * 快捷名 → 对应组件 props 类型的映射（可声明合并）
 *
 * 消费方可通过 TypeScript module augmentation 扩展自定义组件：
 * ```ts
 * declare module '@/components/form-schema/types' {
 *   interface ComponentPropsRegistry {
 *     MyInput: MyInputProps
 *   }
 * }
 * ```
 */
export interface ComponentPropsRegistry {
  Input: ElInputProps
  Select: ElSelectProps
  Option: ElOptionProps
  Switch: ElSwitchProps
  DatePicker: ElDatePickerProps
  TimePicker: ElTimePickerProps
  TimeSelect: ElTimeSelectProps
  TreeSelect: ElTreeSelectProps
  Upload: ElUploadProps
  Autocomplete: ElAutocompleteProps
  InputPassword: ElInputProps
  InputTextArea: ElInputProps
  InputTag: ElInputTagProps
  ColorPicker: ElColorPickerProps
  Mention: ElMentionProps
  Rate: ElRateProps
  Transfer: ElTransferProps
  RadioGroup: ElRadioGroupProps
  Radio: ElRadioProps
  CheckboxGroup: ElCheckboxGroupProps
  Checkbox: ElCheckboxProps
  Cascader: ElCascaderProps
  InputNumber: ElInputNumberProps
  Slider: ElSliderProps
  Card: ElCardProps
  FormItem: ElFormItemProps
  // 数组节点不绑 el 组件,内部独立渲染 —— props 类型留空占位
  ArrayNode: Record<string, unknown>
}

/** 向后兼容别名，等效于 ComponentPropsRegistry */
export type PropsByComponent = ComponentPropsRegistry

/** 支持类型推导的 component 名 */
export type ComponentName = keyof ComponentPropsRegistry

/**
 * 按 component 字段推导 props 类型的 SchemaNode 泛型
 *
 * 用法：
 * ```ts
 * const email: SchemaNodeFor<'Input'> = {
 *   component: 'Input',
 *   name: 'email',
 *   props: { placeholder: 'a@b.com', clearable: true },
 * }
 * // props: { placeholder: 123 }  // ❌ TS 类型错误
 * ```
 */
export type SchemaNodeFor<C extends ComponentName = ComponentName> = Omit<
  SchemaNode,
  'component' | 'props'
> & {
  component: C
  props?: ComponentPropsRegistry[C]
}
