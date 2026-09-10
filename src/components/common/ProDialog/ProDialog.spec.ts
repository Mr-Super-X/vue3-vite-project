/**
 * ProDialog 组件单测。
 *
 * 聚焦两条集成路径：
 * 1. 默认渲染：内置 footer（取消/确定）+ 全屏切换按钮 + title 落位
 * 2. 拖拽 × 全屏交叉（code-reviewer #2 HIGH 回归）：v-draggable 给 .el-dialog
 *    写入的内联定位，在切入/切出全屏时必须被清除——EP .is-fullscreen 只重置
 *    margin/width/height，不重置内联 left/top，残留会把全屏弹窗顶出视口
 *
 * 挂载方式：用 createApp + mount 到 body 挂载真实应用（与 useDialog.spec 同一策略），
 * 不用 @vue/test-utils 的 mount——VTU 挂载到游离 DOM 时 EP 的 teleport 链路
 * 在 jsdom 下渲染不出内容，而真实应用路径与生产行为一致。
 * EP 组件 teleport 到 body，断言统一走 document.querySelector；
 * jsdom 布局尺寸为 0，拖拽前按 800×600 视口 / 400×300 弹窗 mock（同 draggable.spec 策略）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import type { App } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import Draggable from '@directives/draggable'
import ProDialog from './ProDialog.vue'

describe('ProDialog', () => {
  const mounted: Array<{ app: App; container: HTMLElement }> = []

  afterEach(() => {
    mounted.forEach(({ app, container }) => {
      app.unmount()
      container.remove()
    })
    mounted.length = 0
    // EP teleport / useLockscreen 在 jsdom 下的副作用清理，防用例间串扰
    document.body.querySelectorAll('.el-overlay').forEach((el) => el.remove())
    document.documentElement.style.overflow = ''
    vi.restoreAllMocks()
  })

  function mountOpen(props: Record<string, unknown> = {}): void {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = createApp(ProDialog, { modelValue: true, title: '交叉测试', ...props })
    app.component('ElDialog', ElDialog)
    app.component('ElButton', ElButton)
    app.use(Draggable)
    app.mount(container)
    mounted.push({ app, container })
  }

  async function queryDialog(): Promise<HTMLElement> {
    let dialog: HTMLElement | null = null
    await vi.waitFor(() => {
      dialog = document.querySelector('.el-dialog')
      expect(dialog).toBeTruthy()
    })
    return dialog as unknown as HTMLElement
  }

  function fullscreenBtn(): HTMLElement {
    const btn = document.querySelector<HTMLElement>('.vv-pro-dialog__fullscreen-btn')
    expect(btn).toBeTruthy()
    return btn as HTMLElement
  }

  it('默认渲染：内置取消/确定按钮 + 全屏/关闭按钮靠右一组 + title 落位', async () => {
    mountOpen()
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.el-dialog__footer button').length).toBe(2)
    })
    expect(fullscreenBtn()).toBeTruthy()
    // 自绘关闭按钮（EP 原生 X 已收编进 actions 组，.el-dialog__headerbtn 不再渲染）
    expect(document.querySelector('.vv-pro-dialog__close-btn')).toBeTruthy()
    expect(document.querySelector('.el-dialog__headerbtn')).toBeNull()
    expect(document.querySelector('.vv-pro-dialog__title')?.textContent).toContain('交叉测试')
  })

  it('自绘关闭按钮尊重 beforeClose 拦截', async () => {
    const onUpdate = vi.fn()
    let allowClose = false
    mountOpen({
      beforeClose: (done: () => void) => {
        if (allowClose) done()
      },
      'onUpdate:modelValue': onUpdate,
    })
    await queryDialog()

    const closeBtn = document.querySelector<HTMLElement>('.vv-pro-dialog__close-btn') as HTMLElement
    // beforeClose 不放行：不触发 update:modelValue
    closeBtn.click()
    await nextTick()
    expect(onUpdate).not.toHaveBeenCalled()

    // 放行后：关闭
    allowClose = true
    closeBtn.click()
    await nextTick()
    expect(onUpdate).toHaveBeenCalledWith(false)
  })

  it('show-close=false：actions 组里只有全屏按钮，无自绘关闭按钮', async () => {
    mountOpen({ 'show-close': false })
    await queryDialog()
    expect(document.querySelector('.vv-pro-dialog__close-btn')).toBeNull()
    expect(document.querySelector('.vv-pro-dialog__fullscreen-btn')).toBeTruthy()
  })

  it('拖拽后切全屏：清除 v-draggable 的内联定位残留；退出全屏同样复位', async () => {
    mountOpen()
    const dialog = await queryDialog()
    const handle = document.querySelector('.vv-pro-dialog__header') as HTMLElement
    expect(handle).toBeTruthy()

    // mock 布局尺寸（jsdom 全 0）：800×600 视口 / 400×300 弹窗 / 50px 手柄
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

    // 先拖拽出内联定位
    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 120, clientY: 100 })
    )
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 220, clientY: 200 }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(dialog.style.left).toBe('200px')

    // 切全屏：is-fullscreen 生效 + 内联定位被 toggleFullScreen 清除
    fullscreenBtn().click()
    await vi.waitFor(() => {
      expect(dialog.classList.contains('is-fullscreen')).toBe(true)
    })
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
    expect(dialog.style.margin).toBe('')
    expect(dialog.style.position).toBe('')

    // 退出全屏：同样复位为默认居中（拖拽偏移一并清除，可重新拖）
    fullscreenBtn().click()
    await vi.waitFor(() => {
      expect(dialog.classList.contains('is-fullscreen')).toBe(false)
    })
    expect(dialog.style.left).toBe('')
    expect(dialog.style.position).toBe('')
  })
})
