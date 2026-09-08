/**
 * engine 适配器（spec 决策 4：首次挂载锁定）
 *
 * 职责：把 ProTableProps.tableEngine 在 setup 阶段一次性解析成 Ref，
 * 后续 prop 修改无效（JSDoc 明确约束）。
 *
 * vxe-table 引擎 v2.0 未实现：传入时 console.warn 并回退 element-plus
 * （v2.1 计划交付，届时在 resolveEngine 内解除回退）。
 *
 * @see [`../composables/useTable`](../composables/useTable.ts) 消费方
 * @group ProTable adapters
 */
import { ref, type Ref } from 'vue'
import type { TableEngine } from '../types'

/**
 * 解析 tableEngine prop → Ref（setup 一次性捕获）
 *
 * v2.0 行为：'vxe-table' 暂未实现，warn 后回退 'element-plus'（避免静默渲染错误引擎）。
 *
 * @param prop 组件 prop（可能未传，缺省 'element-plus'）
 * @returns Ref<TableEngine>，整个组件生命周期内不变
 */
export function resolveEngine(prop: TableEngine | undefined): Ref<TableEngine> {
  if (prop === 'vxe-table') {
    // 回退而非抛错：表格是页面主内容，引擎未实现不应导致页面白屏
    console.warn('[ProTable] vxe-table 引擎暂未实现，已回退 element-plus（v2.1 计划支持）')
    return ref<TableEngine>('element-plus')
  }
  return ref<TableEngine>(prop ?? 'element-plus')
}
