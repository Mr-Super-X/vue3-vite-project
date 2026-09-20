/**
 * useProTableEvents composable 单元测试（v3.5 PR2 新增）
 *
 * 覆盖场景：
 * 1) handleFilterChange 调用 table.setFilter（更新 filterState）
 * 2) handleFilterChange emit('filter-change', newFilters)
 * 3) 多次 handleFilterChange emit 顺序正确
 *
 * 仅覆盖 PR2 新增 API；既有 handleSortChange / handleSelectionChange 等行为由
 * ProTable.integration.spec.ts（端到端 mount 触发）覆盖。
 *
 * @group ProTable composables 测试
 */
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useProTableEvents } from './useProTableEvents'
import type { FilterValuesMap, SortState } from '../types'

describe('useProTableEvents v3.5 PR2', () => {
  const makeDeps = () => {
    const setFilter = vi.fn()
    const resetFilter = vi.fn()
    const sortState = ref<SortState | null>(null)
    const onSortChange = vi.fn()
    return {
      table: {
        page: ref(1),
        pageSize: ref(10),
        selectedRows: ref([]),
        sortState,
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        setDensity: vi.fn(),
        onSortChange,
        setSelectedRows: vi.fn(),
        setFilter,
        resetFilter,
      } as never,
      columns: {
        sortedColumns: ref([]),
        colSettingVisible: ref(false),
        setVisibleKeys: vi.fn(),
        setColumnOrder: vi.fn(),
      } as never,
      search: { updateParams: vi.fn() } as never,
      treeData: null,
      rowEdit: null,
      engine: {
        effectiveEngine: ref('element-plus' as const),
        proTableVxe: ref(null),
      } as never,
      emit: vi.fn() as never,
      setFilter,
      resetFilter,
    }
  }

  it('handleFilterChange 调用 table.setFilter（更新 filterState 通道）', () => {
    const deps = makeDeps()
    const events = useProTableEvents(deps)
    const newFilters: FilterValuesMap = { status: ['paid'], dept: ['tech'] }
    events.handleFilterChange(newFilters)
    expect(deps.setFilter).toHaveBeenCalledTimes(1)
    expect(deps.setFilter).toHaveBeenCalledWith(newFilters)
  })

  it('handleFilterChange emit filter-change 事件，payload 为 newFilters', () => {
    const deps = makeDeps()
    const events = useProTableEvents(deps)
    const newFilters: FilterValuesMap = { status: ['paid'] }
    events.handleFilterChange(newFilters)
    expect(deps.emit).toHaveBeenCalledWith('filter-change', newFilters)
  })

  it('多次 handleFilterChange：setFilter 与 emit 调用次数与顺序一致', () => {
    const deps = makeDeps()
    const events = useProTableEvents(deps)
    const f1: FilterValuesMap = { status: ['paid'] }
    const f2: FilterValuesMap = { dept: ['tech'] }
    events.handleFilterChange(f1)
    events.handleFilterChange(f2)
    expect(deps.setFilter).toHaveBeenNthCalledWith(1, f1)
    expect(deps.setFilter).toHaveBeenNthCalledWith(2, f2)
    expect(deps.emit).toHaveBeenNthCalledWith(1, 'filter-change', f1)
    expect(deps.emit).toHaveBeenNthCalledWith(2, 'filter-change', f2)
  })

  it('handleFilterChange({})：清空筛选（调用方清空列筛选项时）', () => {
    const deps = makeDeps()
    const events = useProTableEvents(deps)
    events.handleFilterChange({})
    expect(deps.setFilter).toHaveBeenCalledWith({})
    expect(deps.emit).toHaveBeenCalledWith('filter-change', {})
  })
})
