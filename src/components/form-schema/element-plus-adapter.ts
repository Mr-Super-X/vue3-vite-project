/**
 * Schema 字符串快捷名 → Element Plus 全局注册名 的内置映射
 *
 * 为什么不在此处直接 import element-plus 组件对象：
 *   - 违反 CLAUDE.md §1.6 项目按需加载约定（unplugin-vue-components 自动注册）
 *   - 直接命名导入会增加 bundle size
 *   - 实际组件由 vue 内置 resolveComponent() 从全局注册表查找
 *
 * 使用方式：
 *   const name = resolveElComponentName(schema.component)  // → 'ElInput'
 *   const Comp = resolveComponent(name)                     // → ElInput 组件
 */
export const DEFAULT_COMPONENT_MAP: Record<string, string> = {
  Input: 'ElInput',
  Select: 'ElSelect',
  Option: 'ElOption',
  Switch: 'ElSwitch',
  DatePicker: 'ElDatePicker',
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

/**
 * 解析 schema.component 字符串到最终组件名（供 resolveComponent 查找）
 *
 * 解析顺序：
 *   1. userComponentKeys 命中 → 返回原 name（调用方走用户 components map）
 *   2. DEFAULT_COMPONENT_MAP 内置命中（如 Input → 'ElInput'）
 *   3. ElXxx 原生名直通
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
