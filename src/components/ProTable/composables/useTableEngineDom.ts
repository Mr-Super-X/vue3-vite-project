/**
 * useTableEngineDom —— 表格引擎 DOM 访问层 composable（v3.0 新增）
 *
 * 项目角色：把 ProTable.vue setup 阶段的"模板 ref → tbody DOM"内联查询收敛到独立 composable。
 * 当前消费方是 useRowDrag（v2.0 行拖拽需要 .el-table__body tbody DOM 挂载点）。
 *
 * 设计动机：
 * - 原 ProTable.vue 内联 getTbody 函数（~5 行）违反 CLAUDE.md §一 #11 Hook 拆分
 * - 单测无法独立验证 DOM 查询逻辑
 * - 多能力层（drag / virtual scroll）都可能需要 DOM 访问 → 集中点
 *
 * @see [`./useRowDrag`](./useRowDrag.ts) 消费方
 * @see [`./useVirtualScroll`](./useVirtualScroll.ts) 同形态消费者（v3.0 新增）
 * @group ProTable composables
 */
import { type ComponentPublicInstance, type Ref } from 'vue'

export interface UseTableEngineDomOptions {
  /** ProTable 模板 ref（ElementTableBody / VxeTableBody 实例） */
  proTableEl: Ref<{
    $el?: HTMLElement
    elTable?: ComponentPublicInstance | null
  } | null>
}

export interface UseTableEngineDomReturn {
  /** 获取当前引擎的 tbody DOM（行拖拽 / 虚拟滚动挂载点） */
  getTbody: () => HTMLElement | null
}

/**
 * v3.0 M5 抽取：从 ProTable.vue setup 内联查询改为 composable，
 * 便于单测覆盖和未来多能力层复用（v3.0 虚拟滚动等）
 */
export function useTableEngineDom(options: UseTableEngineDomOptions): UseTableEngineDomReturn {
  function getTbody(): HTMLElement | null {
    const root = options.proTableEl.value?.$el
    if (!root || typeof root.querySelector !== 'function') return null
    // 硬编码选择器：v2.1 决策 5 明确 vxe-table 引擎不支持行拖拽（DOM 结构不同），
    // 此处仅服务 element-plus 引擎；vxe 分支由 capabilities 层 warn 跳过
    return root.querySelector('.el-table__body tbody') as HTMLElement | null
  }
  return { getTbody }
}
