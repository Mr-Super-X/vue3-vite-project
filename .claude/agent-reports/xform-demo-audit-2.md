# XForm Demo 第二轮审计报告（13 个未审计 demo）

> **生成时间**：2026-09-22
> **审计范围**：`src/modules/demo/examples/XForm/` 下未审计的 13 个 demo
> **审计方法**：对照 2026-09-21 D4 深度审计（已审但未修）+ 新增 F/G 维度（行内相对 deps / 沙箱表达式）
> **审计员**：general-purpose agent (Explore)

---

## 1. 「真正的未审计清单」表

| #   | 文件路径                     | 业务主题                               | 字段数 | 核心 reaction 数 | 行数 |
| --- | ---------------------------- | -------------------------------------- | ------ | ---------------- | ---- |
| 1   | `XFormAsyncValidator.vue`    | 异步校验                               | 3      | 0                | 180  |
| 2   | `XFormCrossField.vue`        | 跨字段校验（crossValidator）           | 11     | 0                | 351  |
| 3   | `XFormCrossFieldReverse.vue` | 反向跨字段                             | 4      | 0                | 205  |
| 4   | `XFormCustomComponent.vue`   | 注册业务自定义组件                     | 2      | 0                | 254  |
| 5   | `XFormDetailFill.vue`        | 详情接口回填                           | 10     | 3                | 327  |
| 6   | `XFormDirectives.vue`        | 节点指令 + 全局 props + rules 命名引用 | 4      | 0                | 182  |
| 7   | `XFormDisabled.vue`          | disabled 反应式                        | 5      | 2                | 160  |
| 8   | `XFormDirty.vue`             | dirty 状态追踪                         | 6      | 0                | 277  |
| 9   | `XFormErrorToastSlot.vue`    | toast 容器替换 slot                    | 2      | 0                | 170  |
| 10  | `XFormEvents.vue`            | on 字段事件 + beforeChange 拦截        | 6      | 0                | 226  |
| 11  | `XFormExpression.vue`        | `{{ fn }}` 沙箱表达式                  | 8      | 3                | 292  |
| 12  | `XFormGrid.vue`              | 栅格布局三模式对照                     | 5      | 0                | 235  |
| 13  | `XFormIgnore.vue`            | ignore 字段跳过渲染                    | 3      | 0                | 135  |

**总数核对**：60 个 XForm .vue = 17（已审已修）+ 31（D4 已审未修）+ 13（本轮待审）✅

---

## 2. 评分与命中问题

> 评分 1-5：5=优秀 / 4=良好 / 3=需小修 / 2=需重构 / 1=失真
> 维度：A=标题/intro错位 / B=暴露内部bug / C=信息过载 / D=缺分步指引 / E=placeholder脱业务 / F=未用行内相对deps / G=未走沙箱表达式

| Demo                   | 评分    | 命中          | 一句话                                         |
| ---------------------- | ------- | ------------- | ---------------------------------------------- |
| XFormAsyncValidator    | 3/5     | A + D         | title 写「async crossValidator」代码全单字段   |
| XFormCrossField        | 3/5     | B + C + A     | 351 行讲 6 概念 + 曝光「修复前/后」            |
| XFormCrossFieldReverse | 4/5     | D             | 「不需失焦」与 DatePicker blur 行为不符        |
| XFormCustomComponent   | 4/5     | D             | intro「module augmentation」未在 demo 体现     |
| XFormDetailFill        | 2/5     | C + B + E     | 327 行讲 6 概念 + 曝光修复细节                 |
| XFormDirectives        | 3/5     | C + B + D     | 单 demo 讲 3 大不相关概念 + 公开未实装         |
| XFormDisabled          | 4/5     | E             | username 业务场景偏泛                          |
| XFormDirty             | 4/5     | B + D         | 注释「H4 回归场景」曝光内部修复                |
| XFormErrorToastSlot    | **2/5** | **A + B + D** | **slot 接管能力完全无法验证（events 永远空）** |
| XFormEvents            | 3/5     | C + G         | 226 行讲 5 类概念                              |
| XFormExpression        | 5/5     | B 轻微        | title 用 `{{ fn }}` 字面字符串（渲染歧义）     |
| XFormGrid              | 4/5     | D             | `:key="activeKey"` 强制重建策略未注释          |
| XFormIgnore            | 5/5     | —             | 优秀，保留现状                                 |

---

## 3. P0 修复清单（≤3）

### P0-1: XFormErrorToastSlot.vue ⭐ 最优先

- **核心问题**：demo 核心承诺（slot 接管 errorBus 失败事件）**完全无法验证**
  - password 字段 `on.change` 直接调 `ElNotification(...)`，绕开 errorBus
  - 模板 `#toastContainer="{ events }"` 内 `v-for="e in events"`，events 始终为空
  - 注释 line 127-139 直接承认「本 demo 的 events 为空」
- **修复路径**：
  1. 删 password.on.change 伪触发代码
  2. 引入真正 errorBus 触发场景（crossValidator 失败 / asyncValidator reject / serverError）
  3. 或改 demo 名为「XFormErrorToastSlotCustomTrigger」明示限制

### P0-2: XFormDetailFill.vue

- **核心问题**：327 行讲 6 概念 + 曝光「修复前/后」历史
- **修复路径**：拆为 XFormDetailFillBasic / XFormDetailFillAdvanced / XFormDetailFillAsyncState 三 demo，删历史注释

### P0-3: XFormAsyncValidator.vue

- **核心问题**：title 写「async crossValidator」但代码全单字段 asyncValidator
- **修复路径**：改 title 为「单字段异步校验」一行；或真补一个 `dependsOn + async crossValidator` 字段

---

## 4. P1 建议下一迭代修复

| #    | demo                | 命中  | 修改建议                                     |
| ---- | ------------------- | ----- | -------------------------------------------- |
| P1-1 | XFormCrossField.vue | B + C | 删「修复前/后」+ 拆 3 demo                   |
| P1-2 | XFormDirectives.vue | C + B | 拆 Directives/ComponentProps/RuleRef 三 demo |
| P1-3 | XFormEvents.vue     | C     | 拆 Events/BeforeChange 两 demo               |
| P1-4 | XFormDirty.vue      | B     | 删「H4 回归场景」字眼                        |

---

## 5. P2 按需微调

XFormCrossFieldReverse（intro 文案）/ XFormCustomComponent（intro 悬挂承诺）/ XFormDisabled（业务语义）/ XFormExpression（title 渲染）/ XFormGrid（:key 注释）

---

## 6. 新维度 F / G 检查

### F. 行内相对 deps 写法（2026-09-21 修复后）

- ✅ XFormCrossField / XFormCrossFieldReverse：行内数组 `dependsOn: ['endDate']` + crossValidator 函数 —— 新写法
- ⚠️ XFormDetailFill.vue line 122 `asyncOptions.deps: 'city'` 字符串短名 —— **需进一步核查引擎层语义**

### G. `{{ }}` 沙箱表达式

- ✅ 全部 6 处 `{{ }}` 均经 XForm 沙箱编译，无直接 eval / new Function
- ✅ XFormEvents.vue 沙箱内 console.info 属白名单允许

---

## 7. 审计元数据

- **总耗时**：约 25 分钟
- **覆盖**：13 文件 Read + D4 报告对照 + 报告撰写
- **未覆盖**：
  - F 维度 `deps: 'city'` 引擎层语义未深查
  - G 维度沙箱白名单具体名单未读取配置文件
  - 本轮仅静态审计，实际行为偏差（如 P0-1 events 始终为空）需浏览器实测确认
