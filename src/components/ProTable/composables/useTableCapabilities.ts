/**
 * ProTable v2.0 能力编排 composable（spec §六 ProTable 编排设计）
 *
 * 把 ProTable.vue 中 4 类能力 composable 的条件实例化 + 启动校验 + v2 expose
 * 统一收敛到此处，让 ProTable.vue 保持 ≤400 行。
 *
 * 输入：props + columns + table + engineRef
 * 输出：4 个能力 composable 实例 + 8 个 v2 expose 方法 + 启动校验副作用
 *
 * @group ProTable Composables
 */
import { computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { Ref as RefType } from 'vue'
import { useRowEdit } from './useRowEdit'
import { useTreeData } from './useTreeData'
import { useCellSpan } from './useCellSpan'
import { useRowDrag } from './useRowDrag'
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
  columns: { allColumns?: RefType<ProColumn<T>[]> }
  table: { data: RefType<T[] | null> }
  /**
   * 当前表格引擎（v2.1 决策 5）：vxe-table 引擎不支持树形 / 行拖拽，
   * 检出即 warn + 不实例化对应能力（rowEdit / cellSpan 正常接线）。
   * 缺省按 element-plus 处理（向后兼容未传 engine 的调用方/测试）。
   */
  engine?: RefType<TableEngine>
  /**
   * el-table tbody DOM 获取器 —— 由编排层提供（持有模板 ref），
   * 传入后 useRowDrag 自持挂载生命周期（onMounted + watch data 自动重挂）。
   */
  getTbody?: () => HTMLElement | null
}

export interface UseTableCapabilitiesReturn<T extends object = Record<string, unknown>> {
  rowEdit: ReturnType<typeof useRowEdit> | null
  treeData: ReturnType<typeof useTreeData> | null
  cellSpan: ReturnType<typeof useCellSpan> | null
  rowDrag: ReturnType<typeof useRowDrag> | null
  v2Expose: {
    startEdit: (rowKey: string | number) => void
    cancelEdit: (rowKey?: string | number) => void
    saveEdit: (rowKey?: string | number) => Promise<boolean>
    expandNode: (rowKey: string | number, expanded?: boolean) => void
    collapseNode: (rowKey: string | number) => void
    refreshChildren: (rowKey: string | number) => Promise<void>
    setRowOrder: (newOrder: T[]) => void
  }
}

/**
 * 把 boolean|Config 收敛为 Config 形式
 */
function asConfig<T extends object>(v: boolean | T | undefined, fallback: T): T {
  return typeof v === 'object' && v !== null ? v : fallback
}

/**
 * 过滤 undefined 字段（exactOptionalPropertyTypes 兼容）
 * 返回 Partial<T>，配合 `as const` 配合 spread 使用
 */
function pickDefined<T extends object>(src: T, keys: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {}
  for (const k of keys) {
    if (src[k] !== undefined) out[k] = src[k]
  }
  return out
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
  const isVxe = options.engine?.value === 'vxe-table'

  const rowEdit = props.enableRowEdit
    ? useRowEdit({
        // H5：行 key 字段随 props.rowKey 注入，避免 useRowEdit 硬编码 'id' 导致自定义行 key 的表格保存失败
        rowKey: props.rowKey ?? 'id',
        ...(pickDefined(rowEditConfig.value, ['onSave', 'onSaved', 'onSaveError']) as object),
      })
    : null

  // v2.1 决策 5：vxe 引擎不支持树形（扁平化模型与 vxe tree-config 不同）→ 不实例化 + 启动 warn
  const treeData =
    props.enableTree && !isVxe
      ? useTreeData({
          ...(pickDefined(treeDataConfig.value, [
            'loadChildren',
            'childrenKey',
            'defaultExpandDepth',
            'rowKey',
            'showLine',
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
  const rowKeyField = props.rowKey ?? 'id'
  const viewRowKeys = computed<(string | number)[]>(() => {
    // cast 原因：T 无索引签名，行 key 读取统一经 Record 转换（与 setRowOrder 同一边界）
    const src = (treeData ? treeData.flatData.value : (table.data.value ?? [])) as Record<
      string,
      unknown
    >[]
    return src.map((r) => r[rowKeyField] as string | number)
  })
  const topIndexByKey = computed(() => {
    const m = new Map<string | number, number>()
    // cast 原因同上
    ;((table.data.value ?? []) as Record<string, unknown>[]).forEach((r, i) =>
      m.set(r[rowKeyField] as string | number, i)
    )
    return m
  })

  // v2.1 决策 5：vxe 引擎不支持行拖拽（getTbody 选择器硬编码 .el-table__body tbody，vxe DOM 结构不同）→ 不实例化 + 启动 warn
  const rowDrag =
    props.enableRowDrag && !isVxe
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
    if (isVxe && props.enableTree) {
      console.warn('[ProTable] vxe-table 引擎暂不支持树形（enableTree），该配置已忽略')
    }
    if (isVxe && props.enableRowDrag) {
      console.warn('[ProTable] vxe-table 引擎暂不支持行拖拽（enableRowDrag），该配置已忽略')
    }
    // vxe 下 enableTree 已被忽略，「编辑仅作用于叶子节点」的前提不存在，跳过避免误导
    if (!isVxe && props.enableRowEdit && props.enableTree && !treeDataConfig.value.exclusive) {
      console.warn('[ProTable] enableRowEdit + enableTree: 编辑仅作用于叶子节点')
    }
    // M5：全局 span.direction 目前不参与合并计算（生效路径是列级 span.direction，
    // 见 useCellSpan.buildCache），此处不再原地改写调用方配置对象（props 保护），仅提示
    // 同 vxe 守卫：树形被忽略时「树形 + span.direction=column」冲突前提不存在
    if (
      !isVxe &&
      typeof props.enableCellSpan === 'object' &&
      cellSpanConfig.value.direction === 'column' &&
      props.enableTree
    ) {
      console.warn(
        '[ProTable] 树形模式下禁用 span.direction=column，该配置已忽略（合并行为由列级 span.direction 决定）'
      )
    }
  }

  onMounted(validateCapabilities)
  onUnmounted(() => {
    rowDrag?.detachSortable()
    treeData?.dispose()
  })

  const v2Expose = {
    startEdit: (rowKey: string | number) => rowEdit?._start(rowKey),
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
    setRowOrder: (newOrder: T[]) => {
      if (table.data)
        (table.data as Ref<Record<string, unknown>[] | null>).value = newOrder as unknown as Record<
          string,
          unknown
        >[]
    },
  }

  return { rowEdit, treeData, cellSpan, rowDrag, v2Expose }
}
