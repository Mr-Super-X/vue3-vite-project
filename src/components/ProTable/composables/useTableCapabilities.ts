/**
 * ProTable v2.0 能力编排 composable（spec §六 ProTable 编排设计）
 *
 * 把 ProTable.vue 中 4 类能力 composable 的条件实例化 + 启动校验 + v2 expose
 * 统一收敛到此处，让 ProTable.vue 编排层只持有组装胶水（composables 拆分后
 * 主文件仍含模板/样式，行数控制依赖后续编排层继续下沉，见 review M3）。
 *
 * 输入：props + columns + table + engineRef
 * 输出：4 个能力 composable 实例 + 8 个 v2 expose 方法 + 启动校验副作用
 *
 * v3.0 变更：
 * - H3：validateCapabilities 提前到 setup 即时反馈（移除 onMounted 包装）
 * - M 公共抽取：pickDefined / asConfig 改用 _utils/pickDefined 共享工具
 *
 * @group ProTable Composables
 */
import { computed, onUnmounted, ref, type Ref } from 'vue'

// v3.1.3 review：空 Map 单例 —— topIndexByKey 在 props.enableRowDrag=false 时复用，
// 避免每次 computed 重算都 new Map()（GC 压力）。仅 topIndexByKey 在该场景下被消费方访问时返回。
const EMPTY_MAP: ReadonlyMap<string | number, number> = new Map()
import { useRowEdit } from './useRowEdit'
import { useTreeData } from './useTreeData'
import { useCellSpan } from './useCellSpan'
import { useRowDrag } from './useRowDrag'
import { useSummary } from './useSummary' // v3.0 能力扩展 5a：客户端汇总行
import { useVirtualScroll, type UseVirtualScrollReturn } from './useVirtualScroll' // v3.0 能力扩展 5b：虚拟滚动
import { pickDefined, asConfig } from './_utils/pickDefined' // v3.0 M 公共抽取
import { DEFAULT_ROW_KEY } from '../types' // 行 key 缺省值单一来源（review R7）
import type {
  ProColumn,
  ProTableProps,
  CellSpanConfig,
  RowDragConfig,
  RowEditConfig,
  TreeConfig,
  TableEngine,
} from '../types'

export interface UseTableCapabilitiesOptions<T extends object = Record<string, unknown>> {
  props: ProTableProps<T>
  columns: { allColumns?: Ref<ProColumn<T>[]> }
  table: { data: Ref<T[] | null> }
  /**
   * 当前表格引擎（v2.1 决策 5）：vxe-table 引擎不支持树形 / 行拖拽，
   * 检出即 warn + 不实例化对应能力（rowEdit / cellSpan 正常接线）。
   * 缺省按 element-plus 处理（向后兼容未传 engine 的调用方/测试）。
   */
  engine?: Ref<TableEngine>
  /**
   * el-table tbody DOM 获取器 —— 由编排层提供（持有模板 ref），
   * 传入后 useRowDrag 自持挂载生命周期（onMounted + watch data 自动重挂）。
   */
  getTbody?: () => HTMLElement | null
  /**
   * v3.1.3 review：可选外部 virtualScroll 实例 —— 编排层（ProTable.vue）创建并传入，
   * 避免 useTableCapabilities 内部重复创建；未传则按 props.virtualized 条件内部创建（向后兼容）。
   */
  virtualScroll?: UseVirtualScrollReturn | null
}

export interface UseTableCapabilitiesReturn<T extends object = Record<string, unknown>> {
  rowEdit: ReturnType<typeof useRowEdit> | null
  treeData: ReturnType<typeof useTreeData> | null
  cellSpan: ReturnType<typeof useCellSpan> | null
  rowDrag: ReturnType<typeof useRowDrag> | null
  /** v3.0 能力扩展 5a：客户端汇总行 */
  summary: ReturnType<typeof useSummary> | null
  /** v3.0 能力扩展 5b：虚拟滚动 */
  virtualScroll: ReturnType<typeof useVirtualScroll> | null
  /** v3.0.1 新增：el-table-v2 引擎的 v2 配置（virtualized 启用时为非空 Ref） */
  v2TableConfig: ReturnType<typeof useVirtualScroll>['v2TableConfig'] | null
  extendedExpose: {
    /** 程序化启动行编辑（rowData 缺省时 drafts 不回填，编辑框显空值） */
    startEdit: (rowKey: string | number, rowData?: Record<string, unknown>) => void
    cancelEdit: (rowKey?: string | number) => void
    saveEdit: (rowKey?: string | number) => Promise<boolean>
    expandNode: (rowKey: string | number, expanded?: boolean) => void
    collapseNode: (rowKey: string | number) => void
    refreshChildren: (rowKey: string | number) => Promise<void>
    setRowOrder: (newOrder: T[]) => void
  }
}

