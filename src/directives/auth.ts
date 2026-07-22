// 权限指令 v-auth
//
// 用法：
//   v-auth="'user:edit'"               单权限
//   v-auth="['user:view','user:edit']" 多权限（AND 语义，全部满足）
//   v-auth:any="['a','b']"             多权限（ANY 语义，任一满足）
//   v-auth:disabled 修饰符             无权限时仅禁用，保留元素
//
// 实现：
//  - install 模式（与 inputDebounce / buttonDebounce / permission 一致）
//  - 调用 useAuth() 取最新权限，自动响应权限变化（store 更新时元素也更新）
//  - 移除元素不是 el.remove()（彻底删除），而是 el.style.display = 'none'
//    这样 Vue 响应式系统保留组件实例，切回权限时不需要重新挂载

import type { App } from 'vue'
import { useAuth } from '@composables/useAuth'
import type { ElHTMLElement, AuthBinding } from './auth.d'

/**
 * 内部校验函数：从 AuthBinding 提取语义判断权限
 *
 * @param binding 指令绑定值
 * @param hasPerm AND 语义校验函数
 * @param hasAnyPerm ANY 语义校验函数
 * @returns true 表示有权限
 */
function checkPermission(
  binding: AuthBinding,
  hasPerm: (codes: readonly string[]) => boolean,
  hasAnyPerm: (codes: readonly string[]) => boolean
): boolean {
  const codes = Array.isArray(binding.value) ? binding.value : [binding.value]
  return binding.modifiers?.any ? hasAnyPerm(codes) : hasPerm(codes)
}

function applyNoAuthDisplay(el: ElHTMLElement): void {
  el.style.display = 'none'
  el.setAttribute('aria-hidden', 'true')
}

function applyRestore(el: ElHTMLElement): void {
  el.style.display = ''
  el.removeAttribute('aria-hidden')
}

export default {
  install(app: App): void {
    app.directive<ElHTMLElement, AuthBinding['value']>('auth', {
      mounted(el, binding) {
        const { hasPerm, hasAnyPerm } = useAuth()
        const b: AuthBinding = {
          value: binding.value as string | string[],
          modifiers: {
            any: binding.arg === 'any',
            disabled: !!binding.modifiers.disabled,
            remove:
              binding.modifiers.remove ||
              (!binding.modifiers.disabled && !binding.modifiers.remove),
          },
        }
        const hasAccess = checkPermission(b, hasPerm, hasAnyPerm)
        if (!hasAccess) {
          applyNoAuthDisplay(el)
        }
      },
      updated(el, binding) {
        // 权限可能异步变化（用户切换 / 角色变更），重新判断
        const { hasPerm, hasAnyPerm } = useAuth()
        const b: AuthBinding = {
          value: binding.value as string | string[],
          modifiers: {
            any: binding.arg === 'any',
            disabled: !!binding.modifiers.disabled,
          },
        }
        const hasAccess = checkPermission(b, hasPerm, hasAnyPerm)
        if (hasAccess) {
          applyRestore(el)
        } else {
          applyNoAuthDisplay(el)
        }
      },
    })
  },
}
