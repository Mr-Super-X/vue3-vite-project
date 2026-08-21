# XForm 架构总览

> **TL;DR** — XForm 引擎(form-schema)分四层:Schema 定义层 → Composable 编排层 → Render 渲染层 → Demo 应用层。**216 测试 + 8 个 demo 全覆盖 P0/P1/P2/P3 关键能力**。

## 1. 模块边界

```
┌─────────────────────────────────────────────────────────────┐
│ 应用层:src/modules/demo/examples/XForm*.vue              │
│   (8 个 demo 演示各种使用场景)                              │
├─────────────────────────────────────────────────────────────┤
│ 引擎层:src/components/form-schema/                        │
│                                                             │
│   ┌─────────── XForm.vue (顶层组件) ───────────┐          │
│   │  ├ useSchemaRenderer (编排 + 反应式管理)    │          │
│   │  ├ useFormInstance (el-form 引用 + setField)│          │
│   │  ├ useCurrentBreakpoint (响应式断点)         │          │
│   │  └ useRenderSchemaNode (节点 → VNode)         │          │
│   │                                            │          │
│   │  ├ apply-reaction-fields (reaction 字段写入) │          │
│   │  ├ build-vmodel-bindings (v-model 绑定)      │          │
│   │  ├ build-on-bindings (事件绑定)              │          │
│   │  ├ runCrossFieldValidation (跨字段校验调度)  │          │
│   │  ├ match-trigger (trigger 字段匹配)         │          │
│   │  └ use-scan-forbidden (危险标识符扫描)      │          │
│   │                                            │          │
│   │  └ SchemaNode + RuleItem + ReactionConfig     │          │
│   │     (核心类型 + DEFAULT_COMPONENT_MAP)      │          │
│   └────────────────────────────────────────┘          │
│                                                             │
│   xArray / xInput / xSelect / xCascader / ...                │
│   (builder 链式 API)                                         │
└─────────────────────────────────────────────────────────────┘
```

## 2. 关键 Composable 职责

| Composable                | 文件                                    | 职责                                                                                                                              |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `useSchemaRenderer`       | `composables/use-schema-renderer.ts`    | watch schema + cloneDeep + reactive 包装;reaction 注册;**currentBreakpoint 变化触发重渲染**                                       |
| `useFormInstance`         | `composables/use-form-instance.ts`      | el-form 引用 + 校验/重置/滚动;**addItem/removeItem/moveItem 数组操作**;**setFieldError 写红字**(element-plus 2.x shallowRef 适配) |
| `useCurrentBreakpoint`    | `composables/use-current-breakpoint.ts` | 监听 window.resize → 返回 Ref<'xs'\|'sm'\|'md'\|'lg'\|'xl'>(element-plus 标准 5 档阈值)                                           |
| `useRenderSchemaNode`     | `composables/render-schema-node.ts`     | 节点 → VNode 主入口;内含 array/formItem/visual container/默认 4 分支;`pickBreakpointConfig` 响应式拍平                            |
| `runCrossFieldValidation` | `composables/use-validate.ts`           | 跨字段 crossValidator 调度(支持 sync/async Promise)                                                                               |
| `applyReactionFields`     | `composables/apply-reaction-fields.ts`  | reaction 函数值写入 node,**跳过元字段 strategy/delay**                                                                            |
| `buildVModelBindings`     | `composables/build-vmodel-bindings.ts`  | v-model 双向绑定 + lodash 路径解析(数组项) + **onValueChange 主动触发跨字段**                                                     |
| `buildOnBindings`         | `composables/build-on-bindings.ts`      | 事件绑定(支持 fn / `{{ fn }}` 函数表达式)                                                                                         |
| `matchTrigger`            | `composables/match-trigger.ts`          | reaction trigger 字段匹配(sync 默认 / debounce / throttle / manual)                                                               |

## 3. 触发器层级(关键!)

**任何 model 字段变化 → 触发的链路(从内到外)**:

```
model 字段写入
  │
  ├─→ buildVModelBindings 写入 model[name]  ← lodash get/set 解析路径
  │   └─→ onValueChange(node, newValue)       ← 主动调 triggerCrossFieldValidator
  │       └─→ use-reaction watch: applyReactionFields  ← matchTrigger 过滤
  │           └─→ 修改 node.disabled / node.props / node.label / ...
  │
  ├─→ useFormInstance (深 watch model, deep:true)
  │   └─→ schema watch handler → 替换 reactiveSchema 引用
  │       └─→ 整个 form 重新 mount(响应式断点变化 / schema 整体变化)
  │
  └─→ onBlur / onChange 监听器(form-item 触发)
      └─→ triggerCrossFieldValidator(node, 'blur' | 'change')
          └─→ matchTrigger 匹配 → applyReactionFields(同 path)
```

**关键洞察**:

- **v-model 写入**触发 `onValueChange` → **绕过 watch 不可靠问题**(vue Proxy + lodash set 链路)
- **手动调 onBlur/onChange 监听**触发 `triggerCrossFieldValidator`
- **watch deep model**只在 schema 整体变化或断点变化时触发(整体重渲染)
- **所有 reaction 写入**通过 `applyReactionFields`(跳过元字段 strategy/delay 避免污染)

