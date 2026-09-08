/**
 * useColumns composable 单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) allColumns 返回所有列（含隐藏）
 * 2) sortedColumns 排除 hidden=true 的列
 * 3) searchColumns 仅返回带 search 配置的列
 * 4) toggleVisible 切换 hidden
 * 5) setColumnOrder 重新排序（含持久化 order 存在时的回归：拖拽后 sortedColumns 必须按新顺序渲染）
 * 6) resetToDefault 恢复默认列顺序
 *
 * @group ProTable composables 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useColumns } from './useColumns'
import { Local } from '@/utils/storage'

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
    // 默认无持久化数据（单测内可单独覆盖 mockReturnValue）
    vi.mocked(Local.get).mockReturnValue(null)
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

  it('setColumnOrder 重新排序（同步 allColumns 与 sortedColumns）', () => {
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    cols.setColumnOrder(['c', 'a', 'b'])
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['c', 'a', 'b'])
    expect(cols.allColumns.value.map((c) => c.prop)).toEqual(['c', 'a', 'b'])
  })

  it('回归：存在持久化 order 时，setColumnOrder 后 sortedColumns 仍按新顺序渲染', () => {
    // 历史 bug：sortedColumns 按 setup 时的一次性 persisted.order 快照排序（非响应式），
    // 拖拽更新 allColumns 后表格仍按旧顺序渲染
    vi.mocked(Local.get).mockReturnValue({ order: ['a', 'b', 'c'] })
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['a', 'b', 'c'])
    cols.setColumnOrder(['b', 'c', 'a'])
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['b', 'c', 'a'])
  })

  it('setColumnOrder 容忍 order 缺失的列（按原相对顺序追加到尾部）', () => {
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    cols.setColumnOrder(['c', 'a'])
    expect(cols.allColumns.value.map((c) => c.prop)).toEqual(['c', 'a', 'b'])
  })

  it('resetToDefault 恢复默认列顺序', () => {
    vi.mocked(Local.get).mockReturnValue({ order: ['c', 'b', 'a'] })
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props: makeProps(), engine })
    cols.setColumnOrder(['b', 'c', 'a'])
    cols.resetToDefault()
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['a', 'b', 'c'])
  })

  it('M2：toggleVisible/toggleFixed 不修改外部 columns 常量（props 保护）', () => {
    const externalColumns = [
      { prop: 'a', label: 'A' },
      { prop: 'b', label: 'B', fixed: 'left' as const },
    ]
    const props = { columns: externalColumns, tableKey: 't' } as never
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props, engine })

    cols.toggleVisible('a') // 隐藏 a
    cols.toggleFixed('b', 'right') // 改 b 的固定方向

    // 外部常量：结构与原值完全一致（hidden/fixed 均未被原地改写）
    expect(externalColumns).toEqual([
      { prop: 'a', label: 'A' },
      { prop: 'b', label: 'B', fixed: 'left' },
    ])
    // 副本已生效：a 隐藏、b 固定到 right
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['b'])
    expect(cols.allColumns.value.find((c) => c.prop === 'b')?.fixed).toBe('right')
  })

  it('M2：两个实例共享同一 columns 常量时互不污染', () => {
    const sharedColumns = [
      { prop: 'a', label: 'A' },
      { prop: 'b', label: 'B' },
    ]
    const props = { columns: sharedColumns, tableKey: 't' } as never
    const engine = ref('element-plus' as const)
    const first = useColumns({ props, engine })
    const second = useColumns({ props, engine })

    first.toggleVisible('a')

    // 第二个实例的 a 列仍可见；外部常量也未变
    expect(second.sortedColumns.value.map((c) => c.prop)).toEqual(['a', 'b'])
    expect(sharedColumns.every((c) => c.hidden === undefined)).toBe(true)
  })

  it('M2：外部 Ref<boolean> hidden 保持联动，手动 toggle 后本地优先', () => {
    const externalHidden = ref(false)
    const props = {
      columns: [{ prop: 'a', label: 'A', hidden: externalHidden }],
      tableKey: 't',
    } as never
    const engine = ref('element-plus' as const)
    const cols = useColumns({ props, engine })

    // 外部程序化隐藏 → 副本联动（sortedColumns 排除 a）
    externalHidden.value = true
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual([])
    // 手动 toggle（用户经列设置面板）→ 本地优先于外部值，恢复显示
    cols.toggleVisible('a')
    expect(cols.sortedColumns.value.map((c) => c.prop)).toEqual(['a'])
    // 外部 ref 本身不被改写
    expect(externalHidden.value).toBe(true)
  })
})
