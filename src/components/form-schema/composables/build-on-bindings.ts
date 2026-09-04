import type { SchemaNode } from '../types'
import { resolveFunctionExpression } from './use-expression'

/**
 * 节点事件绑定：node.on 转 vue 事件 prop（`on<EventName>` = on + 大写首字母）。
 * 函数直接传；字符串经 resolveFunctionExpression 解析（失败则跳过该事件）。
 */
export function buildOnBindings(
  node: SchemaNode,
  model: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!node.on) return {}
  const out: Record<string, unknown> = {}
  for (const [evt, raw] of Object.entries(node.on)) {
    const propKey = `on${evt[0]!.toUpperCase()}${evt.slice(1)}`
    if (typeof raw === 'function') {
      out[propKey] = raw
    } else if (typeof raw === 'string') {
      const fn = resolveFunctionExpression(raw)
      if (fn) {
        out[propKey] = (...args: unknown[]) =>
          (fn as (m: Record<string, unknown>, ...args: unknown[]) => unknown)(model ?? {}, ...args)
      }
    }
  }
  return out
}
