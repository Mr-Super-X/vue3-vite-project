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

// XFormEvents —— beforeChange 值拦截
export const beforeChangeItems: XFormApiItem[] = [
  {
    name: 'beforeChange',
    type: '(item, newVal, oldVal) => unknown | Promise',
    description: '字段值写入 model 前拦截（XFormProps 级，按 item.name 分派）',
  },
  {
    name: '同步返回非 undefined',
    type: 'unknown',
    description: '返回值替换新值写入 model（如自动格式化）',
  },
  {
    name: 'Promise resolve',
    type: 'unknown',
    description: 'resolve 值写入 model（异步转换 / 校验后放行）',
  },
  {
    name: 'Promise reject',
    type: '—',
    description: '跳过更新，model 保持旧值（输入框回弹）',
  },
  {
    name: '返回 undefined',
    type: '—',
    description: '放行原值（默认行为）',
  },
]

// XFormEvents —— node.on 字段事件
export const onEventItems: XFormApiItem[] = [
  {
    name: 'node.on.<事件名>',
    type: 'Function | {{ fn }}',
    description: '字段级事件：键为组件事件名（change / input / blur…）',
  },
  {
    name: '函数形式',
    type: '(value, ...args) => void',
    description: '推荐：闭包可直接读写真实 model（联动清空 / 字数统计）',
  },
  {
    name: '表达式形式',
    type: '{{ (m, ...args) => ... }}',
    description: '沙箱隔离：m 为 model 只读副本；危险标识符（window / fetch…）被安全扫描拦截',
  },
]

// XFormDirectives —— DirectiveConfig 节点指令
export const directivesItems: XFormApiItem[] = [
  {
    name: 'directive',
    type: 'Directive 对象',
    required: true,
    description: '带钩子的 Vue 指令定义（mounted / updated…），直接写在 schema 中',
  },
  { name: 'value', type: 'unknown', description: '指令绑定值（binding.value）' },
  { name: 'arg', type: 'string', description: '指令参数（binding.arg）' },
  {
    name: 'modifiers',
    type: 'Record<string, boolean>',
    description: '修饰符（binding.modifiers，如 { strong: true }）',
  },
]

// XFormDirectives —— componentProps 全局默认 props
export const componentPropsItems: XFormApiItem[] = [
  {
    name: 'componentProps',
    type: 'Record<string, Record<string, unknown>>',
    description: '按组件名注入默认 props（XFormProps 级）',
  },
  {
    name: '合并规则',
    type: '—',
    description: '与内置默认（clearable 等）合并；节点级 props 优先级最高，可覆盖全局默认',
  },
  {
    name: '生效范围',
    type: '—',
    description: '仅 string component 生效；直接传 Component 对象时由组件自身控制',
  },
]

// XFormDirectives —— rules 命名引用
export const ruleRefItems: XFormApiItem[] = [
  {
    name: 'rules prop',
    type: 'Record<string, RuleItem>',
    description: '校验规则命名表（XFormProps 级），按名字复用跨表单规则',
  },
  {
    name: 'node.rules 字符串',
    type: 'string',
    description: '查命名表：命中取对应 RuleItem；未命中退化为 required',
  },
]

// XFormGrid —— 栅格配置速查
export const gridItems: XFormApiItem[] = [
  {
    name: 'column',
    type: 'number',
    description: '每行固定 N 列，所有字段等宽（span = 24 / N）——最简配置',
  },
  {
    name: 'row',
    type: 'RowConfig',
    description: '行配置：gutter 列间距 / type / align / justify；顶层或容器节点均可',
  },
  {
    name: 'col',
    type: 'boolean | ColConfig',
    description: '节点级列配置：span 自由分配列宽 / offset / push / pull；col: false 不包栅格',
  },
  {
    name: 'row + col.span 组合',
    type: '—',
    description: '顶层 row + 节点级 col.span：自由组合列宽（如 6 + 6 + 12、24 整行）',
  },
  {
    name: '布局容器节点',
    type: '无 name 节点 + row / column',
    description: '渲染为纯 ElRow + ElCol 容器，可分区组织字段（按业务块分组）',
  },
  {
    name: '⚠️ 混用限制',
    type: '—',
    description:
      '顶层 column 会把节点锁进固定 span 的 ElCol，节点级 col.span 无法突破——不等宽布局用 row + col.span',
  },
]

