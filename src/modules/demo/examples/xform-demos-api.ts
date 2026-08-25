/**
 * form 系列 demo 的专属 API 数据（A 档）
 *
 * 原则：每个 demo 只列「该功能专属」的 API 面（schema 字段 / 配置项 / 相关方法），
 * 与 XForm 总览（xform-api.ts 的 Props/Events/Slots/实例方法）不重复。
 * 数据源：src/components/form-schema/types.ts 与各 composable 签名。
 */
import type { XFormApiItem } from './xform-api'

// XFormPersist —— useFormPersist 配置与返回值
export const persistItems: XFormApiItem[] = [
  {
    name: 'key',
    type: 'string',
    required: true,
    description: '草稿唯一标识，建议 `<模块>.<表单名>.draft`（经 storage namespace 隔离）',
  },
  {
    name: 'model',
    type: 'Record<string, unknown>',
    required: true,
    description: '被监听的 reactive model（deep watch 防抖落盘）',
  },
  {
    name: 'storage',
    type: "'local' | 'session'",
    default: "'local'",
    description: "存储介质：'local' 跨会话保留；'session' 关标签页失效",
  },
  { name: 'debounce', type: 'number', default: '400', description: '自动保存防抖 ms' },
  {
    name: 'exclude',
    type: 'string[]',
    default: '[]',
    description: '敏感字段 lodash 路径（如 card.cvv），序列化剔除、不落盘',
  },
  {
    name: 'restoreFilter',
    type: '(draft) => draft | null',
    description: '恢复过滤器：schema 升级后裁剪旧草稿；返回 null 丢弃草稿',
  },
  {
    name: 'save() / load() / clear()',
    type: '() => void / () => boolean / () => void',
    description: '手动补丁：立即落盘 / 恢复草稿（可反复 load）/ 清除草稿',
  },
  {
    name: 'hasDraft / lastSavedAt',
    type: 'Ref<boolean> / Ref<number | null>',
    description: '初始化同步得出的草稿存在标记 / 最后保存时间戳',
  },
]

// XFormArray —— ArrayNodeConfig
export const arrayItems: XFormApiItem[] = [
  { name: 'kind', type: "'array'", required: true, description: '节点类型声明（配合 array 配置）' },
  {
    name: 'array.itemSchema',
    type: 'SchemaNode | SchemaNode[]',
    required: true,
    description: '每行渲染的子 schema（套到 model[name] 每个数组元素）',
  },
  {
    name: 'array.initialLength',
    type: 'number',
    default: '1',
    description: 'model 未定义时的初始行数',
  },
  {
    name: 'array.minItems / maxItems',
    type: 'number',
    description: '行数下限（达限禁删）/ 上限（达限禁增），校验同步读取',
  },
  {
    name: 'array.showActions',
    type: 'boolean | { add, remove, move }',
    default: 'true',
    description: '操作按钮显隐（可分别控制增 / 删 / 移）',
  },
  {
    name: 'array.labels',
    type: '{ add, remove, moveUp, moveDown }',
    description: '操作按钮文案（默认 添加/删除/上移/下移）',
  },
  { name: 'array.title', type: 'string', description: '容器标题（默认不渲染表头）' },
]

// XFormReaction —— ReactionConfig 核心字段
export const reactionItems: XFormApiItem[] = [
  {
    name: 'strategy',
    type: "'sync' | 'debounce' | 'throttle'",
    default: "'sync'",
    description: '调度策略：依赖变化立即执行 / 停止变化 delay ms 后执行一次 / delay ms 内最多一次',
  },
  {
    name: 'delay',
    type: 'number',
    description: 'debounce / throttle 延迟 ms（strategy ≠ sync 时生效）',
  },
  {
    name: 'hidden / disabled',
    type: 'ReactionValue<boolean>',
    description: '反应式显隐 / 禁用（值支持字面量 / 函数 / {{ }} 表达式）',
  },
  {
    name: 'rules / props / label',
    type: 'ReactionValue<...>',
    description: '反应式校验规则 / 组件属性 / 标签文字',
  },
]

// XFormAsyncOptions —— AsyncOptionsConfig
export const asyncOptionsItems: XFormApiItem[] = [
  {
    name: 'source',
    type: '(query?) => Promise<T[]> | T[]',
    required: true,
    description: '数据源函数（Autocomplete 场景可接收 query 参数）',
  },
  {
    name: 'immediate',
    type: 'boolean',
    default: 'true',
    description: '节点创建时是否立即请求',
  },
  {
    name: 'deps',
    type: 'string | string[]',
    description: '依赖字段路径（lodash 路径），任一依赖变化重新请求',
  },
  {
    name: 'transform',
    type: '(raw: T[]) => { label, value }[]',
    description: '把原始数组转为组件需要的 label/value 数组',
  },
  {
    name: 'onError',
    type: '(err) => void',
    description: '请求出错回调（默认写入内部 error 状态）',
  },
]

