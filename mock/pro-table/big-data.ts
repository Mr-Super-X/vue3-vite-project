/**
 * ProTable 虚拟滚动 mock 数据（v3.0.1 升级：10 万行 × 10 列含固定列）
 *
 * 数据规模选择依据：
 * - v1 引擎（el-table）在 3000 行流畅、10000 行卡顿
 * - v2 引擎（el-table-v2）目标支持 10 万行 × 10 列，首屏 < 1s，滚动 avgFPS ≥ 100
 *
 * @group ProTable Mock 数据
 */

export interface BigRow {
  /** ID —— 左固定列 */
  id: number
  /** 姓名 */
  name: string
  /** 邮箱 */
  email: string
  /** 部门 —— 左固定列 */
  department: string
  /** 状态：active / inactive */
  status: 'active' | 'inactive'
  /** 评分（用于排序） */
  score: number
  /** 城市 */
  city: string
  /** 入职日期 ISO string */
  joinDate: string
  /** 等级（用于排序） */
  level: number
  /** 备注 */
  remark: string
}

/** 列表请求参数 —— 与 useTable fetchHook 兼容（pageNum / pageSize / keyword / orderByColumn / isAsc） */
interface BigDataRequest {
  pageNum?: number
  pageSize?: number
  keyword?: string
  orderByColumn?: string
  isAsc?: string
}

const DEPARTMENTS = [
  '研发部',
  '产品部',
  '设计部',
  '运营部',
  '市场部',
  '销售部',
  '人事部',
  '财务部',
] as const
const CITIES = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '成都',
  '武汉',
  '南京',
  '西安',
  '苏州',
] as const
const STATUSES: Array<'active' | 'inactive'> = ['active', 'inactive']

function makeBigRow(i: number): BigRow {
  const id = i + 1
  // 非空断言：i 模 length 永远 ≤ length-1，DEPARTMENTS[i%N] 必返回有效值
  const dept = DEPARTMENTS[i % DEPARTMENTS.length]!
  const city = CITIES[i % CITIES.length]!
  const status = STATUSES[i % STATUSES.length]!
  return {
    id,
    name: `员工-${id.toString().padStart(6, '0')}`,
    email: `user${id}@example.com`,
    department: dept,
    status,
    score: Math.floor(Math.random() * 1000),
    city,
    joinDate: new Date(2020 + (i % 6), i % 12, (i % 28) + 1).toISOString().slice(0, 10),
    level: (i % 10) + 1,
    remark: i % 5 === 0 ? `备注信息-${id}` : '',
  }
}

/** 模块级一次性生成 10 万行（mock 阶段直接全量返回，不分页） */
const ALL_ROWS: BigRow[] = Array.from({ length: 100_000 }, (_, i) => makeBigRow(i))

/** 关键字过滤 */
function filterByKeyword(rows: BigRow[], keyword?: string): BigRow[] {
  if (!keyword) return rows
  const kw = String(keyword).toLowerCase()
  return rows.filter((r) => r.name.toLowerCase().includes(kw) || r.email.toLowerCase().includes(kw))
}

/** 排序 */
function sortByField(rows: BigRow[], orderBy?: string, isAsc?: string): BigRow[] {
  if (!orderBy || !isAsc) return rows
  const asc = isAsc === 'ascending'
  return [...rows].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[orderBy]
    const bv = (b as unknown as Record<string, unknown>)[orderBy]
    if (typeof av === 'number' && typeof bv === 'number') {
      return asc ? av - bv : bv - av
    }
    const as = String(av ?? '')
    const bs = String(bv ?? '')
    return asc ? as.localeCompare(bs) : bs.localeCompare(as)
  })
}

/**
 * 虚拟滚动 mock requestApi
 *
 * mock 阶段：直接全量返回 10 万行（不走分页），让虚拟化引擎自行接管滚动
 * 返回形态按 ProTableRequestApi 约定（data/total/pageNum/pageSize）
 * 生产场景：按 pageSize 分页，由后端分页
 */
export const bigDataRequestApi = async (
  params: BigDataRequest = {}
): Promise<{ data: BigRow[]; total: number; pageNum: number; pageSize: number }> => {
  // 模拟网络延迟 50ms（让骨架屏可见）
  await new Promise((resolve) => setTimeout(resolve, 50))

  const filtered = filterByKeyword(ALL_ROWS, params.keyword)
  const sorted = sortByField(filtered, params.orderByColumn, params.isAsc)
  const page = params.pageNum ?? 1
  const size = params.pageSize ?? 100_000 // mock 默认一次性返回全部
  const sliced = sorted.slice((page - 1) * size, page * size)
  return { data: sliced, total: filtered.length, pageNum: page, pageSize: size }
}
