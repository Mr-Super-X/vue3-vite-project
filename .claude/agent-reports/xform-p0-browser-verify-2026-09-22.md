# XForm 5 P0 Demo 浏览器实测报告（2026-09-22）

> Playwright @ http://localhost:5174/vue3-vite-project/demo/*
> 验证 2026-09-02 13 项 XForm demo 批量修复中的 5 个 P0 修复真实生效

## 1. XFormBuilder

- **URL**: `/demo/xform-builder`
- **修复目标**: 7 字段全部用 builder 链式
- **实测**: 18 form-item（7 builder 字段 + 11 嵌套行内子字段）
- **关键 label**: 省/市(选省后自动重置市) / 头像上传 / 角色分配 / 时间范围 / 班次 / 主要编程语言 / 所属部门（树形多选）
- **model 预览**: `{ city, avatar, roles, timeRange, shift, language, dept }` —— 7 字段全部覆盖 ✓
- **结论**: ✅ P0 修复生效

## 2. XFormAsyncOptionsError

- **URL**: `/demo/xform-async-options-error`
- **修复目标**: 删除「把 immediate:false 限制当 demo 逻辑」+ 新增 el-collapse 限制说明
- **实测**: el-collapse 1 项「⚠️ 关于 immediate: false 的引擎限制」+ 2 form-item + 0 alert
- **结论**: ✅ P0 修复生效（误导 alert 卡已删，限制说明搬到 el-collapse）

## 3. XFormLargeSchema

- **URL**: `/demo/xform-large-schema`
- **修复目标**: 30/120/300 三档对比 + perf-panel + 性能基准对照表
- **实测**: perf-panel class 存在 + 2 table（对照表 + 大表单）
- **结论**: ✅ P0 修复生效

## 4. XFormSchemaIndex

- **URL**: `/demo/xform-schema-index`
- **修复目标**: 4 类业务问题入口卡片 + 6 Map 解释
- **实测**: 22 cards（4 业务入口 + 6 Map + 子 demo 列表）
- **结论**: ✅ P0 修复生效

## 5. XFormServerError

- **URL**: `/demo/xform-server-error`
- **修复目标**: 移除响应式断点（已迁移到 XFormResponsive）+ 错误码一致
- **实测**:
  - 3 form-item
  - 「响应式/断点」文本：4 处（全部是对 XFormResponsive demo 的引用：侧栏导航 2 处 + 「对比 demos:响应式断点见 XFormResponsive」提示 + 注释中「桌面 6/6/12 等宽布局 —— 响应式断点见 XFormResponsive demo」）
  - 无 demo 内部响应式断点内容残留
- **结论**: ✅ P0 修复生效

## 验证基线（同步检查）

- `pnpm type-check` ✅
- `pnpm lint` ✅
- `pnpm check:routes` ✅（61 demo 共享 DemoXFormOverview 单一外层路由，Demo 前缀已豁免）

## 遗留（不阻塞）

- cSpell 警告：项目级词典问题（已记录于 memory `xform-demo-audit-progress`）
- Cascader placeholder 业务化未完全覆盖
- 13 项 demo 修复源码未提交到 git（用户选择先写 CHANGELOG 备忘录）
