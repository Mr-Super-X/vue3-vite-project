import type { ComponentPublicInstance, Directive, VNode } from 'vue'
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

/** slot 渲染函数：支持普通 slot / scoped slot；JSX 本质是其语法糖 */
export type SlotRenderFn = (
  scope?: Record<string, unknown>
) => VNode | VNode[] | string | undefined | null

/** Schema 节点支持的单个 slot 内容 */
export type SchemaSlot = SchemaNode | SchemaNode[] | string | undefined | SlotRenderFn

/** 校验规则（async-validator 兼容） */
export interface RuleItem {
  required?: boolean
  pattern?: RegExp | string
  min?: number | string
  max?: number | string
  message?: string
  validator?: (rule: unknown, value: unknown, cb: (err?: Error) => void) => void
  trigger?: 'blur' | 'change' | 'manual' | string | string[]
  /** async-validator 内置类型校验,如 'string' / 'email' / 'url' / 'number' 等 */
  type?: string
  /** 跨字段依赖：声明当前规则依赖的其他字段名（取自同 model，支持 lodash 路径解析如 'items[0].qty'）
   *  - 单字段依赖：dependsOn: 'password'
   *  - 多字段依赖：dependsOn: ['password', 'confirmPassword']
   *  仅与 crossValidator 配合使用；单独写无意义 */
  dependsOn?: string | string[]
  /** 跨字段校验函数（替代 async-validator 的 callback validator，支持同步/异步）
   *  - 第 1 个参数：当前字段 value（lodash get 取自 model）
   *  - 后续参数：按 dependsOn 声明顺序传入依赖字段的 value
   *  - 返回 true 表示通过；返回 string 作为错误信息
   *  - 返回 Promise<true | string> 支持异步校验（远程接口等场景），validateForm 会 await
   *  失败时由 form-schema 统一把 message 写入对应 form-item，无需 callback */
  crossValidator?: (
    value: unknown,
    ...dependsOnValues: unknown[]
  ) => true | string | Promise<true | string>
  /**
   * 跨字段校验的 debounce 时延（毫秒，覆盖 schema 顶层 debounceValidation）
   * - 未设置：继承 schema.debounceValidation（默认 0 = 实时）
   * - >0：依赖字段停止变化 delay ms 后跑一次 crossValidator（适合密码/确认密码高频输入场景）
   * - 0：实时（每键触发）
   * 仅对有 crossValidator 的规则生效；纯字段规则（required / pattern）走 element-plus 自身 trigger
   */
  debounceMs?: number
}

/** reaction 字段值：字面量 / 函数 / 函数表达式字符串 */
export type ReactionValue<T> = T | ((model: Record<string, unknown>) => T) | FunctionExpression

/** 反应式配置：覆盖节点的任意字段 */
export interface ReactionConfig {
  rules?: ReactionValue<SchemaNode['rules']>
  // reaction.props 整体作为 ReactionValue：applyReactionFields 对函数/字符串求值后整体覆盖 node.props
  // （不是「逐字段反应式」——use-reaction 第 14-34 行 applyReactionFields 是直接赋值 target[key] = value）
  props?: ReactionValue<Record<string, unknown>>
  label?: ReactionValue<string>
  hidden?: ReactionValue<boolean>
  /** 反应式调度策略
   *  - 'sync'(默认):依赖变化立即同步执行 reaction 函数
   *  - 'debounce':依赖停止变化 delay ms 后执行一次(适合远程搜索等高频输入)
   *  - 'throttle':delay ms 内最多执行一次(适合实时保存等)
   *  strategy / delay 在 use-reaction 中解析,不会写入 node */
  strategy?: 'sync' | 'debounce' | 'throttle'
  /** debounce / throttle 延迟(ms);strategy !== 'sync' 时生效 */
  delay?: number
  /** 依赖字段路径列表（性能优化，如 ['a', 'b.c']）：
   *  声明后仅精确 watch 这些路径；不声明则保持旧行为 —— deep watch 整棵 model，
   *  任意字段变化都触发求值（大表单下 N 字段 × M 联动开销显著） */
  deps?: string[]
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
  slots?: Record<string, SchemaSlot>
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
  /** 行拖拽排序（默认 false）：开启后行可 HTML5 拖拽换位（调用 moveItem 更新 model） */
  draggable?: boolean
}