// XFormCrossField —— RuleItem 跨字段字段
export const crossFieldItems: XFormApiItem[] = [
  {
    name: 'dependsOn',
    type: 'string | string[]',
    description: '声明依赖的其他字段名（lodash 路径），仅与 crossValidator 配合',
  },
  {
    name: 'crossValidator',
    type: '(value, ...deps) => true | string | Promise',
    description:
      '跨字段校验：返回 true 通过；返回 string 作为错误信息；Promise 支持异步（validateForm 会 await）',
  },
  {
    name: 'trigger',
    type: "'blur' | 'change' | 'manual'",
    description: '校验触发时机（依赖字段变化时的实时重算由 XForm 内部反向触发）',
  },
]

// XFormFieldPermission —— permission 字段
export const permissionItems: XFormApiItem[] = [
  {
    name: 'permission',
    type: "ReactionValue<'view' | 'edit' | 'hidden'>",
    default: "'edit'",
    description: '字段权限三态：view 只读纯文本（跳过校验）/ edit 正常可编辑 / hidden 不渲染',
  },
  {
    name: '函数形式',
    type: '(model) => Permission',
    description: '根据当前 model 动态决定权限',
  },
  {
    name: '权限码形式',
    type: "string（如 'user.edit'）",
    description: '配合 XForm 的 permissionResolver（默认接受普通字符串字面量）',
  },
]

// XFormDisabled —— disabled 字段
export const disabledItems: XFormApiItem[] = [
  {
    name: 'disabled',
    type: 'ReactionValue<boolean>',
    description: '字段禁用：支持静态 boolean / 函数 / {{ }} 表达式（数组节点仅控制容器按钮）',
  },
  {
    name: 'props.disabled 优先级',
    type: 'boolean',
    description: '用户显式写在 props 里的 disabled 会覆盖本字段',
  },
  { name: '校验行为', type: '—', description: 'el-form 自动跳过 disabled 字段的校验' },
]

// XFormResponsive —— responsive 配置
export const responsiveItems: XFormApiItem[] = [
  {
    name: 'row.responsive',
    type: '{ xs?, sm?, md?, lg?, xl? }',
    description: '每个断点独立 gutter / type / align / justify',
  },
  {
    name: 'col.responsive',
    type: '{ xs?, sm?, md?, lg?, xl? }',
    description: '每个断点独立 span / offset / push / pull（传对象时 el-col 自动按 viewport 选）',
  },
  {
    name: '断点档位',
    type: 'xs / sm / md / lg / xl',
    description: '< 768 / ≥ 768 / ≥ 992 / ≥ 1200 / ≥ 1920（element-plus 标准 5 档）',
  },
]

// XFormBuilder —— builder 链式方法
export const builderItems: XFormApiItem[] = [
  {
    name: '基础 builder',
    type: 'xInput / xSelect / xSwitch / xDatePicker / xTextarea / xRadioGroup / xCard',
    description: '基础控件 builder（详见 README「链式构建器」章节）',
  },
  {
    name: '本 demo 补齐',
    type: 'xCascader / xUpload / xAutocomplete / xTimePicker / xTimeSelect / xTreeSelect / xTransfer',
    description: '7 个 builder 链式方法',
  },
  {
    name: '链式方法',
    type: '.label() .required() .placeholder() .defaultValue() .options() .build()',
    description: '常见链式配置方法，build() 产出 SchemaNode',
  },
]

// XFormSchemaIndex —— useSchemaIndex 返回
export const schemaIndexItems: XFormApiItem[] = [
  { name: 'byName', type: 'Map<string, SchemaNode>', description: 'name → 节点映射（O(1) 查表）' },
  { name: 'fieldNames', type: 'string[]', description: '全部字段名（DFS 顺序，不含 ignore）' },
  { name: 'allNames', type: 'string[]', description: '含 ignore 字段（用于 server error 映射）' },
  {
    name: 'crossRules',
    type: 'Map<target, RuleItem[]>',
    description: '目标字段 → 跨字段规则列表（跨字段 watch 启动用）',
  },
  {
    name: 'reverseIndex',
    type: 'Map<dep, target[]>',
    description: '依赖字段 → 受影响的目标字段（反向触发）',
  },
  {
    name: 'dependsOnMap',
    type: 'Map<target, deps[]>',
    description: '目标字段 → 它依赖的字段（正向链）',
  },
]

// XFormServerError —— 相关实例方法
export const serverErrorMethods: XFormApiItem[] = [
  {
    name: 'validateFromServer',
    type: '(response) => number',
    description: '服务端响应映射：success=true 清空全部错误；errors 写入字段红字',
  },
  {
    name: 'setFieldError',
    type: '(name, message, state?) => void',
    description: '手动写入字段错误（后端 422 场景）',
  },
  {
    name: 'setFieldValidating',
    type: '(name) => void',
    description: '标记字段为校验中（loading 图标）',
  },
  { name: 'clearValidate', type: '() => void', description: '清除全部字段校验状态' },
]

// XFormDirty —— 相关实例方法
export const dirtyMethods: XFormApiItem[] = [
  { name: 'isDirty', type: '() => boolean', description: '是否有未保存修改（相对基线）' },
  { name: 'getDirtyFields', type: '() => string[]', description: '全部 dirty 字段路径列表' },
  { name: 'isTouched', type: '(name) => boolean', description: '指定字段是否被修改过' },
  {
    name: 'resetDirty',
    type: '() => void',
    description: '把当前状态标记为新基线（提交后归零 / 加载后初始化）',
  },
]
