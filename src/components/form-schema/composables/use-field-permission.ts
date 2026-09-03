/**
 * 字段权限解析 —— 三态 view/edit/hidden
 *
 * 解析优先级：
 * 1. string 字面量 'view' | 'edit' | 'hidden' —— 直接使用
 * 2. 函数 (model) => 状态 —— 调用求值（支持运行时动态权限）
 * 3. 字符串函数表达式 '{{ fn }}' —— 沙箱解析后调用（与 reaction 一致）
 * 4. undefined —— 视为 'edit'（向后兼容）
 *
 * 权限码字符串（如 'user.edit'）由调用方通过 permissionResolver 自行映射：
 * XForm.permissionResolver: (perm) => 'view' | 'edit' | 'hidden'
 * 默认 permissionResolver 是 identity（直接返回 string 值）
 */
import type { SchemaNode } from '../types'
import { get } from 'lodash-es'
import { resolveFunctionExpression } from './use-expression'

export type FieldPermission = 'view' | 'edit' | 'hidden'

export interface ResolvePermissionOptions {
  model: () => Record<string, unknown> | undefined
  /**
   * 权限码 → 状态 映射函数
   * 默认 identity（string 字面量直接返回）
   * 业务可注入 useAuth().hasPerm 实现：'user.edit' → hasPerm ? 'edit' : 'hidden'
   */
  permissionResolver?: (perm: string) => FieldPermission
}

/** resolvePermission —— 字段权限解析（view / edit / hidden 三态） */
export function resolvePermission(
  node: SchemaNode,
  opts: ResolvePermissionOptions
): FieldPermission {
  const raw = node.permission
  if (raw === undefined || raw === null) return 'edit'
  // 权限求值抛错（函数 / 表达式 / resolver 内部异常）不能炸掉整表单渲染 ——
  // 降级为 edit（最安全的可见可编辑态）并给出可诊断日志
  try {
    // 函数
    if (typeof raw === 'function') {
      const model = opts.model() ?? {}
      return (raw as (m: Record<string, unknown>) => FieldPermission)(model) ?? 'edit'
    }
    // 字符串
    if (typeof raw === 'string') {
      // 1) 尝试函数表达式解析（与 reaction 一致）
      const fn = resolveFunctionExpression(raw)
      if (fn) {
        const model = opts.model() ?? {}
        const result = (fn as (m: Record<string, unknown>) => unknown)(model)
        if (result === 'view' || result === 'edit' || result === 'hidden') return result
      }
      // 2) 字面量或权限码 —— 走 resolver 映射
      const resolver = opts.permissionResolver ?? ((p: string) => p as FieldPermission)
      const resolved = resolver(raw)
      if (resolved === 'view' || resolved === 'edit' || resolved === 'hidden') return resolved
      return 'edit'
    }
    return 'edit'
  } catch (err) {
    console.error('[XForm] permission evaluation failed:', raw, err)
    return 'edit'
  }
}

/**
 * view 态的渲染占位 —— 纯文本展示 model value
 * 通用 fallback：复杂组件（如 Upload）建议在节点层用 reaction 自行实现 view 模板
 */
export function renderViewPlaceholder(
  node: SchemaNode,
  model: Record<string, unknown> | undefined
): string {
  if (!node.name) return ''
  const value = get(model, node.name)
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}
