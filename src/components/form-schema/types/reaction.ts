/**
 * 反应式类型 —— 节点级派生字段的运行时求值
 */
import type { SchemaNode } from './schema-node'

/** 反应式字段值：字面量 / 函数 / 函数表达式字符串 */
export type ReactionValue<T> = T | ((model: Record<string, unknown>) => T) | string

/** 反应式配置：覆盖节点的任意字段 */
export interface ReactionConfig {
  rules?: ReactionValue<SchemaNode['rules']>
  // reaction.props 整体作为 ReactionValue：applyReactionFields 对函数/字符串求值后整体覆盖 node.props
  // （不是「逐字段反应式」——use-reaction 第 14-34 行 applyReactionFields 是直接赋值 target[key] = value）
  props?: ReactionValue<Record<string, unknown>>
  label?: ReactionValue<string>
  hidden?: ReactionValue<boolean>
  /** 反应式调度策略
   *  - 'sync'(默认):依赖变化立即同步执行 reaction 函数
   *  - 'debounce':依赖停止变化 delay ms 后执行一次(适合远程搜索等高频输入)
   *  - 'throttle':delay ms 内最多执行一次(适合实时保存等)
   *  strategy / delay 在 use-reaction 中解析,不会写入 node */
  strategy?: 'sync' | 'debounce' | 'throttle'
  /** debounce / throttle 延迟(ms);strategy !== 'sync' 时生效 */
  delay?: number
  /** 依赖字段路径列表（性能优化，如 ['a', 'b.c']）：
   *  声明后仅精确 watch 这些路径；不声明则保持旧行为 —— deep watch 整棵 model，
   *  任意字段变化都触发求值（大表单下 N 字段 × M 联动开销显著） */
  deps?: string[]
  // 其他可覆盖字段（开闭原则：未知字段透传）
  [key: string]: unknown
}
