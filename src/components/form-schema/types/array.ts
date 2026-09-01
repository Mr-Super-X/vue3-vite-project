/**
 * 数组节点配置 —— kind === 'array' 时的容器配置
 */
import type { SchemaNode } from './schema-node'

/** 数组节点配置（kind: 'array' 时使用） */
export interface ArrayNodeConfig {
  /** 每行渲染的子 schema —— 同一份 schema 套到 model[name] 的每个数组元素 */
  itemSchema: SchemaNode | SchemaNode[]
  /** model 未定义时的初始行数（默认 1） */
  initialLength?: number
  /** 行数下限（达下限时禁用删除按钮，校验也会读取该值） */
  minItems?: number
  /** 行数上限（达上限时禁用新增按钮，校验也会读取该值） */
  maxItems?: number
  /** 操作按钮显隐（默认全开；传对象可分别控制 add/remove/move） */
  showActions?:
    | boolean
    | {
        add?: boolean
        remove?: boolean
        move?: boolean
      }
  /** 操作按钮文案（默认 添加/删除/上移/下移） */
  labels?: {
    add?: string
    remove?: string
    moveUp?: string
    moveDown?: string
  }
  /** 容器标题（默认不渲染表头） */
  title?: string
  /** 行拖拽排序（默认 false）：开启后行可 HTML5 拖拽换位（调用 moveItem 更新 model） */
  draggable?: boolean
}
