/**
 * resolve-component —— 组件名解析
 *
 * - 内置 EL 组件短名 → 全名 → 实际组件的映射表（EL_COMPONENT_MAP）
 * - 三段式组件名解析（用户注册 / 短名 / 全名 / ElXxx / 全局注册 / 原生 HTML）
 * - ElUpload 类型判断工具（避免覆盖默认图标注入）
 */
import { resolveComponent } from 'vue'
import {
  ElAutocomplete,
  ElButton,
  ElCard,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElColorPicker,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElInputTag,
  ElMention,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTimeSelect,
  ElTransfer,
  ElTreeSelect,
  ElUpload,
} from 'element-plus'
import type { SchemaNode } from '../types'

export const EL_COMPONENT_MAP: Record<string, unknown> = {
  Input: ElInput,
  Select: ElSelect,
  Option: ElOption,
  Switch: ElSwitch,
  DatePicker: ElDatePicker,
  TimePicker: ElTimePicker,
  TimeSelect: ElTimeSelect,
  Upload: ElUpload,
  Transfer: ElTransfer,
  TreeSelect: ElTreeSelect,
  Autocomplete: ElAutocomplete,
  Button: ElButton,
  RadioGroup: ElRadioGroup,
  Radio: ElRadio,
  CheckboxGroup: ElCheckboxGroup,
  Checkbox: ElCheckbox,
  Cascader: ElCascader,
  InputNumber: ElInputNumber,
  InputPassword: ElInput,
  ElInputPassword: ElInput,
  InputTextArea: ElInput,
  ElInputTextArea: ElInput,
  InputTag: ElInputTag,
  ColorPicker: ElColorPicker,
  Mention: ElMention,
  Rate: ElRate,
  Slider: ElSlider,
  Card: ElCard,
  FormItem: ElFormItem,
  Form: ElForm,
}

export function resolveComponentFor(
  name: string | undefined,
  userComponents?: Record<string, unknown>
): unknown {
  if (!name) return null
  if (userComponents && name in userComponents) return userComponents[name]
  if (name in EL_COMPONENT_MAP) return EL_COMPONENT_MAP[name] ?? null
  if (name.startsWith('El') && name.length > 2) {
    const short = name[2]!.toUpperCase() + name.slice(3)
    if (short in EL_COMPONENT_MAP) return EL_COMPONENT_MAP[short] ?? null
  }
  if (name.startsWith('El')) {
    try {
      const r = resolveComponent(name)
      if (typeof r !== 'string') return r
    } catch {
      /* fallthrough */
    }
  }
  // 原生 HTML 标签（全小写，如 'a' / 'span' / 'div'）→ 返回字符串标签名，
  // h() 对字符串直接渲染原生元素（与 EL 组件名的 PascalCase/ElXxx 约定不冲突）
  if (name === name.toLowerCase()) return name
  return null
}

/** schema 名与解析结果双向确认，避免业务用 components 覆盖 Upload 后误注入默认图标 */
export function isElUpload(node: SchemaNode, Comp: unknown): boolean {
  const name = typeof node.component === 'string' ? node.component : ''
  if (name !== 'Upload' && name !== 'ElUpload') return false
  return Comp === ElUpload
}

/** 判断当前节点是否为 listType='picture-card' 的 ElUpload */
export function isPictureCardUpload(node: SchemaNode, Comp: unknown): boolean {
  return isElUpload(node, Comp) && node.props?.listType === 'picture-card'
}

/** 判断当前节点是否为开启 drag 拖拽的 ElUpload */
export function isDragUpload(node: SchemaNode, Comp: unknown): boolean {
  return isElUpload(node, Comp) && Boolean(node.props?.drag)
}
