import type { SchemaNode } from '../types'
import { resolveFunctionExpression } from './use-expression'

/** reaction 元字段 —— 仅用于 use-reaction 调度策略,不写入 node(避免序列化时带元数据) */
const REACTION_META_KEYS = new Set(['strategy', 'delay'])

/**
 * 应用 reaction 字段：对每个 reaction 配置项求值后写入 node[field]
 * - 字面量 / 字符串函数表达式:写入 node[key](如 label: 'xxx' / label: '{{ fn }}')
 * - 函数 reaction:执行 + 返回值赋给 node[key](P0 label 用法兼容;函数内部可同时写 model 副作用)
 * - 元字段(strategy / delay):跳过,不写入 node
 */
export function applyReactionFields(
  node: SchemaNode,
  reaction: NonNullable<SchemaNode['reaction']>,
  model: Record<string, unknown>
): void {
  for (const [key, raw] of Object.entries(reaction)) {
    if (REACTION_META_KEYS.has(key)) continue
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
