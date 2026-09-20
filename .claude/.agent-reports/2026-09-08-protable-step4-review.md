# ProTable 第 4 步重构代码审查报告

> 审查范围：fearute/pro-table 分支未提交变更（含已暂存文档 + 未暂存代码）
> 审查日期：2026-09-08
> 审查人：typescript-reviewer agent

## 验证状态

| 检查项                  | 命令                                        | 结果                               |
| ----------------------- | ------------------------------------------- | ---------------------------------- |
| TypeScript 全量类型检查 | `pnpm type-check:full`                      | 通过                               |
| ESLint                  | `pnpm lint`                                 | 通过                               |
| ProTable 测试套件       | `pnpm test src/components/ProTable`         | 14 文件 / 95 测试 全部通过         |
| 死代码引用扫描          | `grep vxeProps / isVxeEngine / useVxeTable` | `src/components/ProTable` 内零引用 |

---

## 严重级别汇总

- **CRITICAL**：0 项
- **HIGH**：0 项
- **MEDIUM**：2 项
- **LOW**：2 项

---

## MEDIUM

### M1：旧实现计划文档仍包含已删除的 `vxeProps` 字段

- **文件**：`docs/superpowers/plans/2026-09-07-protable-impl.md:163`
- **现状**：该文档的 `ProColumn` 接口示例中仍声明 `vxeProps?: Record<string<unknown>>`，但 `src/components/ProTable/types/index.ts` 已在本次变更中删除该字段。
- **影响**：开发者若按此旧计划文档集成会写出无法通过类型检查的代码；文档与源码不一致。
- **建议**：在该字段处追加 `[已移除] v2.0 删除 vxeProps，统一使用 tableProps`，或在文档顶部标注“本文档已被 2026-09-08-protable-arch-refactor.md 取代”。

### M2：`useRowEdit` 自定义 `rowKey` 仅测试了成功路径，未覆盖异常分支

- **文件**：`src/components/ProTable/composables/useRowEdit.spec.ts:103-117`
- **现状**：新增用例验证了 `rowKey: 'uuid'` 时 `_save` 成功合并 draft，但未验证 `onSave` 抛错时 catch 分支也能按 `uuid` 字段定位到行并触发 `onSaveError`。
- **代码位置**：`src/components/ProTable/composables/useRowEdit.ts:71-75` 的 catch 分支同样使用 `options.rowKey ?? 'id'` 查找行。
- **建议**：补充一个用例：自定义 `rowKey` + `onSave` 抛错，断言 `onSaveError` 被调用且入参中的 `row` 正确。

---

## LOW

### L1：`useRowEdit._save` 中 `keyField` 计算重复

- **文件**：`src/components/ProTable/composables/useRowEdit.ts:60` 与 `:72`
- **现状**：`const keyField = options.rowKey ?? 'id'` 在 try 与 catch 中各出现一次。
- **建议**：在 `_save` 函数开头（进入 try 之前）统一计算一次，减少重复并降低后续维护时遗漏的风险。

### L2：Demo 属性文档未说明 `vxe-table` 回退行为

- **文件**：`src/modules/demo/examples/ProTable/ProTableOverview.vue:190-196`
- **现状**：`tableEngine` 属性描述仍为“值: 'element-plus' | 'vxe-table'；首次 mount 前设置，运行时修改需 reload”，未说明 v2.0 传入 `'vxe-table'` 会 warn 并回退 element-plus。
- **建议**：在 description 中追加“（v2.0 传入 'vxe-table' 会 console.warn 并回退 element-plus）”。

---

## 重点关注点结论

| 关注点                         | 结论                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 回退逻辑边界遗漏               | 无遗漏。`resolveEngine` 仅在 `prop === 'vxe-table'` 时 warn，undefined / 'element-plus' 均正常返回 element-plus。          |
| `useRowEdit` rowKey 注入完整性 | 完整。`useTableCapabilities.ts:86` 透传 `props.rowKey ?? 'id'`，`_save` 的 try/catch 两处均使用 `options.rowKey ?? 'id'`。 |
| 类型删除是否破坏引用           | 无破坏。`vxeProps` 在 `src/components/ProTable` 内零引用；barrel `index.ts` 未导出该字段；`useVxeTable` 无消费者。         |
| 测试断言有效性                 | 有效。集成测试正确断言 warn 文案与 ElTable 渲染；单元测试覆盖自定义 rowKey 成功路径。                                      |
| 注释/JSDoc 规范                | 总体符合。文件级、函数级、关键分支均有业务意图说明；`@see` / `@group` 保留。                                               |

---

## 总体结论

本次变更达到可合并基线：无 CRITICAL/HIGH 问题，类型检查、Lint、测试全部通过。建议在合并前处理 MEDIUM 项（尤其 M1 文档不一致、M2 测试缺口），LOW 项可后续排期优化。
