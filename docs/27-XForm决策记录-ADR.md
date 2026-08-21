# XForm 决策记录(ADR)

> **TL;DR** — form-schema 引擎从 P0 到 P3-B 历经 7 次重大设计决策,本文记录每项决策的**背景 / 备选方案 / 决策理由 / 后续影响**。

## ADR-001:Schema DSL 选用对象字面量 + 链式 Builder

**状态**:✅ 已实施 (P0-1)

**背景**:form-schema 引擎需要让用户声明表单结构 + 联动 + 校验。备选:

- A. JSON Schema 协议(标准、跨平台但类型推导弱)
- B. JSX / TSX 模板(类型好但运行时不灵活)
- C. Schema DSL 对象 + 链式 Builder(类型 + 灵活 + 集成 element-plus)

**决策**:C(对象字面量 + 链式 Builder)

**理由**:

- JSON Schema 表达跨字段联动(crossValidator)能力弱,需自定义 JSON 扩展
- JSX 运行时不能动态切换
- 对象字面量 + Builder 双轨:简单场景用对象字面量,复杂联动用 Builder 链式

**影响**:

- SchemaNode 类型核心 17 字段(本设计 + 后续扩展)
- 18 个 builder 类(xInput / xSelect / xCascader / xTreeSelect / ...)
- 链式推断偶尔被 cast 链路破坏(P1-2 已知问题,留 P4 优化)

---

## ADR-002:反应式 crossValidator vs 同步 validator

**状态**:✅ 已实施 (P0-2)

**背景**:校验体系有两条路:

- A. 用 element-plus 原生 `validator` 字段(支持 callback)
- B. 自定义 `crossValidator` 字段(支持 dependsOn 跨字段)

**决策**:B(自定义 crossValidator 字段,保留 A 兼容)

**理由**:

- A 是 el-form 标准——单字段验证,不能跨字段
- 实际中后台场景**跨字段约束极常见**(密码 = 确认密码 / 日期区间 / xor)
- B 用纯函数形式更易测试,支持同步/异步 Promise

**影响**:

- RuleItem 增 `dependsOn` + `crossValidator` 字段
- runCrossFieldValidation composable 处理
- 触发器:由 v-model 写入 / onBlur / onChange 调度
- P0-2 期间调试 6 次反复尝试,发现 element-plus 2.x shallowRef 限制,DatePicker 红字只在保存时显示——**降级为已知限制**

---

## ADR-003:数组节点独立 kind: 'array'(不内嵌在 children)

**状态**:✅ 已实施 (P0-1)

**背景**:数组容器有两条建模方式:

- A. 用 `children` 数组存行(简单但难以表达最小/最大行数、操作按钮文案)
- B. 独立 `kind: 'array' + array: ArrayNodeConfig`(独立语义)

**决策**:B(独立 `kind: 'array'`)

**理由**:

- A 让 children 数组 + 数组操作配置混在一起,类型混乱
- B 把数组配置(itemSchema / minItems / labels / showActions)封装到 `array` 字段,children 仍为单行 schema
- 与 XForm 主流 schema 模式(都是单个 `name` 字段)保持一致

**影响**:

- SchemaNode 增 `kind?: 'array'` + `array?: ArrayNodeConfig`
- 数组行通过 `rewriteNamePath` 拍平 name 路径(`items[0].qty` 形式)
- 数组操作 API:`addItem / removeItem / moveItem` 暴露在 XFormExpose

---

## ADR-004:触发器:不依赖 element-plus 自动 validate

**状态**:✅ 已实施 (P0-2 / P2 多次迭代)

**背景**:跨字段校验的触发时机有 3 种选择:

- A. 让 el-form 自动 validateField 跑我们注入的 rules
- B. 自定义 `triggerCrossFieldValidator(node, eventType)`,由 v-model 写入 + onBlur + onChange 调度
- C. 用 watch deep model 触发

**决策**:B(自定义 trigger 系统)

**理由**:

