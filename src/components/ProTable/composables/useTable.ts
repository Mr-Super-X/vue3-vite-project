/**
 * useTable —— 数据/分页/loading/多选（spec §六数据流 / §九错误处理 #1-#5）
 *
 * 职责：
 * - 包装 useRequest（CLAUDE.md §1.5 强制封装；AbortController + 三态）
 * - 内部维护 searchParams（从 props.columns.search.defaultValue 初始化）
 * - 序列化搜索参数（剔除 undefined/null/''，保留 0/false，附录 A #10）
 * - 管理分页（page / pageSize / total）
 * - 多选 selectedRows（按 row-key 去重；reserve-selection 由 el-table 自带）
 * - expose：refresh / clearSelection / getSelectedRows / tableRef
 *
 * **独立 searchParams 设计**：
 * 不再依赖 useSearch 的 searchParams，避免 useSearch ↔ useTable 循环依赖。
 * ProTable.vue 通过 fetchHook 闭包让 useSearch.search/reset 触发 useTable.refresh。
 *
 * @see [`@/composables/useRequest`](../../composables/useRequest.ts) 请求封装
 * @see [`./useSearch`](./useSearch.ts) 共享 fetchHook 闭包
 * @group ProTable composables
 */
import { ref, computed, watch, onMounted, type ComponentPublicInstance, type Ref } from 'vue'
import { useRequest } from '@composables/useRequest' // 项目 composable auto-import
import type { ProTableProps, TableDensity, TableEngine } from '../types'

export interface UseTableOptions {
  props: ProTableProps
  /** 列上下文（useColumns 返回值） */
  columns: { allColumns?: Ref<unknown[]>; sortedColumns?: Ref<unknown[]> }
  engine: Ref<TableEngine>
}

export interface UseTableReturn {
  data: Ref<Record<string, unknown>[] | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  total: Ref<number>
  page: Ref<number>
  pageSize: Ref<number>
  selectedRows: Ref<Record<string, unknown>[]>
  density: Ref<TableDensity>
  tableRef: Ref<ComponentPublicInstance | null>
  searchParams: Ref<Record<string, unknown>>
  /** v2.0 编辑态行 key 集合（由 useRowEdit 接管） */
  editingKeys: Ref<Set<string | number>>
  /** v2.0 树形展开 key 集合（由 useTreeData 接管） */
  treeExpandedKeys: Ref<Set<string | number>>
  /** v2.0 是否处于树形模式 */
  isTreeMode: Ref<boolean>
  refresh: () => Promise<void>
  clearSelection: () => void
  getSelectedRows: () => Record<string, unknown>[]
  setSelectedRows: (rows: Record<string, unknown>[]) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setDensity: (d: TableDensity) => void
  setSearchParams: (params: Record<string, unknown>) => void
  resetSearchParams: () => void
}

export function useTable(options: UseTableOptions): UseTableReturn {
  const { props } = options

  // 内部 searchParams：从 props.columns.search.defaultValue 初始化（不依赖 useSearch）
  const initialSearchParams: Record<string, unknown> = { ...(props.initParam ?? {}) }
  for (const col of props.columns) {
    if (col.search) {
      initialSearchParams[col.prop] = col.search.defaultValue ?? null
    }
  }
  const searchParams = ref<Record<string, unknown>>(initialSearchParams)

  /** 序列化参数（剔除 undefined/null/''，保留 0/false） */
  function serializeParams(params: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      out[key] = value
    }
    return out
  }

  const data = ref<Record<string, unknown>[] | null>(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(props.pageSize ?? 10)
  const selectedRows = ref<Record<string, unknown>[]>([])
  const tableRef = ref<ComponentPublicInstance | null>(null)
  const density = ref<TableDensity>(props.density ?? 'default')

  // v2.0 状态字段（由 ProTable.vue 接入 useRowEdit / useTreeData 后接管写入）
  const editingKeys = ref<Set<string | number>>(new Set())
  const treeExpandedKeys = ref<Set<string | number>>(new Set())
  const isTreeMode = computed(() => !!props.enableTree)

  // useRequest 包装（AbortController 内置；spec §九 #5 快速连续取消）
  const request = useRequest(
    async () => {
      const params = serializeParams({
        ...searchParams.value,
        pageNum: page.value,
        pageSize: pageSize.value,
      })
      return await props.requestApi(params)
    },
    {
      immediate: false,
      onSuccess: (result) => {
        const rawData = result.data ?? []
        data.value = props.dataCallback ? props.dataCallback(rawData) : rawData
        total.value = result.total ?? 0
      },
      onError: (err: unknown) => {
        data.value = []
        total.value = 0
        props.requestError?.(err)
      },
    }
  )

  async function refresh(): Promise<void> {
    await request.execute()
  }

  function setPage(p: number): void {
    page.value = p
  }

  function setPageSize(size: number): void {
    pageSize.value = size
    page.value = 1
  }

  function setSelectedRows(rows: Record<string, unknown>[]): void {
    // 按 row-key 去重（spec §九 #13 守卫：row-key 缺失时不报错）
    const key = props.rowKey
    if (!key) {
      selectedRows.value = [...rows]
      return
    }
    const seen = new Set<string>()
    const unique: Record<string, unknown>[] = []
    for (const row of rows) {
      const k = String(row[key])
      if (seen.has(k)) continue
      seen.add(k)
      unique.push(row)
    }
    selectedRows.value = unique
  }

  function clearSelection(): void {
    selectedRows.value = []
  }

  function getSelectedRows(): Record<string, unknown>[] {
    return [...selectedRows.value]
  }

  function setDensity(d: TableDensity): void {
    density.value = d
  }

  /** 程序化设置搜索参数（ProTable.vue 通过 fetchHook 触发刷新） */
  function setSearchParams(params: Record<string, unknown>): void {
    Object.assign(searchParams.value, params)
  }

  /** 重置搜索参数到 defaultValue */
  function resetSearchParams(): void {
    const reset: Record<string, unknown> = { ...(props.initParam ?? {}) }
    for (const col of props.columns) {
      if (col.search) {
        reset[col.prop] = col.search.defaultValue ?? null
      }
    }
    searchParams.value = reset
  }

  // 首次 mount 触发请求
  onMounted(() => {
    void refresh()
  })

  // page / pageSize 变化时自动触发刷新
  watch([page, pageSize], () => {
    void refresh()
  })

  return {
    data,
    loading: request.loading as Ref<boolean>,
    error: request.error as Ref<Error | null>,
    total,
    page,
    pageSize,
    selectedRows,
    density,
    tableRef,
    searchParams,
    editingKeys,
    treeExpandedKeys,
    isTreeMode,
    refresh,
    clearSelection,
    getSelectedRows,
    setSelectedRows,
    setPage,
    setPageSize,
    setDensity,
    setSearchParams,
    resetSearchParams,
  }
}
