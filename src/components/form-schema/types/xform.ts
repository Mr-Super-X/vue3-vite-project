/**
 * XForm 组件对外契约 —— Props / Expose / Validate 入出参
 */
import type { ComponentPublicInstance, Directive } from 'vue'
import type { ZodType } from 'zod'

import type { RuleItem } from './rule'
import type { SchemaNode } from './schema-node'

/**
 * beforeChange 钩子上下文 —— 允许在字段级钩子里联动修改其他字段 / 取消写入
 *
 * 由 build-vmodel-bindings 在每字段 v-model 事件触发时构造（每字段独立 ctx 实例）
 * - setFieldValue('district', null): 选城市时清空区字段（联动副作用）
 * - setFieldError('phone', '格式错误'): 显示红字不阻断写入
 * - abort(): 取消本次本字段写入，等价于返回 undefined
 */
export interface BeforeChangeCtx {
  readonly name: string
  setFieldValue(name: string, value: unknown): void
  setFieldError(name: string, message: string): void
  readonly abort: () => void
}

/** beforeChange 函数签名 —— 全局 Props / 字段级 / 命名空间 handler 三处共用 */
export type BeforeChangeFn = (
  item: SchemaNode,
  newValue: unknown,
  oldValue: unknown,
  allValues?: Record<string, unknown>,
  ctx?: BeforeChangeCtx
) => unknown | Promise<unknown>

/** beforeChange 函数签名 —— ctx 必填版本（业务常用，TS 类型推断更友好） */
export type BeforeChangeFnWithCtx = (
  item: SchemaNode,
  newValue: unknown,
  oldValue: unknown,
  allValues: Record<string, unknown>,
  ctx: BeforeChangeCtx
) => unknown | Promise<unknown>

/**
 * 动态命名空间拦截规则 —— 字段是动态生成（如数组列表）时按 pattern 匹配
 * - RegExp: 精确正则匹配（推荐 ^...$ 锚定）
 * - string: 字面量精确匹配（'*' 单层通配 / '**' 多层通配）
 * 多个规则匹配同一字段时按数组顺序全部串行执行
 */
export interface BeforeChangeRule {
  pattern: RegExp | string
  handler: BeforeChangeFn
}

/** XForm 组件 props */
export interface XFormProps {
  schema: SchemaNode | SchemaNode[]
  model?: Record<string, unknown>
  components?: Record<string, unknown>
  rules?: Record<string, RuleItem>
  directives?: Record<string, Directive>
  /**
   * 全局 Props beforeChange（第 1 层：横切关注点）
   * - 返回新值 → 透传给下一层
   * - 返回 undefined → 放行原值给下一层
   * - Promise.resolve → 异步更新，等待结果后透传
   * - Promise.reject / 抛异常 → catch + warn + 中断后续写入
   *
   * 字段级拦截请用 SchemaNode.beforeChange；动态数组场景请用 beforeChangeRules
   */
  beforeChange?: BeforeChangeFn
  /**
   * 动态命名空间拦截（第 2 层：按 pattern 匹配字段路径）
   * 数组节点（items[i].phone）字段级配置繁琐，用规则数组简处理
   * 多个规则匹配同一字段时按数组顺序全部串行执行
   */
  beforeChangeRules?: BeforeChangeRule[]
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
