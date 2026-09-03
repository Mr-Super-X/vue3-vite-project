/**
 * 校验规则编译：字符串规则名查表 + 未注册警告（拼写错误静默降级极难排查，必须显式告警）；
 * 必需字段默认 message 自动注入（label-aware，避免英文 message 透出）。
 */
import type { SchemaNode, XFormProps } from '../types'

/** 命名字符串规则未注册时静默降级为必填，排障极其困难 —— 必须显式告警暴露（通常是拼写错误） */
function warnUnknownRule(name: string): Record<string, unknown> {
  // 'required' 是 DSL 惯用简写（rules: 'required' ≡ [{ required: true }]，文档化行为），
  // 不属于拼写错误，静默放行；其余未命中名才告警
  if (name === 'required') return { required: true }
  console.error(
    `[XForm] 命名校验规则 "${name}" 未在 props.rules 中注册，已降级为 { required: true }（请检查拼写或注册该规则）`
  )
  return { required: true }
}

/**
 * 校验规则编译：把 schema DSL 的规则数组归一化为 async-validator 可消费的对象数组。
 *
 * 行为：
 * - 字符串 `'required'` 在 propsRules 表里查表，未命中时降级为 `{ required: true }`（warnUnknownRule）
 * - 自动注入默认 message：与 builders.ts:90 的 `required(message = '必填')` 对齐；
 *   仅当 `required === true && !message` 时注入，**用户显式 message 不覆盖**
 * - label 可选：传入时 message = `${label}必填`（如「订单号必填」），未传时退化「必填」保持向后兼容
 * - async-validator 默认 message「orderNo is required」是英文，element-plus zhCn 不含此翻译，
 *   ElConfigProvider locale 改不了这一项；必须在编译层注入
 */
export function compileRules(
  rules: SchemaNode['rules'],
  propsRules: XFormProps['rules'],
  label?: string
): Array<Record<string, unknown>> {
  if (!rules) return []
  return (Array.isArray(rules) ? rules : [rules])
    .map((r) =>
      typeof r === 'string'
        ? (propsRules?.[r] ?? warnUnknownRule(r))
        : (r as Record<string, unknown>)
    )
    .map((r) => {
      // required: true 且无 message 时注入「<label>必填」，label 缺失时退化「必填」
      if (r.required === true && r.message === undefined) {
        return { ...r, message: label ? `${label}必填` : '必填' }
      }
      return r
    })
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
}
