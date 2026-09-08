/**
 * useColumns —— 列解析 / 枚举 / 列设置持久化（spec §六数据流 / §九 #8 / 附录 A #5/#6）
 *
 * 职责：
 * - allColumns：原始列（含隐藏列，列设置抽屉渲染用）
 * - sortedColumns：按用户拖拽顺序 + 排除 hidden 的列（表格渲染用）
 * - searchColumns：带 search 配置的列（搜索区用）
 * - 列设置持久化（Local `${tableKey}:columns`，未传 tableKey 不持久化；附录 A #5）
 * - resetToDefault 恢复默认（附录 A #6 "恢复默认"按钮）
 *
 * @see [`@/utils/storage`](../../utils/storage.ts) Local 工具
 * @group ProTable composables
 */
import { ref, computed, watch, type Ref } from 'vue'
import { Local } from '@/utils/storage' // plan critical review #5：Local 不在 auto-import 列表
import type { ProColumn, ProTableProps, TableEngine } from '../types'

export interface UseColumnsOptions {
  props: ProTableProps
  engine: Ref<TableEngine>
}

export interface UseColumnsReturn {
  allColumns: Ref<ProColumn[]>
  sortedColumns: Ref<ProColumn[]>
  searchColumns: ProColumn[]
  visibleKeys: Ref<string[]>
  fixedKeys: Ref<string[]>
  colSettingVisible: Ref<boolean>
  toggleVisible: (prop: string) => void
  toggleFixed: (prop: string, fixed: 'left' | 'right' | undefined) => void
  setColumnOrder: (order: string[]) => void
  setVisibleKeys: (keys: string[]) => void
  setFixedKeys: (keys: string[]) => void
  resetToDefault: () => void
}

interface PersistedSetting {
  order?: string[]
  visible?: Record<string, boolean>
  fixed?: Record<string, 'left' | 'right'>
}

export function useColumns(options: UseColumnsOptions): UseColumnsReturn {
  const { props } = options
  const tableKey = props.tableKey
  const storageKey = tableKey ? `${tableKey}:columns` : ''

  const allColumns = ref<ProColumn[]>([...props.columns])
  const visibleKeys = ref<string[]>(props.columns.map((c) => c.prop))
  const fixedKeys = ref<string[]>(props.columns.filter((c) => c.fixed).map((c) => c.prop))
  const colSettingVisible = ref(false) // 附录 A #8：默认关闭

  // 加载持久化（safeParse 由 Local 提供；spec §九 #8）
  const persisted: PersistedSetting | null = storageKey
    ? (Local.get(storageKey) as PersistedSetting | null)
    : null

  /**
   * 列顺序（含隐藏列）—— 拖拽排序的响应式数据源。
   * 不能用 setup 时的一次性 persisted.order 快照：快照非响应式，
   * 拖拽更新 allColumns 后 sortedColumns 仍按旧快照排序，表格列序不更新（历史 bug）。
   */
  const columnOrder = ref<string[]>(persisted?.order ?? props.columns.map((c) => c.prop))

  /** 是否隐藏（支持 boolean 与 Ref<boolean>） */
  function isHidden(col: ProColumn): boolean {
    if (typeof col.hidden === 'boolean') return col.hidden
    if (col.hidden && typeof col.hidden === 'object' && 'value' in col.hidden) {
      return Boolean((col.hidden as Ref<boolean>).value)
    }
    return false
  }

  const sortedColumns = computed(() => {
    const order = columnOrder.value
    const arr: ProColumn[] = [...allColumns.value]
    arr.sort((a, b) => {
      const ia = order.indexOf(a.prop)
      const ib = order.indexOf(b.prop)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    // 过滤逻辑：col.hidden = true 隐藏 + 不在 visibleKeys 中也隐藏
    return arr.filter((c) => !isHidden(c) && visibleKeys.value.includes(c.prop))
  })

  const searchColumns = allColumns.value.filter((c) => Boolean(c.search))

  /** 持久化当前列设置 */
  function persist(): void {
    if (!storageKey) return
    const setting: PersistedSetting = {
      // 保存完整列顺序（含隐藏列）：抽屉渲染 allColumns（含隐藏列），
      // 若只存可见列顺序，隐藏列重新显示后会漂移到最后
      order: columnOrder.value,
      visible: Object.fromEntries(allColumns.value.map((c) => [c.prop, !isHidden(c)])),
      fixed: Object.fromEntries(
        allColumns.value.filter((c) => c.fixed).map((c) => [c.prop, c.fixed ?? 'left'])
      ),
    }
    Local.set(storageKey, setting)
  }

  function toggleVisible(prop: string): void {
    const col = allColumns.value.find((c) => c.prop === prop)
    if (!col) return
    const current = isHidden(col)
    if (typeof col.hidden === 'boolean') {
      col.hidden = !current
    } else {
      // 转为响应式 ref（Vue ref 包装）
      const r = ref(!current)
      ;(col as { hidden: boolean | Ref<boolean> }).hidden = r
    }
    persist()
  }

  function toggleFixed(prop: string, fixed: 'left' | 'right' | undefined): void {
    const col = allColumns.value.find((c) => c.prop === prop)
    if (!col) return
    if (fixed) {
      col.fixed = fixed
    } else {
      delete (col as { fixed?: 'left' | 'right' }).fixed
    }
    persist()
  }

  /**
   * 应用列拖拽后的完整顺序（ColSetting sortablejs onEnd 产出，col.prop 数组）
   * - 同步 columnOrder（sortedColumns 的排序依据）与 allColumns（抽屉渲染依据）
   * - order 中未包含的列（如后追加的新列）按原相对顺序排到最后
   */
  function setColumnOrder(order: string[]): void {
    columnOrder.value = [...order]
    const rank = new Map(order.map((prop, index) => [prop, index]))
    allColumns.value = [...allColumns.value].sort((a, b) => {
      const ia = rank.get(a.prop) ?? Number.MAX_SAFE_INTEGER
      const ib = rank.get(b.prop) ?? Number.MAX_SAFE_INTEGER
      return ia - ib
    })
    persist()
  }

  function setVisibleKeys(keys: string[]): void {
    visibleKeys.value = keys
    persist()
  }

  function setFixedKeys(keys: string[]): void {
    fixedKeys.value = keys
    persist()
  }

  /** 恢复默认：清 Local 存储 + 重置 allColumns + visibleKeys + 列顺序（附录 A #6） */
  function resetToDefault(): void {
    if (!storageKey) return
    Local.remove(storageKey)
    allColumns.value = [...props.columns]
    visibleKeys.value = props.columns.map((c) => c.prop) // 重置可见列（含 hidden=false + Ref<boolean>）
    columnOrder.value = props.columns.map((c) => c.prop) // 同步重置列顺序，否则恢复默认后顺序仍是拖拽后的
    // 重置所有列的 hidden 状态
    for (const col of allColumns.value) {
      if (typeof col.hidden === 'boolean') {
        col.hidden = false
      } else if (col.hidden && typeof col.hidden === 'object' && 'value' in col.hidden) {
        ;(col.hidden as Ref<boolean>).value = false
      }
    }
  }

  // 响应式 hidden 变化时持久化
  watch(
    () => allColumns.value,
    () => persist(),
    { deep: true }
  )

  return {
    allColumns,
    sortedColumns,
    searchColumns,
    visibleKeys,
    fixedKeys,
    colSettingVisible,
    toggleVisible,
    toggleFixed,
    setColumnOrder,
    setVisibleKeys,
    setFixedKeys,
    resetToDefault,
  }
}
