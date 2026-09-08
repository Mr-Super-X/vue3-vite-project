/**
 * ProColumn → VxeColumn 列映射适配层（v2.1 P2）
 *
 * 角色：把 element-plus 心智的 ProColumn 翻译为 vxe-table v4 列 props。
 * 两引擎列 API 差异：prop→field / label→title / selection→checkbox / index→seq；
 * 服务端排序（sortable='custom'）映射为列 sortable + 表级 remote sort-config
 * （VxeTableBody 用 {@link hasCustomSort} 决定是否开启 remote）。
 *
 * @see [`../../ProTable.vue`](../../ProTable.vue) 编排层 —— VxeTableBody 的调用方
 * @group ProTable adapters
 */
import type { ProColumn } from '../types'

/**
 * 翻译 ProColumn 为 VxeColumn props
 *
 * 合并策略：vxeProps 为「补充」不覆盖派生值 —— ProColumn 显式声明的语义
 * （field/title/type/sortable/width/minWidth/fixed）优先，vxeProps 仅填充
 * 派生未覆盖的透传项（如 showOverflow/resizable 等 vxe 专有配置）。
 *
 * @param col ProTable 列定义（泛型 T 缺省 Record，与 ProColumn 默认一致）
 * @returns VxeColumn props 对象（Record 收口：vxe 类型链依赖未安装的 vxe-pc-ui，不做精确类型）
 */
export function toVxeColumnProps<T extends object = Record<string, unknown>>(
  col: ProColumn<T>
): Record<string, unknown> {
  const derived: Record<string, unknown> = {
    field: col.prop,
    title: col.label,
  }
  // 特殊列类型翻译（operation 是普通业务列，无 vxe 特殊类型对应）
  if (col.type === 'selection') derived.type = 'checkbox'
  else if (col.type === 'index') derived.type = 'seq'
  else if (col.type === 'expand') derived.type = 'expand'
  // sortable：true（客户端）与 'custom'（服务端）在 vxe 列级同为 true，
  // 服务端语义由表级 sort-config.remote 表达（hasCustomSort 判定）
  if (col.sortable !== undefined) derived.sortable = true
  if (col.width !== undefined) derived.width = col.width
  if (col.minWidth !== undefined) derived.minWidth = col.minWidth
  if (col.fixed !== undefined) derived.fixed = col.fixed
  // 先铺 vxeProps 再覆盖派生值：实现「补充不覆盖」策略（undefined 派生键已被上面的守卫跳过）
  return { ...(col.vxeProps ?? {}), ...definedEntries(derived) }
}

/**
 * 是否存在服务端排序列 —— VxeTableBody 据此决定是否给 VxeTable 开 `sort-config.remote`
 *
 * @param columns 全部可见列
 * @returns 任一列 sortable === 'custom' 时 true
 */
export function hasCustomSort(columns: ProColumn[]): boolean {
  return columns.some((c) => c.sortable === 'custom')
}

/** 剔除 undefined 值后返回新对象（exactOptionalPropertyTypes 兼容，与 ProTable.vue filterUndefined 同语义） */
function definedEntries(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}
