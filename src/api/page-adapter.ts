import type { Pagination } from './types/api.d'

/**
 * 入参字段映射配置：项目侧语义字段 → 后端字段名。
 * 不指定则使用当前 v2 后端约定默认值。
 *
 * 设计要点：让 page-adapter.ts 可被任意分页约定复用，零改源码。
 * 业务模块只调函数，传 fieldMap 即可适配不同后端。
 *
 * @example 默认（当前 v2 后端）
 * ```ts
 * buildBackendPageQuery({ page: 1, pageSize: 10 })
 * // => { pageIndex: 1, pageSize: 10 }
 * ```
 *
 * @example 团队 B 后端（p / pageSize 字段名）
 * ```ts
 * buildBackendPageQuery(
 *   { page: 1, pageSize: 10 },
 *   { pageField: 'p' }
 * )
 * // => { p: 1, pageSize: 10 }
 * ```
 */
export interface PageQueryFieldMap {
  /** 后端"当前页"字段名，默认 'pageIndex' */
  pageField?: string
  /** 后端"每页大小"字段名，默认 'pageSize' */
  pageSizeField?: string
}

/**
 * 响应字段映射配置：项目侧语义字段 → 后端字段名。
 */
export interface PageResponseFieldMap {
  /** 后端"数据列表"字段名，默认 'records' */
  listField?: string
  /** 后端"当前页"字段名，默认 'current' */
  pageField?: string
  /** 后端"每页大小"字段名，默认 'size' */
  pageSizeField?: string
  /** 后端"总记录数"字段名，默认 'total' */
  totalField?: string
}

/**
 * 项目侧分页入参（与 Pagination<T> 同名字段，复用约定）。
 */
export interface ProjectPageQuery {
  page?: number
  pageSize?: number
}

/** 默认字段映射（当前 v2 后端约定） */
const DEFAULT_QUERY_FIELDS = {
  pageField: 'pageIndex',
  pageSizeField: 'pageSize',
} as const

const DEFAULT_RESPONSE_FIELDS = {
  listField: 'records',
  pageField: 'current',
  pageSizeField: 'size',
  totalField: 'total',
} as const

/**
 * 把项目侧分页入参转换为后端入参格式。
 * 字段映射可通过 fieldMap 覆盖，默认对齐当前 v2 后端（pageIndex/pageSize）。
 *
 * 使用方式：业务模块的 params 与其他过滤条件一并 spread 进来，
 * 本函数只重命名分页字段，不影响 keyword / orderBy 等其他字段。
 *
 * @example
 * ```ts
 * request({
 *   url: '/list',
 *   method: 'get',
 *   params: {
 *     ...buildBackendPageQuery({ page: 1, pageSize: 10 }),
 *     keyword: 'foo', // 其他字段原样透传
 *   },
 * })
 * ```
 */
export function buildBackendPageQuery(
  query: ProjectPageQuery,
  fieldMap: PageQueryFieldMap = {}
): Record<string, number> {
  const fields = { ...DEFAULT_QUERY_FIELDS, ...fieldMap }
  return {
    [fields.pageField]: query.page ?? 1,
    [fields.pageSizeField]: query.pageSize ?? 10,
  }
}

/**
 * 把后端分页响应适配为项目内 Pagination<T>。
 * 字段映射可通过 fieldMap 覆盖，默认对齐当前 v2 后端（records/current/size/total）。
 *
 * 缺失字段走默认值（空数组 / 0 / 1 / 10），确保调用方拿到有效 Pagination 对象。
 *
 * @example 团队 B 后端（list / page / pageSize / total_records）
 * ```ts
 * adaptBackendPage<UserItem>(raw, {
 *   listField: 'list',
 *   pageField: 'page',
 *   pageSizeField: 'pageSize',
 *   totalField: 'total_records',
 * })
 * ```
 */
export function adaptBackendPage<T>(
  raw: Record<string, unknown>,
  fieldMap: PageResponseFieldMap = {}
): Pagination<T> {
  const fields = { ...DEFAULT_RESPONSE_FIELDS, ...fieldMap }
  return {
    list: (raw[fields.listField] as T[] | undefined) ?? [],
    total: (raw[fields.totalField] as number | undefined) ?? 0,
    page: (raw[fields.pageField] as number | undefined) ?? 1,
    pageSize: (raw[fields.pageSizeField] as number | undefined) ?? 10,
  }
}
