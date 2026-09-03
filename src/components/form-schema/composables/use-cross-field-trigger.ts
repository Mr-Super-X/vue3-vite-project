/**
 * 反向跨字段实时校验 —— 阶段 1.1 + 阶段 3.1 修复 + debounce 调度
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
 * - debounce 调度（阶段 X.Y）：
 *   - 全局默认：useCrossFieldTriggerOptions.defaultDebounceMs（由 XForm 从 schema.debounceValidation 透传）
 *   - 字段覆盖：RuleItem.debounceMs 优先于 defaultDebounceMs
 *   - 0 = 实时同步执行；>0 = lodash.debounce 延迟执行
 *   - runner 按 `target|delay` 缓存，同字段同 delay 共享一个 runner
 */
import { watch, type WatchStopHandle } from 'vue'
import { debounce, get, isEqual } from 'lodash-es'
import type { RuleItem } from '../types'

interface ReverseRule {
  /** 规则所属的目标字段（错误写入这里） */
  target: string
  /** 规则依赖的字段路径集合（lodash get 支持 'items[0].qty'） */
  deps: string[]
  rule: RuleItem
}

/**
 * useCrossFieldTrigger 入参 —— 反向跨字段实时触发配置
 *
 * - crossRules: getter 返回扁平跨字段规则数组（XForm 通过 useSchemaIndex().crossRules 注入）
 * - setFieldError / clearValidate: 来自 useFormInstance 的错误写入 + 官方清错流程
 * - defaultDebounceMs: getter 形式（schema.debounceValidation 可能运行时改变）
 */
export interface UseCrossFieldTriggerOptions {
  /**
   * 跨字段规则的扁平数组 —— 由 XForm 通过 useSchemaIndex().crossRules 拍平后传入。
   * XForm setup 时一次扁平，schema 整体替换时由 XForm 重新构造此函数返回值。
   */
  crossRules: () => ReverseRule[]
  model: () => Record<string, unknown> | undefined
  /** 写错误到 form-item（由 XForm 通过 useFormInstance.setFieldError 注入） */
  setFieldError: (name: string, message: string) => void
  /** 清错误 —— 用 element-plus el-form.clearValidate([prop]) 走官方清错流程 */
  clearValidate: (names: string[]) => void
  /**
   * 全局默认 debounce 时延（毫秒，getter 形式）
   * - 返回 0：实时执行（每键触发）
   * - 返回 >0：依赖字段停止变化 delay ms 后跑一次 crossValidator
   * 字段级 RuleItem.debounceMs 优先于本配置
   * getter 形式：useCrossFieldTrigger 在 setup 时实例化，但 schema.debounceValidation
   * 可能在运行中改变（demo 模式切换 / 远程拉取 schema 覆盖等）；getter 保证读取最新值
   */
  defaultDebounceMs?: () => number
}

