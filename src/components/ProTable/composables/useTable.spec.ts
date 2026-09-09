/**
 * useTable composable 单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) refresh() 主动触发 requestApi
 * 2) refresh() 后 loading 关闭
 * 3) setPage 触发 watch → refresh
 * 4) 快速连续 refresh 取消上一次请求（AbortController，spec §九 #5）
 * 5) getSelectedRows 返回按 row-key 去重的选中
 * 6) clearSelection 清空 selectedRows
 *
 * 注：useTable 内部用 onMounted + watch 触发 refresh。composable 单测环境无 component context，
 * 所以测试主动调用 refresh() 验证行为。
 *
 * @group ProTable composables 测试
 */
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useTable } from './useTable'
import type { SortState } from '../types'

describe('useTable', () => {
  const makeDeps = () => {
    const requestApi = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'a' }],
      total: 1,
      pageNum: 1,
      pageSize: 10,
    })
    return {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        requestApi,
        pageSize: 10,
        rowKey: 'id',
      } as never,
      columns: {} as never,
      engine: ref('element-plus' as const),
      getSearchParams: () => ({ name: '' }),
    }
  }

  it('refresh() 调用 requestApi 并填充 data / total', async () => {
    const deps = makeDeps()
    const table = useTable(deps)
    await table.refresh()
    expect(deps.props.requestApi).toHaveBeenCalledTimes(1)
    expect(table.data.value).toEqual([{ id: 1, name: 'a' }])
    expect(table.total.value).toBe(1)
  })

  it('refresh() 后 loading 关闭', async () => {
    const deps = makeDeps()
    const table = useTable(deps)
    await table.refresh()
    expect(table.loading.value).toBe(false)
  })

  it('setPage 触发 watch → refresh + 更新 page', async () => {
    const deps = makeDeps()
    const table = useTable(deps)
    await table.refresh()
    expect(deps.props.requestApi).toHaveBeenCalledTimes(1)
    table.setPage(2)
    await vi.waitFor(() => expect(deps.props.requestApi).toHaveBeenCalledTimes(2))
    expect(table.page.value).toBe(2)
  })

  it('快速连续 refresh：第二次覆盖第一次结果（useRequest AbortController）', async () => {
    const deps = makeDeps()
    deps.props.requestApi = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }], total: 1, pageNum: 1, pageSize: 10 })
      .mockResolvedValueOnce({ data: [{ id: 99 }], total: 99, pageNum: 1, pageSize: 10 })
    const table = useTable(deps)
    const p1 = table.refresh()
    const p2 = table.refresh()
    await Promise.all([p1, p2])
    // 第二次请求的 data 应该覆盖
    expect(table.data.value).toEqual([{ id: 99 }])
    expect(table.total.value).toBe(99)
  })

  it('refresh() 使用 getSearchParams 返回值组装请求参数（含分页 + 序列化）', async () => {
    const deps = makeDeps()
    deps.getSearchParams = () => ({ name: '张三', empty: '', nil: null })
    const table = useTable(deps)
    await table.refresh()
    expect(deps.props.requestApi).toHaveBeenCalledWith({
      name: '张三',
      pageNum: 1,
      pageSize: 10,
    })
  })

  it('getSelectedRows 返回按 row-key 去重的选中', () => {
    const table = useTable(makeDeps())
    table.setSelectedRows([{ id: 1 }, { id: 2 }, { id: 1 }])
    expect(table.getSelectedRows()).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('clearSelection 清空 selectedRows', () => {
    const table = useTable(makeDeps())
    table.setSelectedRows([{ id: 1 }])
    table.clearSelection()
    expect(table.getSelectedRows()).toEqual([])
  })

  it('v2.2-M1：clearSelection 同步调用 el-table 实例的 clearSelection（清 UI 勾选态）', () => {
    const table = useTable(makeDeps())
    const elClearSelection = vi.fn()
    table.tableRef.value = { clearSelection: elClearSelection } as never
    table.setSelectedRows([{ id: 1 }])
    table.clearSelection()
    expect(elClearSelection).toHaveBeenCalledTimes(1)
    expect(table.getSelectedRows()).toEqual([])
  })

  it('M2：onSortChange 更新 sortState 并把排序参数并入请求（默认序列化）', async () => {
    const deps = makeDeps()
    const table = useTable(deps)
    await table.refresh()
    table.onSortChange({ prop: 'name', order: 'ascending' })
    await vi.waitFor(() => expect(deps.props.requestApi).toHaveBeenCalledTimes(2))
    // 注：getSearchParams 返回的 name:'' 被 serializeParams 剔除（附录 A #10），故不在期望内
    expect(deps.props.requestApi).toHaveBeenLastCalledWith({
      orderByColumn: 'name',
      isAsc: 'asc',
      pageNum: 1,
      pageSize: 10,
    })
    expect(table.getSortState()).toEqual({ prop: 'name', order: 'ascending' })
  })

  it('M2：第三击（order=null）清除排序状态且请求不带排序参数', async () => {
    const deps = makeDeps()
    const table = useTable(deps)
    await table.refresh()
    table.onSortChange({ prop: 'name', order: 'ascending' })
    await vi.waitFor(() => expect(deps.props.requestApi).toHaveBeenCalledTimes(2))
    table.onSortChange({ prop: 'name', order: null })
    await vi.waitFor(() => expect(deps.props.requestApi).toHaveBeenCalledTimes(3))
    expect(table.getSortState()).toBeNull()
    const last = deps.props.requestApi.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(last).not.toHaveProperty('orderByColumn')
    expect(last).not.toHaveProperty('isAsc')
  })

  it('M2：自定义 sortParamsAdapter 覆盖默认序列化', async () => {
    const deps = makeDeps()
    deps.props.sortParamsAdapter = (state: SortState) => ({
      sortBy: state.prop,
      sortOrder: state.order,
    })
    const table = useTable(deps)
    await table.refresh()
    table.onSortChange({ prop: 'name', order: 'descending' })
    await vi.waitFor(() => expect(deps.props.requestApi).toHaveBeenCalledTimes(2))
    expect(deps.props.requestApi).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'name', sortOrder: 'descending' })
    )
  })

  it('M2：排序变化回第 1 页（page>1 时只触发一次新请求）', async () => {
    const deps = makeDeps()
    const table = useTable(deps)
    await table.refresh()
    table.setPage(3)
    await vi.waitFor(() => expect(deps.props.requestApi).toHaveBeenCalledTimes(2))
    expect(table.page.value).toBe(3)
    table.onSortChange({ prop: 'name', order: 'ascending' })
    await vi.waitFor(() => expect(table.page.value).toBe(1))
    const last = deps.props.requestApi.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(last).toMatchObject({ pageNum: 1, orderByColumn: 'name' })
    // page watch 已触发刷新：确认没有二次重复请求
    await new Promise((r) => setTimeout(r, 20))
    expect(deps.props.requestApi).toHaveBeenCalledTimes(3)
  })

  it('M3：responseAdapter 映射自定义结构（records/totalCount → data/total）', async () => {
    const deps = makeDeps()
    deps.props.requestApi = vi
      .fn()
      .mockResolvedValue({ records: [{ id: 7, name: 'x' }], totalCount: 1 })
    deps.props.responseAdapter = (raw: unknown) => {
      const r = raw as { records: unknown[]; totalCount: number }
      return { data: r.records, total: r.totalCount, pageNum: 1, pageSize: 10 }
    }
    const table = useTable(deps)
    await table.refresh()
    expect(table.data.value).toEqual([{ id: 7, name: 'x' }])
    expect(table.total.value).toBe(1)
  })

  it('M3：responseAdapter 返回非法结构 → 错误态 + requestError 回调（fail-fast）', async () => {
    const deps = makeDeps()
    const onRequestError = vi.fn()
    deps.props.requestApi = vi.fn().mockResolvedValue({ wrong: true })
    deps.props.responseAdapter = () => ({ bad: 1 }) as never
    deps.props.requestError = onRequestError
    const table = useTable(deps)
    await table.refresh()
    expect(table.error.value).toBeTruthy()
    expect(String(table.error.value?.message)).toContain('结构非法')
    expect(onRequestError).toHaveBeenCalled()
  })
})
