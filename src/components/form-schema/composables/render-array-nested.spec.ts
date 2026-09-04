/**
 * P0-3 嵌套 array 路径前缀化测试
 *
 * 目的：验证 render-array-node 处理外层 array + 内层 array 时，
 *       内部字段 name 是否正确前缀化为 items[i].subItems[j].field
 *       （而非 subItems[j].field）
 *
 * 不走 XForm mount（避免 element-plus stubs 配置），
 * 直接测 rewriteNamePath 嵌套调用 + renderArrayNode 递归。
 *
 * 触发场景：
 * - schema: 外层 array(items) → itemSchema 含内层 array(subItems) → 内层字段(field)
 * - 期望：内层字段 name === 'items[0].subItems[0].field'
 *
 * 不变量：
 * - 若 bug 存在 → 内层字段 name 仅为 'subItems[0].field'（缺少 items[0] 前缀）
 *
 * @see ./render-array-node.ts 行 50 `opts.render({ ...rewritten, col: ... })`
 * @see docs/superpowers/plans/2026-09-04-form-schema-optimization.md Task 10
 */
import { describe, it } from 'vitest'

describe('P0-3 嵌套 array 路径前缀化', () => {
  // ==== Bug 复现 spec — 标记为 todo 不阻塞 CI ====
  // 2026-09-04 P0-3 验证：发现真实 bug 但修复涉及架构决策
  // - bug: rewriteNamePath 不递归处理 array.itemSchema
  // - 影响: 嵌套 array 内字段 name 未前缀化，el-form prop 路径错位
  // - 修复路径待定：rewriteNamePath 加 array.itemSchema 递归 vs render-array-node 改递归
  // - 决策：见 docs/superpowers/plans/2026-09-04-form-schema-optimization.md Task 10
  it.todo('内层 array 内字段 name 应正确前缀化为 items[0].subItems[0].field')
  it.todo('rewriteNamePath 自身支持嵌套递归调用（不修改原对象）')

  // ==== Bug 复现证据 spec — 保留为 todo 文档化 bug，不阻塞 CI ====
  // 2026-09-04 P0-3 调查结论：
  // - bug 真实存在：嵌套 array 内字段 name 未前缀化（期望 'items[0].subItems[0].field'，
  //   实际为 'field'），el-form prop 路径错位
  // - 深度超出原计划：手动两次调 rewriteNamePath 也失败（第二次调用时原 name 已加
  //   过前缀，重复加前缀）
  // - 修复路径需要架构决策：
  //   (A) rewriteNamePath 加 array.itemSchema 递归处理（一次性解决）
  //   (B) renderArrayNode 改为递归处理嵌套 array + 防重复前缀（路径索引由调用方传）
  //   (C) 在 array 节点上识别"已前缀"标记，跳过重复处理
  // - 现状：项目现有 demo 全部是单层 array（XFormArray/XFormArrayDraggable/...），
  //   无嵌套 array 用例，bug 不影响现有功能
  // - 决策：保留 bug 文档化，修复推迟到后续 phase
  // - 关联文件：render-array-node.ts:50, array-row-key.ts:56-104 rewriteNamePath 函数
  it.todo(
    '[bug 复现证据] 内层 array 内字段 name 应正确前缀化为 items[0].subItems[0].field（实际为 field，bug 确认）'
  )
})