// XFormBase —— RuleItem 常用字段
export const ruleItems: XFormApiItem[] = [
  {
    name: 'required',
    type: 'boolean',
    description: '必填校验（rules 写字符串 "required" 等价）',
  },
  {
    name: 'pattern',
    type: 'RegExp | string',
    description: '正则校验（如订单号格式 /^ORD-\\d{6}$/）',
  },
  {
    name: 'min / max',
    type: 'number | string',
    description: '长度 / 数值范围校验',
  },
  {
    name: 'message',
    type: 'string',
    description: '校验失败提示文案',
  },
  {
    name: 'validator',
    type: '(rule, value, cb) => void',
    description: '自定义校验函数（async-validator 回调式，cb(Error?) 报告结果）',
  },
  {
    name: 'type',
    type: 'string',
    description: '内置类型校验：string / email / url / number 等',
  },
  {
    name: 'trigger',
    type: "'blur' | 'change' | 'manual'",
    description: '校验触发时机',
  },
]

// XFormMinimumDemo —— 最小示例三要素
export const minimumItems: XFormApiItem[] = [
  {
    name: 'schema',
    type: 'SchemaNode',
    required: true,
    description: '表单结构声明（component / name / label / rules）',
  },
  {
    name: 'model',
    type: 'Record<string, unknown>',
    description: 'reactive() 包装的数据对象（校验 / 默认值 / reaction 依赖）',
  },
  {
    name: 'defaultValue',
    type: 'unknown',
    description: '挂载时自动填充到 model（仅字段未定义时）',
  },
]

// XFormNested —— Card 分组布局
export const nestedItems: XFormApiItem[] = [
  {
    name: 'Card 容器分组',
    type: "component: 'Card'",
    description: '每个 Card 节点带 column + row + props，内部字段自动栅格化',
  },
  {
    name: 'slots.header',
    type: 'SchemaSlot',
    description: 'ElCard 标题插槽（注意是 header，不是 title / extra）',
  },
  {
    name: '嵌套 children',
    type: 'SchemaNode[]',
    description: 'FormItem 内嵌 Input + 原生标签（a / span）等混合内容',
  },
  {
    name: 'column',
    type: 'number',
    description: '每行 N 列（2 / 3 等宽分配）',
  },
]

// XFormSlots —— 插槽三种形式
export const slotTypeItems: XFormApiItem[] = [
  {
    name: 'SchemaNode 形式',
    type: 'SchemaNode | SchemaNode[]',
    description: '按 schema 渲染子内容',
  },
  {
    name: '字符串形式',
    type: 'string',
    description: '纯文本内容（走 schema 渲染）',
  },
  {
    name: '函数形式',
    type: '(scope?) => VNode',
    description: 'render function / JSX 产物；scoped slot 接收 scope 参数',
  },
]

// XFormModelWarn —— model prop 三种形态
export const modelWarnItems: XFormApiItem[] = [
  {
    name: 'model 未传',
    type: '—',
    description: 'dev 模式 console.warn；校验 / 默认值 / reaction / dirty 追踪全部失效',
  },
  {
    name: 'reactive({})',
    type: '—',
    description: '合法但未声明字段，提交为空',
  },
  {
    name: 'reactive({ email: "" })',
    type: '—',
    description: '对照正常用法：字段需在 model 中预声明',
  },
]

