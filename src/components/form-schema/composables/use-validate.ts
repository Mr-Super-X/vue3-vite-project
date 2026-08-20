import type { SchemaNode, ValidateOptions, ValidateResult } from '../types'
import type { ZodType } from 'zod'

/** 静态校验 schema 合法性 —— component/on/rules/children 类型与递归 */
export function validate(
  schema: SchemaNode | SchemaNode[] | unknown,
  options: ValidateOptions = {}
): ValidateResult {
  const errors: ValidateResult['errors'] = []
  traverse(schema, [], errors, options.validateFirst ?? false)
  return { isValid: errors.length === 0, errors }
}

function traverse(
  node: unknown,
  keyPath: (string | number)[],
  errors: ValidateResult['errors'],
  validateFirst: boolean
): void {
  if (validateFirst && errors.length > 0) return
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return
  const obj = node as Record<string, unknown>

  if ('component' in obj && obj.component !== undefined) {
    if (typeof obj.component !== 'string') {
      errors.push({ keyPath: [...keyPath, 'component'], message: 'component 必须是字符串' })
      if (validateFirst) return
    }
  }
  if (obj.on && typeof obj.on === 'object' && !Array.isArray(obj.on)) {
    for (const [k, v] of Object.entries(obj.on as Record<string, unknown>)) {
      if (validateFirst && errors.length > 0) return
      if (typeof v !== 'function' && typeof v !== 'string') {
        errors.push({ keyPath: [...keyPath, 'on', k], message: '事件回调必须为函数或函数表达式' })
      }
    }
  }
  if ('rules' in obj && obj.rules !== undefined) {
    const r = obj.rules
    const ok = typeof r === 'string' || (typeof r === 'object' && r !== null) || Array.isArray(r)
    if (!ok)
      errors.push({ keyPath: [...keyPath, 'rules'], message: 'rules 必须是 string/RuleItem/Array' })
  }
  if ('children' in obj && obj.children !== undefined) {
    const c = obj.children
    if (Array.isArray(c)) {
      c.forEach((child, i) => traverse(child, [...keyPath, 'children', i], errors, validateFirst))
    } else if (typeof c === 'object' && c !== null) {
      traverse(c, [...keyPath, 'children'], errors, validateFirst)
    } else if (typeof c !== 'string') {
      errors.push({ keyPath: [...keyPath, 'children'], message: 'children 类型非法' })
    }
  }
}

/** 顶层 zod schema 校验（与 async-validator 并行） */
export function validateWithZod(
  zodSchema: ZodType,
  formData: unknown
): { success: boolean; errors: import('zod').ZodError | null } {
  const result = zodSchema.safeParse(formData)
  return result.success ? { success: true, errors: null } : { success: false, errors: result.error }
}
