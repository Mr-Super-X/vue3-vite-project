import type { SchemaNode } from '../types'
import { resolveFunctionExpression } from './use-expression'

/** 构建节点事件绑定：node.on 的 function / function-expression-string 转为 vue 事件 prop
 * - 函数：直接传
 * - 字符串：经 resolveFunctionExpression 解析（失败则跳过该事件）
 * 事件 prop 名遵循 vue 约定：on<EventName> = on + 大写首字母
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
