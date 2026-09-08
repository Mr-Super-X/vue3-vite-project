import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import Sortable from 'sortablejs'
import { useRowDrag } from './useRowDrag'

// mock sortablejs（hoisted by vitest）
vi.mock('sortablejs', () => ({
  default: {
    create: vi.fn(() => ({
      destroy: vi.fn(),
      option: vi.fn(),
    })),
  },
}))

const mockSortable = Sortable as unknown as { create: ReturnType<typeof vi.fn> }

describe('useRowDrag', () => {
  beforeEach(() => {
    mockSortable.create.mockClear()
  })

  it('默认 handleClass 为 pro-table-drag-handle', () => {
    const drag = useRowDrag({ handle: 'first-col', data: ref([]), onSortChange: undefined })
    expect(drag.handleClass.value).toBe('pro-table-drag-handle')
  })

  it('handle = __all__ 时整行可拖', () => {
    const drag = useRowDrag({ handle: '__all__', data: ref([]), onSortChange: undefined })
    expect(drag.handleClass.value).toBe('pro-table-drag-handle')
  })

  it('attachSortable 创建 sortable 实例 + 触发 onEnd 回调', async () => {
    const data = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const onSortChange = vi.fn(() => true)
    const drag = useRowDrag({ handle: 'first-col', data, onSortChange })

    const tbody = document.createElement('tbody')
    const sortable = drag.attachSortable(tbody)
    expect(sortable).toBeTruthy()

    // 模拟 onEnd 事件
    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    await onEndHandler({ oldIndex: 0, newIndex: 2 })

    expect(onSortChange).toHaveBeenCalledWith([{ id: 2 }, { id: 3 }, { id: 1 }])
    expect(data.value).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }])
  })

  it('onSortChange 返回 false 时不更新 data', async () => {
    const data = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const onSortChange = vi.fn(() => false)
    const drag = useRowDrag({ handle: 'first-col', data, onSortChange })

    const tbody = document.createElement('tbody')
    drag.attachSortable(tbody)

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    await onEndHandler({ oldIndex: 0, newIndex: 2 })

    expect(data.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('onSortChange 抛错时回滚 data + console.error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const data = ref([{ id: 1 }, { id: 2 }])
    const onSortChange = async () => {
      throw new Error('排序失败')
    } // async 让 throw 进入 Promise reject
    const drag = useRowDrag({ handle: 'first-col', data, onSortChange })

    const tbody = document.createElement('tbody')
    drag.attachSortable(tbody)

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    await onEndHandler({ oldIndex: 0, newIndex: 1 })

    expect(data.value).toEqual([{ id: 1 }, { id: 2 }])
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('onSortChange 返回 false 时还原 DOM（取消二次确认后顺序不变）', async () => {
    const data = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const onSortChange = vi.fn(() => false)
    const drag = useRowDrag({ handle: 'first-col', data, onSortChange })

    const tbody = document.createElement('tbody')
    const rows = [1, 2, 3].map((id) => {
      const tr = document.createElement('tr')
      tr.dataset['rowId'] = String(id)
      tbody.appendChild(tr)
      return tr
    })
    drag.attachSortable(tbody)

    // 模拟 sortablejs 拖拽后的真实 DOM 状态：第 1 行已被物理移动到末尾 [2,3,1]
    tbody.appendChild(rows[0])

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    await onEndHandler({ oldIndex: 0, newIndex: 2, from: tbody, item: rows[0] })

    expect(data.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    // 关键断言：取消后 DOM 行还原为原始顺序 [1,2,3]（回归：取消无效、顺序已变）
    expect([...tbody.children].map((el) => (el as HTMLElement).dataset['rowId'])).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it('树形模式映射失败时还原 DOM（跳过排序不留 DOM 残留）', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = ref([{ id: 'a' }, { id: 'b' }])
    const viewKeys = ['a', 'a1', 'b']
    const drag = useRowDrag({
      handle: 'first-col',
      data,
      onSortChange: undefined,
      crossLevelDrag: false,
      getViewRowKeys: () => viewKeys,
      resolveTopIndex: (viewIndex) => ['a', 'b'].indexOf(viewKeys[viewIndex] as string),
    })

    const tbody = document.createElement('tbody')
    const rows = ['a', 'a1', 'b'].map((key) => {
      const tr = document.createElement('tr')
      tr.dataset['rowId'] = key
      tbody.appendChild(tr)
      return tr
    })
    drag.attachSortable(tbody)

    // 子节点 a1 被拖到末尾 [a,b,a1]
    tbody.appendChild(rows[1])

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    // oldIndex=1（子节点 a1）映射失败 → 跳过 + 还原 DOM
    await onEndHandler({ oldIndex: 1, newIndex: 2, from: tbody, item: rows[1] })

    expect(data.value).toEqual([{ id: 'a' }, { id: 'b' }])
    expect([...tbody.children].map((el) => (el as HTMLElement).dataset['rowId'])).toEqual([
      'a',
      'a1',
      'b',
    ])
    consoleWarn.mockRestore()
  })

  it('detachSortable 销毁实例', () => {
    const drag = useRowDrag({ handle: 'first-col', data: ref([]), onSortChange: undefined })
    const tbody = document.createElement('tbody')
    const sortable = drag.attachSortable(tbody)

    drag.detachSortable()
    expect(sortable.destroy).toHaveBeenCalled()
  })

  it('onMove 跨层拦截（树形模式）', () => {
    const drag = useRowDrag({
      handle: 'first-col',
      data: ref([]),
      onSortChange: undefined,
      crossLevelDrag: false,
    })

    const tbody = document.createElement('tbody')
    drag.attachSortable(tbody)

    const onMoveHandler = mockSortable.create.mock.calls[0][1].onMove
    // 同层 → true 允许
    const evtSameLevel = {
      dragged: { dataset: { level: '0' } },
      related: { dataset: { level: '0' } },
    }
    // 跨层 → false 拒绝
    const evtCrossLevel = {
      dragged: { dataset: { level: '0' } },
      related: { dataset: { level: '1' } },
    }

    expect(onMoveHandler(evtSameLevel)).toBe(true)
    expect(onMoveHandler(evtCrossLevel)).toBe(false)
  })

  it('索引越界时跳过 + console.warn', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = ref([{ id: 1 }, { id: 2 }])
    const drag = useRowDrag({ handle: 'first-col', data, onSortChange: undefined })

    const tbody = document.createElement('tbody')
    drag.attachSortable(tbody)

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    onEndHandler({ oldIndex: 0, newIndex: 99 })

    expect(data.value).toEqual([{ id: 1 }, { id: 2 }])
    expect(consoleWarn).toHaveBeenCalled()
    consoleWarn.mockRestore()
  })

  it('树形模式：视图行 key 映射到顶层索引后 splice（H6）', async () => {
    // 视图扁平序列：a 展开两个子节点 → [a, a1, a2, b, c]，顶层 data 只有 [a, b, c]
    const data = ref([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const onSortChange = vi.fn(() => true)
    const viewKeys = ['a', 'a1', 'a2', 'b', 'c']
    const drag = useRowDrag({
      handle: 'first-col',
      data,
      onSortChange,
      crossLevelDrag: false,
      getViewRowKeys: () => viewKeys,
      resolveTopIndex: (viewIndex) => ['a', 'b', 'c'].indexOf(viewKeys[viewIndex] as string),
    })

    const tbody = document.createElement('tbody')
    drag.attachSortable(tbody)

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    // 视图 index 3（顶层 b）拖到视图 index 0（顶层 a）之前
    await onEndHandler({ oldIndex: 3, newIndex: 0 })

    expect(onSortChange).toHaveBeenCalledWith([{ id: 'b' }, { id: 'a' }, { id: 'c' }])
    expect(data.value).toEqual([{ id: 'b' }, { id: 'a' }, { id: 'c' }])
  })

  it('树形模式：非顶层行映射失败时跳过 + console.warn（H6）', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = ref([{ id: 'a' }, { id: 'b' }])
    const onSortChange = vi.fn(() => true)
    const viewKeys = ['a', 'a1', 'b']
    const drag = useRowDrag({
      handle: 'first-col',
      data,
      onSortChange,
      crossLevelDrag: false,
      getViewRowKeys: () => viewKeys,
      resolveTopIndex: (viewIndex) => ['a', 'b'].indexOf(viewKeys[viewIndex] as string),
    })

    const tbody = document.createElement('tbody')
    drag.attachSortable(tbody)

    const onEndHandler = mockSortable.create.mock.calls[0][1].onEnd
    // oldIndex=1 是子节点 a1，映射返回 -1 → 跳过
    await onEndHandler({ oldIndex: 1, newIndex: 2 })

    expect(data.value).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(onSortChange).not.toHaveBeenCalled()
    expect(consoleWarn).toHaveBeenCalled()
    consoleWarn.mockRestore()
  })
})
