import { watchEffect } from 'vue'
import type { SchemaNode } from '../types'
import { applyReactionFields } from './apply-reaction-fields'

/** 检查 schema 中是否含 reaction 字段（含字段时才需启用 watchEffect） */
export function containsReaction(schema: SchemaNode | SchemaNode[]): boolean {
  let found = false
  traverse(schema)
  return found
  function traverse(node: unknown): void {
    if (found || node === null || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (o.reaction) {
      found = true
      return
    }
    if (Array.isArray(o.children)) o.children.forEach(traverse)
    else if (o.children && typeof o.children === 'object') traverse(o.children)
    if (o.slots && typeof o.slots === 'object') {
      for (const slot of Object.values(o.slots as Record<string, unknown>)) traverse(slot)
    }
    if (o.formItem && typeof o.formItem === 'object') {
      const fi = o.formItem as Record<string, unknown>
      if (fi.slots && typeof fi.slots === 'object') {
        for (const slot of Object.values(fi.slots as Record<string, unknown>)) traverse(slot)
      }
    }
  }
}

/** 应用 reaction：按需注册 watchEffect（仅函数/函数表达式字符串）；求值错误 → console.error */
export function applyReactions(
  node: SchemaNode,
  model: Record<string, unknown>,
  stoppers: (() => void)[]
): void {
  if (node.reaction) {
    // 保存本地引用：watchEffect 立即同步执行时 node.reaction 已被 delete
    const reactionConfig = node.reaction
    delete node.reaction
    const hasDynamic = Object.values(reactionConfig).some(
      (v) => typeof v === 'function' || (typeof v === 'string' && v.startsWith('{{'))
    )
    if (hasDynamic) {
      const stop = watchEffect(() => {
        try {
          applyReactionFields(node, reactionConfig, model)
        } catch (err) {
          console.error('[XForm] reaction evaluation error:', err)
        }
      })
      stoppers.push(stop)
    } else {
      applyReactionFields(node, reactionConfig, model)
    }
  }
  if (node.children) {
    if (Array.isArray(node.children))
      node.children.forEach((c) => applyReactions(c, model, stoppers))
    else if (typeof node.children === 'object') applyReactions(node.children, model, stoppers)
  }
  if (node.slots) {
    for (const slot of Object.values(node.slots)) {
      if (slot && typeof slot === 'object' && !Array.isArray(slot))
        applyReactions(slot, model, stoppers)
      else if (Array.isArray(slot)) slot.forEach((c) => applyReactions(c, model, stoppers))
    }
  }
  if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
    for (const slot of Object.values(node.formItem.slots)) {
      if (slot && typeof slot === 'object' && !Array.isArray(slot))
        applyReactions(slot, model, stoppers)
    }
  }
}
