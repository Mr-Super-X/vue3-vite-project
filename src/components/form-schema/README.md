# XForm

> 基于 schema DSL 的动态表单组件 · 参考开源 form-schema 实现

## 30 秒上手

```vue
<XForm :schema="schema" :model="form" />
```

```ts
const form = reactive({ email: '' })

const schema = {
  component: 'Input',
  name: 'email',
  label: '邮箱',
  defaultValue: 'a@b.com',
  rules: [{ required: true, type: 'email', message: '请输入有效邮箱' }],
}
```

完整 demo 在 `/demo/xform-minimum-demo`。

---

## props

| 属性                    | 类型                                           | 必填 | 说明                                                         |
| ----------------------- | ---------------------------------------------- | ---- | ------------------------------------------------------------ |
| `schema`                | `SchemaNode \| SchemaNode[]`                   | ✅   | 表单 schema                                                  |
| `model`                 | `Record<string, unknown>`                      |      | 响应式数据对象（需用 `reactive()` 包装）                     |
| `components`            | `Record<string, Component>`                    |      | 自定义组件映射                                               |
| `rules`                 | `Record<string, RuleItem>`                     |      | 校验规则命名引用                                             |
| `directives`            | `Record<string, Directive>`                    |      | 自定义指令映射                                               |
| `beforeChange`          | `(item, newVal, oldVal) => unknown \| Promise` |      | 字段值变化前拦截                                             |
| `zodSchema`             | `ZodType`                                      |      | zod 校验 schema（配合 `validateWithZod()`）                  |
| `scrollToError`         | `boolean`                                      |      | 校验失败自动滚动到第一个错误字段（默认 false）               |
| `scrollIntoViewOptions` | `ScrollIntoViewOptions \| boolean`             |      | 滚动行为选项（如 `{ behavior: 'smooth', block: 'center' }`） |
| `componentProps`        | `Record<string, Record<string, unknown>>`      |      | 按组件名注入默认 props（节点级 props 可覆盖）                |

---

## 实例方法（ref 引用）

```vue
<XForm ref="formRef" :schema="schema" :model="form" />
```

```ts
const formRef = ref()

// 校验（Promise 风格，非回调）
await formRef.value?.validate() // → boolean（el-form 字段规则 + 跨字段 crossValidator）
await formRef.value?.validateDetail() // → { isValid, errors: [{ keyPath, message }] }
formRef.value?.resetFields()
formRef.value?.clearValidate()
formRef.value?.scrollToField('email')
formRef.value?.getNames() // → ['email', 'name', ...]（includesIgnore=true 含 ignore 字段）
formRef.value?.getRef('email') // → Component | HTMLElement | null
formRef.value?.validateWithZod() // → { success, errors }（需配合 zodSchema prop）

// 服务端错误回显
formRef.value?.setFieldError('email', '邮箱已被占用') // 手动写入字段错误（422 场景）
formRef.value?.setFieldValidating('email') // 标记校验中（loading 图标）
formRef.value?.validateFromServer({ success: false, errors: { email: '已被占用' } }) // → 写入的错误条数

// 数组节点操作（仅 kind: 'array' 节点）
formRef.value?.addItem('items', { qty: 1 }) // 末尾追加一行
formRef.value?.removeItem('items', 0) // 删除指定行
formRef.value?.moveItem('items', 0, 2) // 行位置调整

// dirty 状态追踪
formRef.value?.isDirty() // → boolean
formRef.value?.getDirtyFields() // → ['email', 'address.city', ...]
formRef.value?.isTouched('email') // → boolean
formRef.value?.resetDirty() // 当前状态设为新基线（提交后归零）
```

---

## schema 字段（25 个）