## 4. SchemaNode 字段分类(17 字段)

| 分类         | 字段                                                     |
| ------------ | -------------------------------------------------------- |
| 组件标识     | `component`(string \| Component 对象)                    |
| 结构         | `name`, `children`, `slots`, `formItem`, `kind`, `array` |
| UI 元素      | `label`, `col`, `row`, `column`                          |
| 校验         | `rules`, `reaction`, `crossValidator`                    |
| 渲染         | `props`, `on`, `defaultValue`, `modelProp`, `directives` |
| 状态         | `ignore`, `hidden`, `disabled`, `key`                    |
| 反应式元数据 | `strategy`, `delay`(P1-1,不写入 node)                    |

## 5. 响应式流转图(P2-1)

```
window resize
  ↓
useCurrentBreakpoint Ref.value 变化 (xs/sm/md/lg/xl)
  ↓
useSchemaRenderer 内部 watch 触发
  ↓
reactiveSchema 引用替换
  ↓
renderToComponentInner 重新调用
  ↓
pickBreakpointConfig(responsive, currentBreakpoint) 选具体 ColConfig
  ↓
wrapWithElCol 拍平为 ElCol props(span/offset)
  ↓
DOM 更新(只该字段的 col 变化,其他字段不动)
```

## 6. P0-P2 关键能力对照

| 能力                   | 触发器                                    | API                                                                        | Demo                |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------- |
| **数组容器**           | `addItem/removeItem/moveItem`             | `xArray('name').item(...).minItems(1).maxItems(5)`                         | XFormArray          |
| **跨字段校验**         | `v-model 写入` + `onBlur` + `watch model` | `rules: [{ dependsOn: ['x'], crossValidator: (m) => ... }]`                | XFormCrossField     |
| **disabled 反应式**    | `v-model 写入`                            | `reaction: { disabled: (m) => ... }`                                       | XFormDisabled       |
| **异步校验 loading**   | element-plus 原生支持                     | `xInput(...).asyncValidator(async (rule, val, cb) => { await ...; cb() })` | XFormAsyncValidator |
| **reaction 防抖/节流** | `watch(() => model, ...)`                 | `reaction: { strategy: 'debounce', delay: 300, ... }`                      | XFormReaction       |
| **Builder 链式**       | 同步                                      | `xUpload('a').action(url).accept('image/*')`                               | XFormBuilder        |
| **运行时响应式**       | `useCurrentBreakpoint`                    | `col: { responsive: { xs: { span: 24 }, md: { span: 6 } } }`               | XFormResponsive     |
| **服务端错误映射**     | `setFieldError`                           | `formRef.value.setFieldError('email', '该邮箱已注册')`                     | XFormServerError    |

## 7. 已知限制(从调试过程沉淀)

| 限制                                                                           | 根因                                                                                                              | 影响                                                    | 应对                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| **DatePicker 等复杂控件失焦不显示跨字段红字**                                  | element-plus 2.x `elForm.fields` 用 `shallowRef` 包装 — 改 `fields[i].validateState = 'error'` 不会触发 UI 重渲染 | 跨字段跨 DatePicker 的红字**保存时**才显示,失焦时不显示 | 升级 element-plus 2.6+ 或改造 setFieldError 集成 |
| **custom 组件(component 字段直接传对象)走同一 resolveComponentFor**            | 设计如此(最近一次扩展支持)                                                                                        | 无                                                      | 无                                               |
| **链式 makeBuilder cast 链路 + `[k: string]: unknown` 让 TS 链式推断为 never** | P1-2 类型设计局限                                                                                                 | Demo 链式调用需 `as any` 绕过                           | 后续可重写 makeBuilder 用 this 多态              |

## 8. 调试快速参考

| 问题                         | 排查点                                            | 文件                                                                             |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| 输入不响应                   | `buildVModelBindings` 的 lodash set 路径          | `composables/build-vmodel-bindings.ts`                                           |
| 校验不触发                   | `compileRules` 字符串引用 + XForm 的 `rules` prop | `composables/render-schema-node.ts` `compileRules`                               |
| 跨字段红字不显示(DatePicker) | element-plus 2.x shallowRef                       | `composables/use-form-instance.ts` `setFieldError` + `nextTick + splice`         |
| 反应式不响应                 | reaction 字段写在元字段(strategy/delay)上         | `composables/apply-reaction-fields.ts` 跳过元字段                                |
| 死循环                       | reaction 函数写 model 字段                        | `composables/use-reaction.ts` `watch(() => model, ...)` + demo 用外部 store 避开 |

## 9. 相关文档

- **24-XForm选型决策指南.md** — 何时用 XForm / element-plus 原生 / FormRender
- **25-XForm故障排查表.md** — 常见问题速查
- **27-XForm决策记录-ADR.md** — P0-P3 关键设计选择与原因(下一个文档)