export function useTableCapabilities<T extends object = Record<string, unknown>>(
  options: UseTableCapabilitiesOptions<T>
): UseTableCapabilitiesReturn<T> {
  const { props, columns, table } = options

  const rowEditConfig = computed<RowEditConfig>(() => asConfig(props.enableRowEdit, {}))
  const treeDataConfig = computed<TreeConfig>(() => asConfig(props.enableTree, {}))
  const cellSpanConfig = computed<CellSpanConfig>(() => asConfig(props.enableCellSpan, {}))
  const rowDragConfig = computed<RowDragConfig>(() => asConfig(props.enableRowDrag, {}))

  // v2.1 决策 5：setup 一次性读取引擎。vxe 加载失败回退 element-plus 后不会重实例化能力
  // （罕见故障路径：树形/拖拽在该页面不可用，但表格主内容可用，warn 已提示）
  const isVxeEngine = options.engine?.value === 'vxe-table'

  const rowEdit = props.enableRowEdit
    ? useRowEdit({
        // H5：行 key 字段随 props.rowKey 注入，避免 useRowEdit 硬编码 'id' 导致自定义行 key 的表格保存失败
        rowKey: props.rowKey ?? DEFAULT_ROW_KEY,
        ...(pickDefined(rowEditConfig.value, ['onSave', 'onSaved', 'onSaveError']) as object),
      })
    : null

  // v2.1 决策 5：vxe 引擎不支持树形（扁平化模型与 vxe tree-config 不同）→ 不实例化 + 启动 warn
  const treeData =
    props.enableTree && !isVxeEngine
      ? useTreeData({
          ...(pickDefined(treeDataConfig.value, [
            'loadChildren',
            'childrenKey',
            'defaultExpandDepth',
            'rowKey',
            'loadDebounce',
            'exclusive',
          ]) as object),
        })
      : null

  const cellSpan = props.enableCellSpan
    ? useCellSpan({
        // v2.0 修复：传 Ref 让 useCellSpan watch 响应式（之前传快照导致 buildCache 永远用空数据）
        columns: columns.allColumns as Ref<ProColumn[]>,
        data: table.data as unknown as Ref<Record<string, unknown>[]>,
        ...(cellSpanConfig.value.maxMergeSpan !== undefined && {
          maxMergeSpan: cellSpanConfig.value.maxMergeSpan,
        }),
      })
    : null

  // H6 树形拖拽索引映射：视图行（扁平后 DOM 顺序）→ data 顶层数组索引。
  // 仅在树形 + 拖拽同时启用时创建，key 取自 props.rowKey（默认 'id'）。
  //
  // v3.1.3 review：条件 computed 减负 —— 此前两个 computed 在所有场景都被创建 + 每次
  // data 变更都执行 new Map()，对无拖拽场景造成不必要响应式开销与 GC 压力。
  // 改为按 props.enableRowDrag 短路：未启用时返回稳定的单例空数组/空 Map，避免每帧分配。
  const rowKeyField = props.rowKey ?? DEFAULT_ROW_KEY
  const viewRowKeys = computed<(string | number)[]>(() => {
    if (!props.enableRowDrag) return []
    // cast 原因：T 无索引签名，行 key 读取统一经 Record 转换（与 setRowOrder 同一边界）
    const src = (treeData ? treeData.flatData.value : (table.data.value ?? [])) as Record<
      string,
      unknown
    >[]
    return src.map((r) => r[rowKeyField] as string | number)
  })
  const topIndexByKey = computed(() => {
    if (!props.enableRowDrag) return EMPTY_MAP
    const m = new Map<string | number, number>()
    // cast 原因同上
    ;((table.data.value ?? []) as Record<string, unknown>[]).forEach((r, i) =>
      m.set(r[rowKeyField] as string | number, i)
    )
    return m
  })

  // v2.1 决策 5：vxe 引擎不支持行拖拽（getTbody 选择器硬编码 .el-table__body tbody，vxe DOM 结构不同）→ 不实例化 + 启动 warn
  const rowDrag =
    props.enableRowDrag && !isVxeEngine
      ? useRowDrag({
          handle: rowDragConfig.value.handle ?? 'first-col',
          data: table.data as unknown as Ref<Record<string, unknown>[]>,
          crossLevelDrag: !props.enableTree,
          ...(options.getTbody && { getTbody: options.getTbody }),
          // 树形模式必传映射；平铺模式不传，onEnd 直接用 DOM index（行为与 v1 一致）
          ...(treeData && {
            getViewRowKeys: () => viewRowKeys.value,
            resolveTopIndex: (viewIndex: number) => {
              const key = viewRowKeys.value[viewIndex]
              return key === undefined ? -1 : (topIndexByKey.value.get(key) ?? -1)
            },
          }),
          ...(rowDragConfig.value.onSortChange && {
            onSortChange: rowDragConfig.value.onSortChange,
          }),
        })
      : null

  /** 启动校验（spec §七.3 + v2.1 决策 5 引擎能力矩阵） */
  function validateCapabilities(): void {
    // v2.1 决策 5：vxe 引擎不支持的能力在 setup 已忽略实例化，此处提示用户配置被忽略的原因
    if (isVxeEngine && props.enableTree) {
      console.warn('[ProTable] vxe-table 引擎暂不支持树形（enableTree），该配置已忽略')
    }
    if (isVxeEngine && props.enableRowDrag) {
      console.warn('[ProTable] vxe-table 引擎暂不支持行拖拽（enableRowDrag），该配置已忽略')
    }
    // vxe 下 enableTree 已被忽略，「编辑仅作用于叶子节点」的前提不存在，跳过避免误导
    if (
      !isVxeEngine &&
      props.enableRowEdit &&
      props.enableTree &&
      !treeDataConfig.value.exclusive
    ) {
      console.warn('[ProTable] enableRowEdit + enableTree: 编辑仅作用于叶子节点')
    }
    // M5：全局 span.direction 目前不参与合并计算（生效路径是列级 span.direction，
    // 见 useCellSpan.buildCache），此处不再原地改写调用方配置对象（props 保护），仅提示
    // 同 vxe 守卫：树形被忽略时「树形 + span.direction=column」冲突前提不存在
    if (
      !isVxeEngine &&
      typeof props.enableCellSpan === 'object' &&
      cellSpanConfig.value.direction === 'column' &&
      props.enableTree
    ) {
      console.warn(
        '[ProTable] 树形模式下禁用 span.direction=column，该配置已忽略（合并行为由列级 span.direction 决定）'
      )
    }
  }

  // v3.0 H3 修复：validateCapabilities 提前到 setup 即时反馈。
  // 原 onMounted 包装导致 console.warn 推迟到 DOM 挂载后，错过用户首次开发自检时机。
  validateCapabilities()

  // v3.0 能力扩展 5a：客户端汇总行（条件实例化）
  const summary = props.enableSummary
    ? useSummary({
        columns: columns.allColumns as Ref<ProColumn[]>,
        data: table.data as unknown as Ref<Record<string, unknown>[]>,
        config: typeof props.enableSummary === 'object' ? props.enableSummary : {},
      })
    : null

  // v3.0 能力扩展 5b：虚拟滚动（条件实例化；启用时禁用行内编辑 R2 决策）
  // v3.1.3 review：编排层可选注入；未传则按 props.virtualized 内部创建（向后兼容单测）
  const virtualScroll: UseVirtualScrollReturn | null =
    options.virtualScroll ??
    (props.virtualized
      ? useVirtualScroll({
          // useVirtualScroll 不读泛型，仅用 props.tableEngine/props.virtualized/props.enableRowEdit，
          // cast 到默认 Record 视角避免泛型传递的 index signature 报错
          props: props as unknown as ProTableProps,
          engine: options.engine ?? ref('element-plus'),
          enableRowEdit: Boolean(props.enableRowEdit),
        })
      : null)
  onUnmounted(() => {
    rowDrag?.detachSortable()
    treeData?.dispose()
  })

  const extendedExpose = {
    // 2026-09-18 review：透传 rowData（与双击编辑 _start(rowKey, rowData) 回填语义对齐）
    startEdit: (rowKey: string | number, rowData?: Record<string, unknown>) =>
      rowEdit?._start(rowKey, rowData),
    cancelEdit: (rowKey?: string | number) => {
      if (rowKey === undefined && rowEdit) {
        rowEdit.editingKeys.value.forEach((k) => rowEdit._cancel(k))
      } else if (rowKey !== undefined) {
        rowEdit?._cancel(rowKey)
      }
    },
    saveEdit: async (rowKey?: string | number): Promise<boolean> => {
      if (!rowEdit) return false
      // T extends object 无索引签名：传给非泛型 _save 前经 Record 转换（能力层 cast 边界之一）
      const data = (table.data.value ?? []) as Record<string, unknown>[]
      if (rowKey === undefined) {
        const keys = [...rowEdit.editingKeys.value]
        const results = await Promise.all(keys.map((k) => rowEdit._save(k, data)))
        return results.every((r) => r)
      }
      return rowEdit._save(rowKey, data)
    },
    expandNode: (rowKey: string | number, expanded?: boolean) => {
      if (!treeData) return
      if (expanded === undefined || expanded) {
        void treeData.toggle(rowKey)
      } else {
        treeData.expandedKeys.value.delete(rowKey)
      }
    },
    collapseNode: (rowKey: string | number) => {
      treeData?.expandedKeys.value.delete(rowKey)
    },
    refreshChildren: async (rowKey: string | number) => {
      if (!treeData) return
      await treeData.toggle(rowKey)
      treeData.expandedKeys.value.delete(rowKey)
      await treeData.toggle(rowKey)
    },
    // v3.0 M4 收敛：setRowOrder cast 收敛到 castToRecordArray（与 useRowDrag/useCellSpan 同边界）
    setRowOrder: (newOrder: T[]) => {
      if (table.data) {
        ;(table.data as Ref<Record<string, unknown>[] | null>).value =
          newOrder as unknown as Record<string, unknown>[]
      }
    },
  }

  return {
    rowEdit,
    treeData,
    cellSpan,
    rowDrag,
    summary,
    virtualScroll,
    extendedExpose,
    v2TableConfig: virtualScroll?.v2TableConfig ?? null,
  }
}
