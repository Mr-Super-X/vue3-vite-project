import type { ComponentPublicInstance, Directive } from 'vue'
import type { ZodType } from 'zod'
import type {
  ElInput,
  ElSelect,
  ElOption,
  ElSwitch,
  ElDatePicker,
  ElTimePicker,
  ElTimeSelect,
  ElTreeSelect,
  ElUpload,
  ElAutocomplete,
  ElTransfer,
  ElRadioGroup,
  ElRadio,
  ElCheckboxGroup,
  ElCheckbox,
  ElCascader,
  ElInputNumber,
  ElSlider,
  ElCard,
  ElFormItem,
} from 'element-plus'

/**
 * 从 element-plus 组件构造器中提取 props 类型
 * 利用 vue 3 ComponentCustomOptions['props'] 的派生
 */
type ComponentProps<T> = T extends new (...args: never[]) => infer R
  ? NonNullable<R extends { $props: infer P } ? P : never>
  : NonNullable<T extends { props: infer P } ? P : never>

/** 事件回调 */
export type EventFn = (value: unknown, ...args: unknown[]) => unknown
/** 函数表达式：{{ ... }} 包裹的函数体字符串 */
export type FunctionExpression = string

/** 校验规则（async-validator 兼容） */
export interface RuleItem {
  required?: boolean
  pattern?: RegExp | string
  min?: number | string
  max?: number | string
  message?: string
  validator?: (rule: unknown, value: unknown, cb: (err?: Error) => void) => void
  trigger?: 'blur' | 'change' | (string | string[])[]
}

/** reaction 字段值：字面量 / 函数 / 函数表达式字符串 */
export type ReactionValue<T> = T | ((model: Record<string, unknown>) => T) | FunctionExpression

/** 反应式配置：覆盖节点的任意字段 */
export interface ReactionConfig {
  rules?: ReactionValue<SchemaNode['rules']>
  props?: Record<string, ReactionValue<unknown>>
  label?: ReactionValue<string>
  hidden?: ReactionValue<boolean>
  // 其他可覆盖字段（开闭原则：未知字段透传）
  [key: string]: unknown
}

/** 指令系统 */
export interface DirectiveConfig {
  directive: string | Directive
  arg?: string
  modifiers?: Record<string, boolean>
  value?: unknown
}

/** FormItem 包裹配置 */
export interface FormItemConfig {
  component?: string
  props?: Record<string, unknown>
  directives?: DirectiveConfig[]
  slots?: Record<string, SchemaNode | SchemaNode[] | string | undefined>
  rules?: SchemaNode['rules']
  [key: string]: unknown
}

/** 数组节点配置（kind: 'array' 时使用） */
export interface ArrayNodeConfig {
  /** 每行渲染的子 schema —— 同一份 schema 套到 model[name] 的每个数组元素 */
  itemSchema: SchemaNode | SchemaNode[]
  /** model 未定义时的初始行数（默认 1） */
  initialLength?: number
  /** 行数下限（达下限时禁用删除按钮，校验也会读取该值） */
  minItems?: number
  /** 行数上限（达上限时禁用新增按钮，校验也会读取该值） */
  maxItems?: number
  /** 操作按钮显隐（默认全开；传对象可分别控制 add/remove/move） */
  showActions?:
    | boolean
    | {
        add?: boolean
        remove?: boolean
        move?: boolean
      }
  /** 操作按钮文案（默认 添加/删除/上移/下移） */
  labels?: {
    add?: string
    remove?: string
    moveUp?: string
    moveDown?: string
  }
  /** 容器标题（默认不渲染表头） */
  title?: string
}

/** 栅格（el-row） */
export interface RowConfig {
  gutter?: number
  type?: 'flex'
  align?: string
  justify?: string
}
/** 栅格（el-col） */
export interface ColConfig {
  span?: number
  offset?: number
  push?: number
  pull?: number
}

/**
 * 节点定义（schema DSL 全量 16 字段）
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
 * - kind      节点类型（'array' = 数组容器）
 * - array     数组容器配置（kind='array' 时必填）
 *
 * 建议优先使用 `SchemaNodeFor<C>` 泛型版本：按 component 字段推导 props 类型
 * 例如：`const node: SchemaNodeFor<'Input'> = { component: 'Input', props: { placeholder: 'x' } }`
 */
export interface SchemaNode {
  component?: string
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
  slots?: Record<string, SchemaNode | SchemaNode[] | string | undefined>
  ignore?: boolean
  hidden?: boolean
  key?: string | number
  kind?: 'array'
  array?: ArrayNodeConfig
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

/** 快捷名 → 对应组件 props 类型的映射 */
export type PropsByComponent = {
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

/** 支持类型推导的 component 名 */
export type ComponentName = keyof PropsByComponent

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
  props?: PropsByComponent[C]
}

/** XForm 组件 props */
export interface XFormProps {
  schema: SchemaNode | SchemaNode[]
  model?: Record<string, unknown>
  components?: Record<string, unknown>
  rules?: Record<string, RuleItem>
  directives?: Record<string, Directive>
  beforeChange?: (
    itemSchema: SchemaNode,
    newValue: unknown,
    oldValue: unknown
  ) => unknown | Promise<unknown>
  zodSchema?: ZodType
}

/** XForm 组件实例方法 */
export interface XFormExpose {
  getRef(key: string): ComponentPublicInstance | HTMLElement | null
  getNames(includesIgnore?: boolean): string[]
  validate(): Promise<boolean>
  clearValidate(): void
  resetFields(): void
  scrollToField(name: string): void
  validateWithZod(): { success: boolean; errors: import('zod').ZodError | null }
  /** 数组节点操作：push 一项（仅 ArrayNode 用） */
  addItem(name: string, init?: Record<string, unknown>): void
  /** 数组节点操作：删除指定行（仅 ArrayNode 用） */
  removeItem(name: string, index: number): void
  /** 数组节点操作：行位置调整（仅 ArrayNode 用） */
  moveItem(name: string, from: number, to: number): void
}

/** validate() 入参 */
export interface ValidateOptions {
  validateFirst?: boolean
}

/** validate() 出参 */
export interface ValidateResult {
  isValid: boolean
  errors: Array<{ keyPath: (string | number)[]; message: string }>
}
