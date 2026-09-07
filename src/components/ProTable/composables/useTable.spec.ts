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
      search: {
        searchParams: ref({ name: '' }),
        serializeParams: (p: Record<string, unknown>) => p,
        getParams: () => ({ name: '' }),
      } as never,
      columns: {} as never,
      engine: ref('element-plus' as const),
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
})
