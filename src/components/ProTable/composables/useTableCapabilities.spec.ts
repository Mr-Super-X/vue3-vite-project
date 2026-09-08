/**
 * useTableCapabilities 单元测试
 *
 * 验证：4 能力条件启用 / 启动校验 / v2 expose 方法转发
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useTableCapabilities } from './useTableCapabilities'

describe('useTableCapabilities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('所有能力 prop 未启用时 4 个 composable 全部为 null', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    expect(result.rowEdit).toBeNull()
    expect(result.treeData).toBeNull()
    expect(result.cellSpan).toBeNull()
    expect(result.rowDrag).toBeNull()
  })

  it('enableRowEdit=true 时 rowEdit composable 被实例化', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
        enableRowEdit: true,
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    expect(result.rowEdit).not.toBeNull()
  })

  it('enableRowEdit=false 时 rowEdit composable 不实例化', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
        enableRowEdit: false,
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    expect(result.rowEdit).toBeNull()
  })

  it('enableCellSpan=true 时 cellSpan composable 被实例化', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
        enableCellSpan: true,
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    expect(result.cellSpan).not.toBeNull()
  })

  it('v2Expose.startEdit 在 rowEdit 未启用时为 noop', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    expect(() => result.v2Expose.startEdit('row-1')).not.toThrow()
  })

  it('v2Expose.saveEdit 在 rowEdit 未启用时返回 false', async () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    const r = await result.v2Expose.saveEdit('row-1')
    expect(r).toBe(false)
  })

  it('v2Expose.expandNode 在 treeData 未启用时为 noop', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref([]) },
    })
    expect(() => result.v2Expose.expandNode('row-1')).not.toThrow()
    expect(() => result.v2Expose.collapseNode('row-1')).not.toThrow()
  })

  it('v2Expose.setRowOrder 在未挂载 table 时为 noop', () => {
    const result = useTableCapabilities({
      props: {
        columns: [],
        requestApi: async () => ({ data: [], total: 0, pageNum: 1, pageSize: 10 }),
      } as never,
      columns: { allColumns: ref([]) },
      table: { data: ref(null) },
    })
    expect(() => result.v2Expose.setRowOrder([])).not.toThrow()
  })
})
