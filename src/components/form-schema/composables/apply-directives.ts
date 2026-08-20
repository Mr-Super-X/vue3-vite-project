import { withDirectives, type VNode, type Directive } from 'vue'
import type { DirectiveConfig } from '../types'

/** 把 node.directives 数组应用到 vnode（vue withDirectives 包装） */
export function applyDirectives(vnode: VNode, directives: DirectiveConfig[] | undefined): VNode {
  if (!directives || directives.length === 0) return vnode
  try {
    const args: unknown[] = [vnode]
    for (const d of directives) {
      let name: string
      let dirObj: Directive
      if (typeof d.directive === 'string') {
        name = d.directive
        dirObj = {} as Directive
      } else {
        const ref = d.directive as Directive & { name?: string }
        name = ref.name ?? ''
        dirObj = ref
      }
      args.push({
        name,
        value: d.value,
        arg: d.arg,
        modifiers: d.modifiers,
        dir: dirObj,
      } as unknown as Directive)
    }
    return withDirectives(...(args as Parameters<typeof withDirectives>)) as VNode
  } catch (err) {
    console.warn('[XForm] applyDirectives failed:', err)
    return vnode
  }
}