/** useCrossFieldTrigger —— 反向跨字段实时校验（精确 + 兑底 + debounce） */
export function useCrossFieldTrigger(opts: UseCrossFieldTriggerOptions): {
  stop: () => void
  /**
   * 阶段 3.1 修复：精确触发反向校验
   * - 只跑 deps 包含 changedField 的 rules（避免改 password 误触发日期校验）
   * - 调用方：XForm.vue 的 onValueChange 回调精确传入 node.name
   */
  trigger: (changedField: string) => void
} {
  let rules: ReverseRule[] = opts.crossRules()
  // runner 类型：debounced 函数（lodash 返回）带 .cancel()；sync 函数无 cancel。
  // 统一类型让清理逻辑可以安全调用 cancel（lodash.debounce 返回值 cast 后 cancel 存在）
  type Runner = (() => void) & { cancel?: () => void }
  const stops: WatchStopHandle[] = []
  // 每字段序号令牌：异步 crossValidator 连续触发时，旧 Promise 后返回不得覆盖新结果（H3）
  const targetSeqMap = new Map<string, number>()
  // runner 缓存：key = `${target}|${delayMs}`，同字段同 delay 共享一个 lodash.debounce 实例
  // rules 整体替换时清空缓存（旧 runner 引用的 rule 引用已失效）
  const runnerCache = new Map<string, (() => void) & { cancel?: () => void }>()
  // 同 tick 去重窗口：XForm.onValueChange 在 v-model 更新时同步调 trigger(field)，
  // 同一 tick 内 deep watch model 又会 diff 出同一字段 —— 两条路径都 run(field) 会让
  // delay=0（实时模式）的 crossValidator 每键执行 2 次（demo counter 虚高）。
  // trigger() 先登记字段，watch 回调 diff 时跳过已登记的；窗口在每次 watch 回调末尾关闭，
  // 保证下一 tick 的真实变化不被误吞
  const triggeredFields = new Set<string>()

  /** 单条 rule 的同步执行（debounce 包装内部调用），同步/异步结果都走 targetSeqMap 防竞态 */
  function executeRule(r: ReverseRule): void {
    const model = opts.model()
    if (!model) return
    const value = get(model, r.target)
    if (value === '' || value === undefined || value === null) {
      opts.clearValidate([r.target])
      return
    }
    const depsValues = r.deps.map((d) => get(model, d))
    const cv = r.rule.crossValidator
    if (!cv) return
    const seq = (targetSeqMap.get(r.target) ?? 0) + 1
    targetSeqMap.set(r.target, seq)
    const result = cv(value, ...depsValues)
    if (result instanceof Promise) {
      result
        .then((res) => {
          if (seq !== targetSeqMap.get(r.target)) return // 已有更新的触发，丢弃过期结果
          if (res === true) opts.clearValidate([r.target])
          else opts.setFieldError(r.target, res)
        })
        .catch((err) => {
          console.error('[XForm] reverse cross validator threw:', err)
        })
    } else if (result === true) {
      opts.clearValidate([r.target])
    } else {
      opts.setFieldError(r.target, result)
    }
  }

  /** 取 rule 的 debounce runner：0 = 同步执行；>0 = lodash.debounce
   *  关键：delay 用 getter 形式（r.rule.debounceMs ?? opts.defaultDebounceMs?.() ?? 0）
   *  保证 schema 全局 debounceValidation 改变后立即生效，不需要重建 useCrossFieldTrigger 实例 */
  function getRunner(r: ReverseRule): Runner {
    const defaultMs = opts.defaultDebounceMs?.() ?? 0
    const delay = r.rule.debounceMs ?? defaultMs ?? 0
    const key = `${r.target}|${delay}`
    const cached = runnerCache.get(key)
    if (cached) return cached
    // 同 target 其他 delay 的旧 runner 取消 + 删除（模式切换延迟变化时缓存清理）
    for (const [k, old] of runnerCache) {
      if (k.startsWith(`${r.target}|`) && k !== key) {
        old.cancel?.()
        runnerCache.delete(k)
      }
    }
    const fn: Runner =
      delay > 0
        ? (() => {
            const d = debounce(() => executeRule(r), delay)
            return d as unknown as Runner
          })()
        : (Object.assign(() => executeRule(r), { cancel: () => {} }) as Runner)
    runnerCache.set(key, fn)
    return fn
  }

  /**
   * 内部实现：跑 rules 的核心逻辑
   * - changedField 为空/undefined 时跑所有 rules（兜底路径：resetFields / setModel 整个替换）
   * - changedField 有值时只跑 deps 包含 changedField 的 rules（精确路径）
   */
  function run(changedField?: string): void {
    for (const r of rules) {
      // manual trigger 不响应反向 —— 仅 validateForm() 时跑
      if (r.rule.trigger === 'manual') continue
      // 精确双向触发：
      // - 反向：deps 包含 changedField（"改 A 触发 B 重算"）
      // - 正向：target === changedField（"改 B 触发 B 自己的跨字段规则重算"）
      if (changedField && !r.deps.includes(changedField) && r.target !== changedField) {
        continue
      }
      const runner = getRunner(r)
      runner()
    }
  }

  // 跨字段规则重建（依赖 XForm 通过 opts.crossRules 传入；索引变化时该 getter 返回新数组）
  // 重建时清空 runner 缓存 + 取消所有遗留 debounce timer：
  // 仅 runnerCache.clear() 会留下 in-flight 的 lodash.debounce 内部 setTimeout，
  // 这些 timer 到期仍会调用闭包里的 executeRule → counter 累加 → 校验次数虚高
  // 必须先调每个 runner.cancel() 再清缓存
  stops.push(
    watch(
      opts.crossRules,
      (next) => {
        rules = next
        for (const r of runnerCache.values()) {
          if (typeof r.cancel === 'function') r.cancel()
        }
        runnerCache.clear()
        targetSeqMap.clear()
      },
      { immediate: true, flush: 'sync' }
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
        for (const key of changed) {
          // trigger() 同 tick 已精确处理过的字段跳过（嵌套路径如 items[0].qty
          // 只会以顶层 items 出现在 diff 里，不在 Set 中，run 空跑无副作用）
          if (triggeredFields.has(key)) continue
          run(key)
        }
        triggeredFields.clear()
      },
      { deep: true } // 关键:deep 监听 model 内部属性变化
    )
  )

  return {
    stop: () => {
      // stop 时也要取消遗留 debounce timer，否则组件卸载后 timer 仍 fire（内存泄漏 + 错误调用）
      for (const r of runnerCache.values()) {
        if (typeof r.cancel === 'function') r.cancel()
      }
      runnerCache.clear()
      triggeredFields.clear()
      stops.forEach((s) => s())
    },
    trigger: (changedField: string) => {
      triggeredFields.add(changedField)
      run(changedField)
    },
  }
}