/** Col 响应式断点(同 ColConfig 子字段) */
export interface ResponsiveColConfig {
  span?: number
  offset?: number
  push?: number
  pull?: number
}

/** 栅格（el-row） */
export interface RowConfig {
  gutter?: number
  type?: 'flex'
  align?: string
  justify?: string
  /**
   * Row 响应式 —— element-plus 标准 5 档
   * - xs: < 768px(手机)
   * - sm: ≥ 768px(平板)
   * - md: ≥ 992px(小屏)
   * - lg: ≥ 1200px(桌面)
   * - xl: ≥ 1920px(大屏)
   * 每个断点可独立设置 gutter / type / align / justify
   * 注:element-plus el-row 不自动监听 viewport resize —— 运行时响应式联动
   * 需 XForm 内部 useResizeObserver 触发 schema 重渲染(留 P2 阶段)
   */
  responsive?: {
    xs?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    sm?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    md?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    lg?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
    xl?: Pick<RowConfig, 'gutter' | 'type' | 'align' | 'justify'>
  }
}
/** 栅格（el-col） */
export interface ColConfig {
  span?: number
  offset?: number
  push?: number
  pull?: number
  /**
   * Col 响应式 —— element-plus 标准 5 档
   * 每个断点可独立设置 span / offset / push / pull
   * 渲染时透传给 el-col(传对象时 el-col 自动按 viewport 选)
   */
  responsive?: {
    xs?: ResponsiveColConfig
    sm?: ResponsiveColConfig
    md?: ResponsiveColConfig
    lg?: ResponsiveColConfig
    xl?: ResponsiveColConfig
  }
}

/** 异步选项配置：为 Select/Cascader/TreeSelect/Autocomplete 等提供内置远程数据能力 */
export interface AsyncOptionsConfig<T = unknown> {
  /** 数据源函数，返回原始数据数组（支持 Promise）；Autocomplete 场景可接收可选 query 参数 */
  source: (query?: string) => Promise<T[]> | T[]
  /** 是否在节点创建时立即请求（默认 true） */
  immediate?: boolean
  /** 依赖字段路径（lodash 路径），任一依赖变化时重新请求 */
  deps?: string | string[]
  /** 数据转换：把 source 返回的原始数组转为组件需要的 { label, value } 数组 */
  transform?: (raw: T[]) => Array<{ label: string; value: unknown }>
  /** 请求出错时回调（默认仅写入内部 error 状态） */
  onError?: (err: unknown) => void
}

/**
 * 节点定义（schema DSL 全量 29 字段）
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
  disabled?: ReactionValue<boolean>
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
  permission?: ReactionValue<'view' | 'edit' | 'hidden'>
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
  readonly?: ReactionValue<boolean>
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

/** 快捷名 → 对应组件 props 类型的映射（可声明合并）
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
  /**
   * 白名单函数表：注册后 {{ }} 表达式可直接引用注册名
   * 如 { formatDate: (v) => dayjs(v).format('YYYY-MM-DD') } → {{ (m) => formatDate(m.date) }}
   * 注意：模块级注册（多实例共享），与黑名单扫描互补，非真正沙箱
   */
  expressionFunctions?: Record<string, (...args: never[]) => unknown>
  /**
   * 校验失败自动滚动到第一个错误字段（透传 element-plus ElForm.scrollToError）
   * - 字段规则失败：ElForm 原生滚动到第一个 .el-form-item.is-error
   * - 跨字段 crossValidator 失败：XForm 内部滚动到第一个错误字段（keyPath 末段）
   * - 默认 false（与 element-plus 原生默认一致，不静默改变既有 validate() 行为）
   */
  scrollToError?: boolean
  /**
   * 滚动行为选项（透传 element-plus ElForm.scrollIntoViewOptions，默认 true）
   * 如 { behavior: 'smooth', block: 'center' }
   */
  scrollIntoViewOptions?: ScrollIntoViewOptions | boolean
  /**
   * 按组件名注入默认 props，节点级 props 可覆盖。
   * 例如: { Input: { clearable: true }, Select: { clearable: true, filterable: true } }
   * 仅对 string component 生效;直接传 Component 对象时由组件自身控制。
   *
   * 注:XForm 内部已维护一份默认 DEFAULT_COMPONENT_PROPS（对支持 clearable 的 EL 组件默认开启 clearable）。
   * 该字段会与内置默认合并，用户传入的同名组件配置会按组件名覆盖内置默认值。
   */
  componentProps?: Record<string, Record<string, unknown>>
}

