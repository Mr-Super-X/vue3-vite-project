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
  reorderColumns: (payload: { from: string; to: string }) => void
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

  /** 是否隐藏（支持 boolean 与 Ref<boolean>） */
  function isHidden(col: ProColumn): boolean {
    if (typeof col.hidden === 'boolean') return col.hidden
    if (col.hidden && typeof col.hidden === 'object' && 'value' in col.hidden) {
      return Boolean((col.hidden as Ref<boolean>).value)
    }
    return false
  }

  const sortedColumns = computed(() => {
    const order = persisted?.order
    const arr: ProColumn[] = [...allColumns.value]
    if (order) {
      arr.sort((a, b) => {
        const ia = order.indexOf(a.prop)
        const ib = order.indexOf(b.prop)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })
    }
    return arr.filter((c) => !isHidden(c))
  })

  const searchColumns = allColumns.value.filter((c) => Boolean(c.search))

  /** 持久化当前列设置 */
  function persist(): void {
    if (!storageKey) return
    const setting: PersistedSetting = {
      order: sortedColumns.value.map((c) => c.prop),
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

  function reorderColumns(payload: { from: string; to: string }): void {
    const arr = [...allColumns.value]
    const fromIdx = arr.findIndex((c) => c.prop === payload.from)
    const toIdx = arr.findIndex((c) => c.prop === payload.to)
    if (fromIdx === -1 || toIdx === -1) return
    const moved = arr.splice(fromIdx, 1)[0]
    if (!moved) return
    // splice 后 toIdx 可能偏移：fromIdx < toIdx 时 to 需要往前移 1
    const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx
    arr.splice(insertIdx, 0, moved)
    allColumns.value = arr
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

  /** 恢复默认：清 Local 存储 + 重置 allColumns（附录 A #6） */
  function resetToDefault(): void {
    if (!storageKey) return
    Local.remove(storageKey)
    allColumns.value = [...props.columns]
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
    reorderColumns,
    setVisibleKeys,
    setFixedKeys,
    resetToDefault,
  }
}
