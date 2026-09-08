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
} from '../types'

export interface UseTableCapabilitiesOptions {
  props: ProTableProps
  columns: { allColumns?: RefType<ProColumn[]> }
  table: { data: RefType<Record<string, unknown>[] | null> }
  /**
   * el-table tbody DOM 获取器 —— 由编排层提供（持有模板 ref），
   * 传入后 useRowDrag 自持挂载生命周期（onMounted + watch data 自动重挂）。
   */
  getTbody?: () => HTMLElement | null
}

export interface UseTableCapabilitiesReturn {
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
    setRowOrder: (newOrder: Record<string, unknown>[]) => void
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

export function useTableCapabilities(
  options: UseTableCapabilitiesOptions
): UseTableCapabilitiesReturn {
  const { props, columns, table } = options

  const rowEditConfig = computed<RowEditConfig>(() => asConfig(props.enableRowEdit, {}))
  const treeDataConfig = computed<TreeConfig>(() => asConfig(props.enableTree, {}))
  const cellSpanConfig = computed<CellSpanConfig>(() => asConfig(props.enableCellSpan, {}))
  const rowDragConfig = computed<RowDragConfig>(() => asConfig(props.enableRowDrag, {}))

  const rowEdit = props.enableRowEdit
    ? useRowEdit({
        ...(pickDefined(rowEditConfig.value, ['onSave', 'onSaved', 'onSaveError']) as object),
      })
    : null

  const treeData = props.enableTree
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
    const src = treeData
      ? (treeData.flatData.value as Record<string, unknown>[])
      : (table.data.value ?? [])
    return src.map((r) => r[rowKeyField] as string | number)
  })
  const topIndexByKey = computed(() => {
    const m = new Map<string | number, number>()
    ;(table.data.value ?? []).forEach((r, i) => m.set(r[rowKeyField] as string | number, i))
    return m
  })

  const rowDrag = props.enableRowDrag
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
        ...(rowDragConfig.value.onSortChange && { onSortChange: rowDragConfig.value.onSortChange }),
      })
    : null

  /** 启动校验（spec §七.3） */
  function validateCapabilities(): void {
    if (props.enableRowEdit && props.enableTree && !treeDataConfig.value.exclusive) {
      console.warn('[ProTable] enableRowEdit + enableTree: 编辑仅作用于叶子节点')
    }
    // M5：全局 span.direction 目前不参与合并计算（生效路径是列级 span.direction，
    // 见 useCellSpan.buildCache），此处不再原地改写调用方配置对象（props 保护），仅提示
    if (
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
      const data = table.data.value ?? []
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
    setRowOrder: (newOrder: Record<string, unknown>[]) => {
      if (table.data) (table.data as Ref<Record<string, unknown>[] | null>).value = newOrder
    },
  }

  return { rowEdit, treeData, cellSpan, rowDrag, v2Expose }
}
