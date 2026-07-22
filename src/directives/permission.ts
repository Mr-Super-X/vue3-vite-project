// 权限控制指令 v-permission
//
// 用法：
//   v-permission="'user:edit'"               单权限
//   v-permission="['user:view','user:edit']" 多权限（AND 语义，全部满足）
//   v-permission:any="['a','b']"             多权限（ANY 语义，任一满足）
//
// 与 v-auth 区别：
//  - v-permission 是早期指令，专为按钮设计；行为更简单：仅做"移除"或"禁用"切换
//  - v-auth 是 P0-4 阶段推出的统一权限指令，支持更多修饰符组合
//  - 推荐新代码用 v-auth；v-permission 保留以兼容已有调用
//
// 实现：
//  - install 模式（与 v-auth / inputDebounce / buttonDebounce 一致）
//  - 调用 useAuth() 实时读取权限；权限变化时通过 updated 钩子重新判断
//  - 默认行为：无权限时 display: none（与 v-auth remove 模式一致）

import type { App } from 'vue'
import { useAuth } from '@composables/useAuth'
import type { ElHTMLElement, PermissionBinding } from './permission.d'

/**
 * 内部：根据 binding 提取权限码数组并按修饰符判断。
 */
function checkPermission(
  binding: PermissionBinding,
  hasPerm: (codes: readonly string[]) => boolean,
  hasAnyPerm: (codes: readonly string[]) => boolean
): boolean {
  const codes = Array.isArray(binding.value) ? binding.value : [binding.value]
  return binding.arg === 'any' ? hasAnyPerm(codes) : hasPerm(codes)
}

/**
 * 应用无权限展示（display: none + aria-hidden）。
 */
function applyNoPermissionDisplay(el: ElHTMLElement): void {
  el.style.display = 'none'
  el.setAttribute('aria-hidden', 'true')
}

/**
 * 恢复元素展示（清空 display 与 aria-hidden）。
 */
function applyRestore(el: ElHTMLElement): void {
  el.style.display = ''
  el.removeAttribute('aria-hidden')
}

export default {
  install(app: App) {
    app.directive<ElHTMLElement, PermissionBinding['value']>('permission', {
      mounted(el, binding) {
        const { hasPerm, hasAnyPerm } = useAuth()
        const b: PermissionBinding = {
          value: binding.value as string | string[],
          arg: binding.arg,
        }
        if (!checkPermission(b, hasPerm, hasAnyPerm)) {
          applyNoPermissionDisplay(el)
        }
      },
      updated(el, binding) {
        // 权限可能异步变化（角色切换 / token 刷新），重新判断
        const { hasPerm, hasAnyPerm } = useAuth()
        const b: PermissionBinding = {
          value: binding.value as string | string[],
          arg: binding.arg,
        }
        if (checkPermission(b, hasPerm, hasAnyPerm)) {
          applyRestore(el)
        } else {
          applyNoPermissionDisplay(el)
        }
      },
    })
  },
}
