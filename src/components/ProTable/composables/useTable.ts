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
import { ref, watch, onMounted, type ComponentPublicInstance, type Ref } from 'vue'
import { useRequest } from '@composables/useRequest' // 项目 composable auto-import
import { serializeParams } from './useSearch' // 第 1 步单源化：序列化唯一实现
import type {
  ProTableProps,
  ProTableResponse,
  SortChangeEvent,
  SortState,
  TableDensity,
  TableEngine,
} from '../types'

export interface UseTableOptions<T extends object = Record<string, unknown>> {
  props: ProTableProps<T>
  /** 列上下文（useColumns 返回值） */
  columns: { allColumns?: Ref<unknown[]>; sortedColumns?: Ref<unknown[]> }
  engine: Ref<TableEngine>
  /**
   * 读取当前搜索参数 —— 由 ProTable.vue 注入 useSearch.searchParams（单一数据源）。
   * 第 1 步单源化：useTable 不再自持 searchParams 副本（原双份 + watch 桥接导致 H1 参数错配）。
   */
  getSearchParams: () => Record<string, unknown>
}

export interface UseTableReturn<T extends object = Record<string, unknown>> {
  data: Ref<T[] | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  total: Ref<number>
  page: Ref<number>
  pageSize: Ref<number>
  selectedRows: Ref<T[]>
  density: Ref<TableDensity>
  tableRef: Ref<ComponentPublicInstance | null>
  refresh: () => Promise<void>
  clearSelection: () => void
  getSelectedRows: () => T[]
  setSelectedRows: (rows: T[]) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setDensity: (d: TableDensity) => void
  /** 当前排序状态（null = 未排序） */
  sortState: Ref<SortState<T> | null>
  /** el-table sort-change 事件入口 —— 更新状态 + 回第 1 页 + 触发请求 */
  onSortChange: (evt: SortChangeEvent) => void
  /** 排序状态快照（ProTable.vue 经此向外 emit / expose） */
  getSortState: () => SortState<T> | null
}

/**
 * 内置排序参数序列化 —— 国产后台最常用约定 { orderByColumn, isAsc }（设计决策 D2）。
 * 后端约定不同时由 props.sortParamsAdapter 接管（见类型 JSDoc）。
 */
function defaultSortParams(state: SortState | null): Record<string, unknown> {
  if (!state) return {}
  return { orderByColumn: state.prop, isAsc: state.order === 'ascending' ? 'asc' : 'desc' }
}

/**
 * 校验适配后的响应结构（M3 fail-fast，决策 D5）。
 * 抛错发生在 useRequest 的 try 内 → 被 catch 捕获进入 error 态 + requestError 回调——
 * 不静默吞、不影响组件树（AsyncState 展示错误 + 重试）。
 */
function assertValidResponse<T extends object>(result: ProTableResponse<T>): void {
  if (!result || !Array.isArray(result.data) || typeof result.total !== 'number') {
    const message =
      '[ProTable] responseAdapter 返回值结构非法：期望 { data: T[], total: number }（pageNum/pageSize 可省略）'
    console.error(message, result)
    throw new Error(message)
  }
}

export function useTable<T extends object = Record<string, unknown>>(
  options: UseTableOptions<T>
): UseTableReturn<T> {
  const { props } = options

  // Vue 对含裸泛型 T 的 ref 会套 UnwrapRefSimple<T>（静态判定不了 T 是否含 Ref 联合），
  // 需显式断言回 Ref<T[]>：仅类型层 cast，运行时仍是普通 deep ref，与泛型化前行为一致
  const data = ref<T[] | null>(null) as unknown as Ref<T[] | null>
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(props.pageSize ?? 10)
  const selectedRows = ref<T[]>([]) as unknown as Ref<T[]>
  const tableRef = ref<ComponentPublicInstance | null>(null)
  const density = ref<TableDensity>(props.density ?? 'default')

  /** 排序状态 —— 不混入 searchParams（D4：排序是表格交互状态，非表单输入，useSearch 语义保持纯净） */
  const sortState = ref<SortState<T> | null>(null)

  /** 排序参数序列化：优先业务方 adapter，缺省内置约定；未排序返回空对象（不传空键给后端） */
  function serializeSort(state: SortState<T> | null): Record<string, unknown> {
    if (!state) return {}
    if (props.sortParamsAdapter) return props.sortParamsAdapter(state)
    return defaultSortParams(state)
  }

  // useRequest 包装（AbortController 内置；spec §九 #5 快速连续取消）
  const request = useRequest(
    async () => {
      const params = serializeParams({
        ...options.getSearchParams(),
        ...serializeSort(sortState.value),
        pageNum: page.value,
        pageSize: pageSize.value,
      })
      return await props.requestApi(params)
    },
    {
      immediate: false,
      onSuccess: (result) => {
        const adapted = props.responseAdapter ? props.responseAdapter(result) : result
        assertValidResponse(adapted)
        data.value = props.dataCallback ? props.dataCallback(adapted.data) : adapted.data
        total.value = adapted.total
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

  function setSelectedRows(rows: T[]): void {
    // 按 row-key 去重（spec §九 #13 守卫：row-key 缺失时不报错）
    const key = props.rowKey
    if (!key) {
      selectedRows.value = [...rows]
      return
    }
    const seen = new Set<string>()
    const unique: T[] = []
    for (const row of rows) {
      // T extends object 无索引签名：行字段读取统一经 Record 转换（本文件唯一 cast 点）
      const k = String((row as Record<string, unknown>)[key])
      if (seen.has(k)) continue
      seen.add(k)
      unique.push(row)
    }
    selectedRows.value = unique
  }

  function clearSelection(): void {
    selectedRows.value = []
  }

  function getSelectedRows(): T[] {
    return [...selectedRows.value]
  }

  function setDensity(d: TableDensity): void {
    density.value = d
  }

  /**
   * el-table sort-change 事件入口（M2 服务端排序）。
   * 三连点语义由 el-table 提供（asc → desc → null）；order=null 清除排序。
   * 排序变化回第 1 页（与搜索同语义）：page 未变时须手动刷新（watch 不触发）。
   */
  function onSortChange(evt: SortChangeEvent): void {
    sortState.value = evt.order && evt.prop ? { prop: evt.prop, order: evt.order } : null
    if (page.value !== 1) {
      page.value = 1
    } else {
      void refresh()
    }
  }

  function getSortState(): SortState<T> | null {
    return sortState.value
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
    refresh,
    clearSelection,
    getSelectedRows,
    setSelectedRows,
    setPage,
    setPageSize,
    setDensity,
    sortState,
    onSortChange,
    getSortState,
  }
}
