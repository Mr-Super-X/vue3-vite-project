/**
 * useColumns composable 单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) allColumns 返回所有列（含隐藏）
 * 2) sortedColumns 排除 hidden=true 的列
 * 3) searchColumns 仅返回带 search 配置的列
 * 4) toggleVisible 切换 hidden
 * 5) reorderColumns 重新排序
 *
 * @group ProTable composables 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useColumns } from './useColumns'

// mock Local（plan critical review #5：Local 不在 auto-import，显式 mock 模块）
vi.mock('@/utils/storage', () => ({
  Local: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    remove: vi.fn(),
  },
}))

describe('useColumns', () => {
  const makeProps = () =>
    ({
      columns: [
        { prop: 'a', label: 'A' },
        { prop: 'b', label: 'B', hidden: false },
        { prop: 'c', label: 'C' },
      ],
      tableKey: 'test',
    }) as never

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allColumns 返回所有列（含隐藏）', () => {
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    expect(cols.allColumns.value).toHaveLength(3)
  })

  it('sortedColumns 排除 hidden=true 的列', () => {
    const props = {
      columns: [
        { prop: 'a', label: 'A' },
        { prop: 'b', label: 'B', hidden: true },
        { prop: 'c', label: 'C' },
      ],
      tableKey: 't',
    } as never
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props, engine })
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['a', 'c'])
  })

  it('searchColumns 仅返回带 search 配置的列', () => {
    const props = {
      columns: [
        { prop: 'a', label: 'A', search: { el: 'input' } },
        { prop: 'b', label: 'B' },
      ],
      tableKey: 't',
    } as never
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props, engine })
    expect(cols.searchColumns.map((c) => c.prop)).toEqual(['a'])
  })

  it('toggleVisible 切换 hidden', () => {
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    cols.toggleVisible('a')
    expect(cols.sortedColumns.value.find((c) => c.prop === 'a')).toBeUndefined()
  })

  it('reorderColumns 重新排序', () => {
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    cols.reorderColumns({ from: 'a', to: 'c' })
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['b', 'a', 'c'])
  })
})
