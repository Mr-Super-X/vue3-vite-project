/**
 * 指令系统 + FormItem 包裹配置
 */
import type { Directive } from 'vue'
import type { SchemaNode } from './schema-node'
import type { SchemaSlot } from './base'

/** 指令系统 */
export interface DirectiveConfig {
  directive: string | Directive
  arg?: string
  modifiers?: Record<string, boolean>
  value?: unknown
}

/** FormItem 包裹配置 */
export interface FormItemConfig {
  component?: string
  props?: Record<string, unknown>
  directives?: DirectiveConfig[]
  slots?: Record<string, SchemaSlot>
  rules?: SchemaNode['rules']
  [key: string]: unknown
}
