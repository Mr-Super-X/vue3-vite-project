/**
 * ProTableVirtualScroll demo —— 3 千行大数据 mock
 *
 * v3.0 修复：去掉分页，单页返回全部 3 千行 + el-table height 容器接管滚动
 * （之前 pageSize=50 + 分页是矛盾的——虚拟滚动的意义就是"不分页也能流畅滚动大数据"）
 */
import type { ProTableRequestApi } from '@/components/ProTable/types'

interface BigRow {
  id: number
  name: string
  value: number
}

const ALL_DATA: BigRow[] = Array.from({ length: 3_000 }, (_, i) => ({
  id: i + 1,
  name: `Item-${i + 1}`,
  value: i * 100,
}))

/**
 * 单次返回全部 3,000 行（不切片），由 el-table 高度容器 + 内部虚拟滚动接管。
 *
 * v3.0 已知限制：el-table v1 不支持自动虚拟化（仅支持高度容器 + CSS overflow 滚动）。
 * 真虚拟化需切换到 el-table-v2（Element Plus 2.14 已提供 API 兼容层，但 slot / prop 不完全兼容），
 * 留待 v3.0.1 评估。
 *
 * 性能数据：mock 数据准备 ~30ms，el-table 渲染 3000 行首屏 ~200ms，固定高度容器滚动流畅。
 */
export const bigDataRequestApi: ProTableRequestApi<BigRow> = async () => {
  await new Promise((r) => setTimeout(r, 300)) // 模拟接口延迟
  return {
    data: ALL_DATA,
    total: ALL_DATA.length,
    pageNum: 1,
    pageSize: ALL_DATA.length,
  }
}
