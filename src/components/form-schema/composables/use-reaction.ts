import { nextTick, watch } from 'vue'
import { debounce, get, throttle } from 'lodash-es'
import type { SchemaNode } from '../types'
import { applyReactionFields } from './apply-reaction-fields'

/** 单 flush 内 reaction 最大执行次数 —— 超出视为循环联动（reaction 写 model 又触发自身）。
 *  必须低于 Vue 调度器自身的递归上限（100）：先一步拦截可避免 Vue 抛出
 *  "Maximum recursive updates exceeded" 未处理异常，把卡死降级为可诊断的 console.error */
const MAX_CHAIN_PER_FLUSH = 50

/**
 * 联动执行预算：每个表单实例一份，nextTick 后自动重置。
 * 为什么需要：reaction 函数允许写 model 副作用，deep watch 会再次触发 runner，
 * 一旦构成环（A 改 B、B 改 A）将无限刷入 Vue 调度队列，页面卡死且无报错。
 * 预算耗尽后本 flush 直接跳过并 console.error，把"卡死"降级为"可诊断的错误"。
 */
interface ReactionBudget {
  enter: () => boolean
}

function createBudget(): ReactionBudget {
  let count = 0
  let resetScheduled = false
  return {
    enter() {
      if (count >= MAX_CHAIN_PER_FLUSH) return false
      count++
      if (!resetScheduled) {
        resetScheduled = true
        void nextTick(() => {
          count = 0
          resetScheduled = false
        })
      }
      return true
    },
  }
}

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

/**
 * 应用 reaction：按需注册 watch（仅函数/函数表达式字符串）；求值错误 → console.error
 *
 * - strategy: 'sync' | 'debounce' | 'throttle' + delay
 *  - 'sync'(默认):依赖变化立即同步执行
 *  - 'debounce':依赖停止变化 delay ms 后执行一次（适合远程搜索）
 *  - 'throttle':delay ms 内最多执行一次（适合实时保存）
 * - deps: string[] —— 声明后仅精确 watch 这些路径；未声明保持 deep watch 整棵 model 的旧行为
 */
export function applyReactions(
  node: SchemaNode,
  model: Record<string, unknown>,
  stoppers: (() => void)[],
  budget: ReactionBudget = createBudget()
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
      const deps = Array.isArray(reactionConfig.deps)
        ? reactionConfig.deps.filter((d): d is string => typeof d === 'string')
        : null
      const runner = (): void => {
        if (!budget.enter()) {
          console.error(
            `[XForm] reaction 单批次执行超过 ${MAX_CHAIN_PER_FLUSH} 次，疑似循环联动` +
              '（reaction 写入 model 又触发自身）。本批次已跳过，请检查联动链或声明 deps 缩小监听范围。'
          )
          return
        }
        try {
          applyReactionFields(node, reactionConfig, model)
        } catch (err) {
          console.error('[XForm] reaction evaluation error:', err)
        }
      }
      // 声明 deps → 精确监听路径（浅比较每次求值的快照数组）；
      // 未声明 → 向后兼容：deep watch 整棵 model
      const source = deps && deps.length > 0 ? () => deps.map((d) => get(model, d)) : () => model
      const watchOpts = deps && deps.length > 0 ? {} : { deep: true as const }
      let stop: () => void
      if (strategy === 'debounce' && delay > 0) {
        const debounced = debounce(runner, delay)
        stop = watch(source, () => debounced(), watchOpts)
      } else if (strategy === 'throttle' && delay > 0) {
        const throttled = throttle(runner, delay)
        stop = watch(source, () => throttled(), watchOpts)
      } else {
        // sync(默认):保持向后兼容 —— setup 时立即同步跑一次 + watch 订阅后续变化
        runner()
        stop = watch(source, runner, watchOpts)
      }
      stoppers.push(stop)
    } else {
      applyReactionFields(node, reactionConfig, model)
    }
  }
  if (node.children) {
    if (Array.isArray(node.children))
      node.children.forEach((c) => applyReactions(c, model, stoppers, budget))
    else if (typeof node.children === 'object')
      applyReactions(node.children, model, stoppers, budget)
  }
  if (node.slots) {
    for (const slot of Object.values(node.slots)) {
      if (typeof slot === 'function') continue
      if (slot && typeof slot === 'object' && !Array.isArray(slot))
        applyReactions(slot, model, stoppers, budget)
      else if (Array.isArray(slot)) slot.forEach((c) => applyReactions(c, model, stoppers, budget))
    }
  }
  if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
    for (const slot of Object.values(node.formItem.slots)) {
      if (typeof slot === 'function') continue
      if (slot && typeof slot === 'object' && !Array.isArray(slot))
        applyReactions(slot, model, stoppers, budget)
    }
  }
  // 数组节点（kind: 'array'）：递归遍历 itemSchema 子树，注册内嵌 reaction
  if (node.kind === 'array' && node.array) {
    const itemSchema = node.array.itemSchema
    if (Array.isArray(itemSchema)) {
      itemSchema.forEach((c) => applyReactions(c, model, stoppers, budget))
    } else if (itemSchema && typeof itemSchema === 'object') {
      applyReactions(itemSchema, model, stoppers, budget)
    }
  }
}
