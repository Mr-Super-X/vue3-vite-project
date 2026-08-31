import { h, type VNode } from 'vue'

/** 给 VNode 套 display:none wrapper（与 ignore 不同：ignore 不创建节点，hidden 创建但隐藏） */
export function withHidden(vnode: VNode): VNode {
  return h('div', { style: 'display: none', 'aria-hidden': 'true' }, [vnode]) as unknown as VNode
}
