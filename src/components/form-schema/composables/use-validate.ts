import type { SchemaNode, RuleItem, ValidateOptions, ValidateResult } from '../types'
import type { ZodType } from 'zod'
import { get } from 'lodash-es'

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

/**
 * 运行时跨字段校验 —— 遍历 schema 中含 crossValidator 的节点（含 array.itemSchema 展开）
 * - 普通节点：node.name 直接用 lodash get 取 model 值
 * - 数组节点：按 model[name] 当前长度展开每个数组元素，把 itemSchema 内子节点 name 重写为 items[i].subName
 * - 失败时（crossValidator 返回非 true）收集到 errors
 * - crossValidator 抛错时 console.error 并跳过(避免一条错误规则阻断整张表单)
 */
export function runCrossFieldValidation(
  schema: SchemaNode | SchemaNode[] | string | undefined,
  model: Record<string, unknown>
): ValidateResult {
  const errors: ValidateResult['errors'] = []
  traverseCross(schema, model, [], errors)
  return { isValid: errors.length === 0, errors }
}

function traverseCross(
  node: SchemaNode | SchemaNode[] | string | undefined,
  model: Record<string, unknown>,
  keyPath: (string | number)[],
  errors: ValidateResult['errors']
): void {
  if (!node) return
  if (typeof node === 'string') return
  if (Array.isArray(node)) {
    node.forEach((n, i) => traverseCross(n, model, [...keyPath, i], errors))
    return
  }

  // 数组节点：按 model[name] 当前长度展开每个元素，把 itemSchema 内 name 重写为 items[i].subName
  if (node.kind === 'array' && node.array && node.name) {
    const listRaw = model[node.name]
    if (Array.isArray(listRaw)) {
      listRaw.forEach((_row, i) => {
        traverseArrayItem(node.array!.itemSchema, `${node.name}[${i}]`, model, errors)
      })
    }
    return
  }

  // 普通节点：检查 rules 内的 crossValidator
  if (node.rules && node.name) {
    runNodeCrossRules(node, model, keyPath, errors)
  }

  // 递归 children / formItem.slots
  if (node.children) {
    if (Array.isArray(node.children)) {
      node.children.forEach((c, i) => traverseCross(c, model, [...keyPath, 'children', i], errors))
    } else if (typeof node.children === 'object') {
      traverseCross(node.children, model, [...keyPath, 'children'], errors)
    }
  }
  if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
    for (const [k, v] of Object.entries(node.formItem.slots)) {
      if (v && typeof v === 'object') {
        traverseCross(v, model, [...keyPath, 'formItem', 'slots', k], errors)
      }
    }
  }
}

function traverseArrayItem(
  sub: SchemaNode | SchemaNode[] | string | undefined,
  prefix: string,
  model: Record<string, unknown>,
  errors: ValidateResult['errors']
): void {
  if (!sub) return
  if (typeof sub === 'string') return
  if (Array.isArray(sub)) {
    sub.forEach((s) => traverseArrayItem(s, prefix, model, errors))
    return
  }
  // 把子节点 name 拼成 items[i].subName 形式
  const rewritten: SchemaNode = sub.name ? { ...sub, name: `${prefix}.${sub.name}` } : sub
  traverseCross(rewritten, model, [], errors)
}

function runNodeCrossRules(
  node: SchemaNode,
  model: Record<string, unknown>,
  keyPath: (string | number)[],
  errors: ValidateResult['errors']
): void {
  const rules = node.rules
  if (!rules) return
  const arr = Array.isArray(rules) ? rules : [rules]
  for (const r of arr) {
    if (typeof r !== 'object' || r === null) continue
    const rule = r as RuleItem
    if (!rule.crossValidator || !rule.dependsOn) continue
    if (!node.name) continue
    const value = get(model, node.name)
    const depsList = (Array.isArray(rule.dependsOn) ? rule.dependsOn : [rule.dependsOn]).map(
      (dep) => get(model, dep)
    )
    let result: true | string
    try {
      result = rule.crossValidator(value, ...depsList)
    } catch (err) {
      console.error('[XForm] crossValidator threw:', err)
      continue
    }
    if (result !== true) {
      errors.push({ keyPath: [...keyPath, node.name], message: result })
    }
  }
}
