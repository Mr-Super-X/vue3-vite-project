import type { App } from 'vue'
import { debounce, isFunction } from './_utils'
import type { ElHTMLElement, InputDebounceBinding } from './inputDebounce.d'

/**
 * v-inputDebounce="onInput"        默认 300ms 防抖
 * v-inputDebounce:500="onInput"    自定义 500ms
 *
 * 实现：trailing edge 防抖（输入后延迟 300ms 才真正调用 handler，期间重复输入会重置计时）。
 * 与 buttonDebounce 共用 _utils.debounce 工具。
 */
export default {
  install(app: App) {
    app.directive<ElHTMLElement, InputDebounceBinding['value']>('inputDebounce', {
      mounted(el, binding) {
        const delay = Number(binding.arg) || 300
        if (!isFunction(binding.value)) return
        el.addEventListener('input', debounce(binding.value, delay))
      },
    })
  },
}
