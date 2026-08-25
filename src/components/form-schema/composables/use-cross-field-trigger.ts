/**
 * 反向跨字段实时校验 —— 阶段 1.1 + 阶段 3.1 修复
 *
 * 问题：当字段 A 变化时，依赖 A 的字段 B 的 crossValidator 应该重算并写错误到 B。
 * 当前 XForm.triggerCrossFieldValidator 仅在该字段失焦/change 时跑自己节点的 rules —— 不响应别人变化。
 *
 * 解决：建立反向依赖索引 `{depField → [RuleDescriptor]}`，
 * model 任一字段变化时找出**受影响的** rules（deps 包含变化字段的）重新跑 crossValidator。
 *
 * 设计要点：
 * - 精确触发：run(changedField) 只跑 deps 包含 changedField 的 rule（避免误触发其他字段）
 * - schema 变化时重建索引：schema 整体替换要重新收集
 * - 空值跳过：避免空字符串把已通过的字段错误重置（与正向逻辑对齐）
 * - 异步支持：crossValidator 可返回 Promise，统一用 Promise.resolve 包一层
 * - 双触发路径：
 *   1. 精确路径：暴露 trigger(fieldName) 方法，XForm.vue 在 onValueChange 时精确调用
 *   2. 兜底路径：保留 watch model，model 任一字段变化时对**所有**字段跑一次（处理非 onValueChange 路径如 resetFields）
 */
import { watch, type WatchStopHandle } from 'vue'
import { get, isEqual } from 'lodash-es'
import type { SchemaNode, RuleItem } from '../types'
import { collectCrossRuleFields } from './use-validate'

interface ReverseRule {
  /** 规则所属的目标字段（错误写入这里） */
  target: string
  /** 规则依赖的字段路径集合（lodash get 支持 'items[0].qty'） */
  deps: string[]
  rule: RuleItem
}

function buildReverseIndex(schema: SchemaNode | SchemaNode[] | string | undefined): ReverseRule[] {
  const out: ReverseRule[] = []
  const fields = collectCrossRuleFields(schema ?? [])
  for (const node of fields) {
    if (!node.name || !node.rules) continue
    const arr = Array.isArray(node.rules) ? node.rules : [node.rules]
    for (const r of arr) {
      if (typeof r !== 'object' || !r || !('crossValidator' in r) || !('dependsOn' in r)) continue
      const rule = r as RuleItem
      const raw = rule.dependsOn
      const deps = (Array.isArray(raw) ? raw : [raw]).filter(
        (d): d is string => typeof d === 'string'
      )
      if (deps.length === 0) continue
      out.push({ target: node.name, deps, rule })
    }
  }
  return out
}

export interface UseCrossFieldTriggerOptions {
  schema: () => SchemaNode | SchemaNode[] | string | undefined
  model: () => Record<string, unknown> | undefined
  /** 写错误到 form-item（由 XForm 通过 useFormInstance.setFieldError 注入） */
  setFieldError: (name: string, message: string) => void
  /** 清错误 —— 用 element-plus el-form.clearValidate([prop]) 走官方清错流程 */
  clearValidate: (names: string[]) => void
}

export function useCrossFieldTrigger(opts: UseCrossFieldTriggerOptions): {
  stop: () => void
  /**
   * 阶段 3.1 修复：精确触发反向校验
   * - 只跑 deps 包含 changedField 的 rules（避免改 password 误触发日期校验）
   * - 调用方：XForm.vue 的 onValueChange 回调精确传入 node.name
   */
  trigger: (changedField: string) => void
} {
  let rules: ReverseRule[] = buildReverseIndex(opts.schema())
  const stops: WatchStopHandle[] = []

  /**
   * 内部实现：跑 rules 的核心逻辑
   * - changedField 为空/undefined 时跑所有 rules（兜底路径：resetFields / setModel 整个替换）
   * - changedField 有值时只跑 deps 包含 changedField 的 rules（精确路径）
   */
  function run(changedField?: string): void {
    const model = opts.model()
    if (!model) return
    const toClear: string[] = []
    const toWrite: Array<{ name: string; message: string }> = []
    for (const r of rules) {
      // manual trigger 不响应反向 —— 仅 validateForm() 时跑
      if (r.rule.trigger === 'manual') continue
      // 精确双向触发：
      // - 反向：deps 包含 changedField（"改 A 触发 B 重算"）
      // - 正向：target === changedField（"改 B 触发 B 自己的跨字段规则重算"）
      if (changedField && !r.deps.includes(changedField) && r.target !== changedField) {
        continue
      }
      const value = get(model, r.target)
      if (value === '' || value === undefined || value === null) {
        toClear.push(r.target)
        continue
      }
      const depsValues = r.deps.map((d) => get(model, d))
      const cv = r.rule.crossValidator
      if (!cv) continue
      const result = cv(value, ...depsValues)
      if (result instanceof Promise) {
        result
          .then((res) => {
            if (res === true) opts.clearValidate([r.target])
            else opts.setFieldError(r.target, res)
          })
          .catch((err) => {
            console.error('[XForm] reverse cross validator threw:', err)
          })
      } else if (result === true) {
        toClear.push(r.target)
      } else {
        toWrite.push({ name: r.target, message: result })
      }
    }
    if (toClear.length > 0) opts.clearValidate(toClear)
    for (const w of toWrite) opts.setFieldError(w.name, w.message)
  }

  // schema 变化时重建索引（如动态表单替换整体 schema）
  stops.push(
    watch(
      () => opts.schema(),
      () => {
        rules = buildReverseIndex(opts.schema())
      },
      { immediate: true }
    )
  )

  // 阶段 3.1 修复：watch model 兜底 + 精确 diff 触发
  // 解决"demo 程序直接修改 model 不触发校验"的问题（如一键制造日期冲突）
  // —— 监听 model 变化,对比 oldModel/newModel 找出变化的字段名,逐个精确 run
  // —— 避免改 password 时误触发日期校验(原 bug 根因)
  let oldSnapshot: Record<string, unknown> = opts.model() ? { ...opts.model()! } : {}
  stops.push(
    watch(
      () => opts.model(),
      (newModel) => {
        if (!newModel) {
          oldSnapshot = {}
          return
        }
        const changed: string[] = []
        for (const key of Object.keys(newModel)) {
          if (!isEqual(newModel[key], oldSnapshot[key])) {
            changed.push(key)
          }
        }
        oldSnapshot = { ...newModel }
        // 精确触发：每个变化字段都 run(fieldName)
        for (const key of changed) {
          run(key)
        }
      },
      { deep: true } // 关键:deep 监听 model 内部属性变化
    )
  )

  return {
    stop: () => stops.forEach((s) => s()),
    trigger: (changedField: string) => run(changedField),
  }
}
