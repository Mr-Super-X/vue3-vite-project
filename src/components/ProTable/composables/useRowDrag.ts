import { ref, computed, type Ref } from 'vue'
import Sortable from 'sortablejs'

/**
 * 行拖拽 composable 选项（spec §5.4）。
 * crossLevelDrag=false 时启用树形模式的同层拖拽限制。
 * @group ProTable Composables
 */
export interface UseRowDragOptions {
  handle: string | '__all__'
  data: Ref<Record<string, unknown>[]>
  onSortChange?: (newOrder: Record<string, unknown>[]) => boolean | Promise<boolean>
  crossLevelDrag?: boolean
}

/**
 * 行拖拽 composable（spec §5.4）—— 绑定 sortablejs 到 el-table tbody。
 * 业务拦截点：onSortChange 返回 false 阻止更新 / 返回 Promise 等待异步确认。
 * 索引越界保护：跳过 + console.warn。
 * @group ProTable Composables
 */
export function useRowDrag(options: UseRowDragOptions) {
  const handleClass = ref('pro-table-drag-handle')
  const isDragging = ref(false)
  const sortableRef = ref<Sortable | null>(null)

  const attachSortable = (tbody: HTMLElement) => {
    const handleSelector =
      options.handle === '__all__'
        ? `.${handleClass.value}`
        : `.${handleClass.value}[data-col="${options.handle}"]`

    const sortable = Sortable.create(tbody, {
      handle: handleSelector,
      animation: 150,
      onMove: (evt: { dragged?: HTMLElement; related?: HTMLElement }) => {
        if (options.crossLevelDrag === false) {
          return evt.dragged?.dataset['level'] === evt.related?.dataset['level']
        }
        return true
      },
      onEnd: async (evt: { oldIndex?: number; newIndex?: number }) => {
        const oldIndex = evt.oldIndex ?? -1
        const newIndex = evt.newIndex ?? -1
        if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) return
        if (newIndex >= options.data.value.length) {
          console.warn('[useRowDrag] 索引越界:', {
            oldIndex,
            newIndex,
            length: options.data.value.length,
          })
          return
        }

        const newOrder = [...options.data.value]
        const moved = newOrder.splice(oldIndex, 1)[0]
        if (moved !== undefined) newOrder.splice(newIndex, 0, moved)

        try {
          const allowed = await options.onSortChange?.(newOrder)
          if (allowed === false) return
          options.data.value = newOrder
        } catch (err) {
          console.error('[useRowDrag] onSortChange 抛错:', err)
        }
      },
    })

    sortableRef.value = sortable
    return sortable
  }

  const detachSortable = () => {
    sortableRef.value?.destroy()
    sortableRef.value = null
  }

  return {
    handleClass: computed(() => handleClass.value),
    isDragging: computed(() => isDragging.value),
    sortableRef,
    attachSortable,
    detachSortable,
  }
}
