import type { ComponentPublicInstance, Directive } from 'vue'
import type { ZodType } from 'zod'

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
 * 节点定义（schema DSL 全量 14 字段）
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
  row?: RowConfig
  column?: number
  col?: boolean | ColConfig
  reaction?: ReactionConfig
  directives?: DirectiveConfig[]
  slots?: Record<string, SchemaNode | SchemaNode[] | string | undefined>
  ignore?: boolean
  hidden?: boolean
  key?: string | number
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
