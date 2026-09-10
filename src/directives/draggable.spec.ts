/**
 * v-draggable 指令单测。
 *
 * 覆盖两层：
 * 1. clampPosition 纯函数：边界数学直接断言（不依赖 DOM 尺寸模拟）
 * 2. 指令行为：jsdom 中 mock getBoundingClientRect / offsetWidth / offsetHeight /
 *    window 视口尺寸，用真实 MouseEvent 走完整 mousedown → mousemove → mouseup 链路
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import Draggable, { clampPosition } from './draggable'

describe('clampPosition', () => {
  it('边界内位置原样返回', () => {
    expect(clampPosition({ left: 100, top: 80 }, { maxLeft: 400, maxTop: 550 })).toEqual({
      left: 100,
      top: 80,
    })
  })

  it('越过上/左边界时钳制为 0', () => {
    expect(clampPosition({ left: -50, top: -20 }, { maxLeft: 400, maxTop: 550 })).toEqual({
      left: 0,
      top: 0,
    })
  })

  it('越过右/下边界时钳制为 maxLeft/maxTop', () => {
    expect(clampPosition({ left: 9999, top: 9999 }, { maxLeft: 400, maxTop: 550 })).toEqual({
      left: 400,
      top: 550,
    })
  })

  it('弹窗比视口大（maxLeft 为负）时兜底为 0，不出现负坐标', () => {
    expect(clampPosition({ left: 100, top: 100 }, { maxLeft: -200, maxTop: -50 })).toEqual({
      left: 0,
      top: 0,
    })
  })
})

describe('v-draggable 指令', () => {
  /** 构造贴近 EP 真实结构的宿主：.el-dialog > .el-dialog__header > 手柄 */
  const Host = defineComponent({
    props: { enabled: { type: Boolean, default: true } },
    template: `
      <div class="el-dialog">
        <div class="el-dialog__header">
          <div v-draggable="enabled" class="handle">标题</div>
        </div>
        <div class="el-dialog__body">内容</div>
      </div>
    `,
  })

  /** jsdom 中布局尺寸全为 0，这里按 800×600 视口、400×300 弹窗、50px 手柄 mock */
  function mockLayout(dialog: HTMLElement, handle: HTMLElement) {
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 400,
      height: 300,
      right: 500,
      bottom: 380,
      x: 100,
      y: 80,
      toJSON: () => ({}),
    } as DOMRect)
    Object.defineProperty(dialog, 'offsetWidth', { value: 400, configurable: true })
    Object.defineProperty(handle, 'offsetHeight', { value: 50, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** 模拟一次完整拖拽（注意 MouseEventInit 的坐标字段是 clientX/clientY，x/y 无效） */
  function drag(
    handle: HTMLElement,
    from: { clientX: number; clientY: number },
    to: { clientX: number; clientY: number }
  ) {
    handle.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        clientX: from.clientX,
        clientY: from.clientY,
      })
    )
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: to.clientX, clientY: to.clientY })
    )
    document.dispatchEvent(new MouseEvent('mouseup'))
  }

  it('按住手柄拖拽：把 margin 定位切换为 left/top 并按位移移动弹窗', () => {
    const wrapper = mount(Host, { global: { plugins: [Draggable] } })
    const dialog = wrapper.find('.el-dialog').element as HTMLElement
    const handle = wrapper.find('.handle').element as HTMLElement
    mockLayout(dialog, handle)

    drag(handle, { clientX: 120, clientY: 100 }, { clientX: 220, clientY: 200 })

    // 位移 +100/+100：left 100→200，top 80→180（均在边界内）
    expect(dialog.style.position).toBe('relative')
    // jsdom 的 CSSStyleDeclaration 会把 '0' 规范化为 '0px'
    expect(dialog.style.margin).toBe('0px')
    expect(dialog.style.left).toBe('200px')
    expect(dialog.style.top).toBe('180px')
  })

  it('拖拽不超出视口边界：右缘钳制 maxLeft、下缘保留手柄可抓回', () => {
    const wrapper = mount(Host, { global: { plugins: [Draggable] } })
    const dialog = wrapper.find('.el-dialog').element as HTMLElement
    const handle = wrapper.find('.handle').element as HTMLElement
    mockLayout(dialog, handle)

    // 起点 (120,100)，拖到极远 (7020,5100)：原始 left=7000/top=5080
    drag(handle, { clientX: 120, clientY: 100 }, { clientX: 7020, clientY: 5100 })

    // maxLeft = 800-400 = 400；maxTop = 600-50 = 550（不是 0，保证可抓回）
    expect(dialog.style.left).toBe('400px')
    expect(dialog.style.top).toBe('550px')
  })

  it('绑定值为 false 时禁用拖拽，弹窗位置不动', () => {
    const wrapper = mount(Host, {
      props: { enabled: false },
      global: { plugins: [Draggable] },
    })
    const dialog = wrapper.find('.el-dialog').element as HTMLElement
    const handle = wrapper.find('.handle').element as HTMLElement
    mockLayout(dialog, handle)

    drag(handle, { clientX: 120, clientY: 100 }, { clientX: 220, clientY: 200 })

    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
  })

  it('绑定值动态切换：false → true 后恢复拖拽能力', async () => {
    const wrapper = mount(Host, {
      props: { enabled: false },
      global: { plugins: [Draggable] },
    })
    const dialog = wrapper.find('.el-dialog').element as HTMLElement
    const handle = wrapper.find('.handle').element as HTMLElement
    mockLayout(dialog, handle)

    drag(handle, { clientX: 120, clientY: 100 }, { clientX: 220, clientY: 200 })
    expect(dialog.style.left).toBe('')

    // updated 钩子同步开关
    await wrapper.setProps({ enabled: true })
    drag(handle, { clientX: 120, clientY: 100 }, { clientX: 220, clientY: 200 })
    expect(dialog.style.left).toBe('200px')
  })
})