| 字段            | 类型                                                 | 说明                                                               |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `component`     | `string`                                             | 组件名（短名 `'Input'` / 全名 `'ElInput'`）                        |
| `props`         | `Record<string, unknown>`                            | 组件 props                                                         |
| `on`            | `Record<string, Function \| string>`                 | 事件回调（string 是 `{{ (m) => ... }}` 表达式）                    |
| `children`      | `SchemaNode \| SchemaNode[] \| string`               | 子节点                                                             |
| `label`         | `string`                                             | 标签文字                                                           |
| `name`          | `string`                                             | 字段名（双向绑定的 key）                                           |
| `key`           | `string \| number`                                   | 唯一标识                                                           |
| `rules`         | `string \| RuleItem \| Array`                        | 校验规则                                                           |
| `defaultValue`  | `unknown`                                            | 字段初值（model 缺时填入）                                         |
| `modelProp`     | `string`                                             | 自定义 v-model 属性名（默认 `modelValue`）                         |
| `row`           | `RowConfig`                                          | 栅格行（gutter）                                                   |
| `column`        | `number`                                             | 每行栅格数                                                         |
| `col`           | `boolean \| { span, offset }`                        | 子节点栅格列                                                       |
| `hidden`        | `boolean`                                            | 节点隐藏（仍创建，display:none，不参与校验）                       |
| `ignore`        | `boolean`                                            | 跳过渲染                                                           |
| `reaction`      | `ReactionConfig`                                     | 反应式联动（支持 `deps` 精确监听依赖路径）                         |
| `directives`    | `DirectiveConfig[]`                                  | 自定义指令                                                         |
| `asyncOptions`  | `AsyncOptionsConfig`                                 | 异步选项数据源（Select/Cascader/TreeSelect/Autocomplete）          |
| `slots`         | `Record<string, SchemaNode>`                         | 具名插槽                                                           |
| `formItem`      | `boolean \| { component, props, directives, slots }` | 自定义 form-item 包装                                              |
| `kind`          | `'array'`                                            | 节点类型（`'array'` = 数组容器）                                   |
| `array`         | `ArrayNodeConfig`                                    | 数组容器配置（`kind: 'array'` 时必填）                             |
| `disabled`      | `ReactionValue<boolean>`                             | 字段禁用（字面量 / 函数 / 表达式；el-form 跳过 disabled 字段校验） |
| `permission`    | `ReactionValue<'view' \| 'edit' \| 'hidden'>`        | 字段权限三态（view 只读 / edit 可编辑 / hidden 不渲染）            |
| `labelPosition` | `'left' \| 'right' \| 'top'`                         | label 位置（仅顶层 schema 生效）                                   |

---

## 链式构建器（fbuilder）

```ts
import {
  xInput,
  xSelect,
  xSwitch,
  xDatePicker,
  xTextarea,
  xRadioGroup,
  xCard,
} from '@/components/form-schema/builders'

const schema = {
  column: 2,
  row: { gutter: 24 },
  children: [
    xInput('email').label('邮箱').required().placeholder('a@b.com').defaultValue('a@b.com').build(),
    xSelect('role')
      .label('角色')
      .options([
        { value: 'admin', label: '管理员' },
        { value: 'user', label: '用户' },
      ])
      .required()
      .build(),
    xSwitch('enabled').label('启用').build(),
    xDatePicker('birthday').label('生日').format('YYYY-MM-DD').build(),
  ],
}
```

## 类型推导（SchemaNodeFor）

`SchemaNode` 是宽类型（`component: string` + `props: Record<string, unknown>`），写错不会报错。  
**`SchemaNodeFor<C>` 按 component 字段推导 props 类型**，IDE 自动校验：

```ts
import type { SchemaNodeFor } from '@/components/form-schema/types'

// 正确：placeholder 必为 string，clearable 必为 boolean
const email: SchemaNodeFor<'Input'> = {
  component: 'Input',
  name: 'email',
  props: { placeholder: 'a@b.com', clearable: true },
}

// 错误：placeholder 传 number（TS 类型错误，IDE 红波浪线）
const bad: SchemaNodeFor<'Input'> = {
  component: 'Input',
  name: 'email',
  props: { placeholder: 123, clearable: 'yes' as unknown as boolean },
}

// 多种 element-plus 组件类型自动支持
const selectNode: SchemaNodeFor<'Select'> = {
  component: 'Select',
  name: 'role',
  props: { multiple: true, clearable: true, filterable: true },
}
```

