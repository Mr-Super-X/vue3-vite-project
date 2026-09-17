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
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type ComponentPublicInstance,
  type Ref,
} from 'vue'
import { useRequest } from '@composables/useRequest' // 项目 composable auto-import
import { serializeParams } from './useSearch' // 第 1 步单源化：序列化唯一实现
import type { PersistedTableState } from './useStatePersist' // v3.1：状态保持快照（纯类型依赖，无运行时环）
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
  /**
   * v3.1：持久化快照（useStatePersist.read() 返回值）—— page/pageSize/sortState
   * 以快照为 ref 初值。必须在 useTable 创建前同步传入：之后赋值会触发 page watcher
   * 与 onMounted 首次请求双发；初值注入则 onMounted 单次请求即为恢复状态
   */
  initialState?: PersistedTableState
}

export interface UseTableReturn<T extends object = Record<string, unknown>> {
  data: Ref<T[] | null>
  /**
   * v3.1.4 review：data 的 Record 视角投影 —— 消除下游消费方「(data.value ?? []) as Record<string, unknown>[]」
   * 重复 cast。useTable 自身做 1 次类型层投影，下游（ProTable.vue 模板 / useTableCapabilities 等）
   * 直接 `table.rows.value` 使用。
   */
  rows: Ref<Record<string, unknown>[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  total: Ref<number>
  page: Ref<number>
  pageSize: Ref<number>
  selectedRows: Ref<T[]>
  density: Ref<TableDensity>
  tableRef: Ref<ComponentPublicInstance | null>
  refresh: () => Promise<void>
  /**
   * 等待当前进行中的刷新完成（无进行中请求时立即 resolve）——
   * 编排层 reset 路径（setPage 触发 watcher 刷新）使用，保证 reset() 的
   * Promise 在数据刷新完成后才 resolve（review R5）。
   */
  waitForRefresh: () => Promise<void>
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
 *
 * v3.0 M2：接受 SortState<T>（带泛型）而非 SortState（无泛型），
 * 让 state.prop 类型自动对齐 T 的键名，调用方无需 cast。
 */
function defaultSortParams<T extends object>(state: SortState<T> | null): Record<string, unknown> {
  if (!state) return {}
  return { orderByColumn: state.prop, isAsc: state.order === 'ascending' ? 'asc' : 'desc' }
}

/**
 * 校验适配后的响应结构（M3 fail-fast，决策 D5）。
 * 抛错发生在 useRequest 的 try 内 → 被 catch 捕获进入 error 态 + requestError 回调——
 * 不静默吞、不影响组件树（AsyncState 展示错误 + 重试）。
 *
 * v3.0 L1 优化：日志加 tableKey + timestamp 上下文，便于生产环境问题定位。
 */
function assertValidResponse<T extends object>(
  result: ProTableResponse<T>,
  context: { tableKey?: string } = {}
): void {
  if (!result || !Array.isArray(result.data) || typeof result.total !== 'number') {
    const ts = Date.now()
    const ctx = context.tableKey ? `[tableKey=${context.tableKey}]` : '[no-tableKey]'
    const message =
      `[ProTable]${ctx}@${ts} responseAdapter 返回值结构非法：` +
      '期望 { data: T[], total: number }（pageNum/pageSize 可省略）'
    console.error(message, result)
    throw new Error(message)
  }
}

/**
 * rowKey 缺失警告的一次性哨兵 —— setSelectedRows 会被 el-table 高频触发
 * （selection-change 每次勾选都调），每次调用都 warn 会刷屏控制台；
 * 改为模块级只提示一次（应用生命周期内首个缺失 rowKey 的实例告警，多表格场景也只报一次），
 * 行为提示能力不损失。
 */
let hasWarnedMissingRowKey = false

export function useTable<T extends object = Record<string, unknown>>(
  options: UseTableOptions<T>
): UseTableReturn<T> {
  const { props } = options

  // v3.1：持久化快照注入初值（statePersist 启用且路由返回场景；新会话为 undefined 走原默认值）
  const snapshot = options.initialState

  // v3.1.3 review：泛型 ref 的 UnwrapRefSimple 边界注释
  //
  // Vue 3.5+ 对 `ref<T>` 推断含 `UnwrapRefSimple<T>` 自动展开嵌套 ref。
  // 但 `T[] | null` 经 UnwrapRef 后类型仍正确；此处 cast 是为了规避
  // "Type 'Ref<UnwrapRefSimple<T[] | null>>' is not assignable to Ref<T[] | null>"
  // 这类 TS 编译器过度展开 —— 运行时 ref 行为不变。
  const data = ref<T[] | null>(null) as unknown as Ref<T[] | null>
  /**
   * v3.1.4 review：data 的 Record 视角投影（消除下游 cast 重复）
   * - computed 缓存 cast 结果，避免每次访问重新 cast
   * - 下游可直接 `table.rows.value` 替代 `(table.data.value ?? []) as Record<string, unknown>[]`
   * - 运行时 data / rows 是同一引用，零性能开销
   */
  const rows = computed<Record<string, unknown>[]>(
    () => (data.value ?? []) as unknown as Record<string, unknown>[]
  )
  const total = ref(0)
  const page = ref(snapshot?.page ?? 1)
  const pageSize = ref(snapshot?.pageSize ?? props.pageSize ?? 10)
  // v3.1.3 review：同上 UnwrapRefSimple cast —— selectedRows Ref<T[]>
  const selectedRows = ref<T[]>([]) as unknown as Ref<T[]>
  const tableRef = ref<ComponentPublicInstance | null>(null)
  const density = ref<TableDensity>(props.density ?? 'default')

  // v3.0.1：响应 props.density 变化（之前只读一次初始化，外部 v-model:density 更新不生效）
  // 配套处理：组件卸载时停止 watcher（H1/H2 修复同样的生命周期清理纪律）
  const stopDensityWatch = watch(
    () => props.density,
    (newDensity) => {
      if (newDensity && newDensity !== density.value) {
        density.value = newDensity
      }
    },
    { immediate: false }
  )
  onUnmounted(() => {
    stopDensityWatch()
  })

  /** 排序状态 —— 不混入 searchParams（D4：排序是表格交互状态，非表单输入，useSearch 语义保持纯净） */
  // v3.1：快照恢复时以持久化排序为初值；SortState（无泛型）→ SortState<T> 仅类型层 cast（运行时纯数据 { prop, order }）
  const sortState = ref<SortState<T> | null>(
    (snapshot?.sortState as SortState<T> | null | undefined) ?? null
  )

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
        assertValidResponse(adapted, props.tableKey ? { tableKey: props.tableKey } : {})
        data.value = props.dataCallback ? props.dataCallback(adapted.data) : adapted.data
        total.value = adapted.total
      },
      onError: (err: unknown) => {
        // 失败时保留 data / total 不清空 —— 错误展示由 useRequest 的 error ref
        // 经 AsyncState 错误态接管（与数据区互斥渲染），旧数据维持供用户查看上下文；
        // 早期实现清空 data 导致失败瞬间数据闪空 + total 归零，破坏重试连续性。
        props.requestError?.(err)
      },
    }
  )

  /**
   * 最新 in-flight 请求的 await 句柄 —— 所有刷新路径（onMounted 首次请求 /
   * page watcher / 显式 refresh）都经 execute() 统一登记到这里。
   *
   * 用途（review R5）：reset 且 page≠1 时 setPage(1) 触发的刷新由 watcher 异步发起，
   * 调用方（search.reset / setSearchParams）的 Promise 需要等待该请求完成后才 resolve。
   * useRequest.execute 的 Promise 永不 reject（错误走 onError 回调 + error ref），
   * 因此 await 本句柄不会抛出，语义安全。
   */
  let pendingRefresh: Promise<void> | null = null

  function refresh(): Promise<void> {
    pendingRefresh = request.execute()
    return pendingRefresh
  }

  /** 等待当前进行中的刷新完成（无进行中请求时立即 resolve）—— 供编排层 reset 路径使用 */
  async function waitForRefresh(): Promise<void> {
    await pendingRefresh
  }

  function setPage(p: number): void {
    page.value = p
  }

  function setPageSize(size: number): void {
    pageSize.value = size
    page.value = 1
  }

  function setSelectedRows(rows: T[]): void {
    // 按 row-key 去重（spec §九 #13 守卫：row-key 缺失时按对象引用去重兜底）
    // v3.1.4 review：原实现 rowKey 缺失时直接 `[...rows]` 不去重，
    // el-table 多次触发 selection-change 可能产生重复行污染 selectedRows
    const key = props.rowKey
    if (!key) {
      // 业务方传 props.rowKey 后可按字段去重；未传时按对象引用去重（WeakSet 防内存泄漏）
      if (!hasWarnedMissingRowKey) {
        hasWarnedMissingRowKey = true
        console.warn(
          '[ProTable] rowKey 缺失：setSelectedRows 按对象引用去重兜底，建议显式传 rowKey 启用按字段去重'
        )
      }
      const seen = new WeakSet<object>()
      selectedRows.value = rows.filter((r) => {
        const obj = r as object
        if (seen.has(obj)) return false
        seen.add(obj)
        return true
      })
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
    // v2.2-M1：同步清 el-table UI 勾选态（tableRef 由 ElementTableBody 经编排层接线；
    // vxe 引擎 / 未挂载时为 null，可选链兜底）
    ;(tableRef.value as { clearSelection?: () => void } | null)?.clearSelection?.()
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
   * 排序变化回第 1 页（与搜索同语义）：
   * - page != 1：赋 page = 1，触发下方 [page, pageSize] watch → refresh
   * - page == 1：赋值相同值不触发 watch，需显式 refresh 兜底
   * 两条路径互斥，各一次 refresh；AbortController 在 useRequest 内置防连发。
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
  // 无 immediate：onMounted 已显式首次 refresh，避免双发
  // v3.0 H1 修复：捕获 watch 返回的 stop，onUnmounted 调用避免组件卸载后
  // 请求飞行中 + ref 更新写入已销毁状态（内存泄漏 + 警告）
  const stopPageWatcher = watch([page, pageSize], () => {
    void refresh()
  })
  onUnmounted(() => {
    stopPageWatcher()
  })

  return {
    data,
    rows,
    loading: request.loading as Ref<boolean>,
    error: request.error as Ref<Error | null>,
    total,
    page,
    pageSize,
    selectedRows,
    density,
    tableRef,
    refresh,
    waitForRefresh,
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
