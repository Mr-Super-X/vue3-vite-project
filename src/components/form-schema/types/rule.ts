/**
 * 校验规则类型 —— async-validator 兼容 + 跨字段扩展
 *
 * 包括：
 * - async-validator 标准字段：required / pattern / min / max / message / validator / trigger / type
 * - 跨字段扩展：dependsOn / crossValidator / debounceMs
 */

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
   * 失败时由 form-schema 统一把 message 写入对应 form-item，无需 callback */
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
