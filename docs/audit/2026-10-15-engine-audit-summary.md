# 引擎健康度审计报告 — XForm / ProTable（2026-10-15）

> /autoplan TODOS #2「引擎加固 sprint」第一阶段（只审不修）。
> 三份独立子代理审计 + 主审查实证复核（5 条 HIGH 抽查：4 成立 / 1 证据不足降级）。
> 子报告：[`xform`](./2026-10-15-engine-audit-xform.md)（14 项）/ [`protable`](./2026-10-15-engine-audit-protable.md)（19 项）/ [`fixpatterns`](./2026-10-15-engine-audit-fixpatterns.md)（8 隐患面 + 20 修复模式聚类）

## 复核结论

| 抽查项                                                                                                              | 证据                                     | 裁决                                                 |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| 数组行内 crossValidator `dependsOn` 相对路径未重写（use-validate.ts:225 只拼 name）                                 | 实证 ✓                                   | CONFIRMED                                            |
| `use-validate.ts:166` 嵌套数组 `model[node.name]` 直索引（model 为嵌套结构，扁平 key 取不到）                       | 实证 ✓                                   | CONFIRMED                                            |
| ProTable `resetFilter()` 只清 `filterState` ref，列头筛选 UI / vxe localFilterMap 无清理通道（useTable.ts:405-407） | 实证 ✓                                   | CONFIRMED                                            |
| `setFieldValidating` else 分支 `delete externalErrors`（use-set-field-error.ts:112-114）                            | 部分实证（行为吻合，完整路径待修时确认） | PLAUSIBLE                                            |
| SelectedTags.vue:61 时区偏移                                                                                        | **文件不存在**                           | **REJECTED**（子代理路径错误，已降级为"待验证线索"） |

## 修复批规划（按数据正确性 → 状态一致性 → 文档/测试排序）

### 批 A — 数据正确性（P0，错误数据/静默跳过）

| #   | 问题                                                                                                    | 证据                                                     | 来源          |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- |
| A1  | 数组行内 crossValidator 的 `dependsOn` 相对路径双路径失效（反向触发恒不触发；批量路径取到顶层字段）     | use-validate.ts:225 / use-schema-index.builder.ts:59-110 | xform#1       |
| A2  | 嵌套数组（array 套 array）校验 `model[node.name]` 直索引静默跳过                                        | use-validate.ts:166                                      | fixpatterns#1 |
| A3  | `reset()` 后筛选"复活"：el-table 列头筛选 UI 非受控残留，再操作时旧条件静默回参                         | useTable.ts:405-407                                      | protable#1    |
| A4  | `setFieldValidating` 名不副实：走 setFieldError 的 else 分支清错误，validating 态永不生效且误清已有红字 | use-set-field-error.ts:112-114                           | xform#2       |
| A5  | 行级 reaction 全量重注册 + 模块级 stopper 桶泄漏（84bca22 残余面）                                      | render-array-node.ts:43                                  | xform#3       |

### 批 B — 状态一致性（P1）

| #   | 问题                                                                                            | 来源          |
| --- | ----------------------------------------------------------------------------------------------- | ------------- |
| B1  | vxe 引擎 `clearSelection` tableRef 恒 null（只清镜像不清 UI）；reserve-selection 跨页镜像不完整 | protable#2    |
| B2  | Autocomplete 异步选项无竞态令牌（快速切换旧响应覆盖新值）                                       | xform#8       |
| B3  | 原始值数组行 key 跨实例碰撞误停 watcher（模块级 rowReactionStoppers）                           | fixpatterns#3 |
| B4  | useTable `pageSize` 只读初始化未跟随 density 改造（e923cb8 同类漏网）                           | fixpatterns#5 |

### 批 C — 文档与测试（P2）

| #   | 问题                                                                                                                       | 来源        |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| C1  | docs/29 §6.4/§12 #3 称 vxe 不支持树形/拖拽/合并/编辑——与 v3.5 PR1-B 实现矛盾                                               | protable#3  |
| C2  | docs/29 §1.2 与源码 JSDoc 引用的「§3.5」章节不存在（断链）                                                                 | protable#3  |
| C3  | 测试盲区补 spec：use-validate 嵌套数组（A2 防线）/ 行级 reaction 双实例（B3 防线）/ setFieldValidating 真实行为（A4 防线） | fixpatterns |
| C4  | XForm 文档 4 处过时/遗漏（表达式扫描范围 / cross 规则索引说明等）                                                          | xform#9-13  |

## 批 A 修复进展（2026-10-15 当天）

