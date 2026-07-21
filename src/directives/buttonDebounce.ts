import type { App } from 'vue'
import { debounce, isFunction } from './_utils'
import type { ElHTMLElement, ButtonDebounceBinding } from './buttonDebounce.d'

/**
 * v-buttonDebounce="onClick"        默认 500ms 防抖
 * v-buttonDebounce:1000="onClick"    自定义 1000ms
 *
 * 实现：trailing edge 防抖（点击后延迟 500ms 才真正调用 handler，期间重复点击会重置计时）。
 * 与 inputDebounce 共用 _utils.debounce 工具，保证项目内行为一致。
 */
export default {
  install(app: App) {
    app.directive<ElHTMLElement, ButtonDebounceBinding['value']>('buttonDebounce', {
      mounted(el, binding) {
        const delay = Number(binding.arg) || 500
        if (!isFunction(binding.value)) return
        // debounce 工厂返回的事件处理函数：throttles click events
        el.addEventListener('click', debounce(binding.value, delay))
      },
    })
  },
}
