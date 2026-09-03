/**
 * applyDirectives —— 把 node.directives 数组应用到 vnode（vue withDirectives 包装）
 *
 * withDirectives 第二参数必须是元组数组 [dir, value, arg, modifiers]：
 * Vue 内部按 .length 遍历 + 数组解构，传对象会被静默跳过（指令不生效且无报错）。
 *
 * 字符串指令名暂不可解析：XFormProps.directives 注册表尚未接线，
 * 空 Directive 无钩子，跳过该条（当前仅支持直接传 Directive 对象）。
 */
import { withDirectives, type VNode, type Directive } from 'vue'
import type { DirectiveConfig } from '../types'

export function applyDirectives(vnode: VNode, directives: DirectiveConfig[] | undefined): VNode {
  if (!directives || directives.length === 0) return vnode
  try {
    const bindings: unknown[] = []
    for (const d of directives) {
      let dirObj: Directive
      if (typeof d.directive === 'string') {
        continue
      } else {
        dirObj = d.directive as Directive
      }
      bindings.push([dirObj, d.value, d.arg, d.modifiers])
    }
    if (bindings.length === 0) return vnode
    return withDirectives(vnode, bindings as Parameters<typeof withDirectives>[1]) as VNode
  } catch (err) {
    console.warn('[XForm] applyDirectives failed:', err)
    return vnode
  }
}
