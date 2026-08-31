import { h, type VNode } from 'vue'
import { ElRow, ElCol } from 'element-plus'
import type { SchemaNode } from '../types'

type RenderFn = (node: SchemaNode) => VNode | string | VNode[] | undefined

/** 视觉容器内栅格渲染（Card 等 + row/column 时使用） */
export function renderToComponentWithGrid(node: SchemaNode, renderToComponent: RenderFn): VNode {
  const cs = node.column ? Math.floor(24 / node.column) : 24
  const arr = Array.isArray(node.children)
    ? (node.children as SchemaNode[])
    : node.children && typeof node.children === 'object'
      ? [node.children as SchemaNode]
      : []
  return h(ElRow as never, { ...node.row } as never, {
    default: () =>
      arr.map((c, i) => {
        const inner = renderToComponent(c)
        return h(
          ElCol as never,
          { span: cs, key: (c as Record<string, unknown>).key ?? i } as never,
          { default: () => (Array.isArray(inner) ? inner : [inner]) as never }
        ) as never
      }),
  }) as never
}
