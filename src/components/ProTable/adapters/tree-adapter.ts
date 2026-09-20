/**
 * 树形数据引擎适配层（v3.5 PR1-B）
 *
 * 背景：v2.0 树形能力只对 element-plus 引擎生效（ProTable.vue 显式排除 vxe-table 引擎，
 * VxeTableBody 不接收 treeData prop）。v3.5 PR1-B 让 vxe 引擎也支持树形 + 行拖拽，
 * 两条引擎管线要在「同一个 useTreeData 状态」上呈现差异化的树行为（el-table 用
 * treeProps + 自定义 toggle 按钮，vxe-table 用 tree-config + 内置 setTreeExpand API）。
 *
 * 抽 TreeAdapter 接口把引擎差异收敛到一处：
 * - getTreeConfig：返回该引擎需要的表级配置（el: treeProps；vxe: treeConfig）
 * - onExpand / onCollapse：通知引擎把指定行标记为展开/收起（vxe 调 setTreeExpand；el noop）
 * - hasChildren：行是否含子节点（vxe tree-config.hasChildren 字段需要按原始行判定）
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

/**
 * vxe-table 引擎树适配器工厂（v3.5 PR1-B Task 2）—— 接收 vxe-table 实例 ref，
 * 通过 vxe-table 的 setTreeExpand API 同步展开状态。
 *
 * 设计要点：
 * - vxe-table 在 :tree-config 启用后会维护自身展开 Map；必须在 useTreeData 状态变化时
 *   调用 setTreeExpand(row, expanded) 否则 UI 与 useTreeData 状态不一致
 * - getTreeConfig 返回 vxe-table v4 的 tree-config 协议（children/hasChildren 字段约定
 *   同 el 占位符，避免双引擎渲染数据不同形）
 * - 适配器只关心引擎胶水：normalize/flatData/expanded Set 仍归 useTreeData
 *
 * @param getVxeTable 获取当前 vxe-table 实例的访问器（动态组件实例在 onMounted 后才有值）
 * @group ProTable adapters
 */
export function createVxeTreeAdapter(
  getVxeTable: () => {
    setTreeExpand?: (row: Record<string, unknown>, expanded: boolean) => void
  } | null
): TreeAdapter {
  return {
    getTreeConfig(): Record<string, unknown> {
      // vxe-table v4 tree-config 协议：children/hasChildren 字段约定与 el 同款占位符
      // （useTreeData 已经把 children 字段重定向到 __pro_table_flat__ 让两引擎都不重复渲染）
      return {
        treeConfig: {
          children: TREE_PLACEHOLDER,
          hasChildren: TREE_PLACEHOLDER,
          expandAll: false,
          accordion: false,
          trigger: 'cell', // vxe-table v4 默认 'default'（图标点击），改 'cell' 与 el-table 单元格点击一致
        },
      }
    },
    onExpand(rowKey, row): void {
      const vxe = getVxeTable()
      // vxe-table 的 setTreeExpand 接收行对象而非 key；row 可能为 undefined（useTreeData
      // 触发 onExpand 时未传 row 上下文），此时按 rowKey 退化 noop——下一次 normalize 会全量回灌
      if (vxe?.setTreeExpand && row) vxe.setTreeExpand(row, true)
    },
    onCollapse(rowKey, row): void {
      const vxe = getVxeTable()
      if (vxe?.setTreeExpand && row) vxe.setTreeExpand(row, false)
    },
    getExpandedKeys(): Array<string | number> {
      // vxe-table 内部维护展开 Map；外部调用方在 vxe 引擎下应读 useTreeData.expandedKeys
      // 本适配器不重复维护，避免双源真相——返回空数组即告知「去 useTreeData 拿」
      return []
    },
    syncExpanded(keys, rowsByKey): void {
      const vxe = getVxeTable()
      if (!vxe?.setTreeExpand) return
      for (const k of keys) {
        const row = rowsByKey.get(k)
        if (row) vxe.setTreeExpand(row, true)
      }
    },
    hasChildren(row: Record<string, unknown>): boolean {
      // vxe-table 平铺渲染（与 el 同源 useTreeData.normalize 输出）：有 _hasChildren 即为有子节点
      return Boolean(row['_hasChildren'])
    },
  }
}
