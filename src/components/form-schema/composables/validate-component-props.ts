/**
 * validate-component-props —— dev mode props 白名单校验
 *
 * Element Plus 2.x 组件在运行时可通过 `Component.props` 反射所有声明的 prop 名
 * （vue 3 options API 风格）。启动时一次性构建映射缓存 KNOWN_PROP_KEYS[componentName] = Set<string>。
 *
 * - dev mode：用户传入不在白名单的 props keys → console.warn + OSD 上报
 * - prod mode：完全无开销（导入但不调用 validate）
 *
 * 不校验：
 * - 用户通过 components prop 注册的自定义组件
 * - Component 对象（非 string 组件名）
 * - 类型错误（TS 编译期拦截）
 */
import type { UseFormErrorBusReturn } from './use-form-error-bus'
import type { SchemaNode } from '../types'
import { EL_COMPONENT_MAP } from './resolve-component'

/** 组件名 → 该组件已知 props keys 集合 */
const KNOWN_PROP_KEYS: Record<string, Set<string>> = {}

/**
 * 一次性从 EL_COMPONENT_MAP 反射所有组件的 props keys
 * 在 import 时立即执行（同步操作，启动成本 < 1ms）
 * 用户自定义组件（如 MyInput）未注册到 EL_COMPONENT_MAP → 自动跳过
 */
function buildKnownPropKeys(): void {
  for (const [name, comp] of Object.entries(EL_COMPONENT_MAP)) {
    const props = (comp as { props?: Record<string, unknown> }).props
    if (props && typeof props === 'object') {
      KNOWN_PROP_KEYS[name] = new Set(Object.keys(props))
    }
  }
  // 同时为 ElXxx 全名建立别名（如果与短名不同）
  for (const [name, comp] of Object.entries(EL_COMPONENT_MAP)) {
    if (name.startsWith('El') && !KNOWN_PROP_KEYS[name]) {
      const props = (comp as { props?: Record<string, unknown> }).props
      if (props && typeof props === 'object') {
        KNOWN_PROP_KEYS[name] = new Set(Object.keys(props))
      }
    }
  }
  // 显式补全：所有 EL 组件短名（Input / Select / ...）的 ElXxx 全名（即使不在 EL_COMPONENT_MAP 中）
  // 避免 getKnownPropKeys('ElInput') 找不到 —— 实际 EL_COMPONENT_MAP 只含短名 + 少数别名
  const shortToElName = (short: string): string => 'El' + short
  for (const short of Object.keys(KNOWN_PROP_KEYS)) {
    const elName = shortToElName(short)
    if (!KNOWN_PROP_KEYS[elName]) {
      KNOWN_PROP_KEYS[elName] = KNOWN_PROP_KEYS[short]!
    }
  }
}
buildKnownPropKeys()

/** dev mode 校验结果 */
interface ValidationResult {
  /** 未未未未在白名单的 props（拼写错误 / 错误组件） */
  unknown: string[]
  /** props 中缺失 el-form 推荐的关键字段（仅 info 提示） */
  suspicious: string[]
}

const FORM_KEY_ALIASES = new Set([
  // ElForm 透传字段 —— 业务可写但不应作为组件 props 校验
  'label',
  'prop',
  'rules',
  'required',
  'showMessage',
  'inlineMessage',
  'size',
  'disabled',
  // labelPosition / labelWidth：顶层 schema 配置（透传 el-form）；
  // 字段级 SchemaNode.labelPosition / labelWidth 也允许（透传 el-form-item，override 顶层）
  'labelPosition',
  'labelWidth',
  'showPassword',
  'autocomplete',
  // Vue 全局 attribute —— 所有组件都接受（运行时 fallthrough / 由 el-form-item 内部消费）
  // 业务直接写到 props 里是合法的（虽然 XForm 推荐 class 用根 template，name 用节点 name 字段）
  'class',
  'style',
  'attrs',
  // el-form-item 特殊字段 —— name 用于 el-form 关联（XForm 内部也从 node.name 派生）
  'name',
])

/**
 * 校验节点的 props 是否在 element-plus 组件白名单内
 * 仅 string component 且 EL_COMPONENT_MAP 命中时校验
 */
function validateNodeProps(node: SchemaNode): ValidationResult {
  if (typeof node.component !== 'string') return { unknown: [], suspicious: [] }
  if (!node.props) return { unknown: [], suspicious: [] }
  const known = KNOWN_PROP_KEYS[node.component]
  if (!known) return { unknown: [], suspicious: [] } // 用户自定义组件，不校验

  const unknown: string[] = []
  for (const key of Object.keys(node.props)) {
    if (!known.has(key) && !FORM_KEY_ALIASES.has(key)) {
      unknown.push(key)
    }
  }
  return { unknown, suspicious: [] }
}

/**
 * dev mode 入口：扫描 schema 树，校验每个节点的 props 白名单
 * - 仅在 import.meta.env.DEV 为 true 时执行
 * - 违规 → console.warn + 通过 errorBus 上报 OSD
 *
 * @param root 顶层 SchemaNode（递归 children / slots / array.itemSchema）
 * @param errorBus 错误事件总线（可选）
 */
export function validateSchemaProps(
  root: SchemaNode | SchemaNode[] | undefined,
  errorBus?: UseFormErrorBusReturn
): void {
  if (!import.meta.env.DEV) return
  if (!root) return
  traverse(root)

  function traverse(node: SchemaNode | SchemaNode[] | string | undefined): void {
    if (!node) return
    if (typeof node === 'string') return
    if (Array.isArray(node)) {
      node.forEach(traverse)
      return
    }
    // 校验当前节点
    const result = validateNodeProps(node)
    if (result.unknown.length > 0) {
      const message = `组件 "${node.component}" props 包含未声明键：${result.unknown.join(', ')}`
      // errorBus.report 内部会调 console.warn（按 severity 分发），避免双日志
      // 无 errorBus 场景（不挂载 XForm）才需要直接 console.warn
      if (errorBus) {
        errorBus.report({
          severity: 'warn',
          code: 'UNKNOWN_COMPONENT_PROP',
          message,
          source: 'validateSchemaProps',
        })
      } else {
        console.warn(`[XForm][PROP_VALIDATION] ${message}`)
      }
    }
    // 递归 children / slots / array
    if (node.children) traverse(node.children)
    if (node.slots) {
      for (const v of Object.values(node.slots)) {
        traverse(v as SchemaNode | SchemaNode[] | string | undefined)
      }
    }
    if (node.kind === 'array' && node.array?.itemSchema) {
      traverse(node.array.itemSchema)
    }
  }
}

/** 测试用：获取某组件白名单（用于 spec 验证） */
export function getKnownPropKeys(componentName: string): Set<string> | undefined {
  return KNOWN_PROP_KEYS[componentName]
}
