import type { SchemaNode } from '../types'
import { isEqual } from 'lodash-es'
import { resolveFunctionExpression } from './use-expression'

/** reaction 元字段 —— 仅用于 use-reaction 调度策略,不写入 node(避免序列化时带元数据) */
const REACTION_META_KEYS = new Set(['strategy', 'delay', 'deps'])

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
    const target = node as Record<string, unknown>
    // 值未变化时跳过写入：reaction 会在 model 任意变化时重跑（未声明 deps 时），
    // 无条件写入会产生多余的响应式通知，放大下游重渲染与联动链
    if (isEqual(target[key], value)) continue
    target[key] = value
  }
}