| 项                     | 状态      | 证据                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A2 嵌套数组直索引      | ✅ 已修复 | `get(model, node.name)`（use-validate.ts）；红→绿 TDD（41/41）                                                                                                                                                                                                                                                                                                                                                                                         |
| A1 批量路径 dependsOn  | ✅ 已修复 | `rewriteRuleDeps`：行内相对**优先**、顶层绝对**回退**（双语义兼容既有"行小计≤总额"用法）；既有 spec 2 条曾红后绿 = 绝对路径回归防线                                                                                                                                                                                                                                                                                                                    |
| A1 反向触发路径        | ✅ 已修复 | builder 标记 rowScoped + composer 透传 + 行前缀 concrete 化（见下方批 A 收尾）                                                                                                                                                                                                                                                                                                                                                                         |
| A4 validating 三态链路 | ✅ 已修复 | 三层修复：①写入层 `message 非空优先`（use-set-field-error.ts，validating 条目不再被误删）②渲染层 validating 态不注入 `:error`（render-form-item.ts——EP error prop 优先级压过 validateStatus）③守护层按条目 validateStatus 同步/纠正（use-set-field-error 路径 B，不再无条件覆盖成 error）。浏览器实证：`is-validating ✓ / is-error ✗`（修复前恒 is-error），error 态与清除回归正常。生产调用点（use-form-instance.ts:248）传空 message，零行为变化风险 |
| A3 / A5                | ✅ 已修复 | 见下方批 A 收尾（2026-10-15 第二轮）                                                                                                                                                                                                                                                                                                                                                                                                                   |

**浏览器实测验收（chrome-devtools @ dev:local，2026-10-15）**：XFormCrossField（正向：不一致→报错、改一致→错误清除）/ XFormAsyncValidator（空提交→必填错误+toast）/ XFormCrossFieldReverse（反向实时清错 + 批量 cross 报错）/ XFormOrderCreate（业务表单校验）——四页全通过；console 零异常。受影响面排查：crossValidator 使用方 8 个文件，其中"数组+cross"组合 demo **0 个**（A1 场景长期无 demo 无测试即此因，已转 C3 输入）。另发现文档漂移：docs/24「路由 = /demo/x-form-<kebab>」应为 `/demo/xform-<kebab>`。

**验证方法论教训**：HMR 热更新后的页面实测出现"错误残留"假回归——经 stash 对比 + 双方 fresh reload 公平对比排除。**引擎修复的浏览器验证必须在 fresh reload 页面进行**。

## 批 A 收尾（2026-10-15 第二轮：A1-反向 + A3 + A5，批 A 全部关闭）

| 项      | 修复要点                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 浏览器实测（fresh reload @ dev:local）                                                                                                                                                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1-反向 | 数组行 crossRule 反向触发恒不触发：trigger('items[0].qty') 精确字符串匹配不到模板 deps（相对名 'qty'）。修复三层：①builder 预遍历 array.itemSchema 后代标记 `rowScoped`（CrossRuleEntry 新字段）②composer 透传 ③`resolveConcreteRule`/`concretizeRowRule` 按行前缀 concrete 化（行内相对优先、顶层绝对回退，语义同批量 rewriteRuleDeps；执行原语从 rule.dependsOn 取值故连 rule 一起副本重写）。spec +10                                                              | XFormCrossFieldReverse：不一致→报错→改依赖字段→目标字段红字自动清除 ✓（反向链路回归）。数组行 cross demo 仍为 0（上轮已转 C3），新能力由 spec 覆盖                                                                                                                                                                                                     |
| A3      | reset() 后筛选复活：resetFilter 只清 filterState，el-table 列头筛选 UI（非受控）与 vxe localFilterMap 无清理通道。修复：useTable.resetFilter 内经 tableRef 结构化调官方 `clearFilter()`（clearSelection 同款模式）+ VxeTableBody expose `clearFilter()`（清 localFilterMap + vxe 内部态）+ 编排层 reset 路径补调（el 模式 proTableVxe 为 null 自然短路）。spec +4。附带修正：vxe-table mock 缺具名导出 VxeTable/VxeColumn（真实 v4 模块形态），原"加载成功"断言空洞化 | **真实 CDP 输入重验**（首轮合成事件验证作废，见下方教训④）：真实点击「按状态过滤」→ Space 勾选待支付 → 真实点击「筛选」→ 行 10→3 + 快照 `{"status":["pending"]}` ✓ → 经 `__vueParentComponent` 调 exposed `reset()`（= SearchForm 重置按钮同一 fetchHook({reset:true}) 链路）→ 行恢复 10 ✓ + 重开面板 checkbox `[]` ✓ + `getFilterState()` 返回 `{}` ✓ |
| A5      | 行级 reaction 全量重注册 + 模块级 stopper 桶泄漏。修复：①stopper 桶 value 升级 `RowReactionEntry` 四元组（stop/index/itemSchema/rewritten），配置未变（同 rowKey+index+itemSchema 引用）跨渲染复用 watcher+副本跳过重注册 ②`useRenderSchemaNode` 每实例建桶经 opts 注入，setup 卸载时 onScopeDispose 统一 stop+clear（getCurrentScope 守卫兼容直调）；原始值行 i${index} key 跨实例碰撞（B3 关联面）随实例隔离消除。spec +6                                           | XFormReactionArrayRow：初始小计正确（含税 2×50×1.06=106）✓ 改数量联动 ✓ 切含税→税率出现+重算 339 ✓ 加新行→reaction 自动注册 ✓ console 零异常 ✓                                                                                                                                                                                                         |

