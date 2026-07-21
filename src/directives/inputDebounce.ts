import type { App } from 'vue'

/**
 * v-inputDebounce="onInput"        默认 300ms 防抖
 * v-inputDebounce:500="onInput"    自定义 500ms
 *
 * 实现：input 事件触发时延迟调用 binding.value，期间重复触发会重置计时器。
 * 内存清理：用 WeakMap 存 timer 引用（unmounted 时清除），避免污染 DOM 属性。
 * WeakMap 不会阻止 GC（元素删除时 timer 引用自动回收）。
 */
const TIMER_MAP = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

export default {
  install(app: App) {
    app.directive<HTMLElement, (e: Event) => void>('inputDebounce', {
      mounted(el, binding) {
        const delay = Number(binding.arg) || 300
        let timer: ReturnType<typeof setTimeout> | null = null

        el.addEventListener('input', (e: Event) => {
          if (timer !== null) clearTimeout(timer)
          timer = setTimeout(() => {
            binding.value?.(e)
            timer = null
          }, delay)
          TIMER_MAP.set(el, timer)
        })
      },
      unmounted(el) {
        const timer = TIMER_MAP.get(el)
        if (timer !== undefined) {
          clearTimeout(timer)
          TIMER_MAP.delete(el)
        }
      },
    })
  },
}
