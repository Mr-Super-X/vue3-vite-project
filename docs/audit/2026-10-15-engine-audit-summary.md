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
| A1 反向触发路径        | ⏳ 待修   | 涉及 use-cross-field-trigger 的 watcher 跟随机制，单独立项                                                                                                                                                                                                                                                                                                                                                                                             |
| A4 validating 三态链路 | ✅ 已修复 | 三层修复：①写入层 `message 非空优先`（use-set-field-error.ts，validating 条目不再被误删）②渲染层 validating 态不注入 `:error`（render-form-item.ts——EP error prop 优先级压过 validateStatus）③守护层按条目 validateStatus 同步/纠正（use-set-field-error 路径 B，不再无条件覆盖成 error）。浏览器实证：`is-validating ✓ / is-error ✗`（修复前恒 is-error），error 态与清除回归正常。生产调用点（use-form-instance.ts:248）传空 message，零行为变化风险 |
| A3 / A5                | ⏳ 待修   | A3 需 ProTable 双引擎（el-table clearFilter / vxe localFilterMap）适配；A5 需模块级 stopper 生命周期设计——下批                                                                                                                                                                                                                                                                                                                                         |

**浏览器实测验收（chrome-devtools @ dev:local，2026-10-15）**：XFormCrossField（正向：不一致→报错、改一致→错误清除）/ XFormAsyncValidator（空提交→必填错误+toast）/ XFormCrossFieldReverse（反向实时清错 + 批量 cross 报错）/ XFormOrderCreate（业务表单校验）——四页全通过；console 零异常。受影响面排查：crossValidator 使用方 8 个文件，其中"数组+cross"组合 demo **0 个**（A1 场景长期无 demo 无测试即此因，已转 C3 输入）。另发现文档漂移：docs/24「路由 = /demo/x-form-<kebab>」应为 `/demo/xform-<kebab>`。

**验证方法论教训**：HMR 热更新后的页面实测出现"错误残留"假回归——经 stash 对比 + 双方 fresh reload 公平对比排除。**引擎修复的浏览器验证必须在 fresh reload 页面进行**。

## 使用说明

- 每批开工时按本清单建任务，修复后把对应行标记 ✅ 并补回归 spec（C3 是各批的验收成分）
- A5/B3 涉及模块级状态，修复时顺手做"卸载清理路径"（onScopeDispose 注册）
- 修复批顺序：A → B → C；A 批内 A1/A2 同源（嵌套路径解析），建议同一人/同批修
- 修复期间如发现清单外问题，先入 `docs/audit/` 追加记录，不扩大当批范围
- **每个修复项的验收 = 单测红绿 + 受影响 demo 浏览器实测（fresh reload）双证据**

## 验证基线（修复批开工前应保持）

196 unit specs + 12 e2e 全绿 · check:doc-currency 13 项 · type-check PASS