**回归基线（批 A 收尾后）**：form-schema 目录全绿 + ProTable 目录全绿 + type-check PASS + 全量 specs 绿（净增 21 例）。

**验证方法论补充（本轮教训）**：①popper 常驻 DOM（display:none）——判断面板开关须读计算样式（既有记忆的复现）②EP 筛选面板"筛选"按钮在勾选后会被 Vue 重渲染替换引用——合成事件须在重查后的节点上派发 ③vxe-table 测试 mock 须镜像真实模块具名导出形态，否则组件解析路径在测试里恒空跑。④**合成事件对隐藏按钮也会派发（不检查可见性）——首轮 A3 验证点的「重置」实为隐藏筛选面板里的按钮，根本没走到 ProTable reset 编排链路；且 el-switch/checkbox 的 a11y uid 解析到隐藏原生 input，uid 直点报"not interactive"，真实交互须走「Tab 移焦点 + CDP Space/click」或坐标级输入**。引擎修复的浏览器验证必须以真实输入管线为准，合成事件仅用于无交互断言。

## 批 B 收尾（2026-10-15 第三轮：B1–B4，批 B 全部关闭）

| 项    | 修复要点                                                                                                                                                                                        | 验证                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| B1 #2 | vxe 引擎 clearSelection 只清镜像不清 UI：`VxeTableBody` expose `clearSelection()`（clearCheckboxRow/clearRadioRow 清 UI + 引擎侧本地镜像），ProTable expose 双通道并调（A3 clearFilter 同模式） | spec×3；EngineCompare 真实页面回归（双 vxe 实例渲染 13 行 + console 零异常）     |
| B1 #3 | reserve 跨页选区镜像残缺（vxe 恢复勾选不派发事件）：rows watch 在 reserve 分支改为 nextTick 后经 `getCheckboxRecords()` 回同步全量镜像，key 集合无变化不 emit（噪声防护）                       | spec×2（回同步全量 / 无变化不 emit）                                             |
| B2    | `buildAutocompleteFetcher` 无竞态令牌（useAsyncOptions 已有 fetchSeq，fetcher 是漏网）：per-fetcher seq，过期 resolve/reject 静默（新查询拥有 UI）。RED 经 stash 补验                           | spec×2（过期 cb 不触发 / 过期 reject 静默），stash 恢复旧实现确认 2 红           |
| B3    | 原始值行 i${index} key 跨实例碰撞：A5 实例桶已结构性消除，本批补双实例防线 spec（同 listName+同原始值行，B 渲染不得停 A 的 watcher / 换 A 的桶条目；A 重渲染命中自己缓存）                      | spec×1（曾定位出 makeOpts 返回包装对象而非 opts 的测试自身 bug，探针 DUMP 定位） |
| B4    | `pageSize` 只读初始化未跟随 density 改造：补 `watch(() => props.pageSize)`（density v3.0.1 同款；变化经既有 [page,pageSize] watcher 自动刷新；卸载 stop 合并进既有 onUnmounted）                | spec×2（跟随 / 联动刷新），RED 2 例先行                                          |

**浏览器验证面说明**：B1/B2 均无对应 demo（全项目无 vxe+selection 列 demo、无 Autocomplete+asyncOptions demo），由 spec 覆盖（与批 A「数组+cross」同型缺口，可入批 C 补 demo）；B4 无动态 pageSize demo。浏览器回归面 = EngineCompare vxe 引擎页（B1 改动后 vxe 渲染链路正常）。

## 使用说明

- 每批开工时按本清单建任务，修复后把对应行标记 ✅ 并补回归 spec（C3 是各批的验收成分）
- A5/B3 涉及模块级状态，修复时顺手做"卸载清理路径"（onScopeDispose 注册）
- 修复批顺序：A → B → C；A 批内 A1/A2 同源（嵌套路径解析），建议同一人/同批修
- 修复期间如发现清单外问题，先入 `docs/audit/` 追加记录，不扩大当批范围
- **每个修复项的验收 = 单测红绿 + 受影响 demo 浏览器实测（fresh reload）双证据**

## 验证基线（修复批开工前应保持）

196 unit specs + 12 e2e 全绿 · check:doc-currency 13 项 · type-check PASS