支持的 component 名（20 个内置 + ArrayNode 占位）：`Input | Select | Option | Switch | DatePicker | TimePicker | TimeSelect | TreeSelect | Upload | Autocomplete | Transfer | RadioGroup | Radio | CheckboxGroup | Checkbox | Cascader | InputNumber | Slider | Card | FormItem`

自定义组件可通过 module augmentation 扩展类型推导（见下方“自定义组件类型扩展”）。

## 自定义组件类型扩展

如果业务写了自定义字段组件，可以让 `SchemaNodeFor` 和 builder 也识别它的 props：

```ts
// types/form-schema.d.ts
import type { ComponentPropsRegistry } from '@/components/form-schema/types'

interface MyInputProps {
  prefix?: string
  suffix?: string
  modelValue?: string
}

declare module '@/components/form-schema/types' {
  interface ComponentPropsRegistry {
    MyInput: MyInputProps
  }
}
```

扩展后：

```ts
const node: SchemaNodeFor<'MyInput'> = {
  component: 'MyInput',
  name: 'keyword',
  props: { prefix: 'Search:', suffix: '✓' }, // IDE 自动补全 + 类型校验
}
```

> 注意：类型扩展仅影响 TS 推导，运行时仍需在 `XForm` 的 `components` prop 中注册：`<XForm :components="{ MyInput: MyInputComp }" />`。

---

## asyncOptions（异步选项）

`Select`、`Cascader`、`TreeSelect`、`Autocomplete` 支持内置异步数据源：

```ts
{
  component: 'Select',
  name: 'city',
  asyncOptions: {
    source: async () => fetch('/api/cities').then(r => r.json()),
    transform: (raw: Array<{ id: number; name: string }>) =>
      raw.map((item) => ({ label: item.name, value: item.id })),
  },
}
```

带依赖联动：

```ts
{
  component: 'Select',
  name: 'district',
  asyncOptions: {
    source: async () => fetch(`/api/districts?city=${form.city}`).then(r => r.json()),
    deps: 'city',
    transform: (raw) => raw.map((item: { name: string }) => ({ label: item.name, value: item.name })),
  },
}
```

| 字段        | 说明                                                                 |
| ----------- | -------------------------------------------------------------------- |
| `source`    | 返回选项数组的函数，支持 Promise；Autocomplete 可接收可选 query 参数 |
| `immediate` | 是否立即请求（默认 true）                                            |
| `deps`      | 依赖字段路径，变化时重新请求                                         |
| `transform` | 把 source 结果转为 `{ label, value }` 数组                           |
| `onError`   | 请求失败回调                                                         |

---

## reaction（响应式联动）

```ts
{
  component: 'Input',
  name: 'path',
  label: '路径',
  reaction: {
    disabled: (m) => !m.enablePath,                          // 字段值
    rules: (m) => m.enablePath ? 'required' : undefined,      // 校验
    props: { placeholder: (m) => m.enablePath ? '请输入' : '' }, // 组件 props
    label: (m) => m.enablePath ? '路径（必填）' : '路径',  // label
    hidden: (m) => !m.enablePath,                             // 隐藏
  },
}
```

**调度策略**：`strategy: 'sync' | 'debounce' | 'throttle'` + `delay`（ms）。

**性能优化 —— `deps` 精确监听**：默认情况下含动态值的 reaction 会 deep watch 整棵 model（任意字段变化都触发求值）。声明 `deps` 后仅监听指定路径：

```ts
{
  name: 'total',
  reaction: {
    deps: ['qty', 'price'],                     // 只有这两个字段变化才重算
    label: (m) => `合计：${m.qty * m.price}`,   // 配合 deps 后，函数内写 model 也安全（不会自触发）
  },
}
```

