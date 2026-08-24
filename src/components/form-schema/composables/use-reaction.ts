import { watch } from 'vue'
import { debounce, throttle } from 'lodash-es'
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
      for (const slot of Object.values(o.slots as Record<string, unknown>)) {
        if (typeof slot === 'function') continue
        traverse(slot)
      }
    }
    if (o.formItem && typeof o.formItem === 'object') {
      const fi = o.formItem as Record<string, unknown>
      if (fi.slots && typeof fi.slots === 'object') {
        for (const slot of Object.values(fi.slots as Record<string, unknown>)) {
          if (typeof slot === 'function') continue
          traverse(slot)
        }
      }
    }
    // 数组节点（kind: 'array'）：递归遍历 itemSchema 子树，避免 itemSchema 内部 reaction 被漏判
    if (o.kind === 'array' && o.array && typeof o.array === 'object') {
      const itemSchema = (o.array as Record<string, unknown>).itemSchema
      traverse(itemSchema)
    }
  }
}

/** 应用 reaction：按需注册 watchEffect（仅函数/函数表达式字符串）；求值错误 → console.error
 *  支持 strategy: 'sync' | 'debounce' | 'throttle' + delay
 *  - 'sync'(默认):依赖变化立即同步执行
 *  - 'debounce':依赖停止变化 delay ms 后执行一次（适合远程搜索）
 *  - 'throttle':delay ms 内最多执行一次（适合实时保存） */
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
      const strategy = reactionConfig.strategy ?? 'sync'
      const delay = typeof reactionConfig.delay === 'number' ? reactionConfig.delay : 0
      const runner = (): void => {
        try {
          applyReactionFields(node, reactionConfig, model)
        } catch (err) {
          console.error('[XForm] reaction evaluation error:', err)
        }
      }
      let stop: () => void
      if (strategy === 'debounce' && delay > 0) {
        const debounced = debounce(runner, delay)
        // watch deep 订阅 model:任意字段变化触发 debounced
        stop = watch(
          () => model,
          () => debounced(),
          { deep: true }
        )
      } else if (strategy === 'throttle' && delay > 0) {
        const throttled = throttle(runner, delay)
        stop = watch(
          () => model,
          () => throttled(),
          { deep: true }
        )
      } else {
        // sync(默认):保持向后兼容 —— setup 时立即同步跑一次 + watch 订阅后续变化
        runner()
        stop = watch(() => model, runner, { deep: true })
      }
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
      if (typeof slot === 'function') continue
      if (slot && typeof slot === 'object' && !Array.isArray(slot))
        applyReactions(slot, model, stoppers)
      else if (Array.isArray(slot)) slot.forEach((c) => applyReactions(c, model, stoppers))
    }
  }
  if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
    for (const slot of Object.values(node.formItem.slots)) {
      if (typeof slot === 'function') continue
      if (slot && typeof slot === 'object' && !Array.isArray(slot))
        applyReactions(slot, model, stoppers)
    }
  }
  // 数组节点（kind: 'array'）：递归遍历 itemSchema 子树，注册内嵌 reaction
  if (node.kind === 'array' && node.array) {
    const itemSchema = node.array.itemSchema
    if (Array.isArray(itemSchema)) {
      itemSchema.forEach((c) => applyReactions(c, model, stoppers))
    } else if (itemSchema && typeof itemSchema === 'object') {
      applyReactions(itemSchema, model, stoppers)
    }
  }
}
