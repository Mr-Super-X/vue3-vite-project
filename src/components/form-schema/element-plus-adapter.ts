/**
 * Schema 字符串快捷名 → Element Plus 全局注册名 的内置映射
 *
 * 为什么不在此处直接 import element-plus 组件对象：
 * - 违反 CLAUDE.md §1.6 项目按需加载约定（unplugin-vue-components 自动注册）
 * - 直接命名导入会增加 bundle size
 * - 实际组件由 vue 内置 resolveComponent() 从全局注册表查找
 */
export const DEFAULT_COMPONENT_MAP: Record<string, string> = {
  Input: 'ElInput',
  InputPassword: 'ElInput',
  ElInputPassword: 'ElInput',
  InputTextArea: 'ElInput',
  ElInputTextArea: 'ElInput',
  InputTag: 'ElInputTag',
  Select: 'ElSelect',
  Option: 'ElOption',
  Switch: 'ElSwitch',
  DatePicker: 'ElDatePicker',
  TimePicker: 'ElTimePicker',
  TimeSelect: 'ElTimeSelect',
  Upload: 'ElUpload',
  Transfer: 'ElTransfer',
  TreeSelect: 'ElTreeSelect',
  Autocomplete: 'ElAutocomplete',
  ColorPicker: 'ElColorPicker',
  Mention: 'ElMention',
  Rate: 'ElRate',
  Button: 'ElButton',
  Icon: 'ElIcon',
  RadioGroup: 'ElRadioGroup',
  Radio: 'ElRadio',
  CheckboxGroup: 'ElCheckboxGroup',
  Checkbox: 'ElCheckbox',
  Cascader: 'ElCascader',
  InputNumber: 'ElInputNumber',
  Slider: 'ElSlider',
  Card: 'ElCard',
  FormItem: 'ElFormItem',
  Form: 'ElForm',
}

/** 把快捷名形式的默认 props 同时展开为 ElXxx 形式，兼容 schema 中两种写法 */
function expandComponentProps(
  base: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {}
  for (const [key, props] of Object.entries(base)) {
    result[key] = { ...props }
    const elName = DEFAULT_COMPONENT_MAP[key]
    if (elName) {
      if (!(elName in result)) result[elName] = { ...props }
      const fullName = `El${key}`
      if (fullName in DEFAULT_COMPONENT_MAP) result[fullName] = { ...props }
    }
  }
  return result
}

/** 内置默认组件 props：按组件名注入，节点级 props 可覆盖 */
const BASE_DEFAULT_COMPONENT_PROPS: Record<string, Record<string, unknown>> = {
  Input: { clearable: true },
  InputNumber: { controlsPosition: 'right' },
  InputPassword: { type: 'password', showPassword: true },
  InputTextArea: { type: 'textarea', showWordLimit: true },
  InputTag: { clearable: true },
  Select: { clearable: true },
  Cascader: { clearable: true },
  DatePicker: { clearable: true },
  TimePicker: { clearable: true },
  TimeSelect: { clearable: true },
  TreeSelect: { clearable: true },
  Autocomplete: { clearable: true },
}

/**
 * 默认组件 props：按组件名注入，节点级 props 可覆盖。
 *
 * 包含轻量输入 UX 默认值和 Input 语义 alias 默认值；不强制 ColorPicker、Mention、Rate 的业务偏好。
 *
 * 键同时支持快捷名（如 'Input'）和 Element Plus 全名（如 'ElInput'），
 * 因此 schema 中写 component: 'Input' 或 component: 'ElInput' 都能命中。
 */
export const DEFAULT_COMPONENT_PROPS: Record<
  string,
  Record<string, unknown>
> = expandComponentProps(BASE_DEFAULT_COMPONENT_PROPS)

/**
 * 解析 schema.component 字符串到最终组件名（供 resolveComponent 查找）
 *
 * 解析顺序：
 * 1. userComponentKeys 命中 → 返回原 name（调用方走用户 components map）
 * 2. DEFAULT_COMPONENT_MAP 内置命中（如 Input → 'ElInput'）
 * 3. ElXxx 原生名直通
 *
 * 返回 null 时调用方应降级为 <div> 占位
 */
export function resolveElComponentName(name: string, userComponentKeys?: string[]): string | null {
  if (userComponentKeys && userComponentKeys.includes(name)) {
    return name
  }
  if (name in DEFAULT_COMPONENT_MAP) {
    return DEFAULT_COMPONENT_MAP[name] ?? null
  }
  if (name.startsWith('El')) {
    return name
  }
  return null
}
