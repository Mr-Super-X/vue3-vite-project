/**
 * 树形数据引擎适配层（v3.5 PR1-B Task 1）
 *
 * 背景：v2.0 树形能力只对 element-plus 引擎生效（ProTable.vue 显式排除 vxe-table 引擎，
 * VxeTableBody 不接收 treeData prop）。v3.5 PR1-B 让 vxe 引擎也支持树形 + 行拖拽，
 * 两条引擎管线要在「同一个 useTreeData 状态」上呈现差异化的树行为（el-table 用
 * treeProps + 自定义 toggle 按钮，vxe-table 用 tree-config + 内置 setTreeExpand API）。
 *
 * 本文件（Task 1）抽 TreeAdapter 接口并实现 element-plus 引擎适配器。
 * vxe-table 引擎适配器见 Task 2 追加。
 *
 * 抽 TreeAdapter 接口把引擎差异收敛到一处：
 * - getTreeConfig：返回该引擎需要的表级配置（el: treeProps）
 * - onExpand / onCollapse：通知引擎把指定行标记为展开/收起（vxe 用；el noop）
 * - hasChildren：行是否含子节点
 * - getExpandedKeys / syncExpanded：增量 / 全量同步展开状态到引擎
 *
 * 约束：
 * - 适配器不持有 normalize/flatData 等核心状态——那是 useTreeData 的职责
 * - 适配器只描述「引擎如何在自身 UI 上反映树的展开/折叠」——纯引擎胶水
 *
 * @see [`../../composables/useTreeData`](../../composables/useTreeData.ts) —— 状态核心
 * @group ProTable adapters
 */

/**
 * 树形数据引擎适配器接口 —— 把「展开/收起」映射到引擎原生 API
 * @group ProTable adapters
 */
export interface TreeAdapter {
  /** 引擎表级配置（el: { treeProps }；vxe: { treeConfig }） */
  getTreeConfig(): Record<string, unknown>
  /** 通知引擎展开指定行（vxe 调 setTreeExpand；el noop） */
  onExpand(rowKey: string | number, row?: Record<string, unknown>): void
  /** 通知引擎收起指定行（vxe 调 setTreeExpand；el noop） */
  onCollapse(rowKey: string | number, row?: Record<string, unknown>): void
  /** 当前引擎侧已展开 keys（vxe 通过内部 Map 跟踪；el 返回空数组由 useTreeData 自身 Set 主导） */
  getExpandedKeys(): Array<string | number>
  /** 全量同步展开状态到引擎（vxe reset / 初次挂载时调用，el noop） */
  syncExpanded(
    keys: Array<string | number>,
    rowsByKey: Map<string | number, Record<string, unknown>>
  ): void
  /** 检测行是否含子节点（vxe tree-config.hasChildren 字段约定） */
  hasChildren(row: Record<string, unknown>): boolean
  /** 检测行是否处于加载中（vxe 行 + loading 图标联动；el noop） */
  isLoading?(rowKey: string | number): boolean
}

/**
 * 树字段占位常量 —— 指向不存在的字段避免 el-table 默认 tree-props 重复渲染（v2.2 修复）。
 * el-table 与 vxe-table 共用同一占位符：业务 rows 是「平铺 data + children 字段」，
 * 我们用 flatData 平铺 + 占位符让两引擎都按纯平铺渲染。
 */
const TREE_PLACEHOLDER = '__pro_table_flat__'

/**
 * element-plus 引擎树适配器 —— el-table 用 treeProps + flatData 重算驱动视图，
 * 引擎侧无独立展开状态，onExpand/onCollapse/syncExpanded 全部 noop。
 *
 * @group ProTable adapters
 */
export function createElementPlusTreeAdapter(): TreeAdapter {
  return {
    getTreeConfig(): Record<string, unknown> {
      // el-table 接收 treeProps 字段；指向不存在的 __pro_table_flat__ 防止
      // el-table 识别真实 children 字段把平铺行重复渲染成嵌套（v2.2 fix）
      return { treeProps: { children: TREE_PLACEHOLDER, hasChildren: TREE_PLACEHOLDER } }
    },
    onExpand(): void {
      /* el-table 不需要主动通知：flatData 重算 + :data 引用变化自动重渲染 */
    },
    onCollapse(): void {
      /* 同上：el-table 跟着 flatData 重算 */
    },
    getExpandedKeys(): Array<string | number> {
      // el-table 不维护引擎侧展开状态：返回空数组由 useTreeData 内部 Set 主导
      return []
    },
    syncExpanded(): void {
      /* el-table 无引擎侧状态需要同步 */
    },
    hasChildren(row: Record<string, unknown>): boolean {
      // el-table 平铺渲染：有 _hasChildren 标记即为有子节点（_hasChildren 由 useTreeData.normalize 注入）
      return Boolean(row['_hasChildren'])
    },
  }
}
