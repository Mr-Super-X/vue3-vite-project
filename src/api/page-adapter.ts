import type { Pagination } from './types/api.d'

/**
 * 后端 v2 分页响应原始格式（详见后端约定）：
 * - records：数据列表
 * - total：总记录数
 * - size：每页大小
 * - current：当前页（1-based）
 * - pages：总页数（备用字段，可由 total/size 推算，本适配器不消费）
 */
export interface BackendPage<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages?: number
}

/**
 * 把后端 v2 分页响应适配为项目内 Pagination<T>。
 *
 * 设计要点：
 * - 保留项目内 Pagination<T> 约定（list / page / pageSize），业务模块零迁移
 * - 业务侧只需 `request<{ data: BackendPage<Item> }>(...)` + `adaptBackendPage(res.data)`
 * - 单一适配点：后端字段名变更时只改这里
 */
export function adaptBackendPage<T>(raw: BackendPage<T>): Pagination<T> {
  return {
    list: raw.records,
    total: raw.total,
    page: raw.current,
    pageSize: raw.size,
  }
}

/**
 * 后端 v2 分页请求参数约定：
 * - pageIndex：当前页（1-based）
 * - pageSize：每页大小
 *
 * 注意：与响应字段名不同（响应用 current/size，请求用 pageIndex/pageSize），
 * 这是后端约定，业务模块不可见。
 */
export interface BackendPageQuery {
  pageIndex: number
  pageSize: number
}

/**
 * 项目侧分页入参（与 Pagination<T> 同名字段，复用约定）。
 */
export interface ProjectPageQuery {
  page?: number
  pageSize?: number
}

/**
 * 把项目侧分页入参转换为后端 v2 入参格式。
 *
 * 字段映射：page → pageIndex（同 1-based，无需 offset），pageSize 直传。
 *
 * 使用方式：业务模块的 params 与其他过滤条件一并 spread 进来，
 * 本函数只重命名分页字段，不影响 keyword / orderBy 等其他字段。
 *
 * @example
 * ```ts
 * request<{ data: BackendPage<Item> }>({
 *   url: '/list',
 *   method: 'get',
 *   params: {
 *     ...buildBackendPageQuery({ page: 1, pageSize: 10 }),
 *     keyword: 'foo', // 其他字段原样透传
 *   },
 * })
 * ```
 */
export function buildBackendPageQuery(query: ProjectPageQuery): BackendPageQuery {
  return {
    pageIndex: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
  }
}
