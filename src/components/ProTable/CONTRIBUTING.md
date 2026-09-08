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

- vxe-table 引擎（v2.1 已交付）暂不支持树形数据 / 行拖拽排序：启用时启动校验 `console.warn` 并忽略该能力
- vxe-table 引擎加载失败（如 chunk 加载异常）自动回退 element-plus 并 `console.warn`（`VxeTableBody` engine-fallback）
