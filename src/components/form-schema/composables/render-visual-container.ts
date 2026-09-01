/**
 * 视觉容器渲染（Card 等带 row/column 的节点，无 name 时走该分支）
 * - 用于「Card 容器包多个字段」「带 row+column 的容器节点」
 * - 默认 slot 来自 node.children 或 grid 渲染
 *
 * 类型断言归因（OPT-3）：h() 调用处的 `as never` 是 Element Plus 类型元组缺陷，
 * 见 render-array-node.ts 头部同类说明。
 */
import { h, type VNode } from 'vue'
import type { SchemaNode } from '../types'
import { buildSlotFn, getComponentDefaultProps } from './render-schema-node'
import { renderToComponentWithGrid } from './render-with-grid'
import type { RenderSchemaNodeOptions } from './render-schema-node'

export function renderVisualContainer(
  node: SchemaNode,
  Comp: object | string,
  opts: RenderSchemaNodeOptions,
  asyncProps: Record<string, unknown>
): VNode {
  const slotMap: Record<string, (scope?: unknown) => unknown> = {}
  if (node.slots) {
    for (const [k, v] of Object.entries(node.slots)) slotMap[k] = buildSlotFn(v, opts.render)
  }
  const useGrid = !!(node.row || node.column !== undefined)
  slotMap.default = useGrid
    ? () => renderToComponentWithGrid(node, opts.render)
    : () => opts.render(node.children as never) as never
  return h(
    Comp as never,
    {
      ...getComponentDefaultProps(node, opts.componentProps),
      ...node.props,
      ...asyncProps,
      ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
      ...(node.key !== undefined && { key: node.key }),
    } as never,
    slotMap
  ) as never
}
