import { ref, computed, watch, onMounted, nextTick, type Ref } from 'vue'
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
  /**
   * tbody DOM 获取器 —— 声明后 useRowDrag 自持挂载生命周期：
   * onMounted 首次 attach + watch(data, flush:'post') data 变化自动 detach/reattach，
   * 编排层不再需要手动 setTimeout 轮询挂载（H4 能力编排归位）。
   */
  getTbody?: () => HTMLElement | null
  /**
   * 当前视图行 key 序列（按 DOM 顺序）—— 树形模式必传。
   * 树形扁平化后 DOM 行数 ≠ data 顶层数组长度，直接拿 DOM index splice 顶层数组会错位（H6）。
   */
  getViewRowKeys?: () => (string | number)[]
  /**
   * 视图行索引 → data 顶层数组索引 —— 树形模式必传。
   * 映射不到（如视图行不是顶层节点）时返回 -1，onEnd 将 console.warn 并跳过本次排序。
   */
  resolveTopIndex?: (viewIndex: number) => number
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

    /**
     * 把 sortablejs 物理移动过的 DOM 行还原到 oldIndex 位置。
     * 为什么需要：sortablejs 拖拽直接操作真实 DOM，而 Vue 以 data 为唯一数据源；
     * 取消/抛错/映射失败等分支只 return 不更新 data，DOM 不会被 Vue 纠正，
     * 用户会看到"取消无效、顺序已变"（与 ColSetting.vue 列设置拖拽修复同理）。
     */
    const restoreDomRow = (
      from: HTMLElement | undefined,
      item: HTMLElement | undefined,
      oldIndex?: number
    ): void => {
      if (!from || !item || oldIndex === undefined || oldIndex < 0) return
      if (item.parentNode !== from) return
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
    }

    const sortable = Sortable.create(tbody, {
      handle: handleSelector,
      animation: 150,
      onMove: (evt: { dragged?: HTMLElement; related?: HTMLElement }) => {
        if (options.crossLevelDrag === false) {
          return evt.dragged?.dataset['level'] === evt.related?.dataset['level']
        }
        return true
      },
      onEnd: async (evt: {
        oldIndex?: number
        newIndex?: number
        from?: HTMLElement
        item?: HTMLElement
      }) => {
        const oldIndex = evt.oldIndex ?? -1
        const newIndex = evt.newIndex ?? -1
        // 先还原 DOM，再走后续分支：无论确认/取消/跳过，DOM 都交还给 Vue 重渲染
        restoreDomRow(evt.from, evt.item, evt.oldIndex)
        if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) return

        // H6 树形模式：DOM 视图行顺序 ≠ data 顶层数组顺序，先经 key 映射到顶层索引再 splice
        let from = oldIndex
        let to = newIndex
        if (options.getViewRowKeys && options.resolveTopIndex) {
          const mappedFrom = options.resolveTopIndex(oldIndex)
          const mappedTo = options.resolveTopIndex(newIndex)
          if (mappedFrom < 0 || mappedTo < 0) {
            console.warn('[useRowDrag] 树形模式视图行映射失败（非顶层节点），跳过本次排序:', {
              oldIndex,
              newIndex,
            })
            return
          }
          from = mappedFrom
          to = mappedTo
        }

        if (to >= options.data.value.length) {
          console.warn('[useRowDrag] 索引越界:', {
            oldIndex: from,
            newIndex: to,
            length: options.data.value.length,
          })
          return
        }

        const newOrder = [...options.data.value]
        const moved = newOrder.splice(from, 1)[0]
        if (moved !== undefined) newOrder.splice(to, 0, moved)

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

  /**
   * 自持挂载：声明 getTbody 后，挂载与 data 变化重挂均由 composable 内部完成。
   * flush:'post' + nextTick 保证读取 tbody 时 el-table 已完成本轮 DOM 更新。
   */
  const reattach = (): void => {
    const tbody = options.getTbody?.()
    if (!tbody) return
    detachSortable()
    attachSortable(tbody)
  }

  if (options.getTbody) {
    watch(
      () => options.data.value,
      () => nextTick(reattach),
      { flush: 'post' }
    )
    onMounted(() => nextTick(reattach))
  }

  return {
    handleClass: computed(() => handleClass.value),
    isDragging: computed(() => isDragging.value),
    sortableRef,
    attachSortable,
    detachSortable,
  }
}
