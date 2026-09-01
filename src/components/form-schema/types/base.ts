/**
 * 基础类型 —— XForm schema DSL 的事件/表达式/slot 定义
 *
 * 与具体的字段/校验/反应式/权限等职责无关，仅做"语义原子"类型
 */
import type { VNode } from 'vue'
import type { SchemaNode } from './schema-node'

/** 事件回调 */
export type EventFn = (value: unknown, ...args: unknown[]) => unknown
/** 函数表达式：{{ ... }} 包裹的函数体字符串 */
export type FunctionExpression = string

/** slot 渲染函数：支持普通 slot / scoped slot；JSX 本质是其语法糖 */
export type SlotRenderFn = (
  scope?: Record<string, unknown>
) => VNode | VNode[] | string | undefined | null

/** Schema 节点支持的单个 slot 内容 */
export type SchemaSlot = SchemaNode | SchemaNode[] | string | undefined | SlotRenderFn
