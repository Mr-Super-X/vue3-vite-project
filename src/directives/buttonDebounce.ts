import type { App } from 'vue'

/**
 * v-buttonDebounce="onClick"         默认 500ms 节流（防止重复点击）
 * v-buttonDebounce:1000="onClick"    自定义 1000ms
 *
 * 实现：click 事件触发时若距上次调用 < delay 则阻止 + 不调用 handler。
 * 与 v-inputDebounce 的区别：input 是 trailing edge 防抖（最后次生效），
 * button 是 leading edge 节流（首次生效，后续丢弃）。
 */
export default {
  install(app: App) {
    app.directive<HTMLElement, (e: Event) => void>('buttonDebounce', {
      mounted(el, binding) {
        const delay = Number(binding.arg) || 500
        let lastInvoke = -Infinity

        el.addEventListener('click', (e: Event) => {
          const now = Date.now()
          if (now - lastInvoke < delay) {
            e.stopImmediatePropagation()
            e.preventDefault()
            return
          }
          lastInvoke = now
          binding.value?.(e)
        })
      },
    })
  },
}
