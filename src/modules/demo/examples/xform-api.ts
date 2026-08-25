/**
 * XForm demo 的 API 文档数据（Props / Events / Slots / 实例方法）
 *
 * 数据源：src/components/form-schema/types.ts（XFormProps / XFormExpose / SchemaNode）。
 * 结构兼容 ApiTable 的 items 入参（TypeScript 结构化类型，无需显式依赖）。
 */

export interface XFormApiItem {
  name: string
  type?: string
  default?: string
  description: string
  required?: boolean
}

export const propsItems: XFormApiItem[] = [
  {
    name: 'schema',
    type: 'SchemaNode | SchemaNode[]',
    required: true,
    description:
      '表单 schema（全量 17 字段 DSL：component / props / on / children / name / label / rules / reaction ...）',
  },
  {
    name: 'model',
    type: 'Record<string, unknown>',
    description:
      '响应式数据对象（需 reactive() 包装；校验 / 默认值 / reaction / dirty 追踪均依赖它）',
  },
  {
    name: 'components',
    type: 'Record<string, Component>',
    description: '自定义组件映射（覆盖内置 element-plus 映射）',
  },
  {
    name: 'rules',
    type: 'Record<string, RuleItem>',
    description: '校验规则命名引用（schema 节点 rules 可写字符串名）',
  },
  {
    name: 'directives',
    type: 'Record<string, Directive>',
    description: '自定义指令映射（schema 节点 directives 按名引用）',
  },
  {
    name: 'beforeChange',
    type: '(item, newVal, oldVal) => unknown | Promise',
    description: '字段值变化前拦截：同步返回值替换 / Promise resolve 后更新 / reject 跳过更新',
  },
  {
    name: 'zodSchema',
    type: 'ZodType',
    description: 'zod 顶层校验 schema（配合 validateWithZod 实例方法）',
  },
  {
    name: 'componentProps',
    type: 'Record<string, Record<string, unknown>>',
    description: '按组件名注入默认 props（节点级 props 可覆盖）',
  },
]

export const eventsItems: XFormApiItem[] = [
  {
    name: 'node.on',
    type: 'Record<string, Function | {{ fn }}>',
    description:
      'XForm 组件本身不 emit 事件；字段级事件经 schema 节点 on 配置——键为组件事件名（change / input / blur ...），值为回调函数或 {{ }} 函数表达式',
  },
]

export const slotsItems: XFormApiItem[] = [
  {
    name: 'node.slots',
    type: 'SchemaSlot',
    description:
      'XForm 组件本身无插槽；字段插槽经 schema 节点 slots 配置，支持三种内容：SchemaNode / 字符串 / slot 函数（含 scoped slot）',
  },
]

export const methodsItems: XFormApiItem[] = [
  {
    name: 'validate',
    type: '() => Promise<boolean>',
    description: 'el-form 整体校验（async-validator）',
  },
  {
    name: 'validateDetail',
    type: '() => Promise<ValidateResult>',
    description: '详细校验结果（含跨字段 crossValidator 错误的 keyPath + message）',
  },
  {
    name: 'validateWithZod',
    type: '() => { success, errors }',
    description: 'zod 顶层校验（需传 zodSchema prop）',
  },
  { name: 'clearValidate', type: '() => void', description: '清除全部字段校验状态' },
  { name: 'resetFields', type: '() => void', description: '重置字段为初始值' },
  { name: 'scrollToField', type: '(name: string) => void', description: '滚动到指定字段' },
  {
    name: 'getRef',
    type: '(key) => Component | HTMLElement | null',
    description: '获取字段组件 / 元素引用',
  },
  { name: 'getNames', type: '(includesIgnore?) => string[]', description: '全部字段名列表' },
  {
    name: 'setFieldError',
    type: '(name, message, state?) => void',
    description: '手动写入字段错误（服务端 422 场景）',
  },
  {
    name: 'setFieldValidating',
    type: '(name) => void',
    description: '标记字段为校验中（form-item 显示 loading 图标）',
  },
  {
    name: 'validateFromServer',
    type: '(response) => number',
    description: '服务端响应映射：success=true 清空全部错误；errors 写入字段红字',
  },
  { name: 'addItem', type: '(name, init?) => void', description: '数组节点追加一行' },
  { name: 'removeItem', type: '(name, index) => void', description: '数组节点删除指定行' },
  { name: 'moveItem', type: '(name, from, to) => void', description: '数组节点行位置调整' },
  { name: 'isDirty', type: '() => boolean', description: '是否有未保存修改（相对基线）' },
  { name: 'getDirtyFields', type: '() => string[]', description: '全部 dirty 字段路径列表' },
  { name: 'isTouched', type: '(name) => boolean', description: '指定字段是否被修改过' },
  { name: 'resetDirty', type: '() => void', description: '把当前状态标记为新基线' },
]
