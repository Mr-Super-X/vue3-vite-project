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
})
