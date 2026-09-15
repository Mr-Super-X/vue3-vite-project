/**
 * useVirtualScroll —— 虚拟滚动配置包装（v3.0 新增能力 5b）
 *
 * 职责：
 * - 收敛 boolean|Config 形态为 Config
 * - 提供 el-table / vxe-table 引擎兼容的 props 适配
 * - 启用时触发 warn：禁用行内编辑（R2 决策）
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
  /** 给 ElementTableBody / VxeTableBody 的 props（引擎差异化） */
  tableProps: Ref<Record<string, unknown>>
}

const DEFAULT_ROW_HEIGHT = 48
const DEFAULT_OVERSCAN = 10

/**
 * v3.0 能力扩展 5b：虚拟滚动
 *
 * 已知限制（R2 决策）：
 * 虚拟行索引 ≠ 真实数据索引会破坏行内编辑 key 映射，
 * 启用虚拟滚动时行内编辑自动失效（启动 warn 提示用户）
 */
export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const enabled = computed(() => Boolean(options.props.virtualized))

  const config = computed<VirtualScrollConfig>(() => {
    const v = options.props.virtualized
    return typeof v === 'object' && v !== null ? v : {}
  })

  // R2: 启动校验 — 虚拟滚动 + 行内编辑 冲突时 warn
  if (enabled.value && options.enableRowEdit && typeof console !== 'undefined') {
    console.warn('[ProTable] 虚拟滚动启用时行内编辑不可用（行索引漂移），enableRowEdit 配置已忽略')
  }

  /**
   * 引擎差异化的 table props：
   * - element-plus：默认开启 el-table 原生虚拟滚动（height 必填）
   * - vxe-table：通过 scroll-y 配置
   */
  const tableProps = computed<Record<string, unknown>>(() => {
    if (!enabled.value) return {}
    const rowHeight = config.value.rowHeight ?? DEFAULT_ROW_HEIGHT
    const overscan = config.value.overscan ?? DEFAULT_OVERSCAN
    if (options.engine.value === 'element-plus') {
      return {
        height: 500, // v3.0：固定 500px 高度 + 内部 el-table-v2 接管滚动
        rowHeight,
        // overscan 通过 el-table-v2 overscan 控制；当前 ProTable 使用 el-table 非 v2，保留参数占位
        _overscan: overscan,
      }
    }
    // vxe-table
    return {
      'scroll-y': { gt: overscan, rowHeight },
    }
  })

  return { enabled, config, tableProps }
}
