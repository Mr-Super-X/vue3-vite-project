/**
 * engine 适配器（spec 决策 4：首次挂载锁定）
 *
 * 职责：把 ProTableProps.tableEngine 在 setup 阶段一次性解析成 Ref，
 * 后续 prop 修改无效（JSDoc 明确约束）。
 *
 * @see [`../composables/useTable`](../composables/useTable.ts) 消费方
 * @group ProTable adapters
 */
import { ref, type Ref } from 'vue'
import type { TableEngine } from '../types'

/**
 * 解析 tableEngine prop → Ref（setup 一次性捕获）
 *
 * @param prop 组件 prop（可能未传，缺省 'element-plus'）
 * @returns Ref<TableEngine>，整个组件生命周期内不变
 */
export function resolveEngine(prop: TableEngine | undefined): Ref<TableEngine> {
  // markRaw 防止 Vue 把 Ref 包成 reactive（CLAUDE.md §1.6.1 不常见 API 来源注释）
  // 注：当前实现用 ref 而非 markRaw，因为 setup 阶段不重复解包
  return ref<TableEngine>(prop ?? 'element-plus')
}

/**
 * 检查引擎是否是 vxe-table（用于 dynamic import 判断点）
 *
 * @param engine 当前引擎
 * @returns boolean
 */
export function isVxeEngine(engine: TableEngine): boolean {
  return engine === 'vxe-table'
}