// XFormLargeSchema —— 性能观察要点
export const largeSchemaItems: XFormApiItem[] = [
  {
    name: '字段规模',
    type: '100+ 字段',
    description: '模拟生产中后台长表单',
  },
  {
    name: 'mount 耗时',
    type: '控制台输出',
    description: '首次渲染挂载时间（DevTools Performance 可复核）',
  },
  {
    name: '输入响应',
    type: '控制台输出',
    description: '字段输入到 UI 更新的耗时',
  },
  {
    name: 'reaction 开销',
    type: '控制台输出',
    description: '反应式联动触发重渲染耗时',
  },
]

// XFormInvalidComponent —— 组件名解析规则
export const invalidComponentItems: XFormApiItem[] = [
  {
    name: 'EL 短名',
    type: "'Input'",
    description: '合法（DEFAULT_COMPONENT_MAP 命中）',
  },
  {
    name: 'EL 全名',
    type: "'ElInput'",
    description: '合法（自动识别 ElXxx 写法）',
  },
  {
    name: '原生 HTML 标签',
    type: "'a' / 'span'（全小写）",
    description: '合法（直接原生渲染）',
  },
  {
    name: '拼写错误',
    type: "'Inpurt'",
    description: 'dev 控制台 warn + Debug Banner 红条',
  },
  {
    name: '未注册自定义组件',
    type: "'MyInput'",
    description: '需在 components prop 注册后才合法',
  },
]

// XFormCrossFieldReverse —— 反向触发机制
export const reverseCrossItems: XFormApiItem[] = [
  {
    name: 'dependsOn',
    type: 'string | string[]',
    description: '声明依赖字段（lodash 路径）',
  },
  {
    name: '反向触发',
    type: '—',
    description: '依赖字段变化时自动重算所有 dependsOn 包含它的规则（无需手动 watch）',
  },
  {
    name: '触发时机',
    type: 'blur / change',
    description: '与正向 trigger 一致；空值跳过（交给 required 处理）',
  },
]

// XFormAsyncValidator —— 异步校验
export const asyncValidatorItems: XFormApiItem[] = [
  {
    name: '异步 validator',
    type: '(rule, value, cb) => void',
    description: 'async-validator 回调式：远程接口返回后调用 cb(Error?)',
  },
  {
    name: '异步 crossValidator',
    type: '(...) => Promise<true | string>',
    description: '跨字段异步校验，validate() 会 await',
  },
  {
    name: 'loading 图标',
    type: '—',
    description: '异步校验期间 form-item 显示 loading（setFieldValidating）',
  },
]

// XFormScrollToError —— 校验失败自动滚动
export const scrollToErrorItems: XFormApiItem[] = [
  {
    name: 'scrollToError',
    type: 'boolean',
    default: 'false',
    description:
      '校验失败自动滚动到第一个错误字段（透传 ElForm）：字段规则失败滚到第一个 .el-form-item.is-error，跨字段失败滚到第一个 cross 错误字段',
  },
  {
    name: 'scrollIntoViewOptions',
    type: 'ScrollIntoViewOptions | boolean',
    default: 'true',
    description: '滚动行为透传（如 { behavior: "smooth", block: "center" }）',
  },
  {
    name: 'scrollToField(name)',
    type: '实例方法',
    description: '手动滚动到指定字段（透传 ElForm.scrollToField，依赖 formItem 的 prop 注册）',
  },
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

export const validateFieldItems: XFormApiItem[] = [
  {
    name: 'validateField(name)',
    type: '(name: string | string[]) => Promise<boolean>',
    description:
      '逐字段校验（透传 ElForm.validateField）：成功 true；校验失败 / el-form 未绑定 false（失败时错误已由 el-form-item 展示，未绑定 console.error 不静默通过）',
  },
  {
    name: 'resetFields(names?)',
    type: '(names?: string | string[]) => void',
    description:
      '重置字段：不传 names 全量重置（清空所有值与 externalErrors）；传 names 部分重置——只清指定字段的值与对应服务端错误，其他字段及红字保留',
  },
  {
    name: 'setFieldError(name, message, state?)',
    type: '实例方法',
    description: '手动写入字段错误（服务端 422 场景）——本 demo 用它模拟双字段红字',
  },
]
