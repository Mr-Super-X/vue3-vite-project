/**
 * Schema 节点定义 —— XForm schema DSL 的核心 29 字段接口
 *
 * - component 节点构造器（字符串=查找，Component 对象=直接使用）
 * - props     节点属性
 * - on        事件定义（回调或 {{ fn }} 表达式）
 * - children  子节点（递归）
 * - name      表单域 name
 * - label     表单域 label
 * - rules     校验规则（async-validator 兼容）
 * - formItem  是否包裹 el-form-item（boolean 或详细配置）
 * - modelProp 双向绑定的属性名（默认 'modelValue' / element-plus 用 'modelValue'）
 * - row       栅格行配置
 * - column    每行栅格数（自动分配 span）
 * - col       栅格列配置（span / offset 等）
 * - reaction  响应式配置（基于 watchEffect）
 * - directives 自定义指令
 * - asyncOptions 异步选项数据源
 * - kind      节点类型（'array' = 数组容器）
 * - array     数组容器配置（kind='array' 时必填）
 * - disabled  字段禁用状态（支持反应式;数组节点仅控制容器按钮）
 *
 * 建议优先使用 `SchemaNodeFor<C>` 泛型版本：按 component 字段推导 props 类型
 * 例如：`const node: SchemaNodeFor<'Input'> = { component: 'Input', props: { placeholder: 'x' } }`
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

export interface SchemaNode {
  /**
   * 组件 —— 支持三种形式:
   *  - EL 组件名:string（内置短名如 'Input' / 全名 'ElInput' / components prop 注册名）
   *  - 原生 HTML 标签:string（全小写，如 'a' / 'span' / 'div'），直接渲染原生元素
   *  - Component 对象:直接传入 Vue 组件实例/选项对象(无需在 XForm 的 components prop 注册)
   * 推荐:EL 组件用 string 形式 + XForm 集中注册;slots 内的 trigger 元素也支持直接传 Component 对象
   */
  component?: string | object
  props?: Record<string, unknown>
  on?: Record<string, EventFn | FunctionExpression>
  children?: SchemaNode | SchemaNode[] | string
  name?: string
  label?: string
  rules?: string | RuleItem | Array<string | RuleItem>
  formItem?: boolean | FormItemConfig
  modelProp?: string
  defaultValue?: unknown
  row?: RowConfig
  column?: number
  col?: boolean | ColConfig
  reaction?: ReactionConfig
  directives?: DirectiveConfig[]
  /** 异步选项数据源（Select/Cascader/TreeSelect/Autocomplete） */
  asyncOptions?: AsyncOptionsConfig
  slots?: Record<string, SchemaSlot>
  ignore?: boolean
  hidden?: boolean
  key?: string | number
  kind?: 'array'
  array?: ArrayNodeConfig
  /** 字段禁用状态（支持反应式：boolean / 函数 / 函数表达式）
   *  - 数组节点：仅控制容器按钮（行内控件需通过 reaction 自行级联）
   *  - props.disabled 优先级更高：用户显式写在 props 里的 disabled 会覆盖本字段
   *  - el-form 自动跳过 disabled 字段的校验（async-validator 行为）
   *  - 【顶层 schema 生效】写在顶层 schema 上 = 整体禁用整个表单（透传 el-form disabled，
   *    与 labelPosition 同模式；函数/表达式/reaction 动态求值均支持） */
  disabled?: import('./reaction').ReactionValue<boolean>
  /**
   * 字段权限（阶段 2.3）：view / edit / hidden 三态
   * - 'edit'：正常渲染为可编辑控件（默认值，不配置等同 edit）
   * - 'view'：渲染为只读纯文本（model value 展示），跳过校验
   * - 'hidden'：不渲染该字段（DOM 中不出现）
   *
   * 动态权限：函数形式 (model) => 'view' | 'edit' | 'hidden'，根据当前 model 动态决定
   * 权限码形式：字符串 'user.edit' 等，需配合 XForm 的 permissionResolver 配置
   * （默认 permissionResolver 接受普通字符串字面量，可由用户注入 useAuth().hasPerm 实现权限码 → 状态映射）
   */
  permission?: import('./reaction').ReactionValue<'view' | 'edit' | 'hidden'>
  /**
   * el-form label 位置（仅顶层 schema 生效，阶段 2.4 增强）：
   * - 'left'（默认）：label 在 input 左侧
   * - 'right'：label 在 input 右侧
   * - 'top'：label 在 input 上方（响应式布局推荐，避免 label 挤占 col 宽度）
   *
   * 注：label-position 是 el-form 实例级属性,只能由顶层 schema 配置,
   * 不能针对单个 el-form-item 设置（这是 element-plus 自身限制）
   */
  labelPosition?: 'left' | 'right' | 'top'
  /**
   * 整体只读模式（仅顶层 schema 生效，与 labelPosition/disabled 同模式）：
   * - true 时所有字段按 view 态纯文本展示（复用 permission: 'view' 渲染链路，不包 formItem、不走校验）
   * - hidden 优先级更高（hidden 字段仍不渲染）
   * - 支持字面量 / 函数 / 函数表达式 / reaction 动态求值
   * - 字段级只读请用 permission: 'view'（本字段仅顶层生效）
   */
  readonly?: import('./reaction').ReactionValue<boolean>
  /**
   * el-form label 宽度（仅顶层 schema 生效，与 labelPosition 同模式）：
   * 如 '120px' 或 120；数组形式 schema 无顶层节点，配置不生效
   */
  labelWidth?: string | number
  /**
   * 校验失败自动滚动到第一个错误字段（仅顶层 schema 生效，与 labelPosition 同模式）：
   * - 字段规则失败：ElForm 原生滚动到第一个 .el-form-item.is-error
   * - 跨字段 crossValidator 失败：XForm 内部滚动到第一个错误字段（keyPath 末段）
   * - 默认 false（与 element-plus 原生一致）
   */
  scrollToError?: boolean
  /**
   * 滚动行为选项（仅顶层 schema 生效，与 labelPosition 同模式，默认 true）：
   * 如 { behavior: 'smooth', block: 'center' }
   */
  scrollIntoViewOptions?: ScrollIntoViewOptions | boolean
  /**
   * 跨字段校验的全局默认 debounce 时延（毫秒，仅顶层 schema 生效）
   * - 0（默认）：实时校验（每键触发 crossValidator）
   * - >0：依赖字段停止变化 delay ms 后跑一次 crossValidator（高频输入场景减负）
   * 字段级 rules[i].debounceMs 可覆盖本配置
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
