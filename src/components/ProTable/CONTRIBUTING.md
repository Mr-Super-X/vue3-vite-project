# ProTable 维护指南

## 新增 composable

1. 在 `composables/` 下新建 `<name>.ts`
2. 必须带 `<name>.spec.ts`（覆盖率 ≥ 80%，CLAUDE.md §4 #11）
3. 单文件 ≤ 80 行（CLAUDE.md §四 Hook 约束）
4. 顶部 JSDoc 4 层结构（CLAUDE.md §五）
5. 不常见 API 加 1 行来源注释（§1.6.1）

## 新增 .vue 组件

1. BEM 规范：`createNamespace('kebab-case')` + `bem.b/e/m/is` + `<style lang="scss">` 无 scoped
2. 根选择器：`.#{$BEM_PREFIX}-组件名-kebab-case`
3. ≤ 200 行（展示组件）/ ≤ 300 行（业务组件）

## 新增 props

1. 先更新 `types/index.ts` 加 JSDoc
2. spec 必须先更新（CLAUDE.md §七「文档同步」）

## 提交规范

- 中文 commit msg（CLAUDE.md §七）
- `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`
- subject 小写开头（commitlint 规则）

## 已知限制

- vxe-table 引擎 v2.0 未实现：传入 `table-engine="vxe-table"` 时 warn 并回退 element-plus（v2.1 计划交付，届时在 `adapters/engine.ts` 解除回退）

## v2.1 接入 vxe-table 清单

被删除的骨架代码可从 git 历史恢复：`git checkout aaedabf -- src/components/ProTable/composables/useVxeTable.ts src/components/ProTable/composables/useVxeTable.spec.ts`（aaedabf 为骨架首次提交，含 dynamic import + 模块缓存 + spec）。接入步骤：

1. **恢复加载层**：`useVxeTable.ts` 骨架放回 `composables/`，`package.json` 的 `vxe-table ^4.21.7` 依赖已预留
2. **解除回退**：`adapters/engine.ts` 删除 `resolveEngine` 的 vxe 回退分支，`ProTableExpose.element` 注释同步
3. **类型恢复**：`types/index.ts` 恢复 `ProColumn.vxeProps`（透传 VxeColumn props）
4. **渲染分支**：`ProTable.vue` 模板按 `engineRef` 加 vxe-table 分支（vxe 组件按需注册，勿全局引入污染首屏）
5. **列映射层**：新增 `ProColumn → VxeColumn` 映射（prop/width/fixed/sortable/enum/render/headerRender 对齐）
6. **事件桥接**：`cell-dblclick` / `expand-change` / `selection-change` 等事件映射到既有 handler（行编辑/树形/多选依赖）
7. **能力矩阵对齐**：4 类 v2 能力（编辑/树形/合并/拖拽）逐项验证 vxe 支持度，不支持的在 `validateCapabilities` 加 warn（树形 vxe 已知不支持）
8. **测试补齐**：useVxeTable spec 恢复 + 集成测试补引擎切换用例 + demo 加引擎对比页