- A 不可行:el-form.validate 跑 rules 不会调我们的 crossValidator(它是 P0 自定义字段)
- C 不可行:vue Proxy + lodash set 链路 watch 不可靠,调试反复 4 次仍不可靠
- B 显式 + 直接 + 可控,易调试

**影响**:

- `triggerCrossFieldValidator(node, 'blur' | 'change')` API
- 触发器由 `v-model 写入` + `onBlur` + `onChange` 三个入口调度
- 4 次调试反复记录在 CHANGELOG(教训)

---

## ADR-005:v-model 写入后**主动**触发(不依赖 watch)

**状态**:✅ 已实施 (P0-2 / P2 修复)

**背景**:reaction 字段写 model 后需触发 reaction 函数重新计算。3 选:

- A. watch `() => model.X` 字段级 watchEffect
- B. watch `() => model, { deep: true }` 整 model watch
- C. v-model 写入后**主动调** triggerCrossFieldValidator

**决策**:C(主动调用)

**理由**:

- A 静态分析 reaction 函数依赖字段,通用性差
- B 调试反复 4 次失败(vue Proxy + lodash set 链路 watch 不可靠,deep watch 也不触发)
- C 在 v-model onUpdate 回调中**直接调** reaction 调度,绕过 watch 不可靠

**影响**:

- `buildVModelBindings` 加 `onValueChange` 回调
- XForm 注入 `(node, _newValue) => triggerCrossFieldValidator(node, 'change')`
- 解决 4 次反复调试的"为什么反应式不触发"问题
- 适用 **vue 3 watch + 第三方数据(v-model / lodash)链路不可靠**这一通用教训

---

## ADR-006:setFieldError 适配 element-plus 2.x shallowRef

**状态**:✅ 已实施 (P0-2 / P2 修复)

**背景**:`setFieldError(name, message, state)` 写入 `fields[i].validateState = 'error'` —— 但 element-plus 2.x `elForm.fields` 是 **shallowRef**,直接改 fields[i].X **不触发 UI 重渲染**。

**决策**:写入 field 后 `nextTick + splice 重建数组引用` 强制 shallowRef trigger

**理由**:

- 写字段+nextTick 是 minimal hack
- 替代方案:走 el-form.validateField 走 element-plus 完整流程,但 rules 中没有 crossValidator,validate 跑不出错——不可行
- 升级 element-plus 2.6+ 可彻底解决,但项目版本 2.14.3 升级成本高

**影响**:

- `use-form-instance.ts` `setFieldError` 实现修改
- **已知限制**:DatePicker / Select / Cascader 等复杂控件失焦红字只在保存时显示
- element-plus 2.6+ 升级后此 hack 可移除

---

## ADR-007:Builder 工厂 makeBuilder cast 链路 vs this 多态

**状态**:⚠️ 部分解决 (P1-2)

**背景**:Builder 链式 API 设计:

- A. `makeBuilder` 工厂返回 `class` + `_b: NodeBuilder` 转发 → **链式 Ext 方法返回类型推断为 never**(`[k: string]: unknown` 索引签名)
- B. `makeBuilder` 工厂返回的 class 内**直接实现链式方法**(不转发)
- C. Ext 类 override 父类方法显式 cast `this`

**决策**:A + hack(`as any` cast 绕过 TS 类型)

**理由**:

- A 是 P0 最初实现,链式 API 简单
- B 改动大(50+ 行)
- C 每个 Ext 类增加 ~10 行 override 方法,工作量大
- **A + 临时 hack 满足 demo 需求**,后续 P4 重构

**影响**:

- P1-2 测试 `as any` cast 通过类型检查
- 类型推断失败但运行时正常
- 后续 P4 优化方向:重写 makeBuilder 让 `this` 推断为子类

---

## ADR-008:反应式断点拍平(P2-1)

**状态**:✅ 已实施 (P2-1)

**背景**:RowConfig / ColConfig 响应式字段定义好之后,运行时切换问题:

- A. `el-row` 自带响应式(不)— element-plus 2.x 不自动监听 viewport resize
- B. XForm 内部 watch window.resize + 拍平 col.responsive → 整体 schema 重渲染
- C. XForm 内部 watch + 字段级局部 re-render(只重渲染变化字段)

**决策**:B(整体 schema 重渲染)

**理由**:

- A 不可行(element-plus 2.x 不自动)
- C 局部 re-render 实现复杂,易引入 bug
- B 简单可靠,120 字段 mount 74ms 实测流畅(超过 200 字段 production 中后台场景)

**影响**:

- useCurrentBreakpoint composable(window.resize 监听)
- useSchemaRenderer 接收 currentBreakpoint ref,内部 watch 触发重渲染
- render-schema-node 加 `pickBreakpointConfig` + `mergeColResponsive`
- 实测 120 字段 74ms 流畅,**未实施 markRaw / 字段级 watch 优化**——按反向策略避免过早优化

---

## ADR-009:不用 element-plus FormRender 等外部库

**状态**:✅ 决策保留 (从项目初始)

**背景**:form 库有 3 选:

- A. element-plus 原生(简单场景)
- B. FormRender(成熟、跨字段支持)
- C. 自研 form-schema(本项目)

**决策**:C + 局部用 A(简单场景)

**理由**:

- A:学习曲线低但联动难(见 24-XForm选型决策指南)
- B:成熟但耦合外部库,定制受限
- C:完全控制,提供 Builder 链式 + 响应式 + 跨字段 + 异步,所有需求 1 个库解决

**影响**:

- 自研工作量大但**长期收益高**(全部 P0-P2 需求都解决)
- 216 测试覆盖 + 8 个 demo 演示 + 完整架构文档
- 与 24-XForm 选型决策指南保持一致

---

## ADR 索引

| 编号 | 主题                           | 状态                         | 关联 demo                          |
| ---- | ------------------------------ | ---------------------------- | ---------------------------------- |
| 001  | Schema DSL 对象 + Builder      | ✅                           | XFormArray 等                      |
| 002  | 跨字段 crossValidator          | ✅(有 element-plus 2.x 限制) | XFormCrossField                    |
| 003  | 数组节点独立 kind              | ✅                           | XFormArray                         |
| 004  | 自定义 trigger 触发器          | ✅                           | XFormCrossField / XFormDisabled    |
| 005  | v-model 主动触发(不依赖 watch) | ✅                           | 所有反应式 demo                    |
| 006  | setFieldError 适配 shallowRef  | ✅(有 element-plus 2.x 限制) | XFormServerError / XFormCrossField |
| 007  | Builder cast 链式类型          | ⚠️ 临时 hack(P1-2)           | XFormBuilder                       |
| 008  | 响应式断点拍平(整体重渲染)     | ✅(120 字段 74ms 流畅)       | XFormResponsive                    |
| 009  | 不用 FormRender 自研           | ✅ 决策保留                  | 所有 demo                          |

## 调试教训(本项目最具价值的沉淀)

> **本次项目最大教训 —— 反复调试 4 次仍未解决才找到根因的"链式 v-model + watch"问题**:
>
> **不要在 watch 不可靠的链路上调试**:
>
> - vue 3 watch + 第三方数据(v-model / lodash set/get)链路**不可靠**——vue Proxy track 可能不触发
> - watch 调试非常困难(4 次反复尝试 6+ 小时)
> - **最稳方案:在数据写入回调中主动调业务逻辑**,不走 watch
> - 这是**P0 整个触发器系统设计**的基础
>
> **下次类似项目**:
>
> - 不要在 watch 不可靠链路上投入时间
> - 直接设计"主动触发"机制
> - watch 只用于**纯 vue 内部响应式数据**的派生

## 相关文档

- **24-XForm选型决策指南.md** — 何时用 XForm / 原生 / FormRender
- **25-XForm故障排查表.md** — 常见问题速查
- **26-XForm架构总览.md** — 组件/composable/触发器层级(本文档 1-9 节)