> 联动函数内写 model 是被允许的（副作用），但未声明 deps 时会触发自身 deep watch 形成循环风险——XForm 内置单批次执行预算（50 次/flush）兜底并 console.error 告警；声明 deps 可从根上避免。

---

## 草稿持久化（useFormPersist）

表单数据自动防抖落盘、刷新不丢、按需恢复。XForm 零改动：

```ts
import { useFormPersist } from '@/components/form-schema'

const model = reactive<Record<string, unknown>>({})
const persist = useFormPersist({
  key: 'orders.create.draft', // 草稿唯一标识（经 storage namespace 隔离）
  model,
  exclude: ['password', 'card.cvv'], // 敏感字段不落盘（必配！）
})

// 挂载时按需恢复
onMounted(() => {
  if (persist.hasDraft.value) {
    persist.load()
    formRef.value?.resetDirty() // 草稿为新基线，isDirty 从草稿起算
  }
})

// 提交成功后
persist.clear()
```

| 配置            | 默认      | 说明                                        |
| --------------- | --------- | ------------------------------------------- |
| `key`           | 必填      | 草稿唯一标识，建议 `<模块>.<表单名>.draft`  |
| `model`         | 必填      | 被监听的 reactive model                     |
| `storage`       | `'local'` | `'session'` 关标签页失效                    |
| `debounce`      | `400`     | 自动保存防抖 ms                             |
| `exclude`       | `[]`      | 敏感字段 lodash 路径，序列化剔除            |
| `restoreFilter` | —         | schema 升级后裁剪旧草稿；返回 null 丢弃草稿 |

返回：`{ save, load, clear, hasDraft, lastSavedAt }`——`save()` 立即 flush；`load()` 恢复草稿（草稿保留，可反复恢复）；`clear()` 清除草稿。

**已知限制**：File/Blob/函数等不可序列化值会退化丢失；多标签页并发编辑不同步（后写覆盖先写）；含密码/证件号等字段必须配置 `exclude`。

---

## 决策指南

**何时用 XForm / 何时用 element-plus 原生：**

| 场景                               | 推荐                  |
| ---------------------------------- | --------------------- |
| 简单表单（< 5 字段）固定结构       | **element-plus 原生** |
| 动态 schema（来自后端 / 配置文件） | **XForm**             |
| 复杂联动（> 3 字段互相关联）       | **XForm**             |
| 复用校验规则                       | **XForm**             |
| 跨组件共享表单状态                 | **XForm**             |
| 性能关键（> 100 字段）             | **element-plus 原生** |
| 多语言 + 动态 schema               | **XForm**             |

---

## 故障排查

| 现象             | 原因                                    | 修复                                 |
| ---------------- | --------------------------------------- | ------------------------------------ |
| 输入无反应       | `model` 不是 reactive 包装              | 用 `reactive({})` 包装               |
| 输入无反应       | 节点缺 `name` 字段                      | 添加 `name: 'fieldId'`               |
| 校验不触发       | `rules` 是字符串但未在 props.rules 注册 | 配置 props.rules                     |
| 反应式不响应     | reaction 函数体未引用 `model`           | `reaction: { disabled: (m) => ... }` |
| directive 不生效 | directive 名未注册到 vue app            | 用 `app.directive()` 全局注册        |
| 样式不对         | 直接 import 绕过了 CSS 自动注入         | XForm 内部已 import CSS              |

dev 模式下 XFormDebugBanner 会自动在右下角浮窗显示 schema 校验错误。

---

## 示例

| 路由                       | 内容                                 |
| -------------------------- | ------------------------------------ |
| `/demo/xform-minimum-demo` | 最小可运行示例（5 分钟上手）         |
| `/demo/xform-base`         | 基础用法（5 字段 + 校验 + 重置）     |
| `/demo/xform-persist`      | 草稿持久化（自动保存 + 刷新恢复）    |
| `/demo/xform-nested`       | 复杂布局（Card 容器 + slots + 嵌套） |
| `/demo/xform-reaction`     | 反应式联动（防抖/节流/禁用/隐藏）    |
