// 占位：完整实现待 P2 阶段
// 用法：v-permission="['user:edit']"
import type { Directive } from 'vue'

export const permission: Directive<HTMLElement, string[]> = {
  mounted(el, binding) {
    const required = binding.value
    if (!Array.isArray(required) || required.length === 0) return
    // TODO: 与 useUserStore().permissions 对比
    // 临时占位：始终显示
    console.info('[v-permission] check:', required)
  },
}
