import type { SchemaNode, RuleItem, ValidateOptions, ValidateResult } from '../types'
import type { ZodType } from 'zod'
import { get } from 'lodash-es'

/**
 * use-validate —— schema 静态校验 + 运行时跨字段校验 + zod 顶层校验
 *
 * 4 个导出函数（无 composable 状态，纯函数集）：
 * - validate: 静态 schema 合法性（component/on/rules/children 类型 + 递归）
 * - validateWithZod: 顶层 zod schema 校验（与 async-validator 并行入口）
 * - runCrossFieldValidation: 运行时跨字段校验（含 array.itemSchema 展开 + 异步）
 * - collectCrossRuleFields: 收集含 crossValidator 的字段节点（XForm 用于建 watcher）
 *
 * 不变量：crossValidator 抛错时 console.error 并跳过（避免一条错误规则阻断整张表单）
 *
 * @see ./use-form-validation.ts validateForm 主流程调用
 * @see ./use-cross-field-trigger.ts collectCrossRuleFields 使用方
 */
export function validate(
  schema: SchemaNode | SchemaNode[] | unknown,
  options: ValidateOptions = {}
): ValidateResult {
  const errors: ValidateResult['errors'] = []
  traverse(schema, [], errors, {
    validateFirst: options.validateFirst ?? false,
    knownComponents: options.knownComponents,
  })
  return { isValid: errors.length === 0, errors }
}

/**
 * 把 builtin 短名集合展开为「短名 + ElXxx 全名」两个集合，方便校验组件名时兼容两种写法
 * （与 element-plus-adapter.resolveElComponentName 的解析顺序对齐）
 */
function expandKnownComponents(known: ValidateOptions['knownComponents']): {
  names: Set<string>
} | null {
  if (!known) return null
  const names = new Set<string>()
  for (const short of known.builtin) {
    names.add(short)
    names.add(`El${short}`)
  }
  if (known.user) for (const u of known.user) names.add(u)
  return { names }
}

function traverse(
  node: unknown,
  keyPath: (string | number)[],
  errors: ValidateResult['errors'],
  ctx: {
    validateFirst: boolean
    knownComponents?: ValidateOptions['knownComponents']
  }
): void {
  if (ctx.validateFirst && errors.length > 0) return
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return
  const obj = node as Record<string, unknown>

  if ('component' in obj && obj.component !== undefined) {
    if (typeof obj.component !== 'string') {
      errors.push({ keyPath: [...keyPath, 'component'], message: 'component 必须是字符串' })
      if (ctx.validateFirst) return
    } else if (ctx.knownComponents) {
      // 阶段 1.3：组件名有效性校验 —— 短名 + ElXxx 全名 + userComponents 三类必须命中其一
      const known = expandKnownComponents(ctx.knownComponents)
      if (known && !known.names.has(obj.component)) {
        // 全小写 → 原生 HTML 标签（如 'a' / 'span'），渲染层直接作为 h() 标签名，视为合法
        if (obj.component !== obj.component.toLowerCase()) {
          const msg = `未知组件名 "${obj.component}" —— 不在 EL 组件集或 userComponents 中（请检查拼写或确认是否已在 components prop 注册）`
          if (import.meta.env.DEV) {
            // dev 模式：console.warn 立即可见，prod 仅推 errors（debug banner 仅 dev 显示）
            console.warn(
              `[XForm][validate] ${msg}\n  keyPath: ${[...keyPath, 'component'].join('.')}`
            )
          }
          errors.push({ keyPath: [...keyPath, 'component'], message: msg })
          if (ctx.validateFirst) return
        }
      }
    }
  }
  if (obj.on && typeof obj.on === 'object' && !Array.isArray(obj.on)) {
    for (const [k, v] of Object.entries(obj.on as Record<string, unknown>)) {
      if (ctx.validateFirst && errors.length > 0) return
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
      c.forEach((child, i) => traverse(child, [...keyPath, 'children', i], errors, ctx))
    } else if (typeof c === 'object' && c !== null) {
      traverse(c, [...keyPath, 'children'], errors, ctx)
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
 * - crossValidator 支持同步或异步：返回值可为 true / string / Promise<true | string>
 * - 失败时（返回非 true）收集到 errors
 * - crossValidator 抛错时 console.error 并跳过(避免一条错误规则阻断整张表单)
 * - 异步函数统一用 Promise.resolve 包一层：同步值通过 Promise.resolve 立即 resolve,不增加等待时间
 */
export async function runCrossFieldValidation(
  schema: SchemaNode | SchemaNode[] | string | undefined,
  model: Record<string, unknown>,
  /** 命名规则注册表（XForm props.rules）—— 字符串规则名里的 crossValidator 也需解析执行 */
  namedRules?: Record<string, RuleItem>
): Promise<ValidateResult> {
  const errors: ValidateResult['errors'] = []
  await traverseCross(schema, model, [], errors, namedRules)
  return { isValid: errors.length === 0, errors }
}

async function traverseCross(
  node: SchemaNode | SchemaNode[] | string | undefined,
  model: Record<string, unknown>,
  keyPath: (string | number)[],
  errors: ValidateResult['errors'],
  namedRules?: Record<string, RuleItem>
): Promise<void> {
  if (!node) return
  if (typeof node === 'string') return
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      await traverseCross(node[i], model, [...keyPath, i], errors, namedRules)
    }
    return
  }

  // 数组节点：按 model[name] 当前长度展开每个元素，把 itemSchema 内 name 重写为 items[i].subName
  if (node.kind === 'array' && node.array && node.name) {
    const listRaw = model[node.name]
    if (Array.isArray(listRaw)) {
      for (let i = 0; i < listRaw.length; i++) {
        await traverseArrayItem(
          node.array!.itemSchema,
          `${node.name}[${i}]`,
          model,
          errors,
          namedRules
        )
      }
    }
    return
  }

  // 普通节点：检查 rules 内的 crossValidator
  if (node.rules && node.name) {
    await runNodeCrossRules(node, model, keyPath, errors, namedRules)
  }

  // 递归 children / formItem.slots
  if (node.children) {
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        await traverseCross(
          node.children[i],
          model,
          [...keyPath, 'children', i],
          errors,
          namedRules
        )
      }
    } else if (typeof node.children === 'object') {
      await traverseCross(node.children, model, [...keyPath, 'children'], errors, namedRules)
    }
  }
  if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
    for (const [k, v] of Object.entries(node.formItem.slots)) {
      if (v && typeof v === 'object') {
        await traverseCross(v, model, [...keyPath, 'formItem', 'slots', k], errors, namedRules)
      }
    }
  }
}

