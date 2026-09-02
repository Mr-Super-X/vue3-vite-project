/**
 * XForm schema DSL —— 公共类型 barrel
 *
 * 历史：原 types.ts 单文件 556 行含 29 字段 SchemaNode + 全部子类型。
 * 重构（OPT-4）后按职责拆为 8 个子文件，本文件仅做 re-export，保持
 * 所有现有 `import type { ... } from '@/components/form-schema/types'` 不变。
 *
 * 子文件索引：
 * - ./types/base.ts           基础类型：EventFn / FunctionExpression / SchemaSlot
 * - ./types/rule.ts           校验规则 RuleItem（async-validator 兼容 + 跨字段）
 * - ./types/reaction.ts       反应式：ReactionValue / ReactionConfig
 * - ./types/directive.ts      指令 + FormItem 包裹
 * - ./types/array.ts          数组节点配置 ArrayNodeConfig
 * - ./types/layout.ts         栅格布局 RowConfig / ColConfig
 * - ./types/async-options.ts  异步选项 AsyncOptionsConfig
 * - ./types/schema-node.ts    SchemaNode + ComponentPropsRegistry + SchemaNodeFor
 * - ./types/xform.ts          XForm 组件 props / expose / validate
 */

export type { EventFn, FunctionExpression, SlotRenderFn, SchemaSlot } from './types/base'
export type { RuleItem } from './types/rule'
export type { ReactionValue, ReactionConfig } from './types/reaction'
export type { DirectiveConfig, FormItemConfig } from './types/directive'
export type { ArrayNodeConfig } from './types/array'
export type { ResponsiveColConfig, RowConfig, ColConfig } from './types/layout'
export type { AsyncOptionsConfig } from './types/async-options'
export type {
  SchemaNode,
  ComponentPropsRegistry,
  PropsByComponent,
  ComponentName,
  SchemaNodeFor,
} from './types/schema-node'
export type {
  XFormProps,
  XFormExpose,
  ValidateOptions,
  ValidateResult,
  BeforeChangeCtx,
  BeforeChangeFn,
  BeforeChangeRule,
} from './types/xform'
