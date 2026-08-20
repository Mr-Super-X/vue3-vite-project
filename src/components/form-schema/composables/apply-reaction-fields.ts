import type { SchemaNode } from '../types'
import { resolveFunctionExpression } from './use-expression'

/**
 * 应用 reaction 字段：对每个 reaction 配置项求值后写入 node[field]
 * 值类型：字面量 / 函数 / 函数表达式字符串（{{ (m) => ... }}）
 */
export function applyReactionFields(
  node: SchemaNode,
  reaction: NonNullable<SchemaNode['reaction']>,
  model: Record<string, unknown>
): void {
  for (const [key, raw] of Object.entries(reaction)) {
    let value: unknown = raw
    if (typeof raw === 'string') {
      const fn = resolveFunctionExpression(raw)
      if (fn) value = (fn as (m: Record<string, unknown>) => unknown)(model)
    } else if (typeof raw === 'function') {
      value = (raw as (m: Record<string, unknown>) => unknown)(model)
    }
    ;(node as Record<string, unknown>)[key] = value
  }
}
