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

/**
 * SchemaNode 命名空间 —— 数组节点（2 字段）
 *
 * P2-1 拆分：原 SchemaNode 31 字段拆为 9 个命名空间接口，本文件定义「数组节点」子集：
 * kind / array —— 标记节点为数组容器 + 容器配置。
 *
 * 业务用法：
 * - 直接 import 此接口用于"只需数组容器 + 其他命名空间字段"的子类型场景
 * - 通过 SchemaNode（schema-node.ts）使用全部 9 个命名空间
 *
 * 不变量：
 * - SchemaNode extends 全部 9 个命名空间，TS 接口展平后类型形状与 P2-1 重构前完全等价
 * - 字段 JSDoc verbatim 拷贝自原 schema-node.ts，IDE hover 不变
 */

/**
 * SchemaNodeArray —— 数组节点（kind / array）
 */
export interface SchemaNodeArray {
  /**
   * 节点类型标识 —— 固定 'array'，标记该节点为数组容器
   * 数组节点走 renderArrayNode 分支，独立于普通字段渲染
   * @group 数组节点
   */
  kind?: 'array'
  /**
   * 数组容器配置（kind='array' 时必填）—— itemSchema / minItems / maxItems / showActions / labels / draggable
   * @see ./array.ts ArrayNodeConfig 完整字段表
   * @group 数组节点
   */
  array?: ArrayNodeConfig
}