/** XForm 组件实例方法 */
export interface XFormExpose {
  getRef(key: string): ComponentPublicInstance | HTMLElement | null
  getNames(includesIgnore?: boolean): string[]
  validate(): Promise<boolean>
  /** 详细校验：含 el-form 字段内规则错误 + 跨字段 crossValidator 错误（keyPath + message） */
  validateDetail(): Promise<ValidateResult>
  clearValidate(): void
  /** 重置字段（不传 names 全量重置；传 names 部分重置并同步清理对应服务端错误） */
  resetFields(names?: string | string[]): void
  /** 校验指定字段（透传 el-form validateField）：成功 true；失败/未绑定 false */
  validateField(name: string | string[]): Promise<boolean>
  scrollToField(name: string): void
  validateWithZod(): { success: boolean; errors: import('zod').ZodError | null }
  /** 手动写入某个字段的错误信息（用于服务端 422 等场景） */
  setFieldError(
    name: string,
    message: string,
    state?: '' | 'validating' | 'success' | 'error'
  ): void
  /** 手动标记某个字段为校验中（el-form-item 显示 loading 图标） */
  setFieldValidating(name: string): void
  /** 数组节点操作：push 一项（仅 ArrayNode 用） */
  addItem(name: string, init?: Record<string, unknown>): void
  /** 数组节点操作：删除指定行（仅 ArrayNode 用） */
  removeItem(name: string, index: number): void
  /** 数组节点操作：行位置调整（仅 ArrayNode 用） */
  moveItem(name: string, from: number, to: number): void
  /** 阶段 2.2：dirty 状态 —— 任一字段与初始 snapshot 不同则为 dirty */
  isDirty(): boolean
  /** 阶段 2.2：返回所有 dirty 字段路径列表 */
  getDirtyFields(): string[]
  /** 阶段 2.2：指定字段是否被修改过 */
  isTouched(name: string): boolean
  /** 阶段 2.2：把当前状态标记为新基线（提交后归零 / 加载后初始化） */
  resetDirty(): void
  /**
   * 阶段 2.1：把后端响应映射到表单字段
   * - success=true：清空所有服务端错误（红字消失）
   * - success=false + errors：清空涉及字段的错误 + 写入新错误
   * - 仅传 errors 视为 success=false
   */
  validateFromServer(response: {
    success?: boolean
    errors?:
      Array<{ path?: string; field?: string; message?: string }> | Record<string, string | string[]>
  }): number
}

/** validate() 入参 */
export interface ValidateOptions {
  validateFirst?: boolean
  /**
   * 已知组件集 —— 用于组件名有效性校验（阶段 1.3）
   * - builtin: EL 内置组件短名集合 (Input/Select/...)
   * - user: 用户通过 XForm.components prop 注册的自定义组件名集合
   * 任一缺失：仅校验另一类（不传则跳过组件名校验，保持向后兼容）
   */
  knownComponents?: {
    builtin: Set<string>
    user?: Set<string>
  }
}

/** validate() 出参 */
export interface ValidateResult {
  isValid: boolean
  errors: Array<{ keyPath: (string | number)[]; message: string }>
}
