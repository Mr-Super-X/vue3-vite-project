// 权限控制指令
// 用法：v-permission="['user:edit']"
//
// 当前状态：占位实现（P2 阶段补完整逻辑：与 useUserStore().permissions 对比，
// 隐藏无权限的元素 / 触发回调等）。
//
// 注意：本文件是 install 模式（与 inputDebounce/buttonDebounce 一致），
// 即使只有 1 个指令也用 install 模式，保持项目内指令注册风格统一。
import type { App } from 'vue'
import type { ElHTMLElement, PermissionBinding } from './permission.d'

export default {
  install(app: App) {
    app.directive<ElHTMLElement, PermissionBinding['value']>('permission', {
      mounted(el, binding) {
        const required = binding.value
        if (!Array.isArray(required) || required.length === 0) return
        // TODO: 与 useUserStore().permissions 对比
        // 临时占位：始终显示
        console.info('[v-permission] check:', required)
      },
    })
  },
}
