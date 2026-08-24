/**
 * 反向跨字段实时校验 —— 阶段 1.1
 *
 * 问题：当字段 A 变化时，依赖 A 的字段 B 的 crossValidator 应该重算并写错误到 B。
 * 当前 XForm.triggerCrossFieldValidator 仅在该字段失焦/change 时跑自己节点的 rules —— 不响应别人变化。
 *
 * 解决：建立反向依赖索引 `{depField → [RuleDescriptor]}`，
 * model 任一字段变化时找出所有受影响的 rules 重新跑 crossValidator，把错误写入目标字段。
 *
 * 设计要点：
 * - trigger 字段过滤：与正向一致（未指定默认 blur，manual 不响应反向）
 * - 空值跳过：避免空字符串把已通过的字段错误重置（与正向逻辑对齐）
 * - debounce 200ms：避免高频输入场景（Input 每次按键）反复跑
 * - 异步支持：crossValidator 可返回 Promise，统一用 Promise.resolve 包一层
 * - schema 变化时重建索引：schema 整体替换（如动态表单）要重新收集
 */
import { watch, type WatchStopHandle } from 'vue'
import { get } from 'lodash-es'
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
  /**
   * 清错误 —— 用 element-plus el-form.clearValidate([prop]) 走官方清错流程
   * 原因：手动设 validateState='' 在 element-plus 2.x 不稳定（已知 shallowRef 陷阱），
   * 用 clearValidate 更可靠，能正确触发 UI 重渲染
   */
  clearValidate: (names: string[]) => void
  /** debounce 延迟（ms），默认 0（同步立即响应）。高频场景可设大值 */
  delay?: number
}

export function useCrossFieldTrigger(opts: UseCrossFieldTriggerOptions): { stop: () => void } {
  let rules: ReverseRule[] = buildReverseIndex(opts.schema())
  const stops: WatchStopHandle[] = []

  function run(): void {
    const model = opts.model()
    if (!model) return
    // 第一遍：收集需要清错误的字段（避免反复调用 clearValidate 触发多次 UI 重渲染）
    const toClear: string[] = []
    const toWrite: Array<{ name: string; message: string }> = []
    for (const r of rules) {
      // manual trigger 不响应反向 —— 仅 validateForm() 时跑
      if (r.rule.trigger === 'manual') continue
      const value = get(model, r.target)
      // 空值清掉之前可能的错误（与正向 triggerCrossFieldValidator 行为一致）
      if (value === '' || value === undefined || value === null) {
        toClear.push(r.target)
        continue
      }
      const depsValues = r.deps.map((d) => get(model, d))
      const cv = r.rule.crossValidator
      if (!cv) continue
      const result = cv(value, ...depsValues)
      // 同步值：同步决定清/写
      // Promise：推到 then 处理
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
    // 同步批量执行：先清错误（一次 clearValidate），再写错误（多次 setFieldError）
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

  // model 任一字段变化 → 同步触发反向校验（不再 debounce —— 用户期望立刻响应）
  // 高频场景（如 100+ 字段表单）：可让外部通过 options.delay 自行包一层
  stops.push(watch(() => opts.model(), run, { deep: true }))

  return {
    stop: () => stops.forEach((s) => s()),
  }
}
