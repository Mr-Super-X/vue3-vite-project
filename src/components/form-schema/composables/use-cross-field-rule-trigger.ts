/**
 * use-cross-field-rule-trigger —— 每字段跨字段规则触发器（P2-2 重做，内部委托）
 *
 * 为什么独立成文件（保留 useFormValidation 公开签名前提下）：
 * - triggerCrossFieldValidator 含序号令牌 + matchTrigger + 空值跳过 + 异步竞态防护，
 *   ~40 行独立逻辑，与 useFormValidation 主编排（validateForm / applyCrossErrors）关注点不同
 * - 抽到独立单元后便于单独测试（未来补 spec），避免主文件过大
 *
 * 重做策略（区别于首次 P2-2）：
 * - useFormValidation 内部委托本 composable → 公开签名 100% 不变
 * - spec 不改、demo 不改、composer 集成不变
 *
 * 行为 100% 等价首次实现：trigger 顺序、序号令牌、空值跳过、过期结果丢弃逻辑完全保留。
 */
import { get } from 'lodash-es'
import { matchTrigger } from './match-trigger'
import type { RuleItem, SchemaNode } from '../types'

export interface UseCrossFieldRuleTriggerDeps {
  /** 表单数据 */
  model: { value: Record<string, unknown> | undefined }
  /** 写错误到 form-item */
  setFieldError: (name: string, message: string, state?: '' | 'error') => void
}

export interface UseCrossFieldRuleTriggerReturn {
  /**
   * 字段事件触发跨字段校验 —— 让 crossValidator 响应 trigger 配置
   * - 遍历当前字段 rules,提取 dependsOn + crossValidator + trigger 配置
   * - 检查 rule.trigger 与当前事件类型是否匹配
   * - 跑 crossValidator(支持同步/异步)
   * - 成功 → 清掉之前可能的红字
   * - 失败 → setFieldError 红字提示
   * - 跳过空值字段(空值交给普通 required 校验处理)
   */
  triggerCrossFieldValidator: (node: SchemaNode, eventType: 'blur' | 'change') => Promise<void>
}

/**
 * 字段事件跨字段规则触发器
 * - 序号令牌：连续 blur/change 触发时，旧 Promise 后返回不得覆盖新结果（H3）
 * - 实例级 Map：组件 unmount 时随 composable scope 一起 GC（OPT-5）
 */
export function useCrossFieldRuleTrigger(
  deps: UseCrossFieldRuleTriggerDeps
): UseCrossFieldRuleTriggerReturn {
  const crossTriggerSeq = new Map<string, number>()

  async function triggerCrossFieldValidator(
    node: SchemaNode,
    eventType: 'blur' | 'change'
  ): Promise<void> {
    if (!node.name || !node.rules) return
    const m = deps.model.value
    if (!m) return
    // 序号令牌：连续 blur/change 触发时，旧 Promise 后返回不得覆盖新结果（H3）
    const triggerSeq = (crossTriggerSeq.get(node.name) ?? 0) + 1
    crossTriggerSeq.set(node.name, triggerSeq)
    const rules = Array.isArray(node.rules) ? node.rules : [node.rules]
    const currentValue = get(m, node.name)
    // 空值跳过 cross 校验(留给 required / type 规则)
    if (currentValue === '' || currentValue === undefined || currentValue === null) return
    for (const r of rules) {
      if (typeof r !== 'object' || r === null) continue
      const rule = r as RuleItem
      if (!rule.crossValidator || !rule.dependsOn) continue
      // trigger 字段过滤
      if (!matchTrigger(rule.trigger, eventType)) continue
      const depsList = (Array.isArray(rule.dependsOn) ? rule.dependsOn : [rule.dependsOn]).map(
        (dep: string) => get(m, dep)
      )
      let result: true | string
      try {
        result = await Promise.resolve(rule.crossValidator(currentValue, ...depsList))
      } catch (err) {
        console.error('[XForm] crossValidator blur trigger threw:', err)
        continue
      }
      if (triggerSeq !== crossTriggerSeq.get(node.name)) return // 已有更新的触发，丢弃过期结果
      if (result === true) {
        deps.setFieldError(node.name, '', '')
      } else {
        deps.setFieldError(node.name, result)
      }
    }
  }

  return { triggerCrossFieldValidator }
}