async function traverseArrayItem(
  sub: SchemaNode | SchemaNode[] | string | undefined,
  prefix: string,
  model: Record<string, unknown>,
  errors: ValidateResult['errors'],
  namedRules?: Record<string, RuleItem>
): Promise<void> {
  if (!sub) return
  if (typeof sub === 'string') return
  if (Array.isArray(sub)) {
    for (const s of sub) {
      await traverseArrayItem(s, prefix, model, errors, namedRules)
    }
    return
  }
  // 把子节点 name 拼成 items[i].subName 形式
  const rewritten: SchemaNode = sub.name ? { ...sub, name: `${prefix}.${sub.name}` } : sub
  await traverseCross(rewritten, model, [], errors, namedRules)
}

async function runNodeCrossRules(
  node: SchemaNode,
  model: Record<string, unknown>,
  keyPath: (string | number)[],
  errors: ValidateResult['errors'],
  namedRules?: Record<string, RuleItem>
): Promise<void> {
  const rules = node.rules
  if (!rules) return
  const arr = Array.isArray(rules) ? rules : [rules]
  for (const r of arr) {
    // 字符串规则名 → 查注册表解析（'required' 简写无 crossValidator，自然跳过）
    const resolvedRule = typeof r === 'string' ? namedRules?.[r] : r
    if (typeof resolvedRule !== 'object' || resolvedRule === null) continue
    const rule = resolvedRule as RuleItem
    if (!rule.crossValidator || !rule.dependsOn) continue
    if (!node.name) continue
    const value = get(model, node.name)
    const depsList = (Array.isArray(rule.dependsOn) ? rule.dependsOn : [rule.dependsOn]).map(
      (dep) => get(model, dep)
    )
    let result: true | string
    try {
      // 兼容同步和异步返回值
      result = await Promise.resolve(rule.crossValidator(value, ...depsList))
    } catch (err) {
      console.error('[XForm] crossValidator threw:', err)
      continue
    }
    if (result !== true) {
      errors.push({ keyPath: [...keyPath, node.name], message: result })
    }
  }
}

/**
 * 收集 schema 中所有含 cross rule 的字段节点
 * - 递归 children / formItem.slots / slots / array.itemSchema
 * - 用于 XForm setup 时为这些字段建立独立 watcher(model 变化触发 cross rules)
 */
export function collectCrossRuleFields(
  schema: SchemaNode | SchemaNode[] | string | undefined
): SchemaNode[] {
  const result: SchemaNode[] = []
  traverse(schema, [], (n) => {
    if (!n.rules || !n.name) return
    const arr = Array.isArray(n.rules) ? n.rules : [n.rules]
    const hasCross = arr.some(
      (r) => typeof r === 'object' && r !== null && 'crossValidator' in r && 'dependsOn' in r
    )
    if (hasCross) result.push(n)
  })
  return result

  function traverse(
    node: SchemaNode | SchemaNode[] | string | undefined,
    keyPath: (string | number)[],
    visit: (n: SchemaNode) => void
  ): void {
    if (!node || typeof node === 'string') return
    if (Array.isArray(node)) {
      node.forEach((c, i) => traverse(c, [...keyPath, i], visit))
      return
    }
    visit(node)
    if (node.kind === 'array' && node.array) {
      traverse(node.array.itemSchema, [...keyPath, 'array', 'itemSchema'], visit)
    }
    if (node.children) {
      if (Array.isArray(node.children)) {
        node.children.forEach((c, i) => traverse(c, [...keyPath, 'children', i], visit))
      } else if (typeof node.children === 'object') {
        traverse(node.children, [...keyPath, 'children'], visit)
      }
    }
    if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
      for (const [k, v] of Object.entries(node.formItem.slots)) {
        if (v && typeof v === 'object') {
          traverse(v, [...keyPath, 'formItem', 'slots', k], visit)
        }
      }
    }
  }
}
