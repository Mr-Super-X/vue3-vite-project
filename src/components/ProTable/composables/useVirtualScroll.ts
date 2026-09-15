/**
 * useVirtualScroll —— 虚拟滚动引擎分支（v3.0.1 升级：el-table-v2 真虚拟化）
 *
 * 职责：
 * - 收敛 boolean|Config 形态为 Config
 * - 提供 el-table-v2 引擎分支的完整 props
 * - 强隔离校验：与其他能力（行内编辑/树形/汇总/合并/拖拽）+ vxe-table 引擎冲突时 warn + 忽略
 *
 * @group ProTable composables
 */
import { computed, type Ref } from 'vue'
import type { ProTableProps, TableEngine, VirtualScrollConfig } from '../types'

export interface UseVirtualScrollOptions {
  props: ProTableProps
  engine: Ref<TableEngine>
  enableRowEdit: boolean
}

export interface UseVirtualScrollReturn {
  enabled: Ref<boolean>
  config: Ref<VirtualScrollConfig>
  /** 给 ElementTableBody / VxeTableBody 的 props（v1 引擎用，v2 分支不消费） */
  tableProps: Ref<Record<string, unknown>>
  /** v3.0.1 新增：给 ElementTableV2Body 的 v2 配置 */
  v2TableConfig: Ref<{
    width: number | 'auto'
    height: number
    estimatedRowHeight: number
  }>
}

const DEFAULT_ROW_HEIGHT = 48
const DEFAULT_OVERSCAN = 10
const DEFAULT_V2_HEIGHT = 500

/**
 * v3.0.1 升级：虚拟化启用时启用 el-table-v2 引擎分支
 *
 * 已知限制（强隔离策略）：
 * - 行内编辑 / 树形 / 汇总 / 合并 / 拖拽 与 v2 不兼容，启用时 warn + 忽略
 * - vxe-table 引擎不支持 v2，启用时 warn + 强制回落 element-plus
 */
export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const enabled = computed(() => Boolean(options.props.virtualized))

  const config = computed<VirtualScrollConfig>(() => {
    const v = options.props.virtualized
    return typeof v === 'object' && v !== null ? v : {}
  })

  /** v3.0.1 强隔离校验（启动期一次性） */
  if (enabled.value) {
    if (options.engine.value === 'vxe-table') {
      console.warn(
        '[ProTable] virtualized + tableEngine="vxe-table" 不兼容，自动回落到 element-plus 引擎'
      )
      options.engine.value = 'element-plus'
    }
    const conflicts: string[] = []
    if (options.enableRowEdit) conflicts.push('enableRowEdit')
    if (options.props.enableTree) conflicts.push('enableTree')
    if (options.props.enableSummary) conflicts.push('enableSummary')
    if (options.props.enableCellSpan) conflicts.push('enableCellSpan')
    if (options.props.enableRowDrag) conflicts.push('enableRowDrag')
    if (conflicts.length > 0) {
      console.warn(`[ProTable] virtualized 模式下以下能力被忽略: ${conflicts.join(', ')}`)
    }
  }

  /** v1 引擎用 tableProps（v2 分支不消费） */
  const tableProps = computed<Record<string, unknown>>(() => {
    if (!enabled.value) return {}
    const rowHeight = config.value.rowHeight ?? DEFAULT_ROW_HEIGHT
    const overscan = config.value.overscan ?? DEFAULT_OVERSCAN
    if (options.engine.value === 'element-plus') {
      return {
        height: 500,
        rowHeight,
        _overscan: overscan,
      }
    }
    return {
      'scroll-y': { gt: overscan, rowHeight },
    }
  })

  /** v3.0.1 新增：v2 引擎配置 */
  const v2TableConfig = computed(() => ({
    width: config.value.width ?? ('auto' as const),
    height: config.value.height ?? DEFAULT_V2_HEIGHT,
    estimatedRowHeight: config.value.rowHeight ?? DEFAULT_ROW_HEIGHT,
  }))

  return { enabled, config, tableProps, v2TableConfig }
}
