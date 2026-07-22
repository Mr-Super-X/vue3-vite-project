/**
 * 归一化后的 API 错误。
 *
 * 设计要点：
 * - 统一形态：所有抛出错误都是 ApiError 实例，调用方 `err instanceof ApiError` 即可识别
 * - 保留 cause 链：底层 axios/原始错误可追溯
 * - 数值 code 兼容业务码（如 0=成功外的其他约定）和 HTTP 状态码
 *
 * 注意：项目 tsconfig 启用了 exactOptionalPropertyTypes，可选字段必须显式
 * `| undefined` 才能在调用处安全传 undefined。
 */
export class ApiError extends Error {
  public readonly code: number
  public readonly status: number | undefined
  public readonly url: string | undefined
  public override readonly cause: unknown

  constructor(init: {
    code: number
    message: string
    status?: number | undefined
    url?: string | undefined
    cause?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.url = init.url
    this.cause = init.cause
  }
}

/**
 * 类型守卫：判断是否为 ApiError。
 * 用于调用方在 catch 块中做 narrowing，避免 `any`。
 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}
