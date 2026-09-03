/**
 * wrap-with-elcol —— 栅格响应式包装
 *
 * - wrapWithElCol：节点 col 响应式包装（含 ElCol 渲染）
 * - pickBreakpointConfig：当前断点配置挑选（移动优先 / 降级到基础）
 * - mergeColResponsive：响应式 col 拍平（移除 responsive 字段）
 * - mergeRowResponsive：响应式 row 拍平
 */
import { h, type VNode } from 'vue'
import { ElCol } from 'element-plus'
import type { ColConfig, RowConfig, SchemaNode } from '../types'

export function wrapWithElCol(
  node: SchemaNode,
  inner: VNode,
  currentBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): VNode {
  if (node.col === false) return inner
  if (node.col === undefined) return inner
  const colObj = typeof node.col === 'object' ? node.col : null
  const baseConfig = colObj?.responsive
    ? pickBreakpointConfig(colObj.responsive, currentBreakpoint)
    : null
  const span = baseConfig?.span ?? colObj?.span ?? 24
  const offset = baseConfig?.offset ?? colObj?.offset
  // 关键修复:使用 ElCol 而非 ElFormItem —— ElFormItem 在 el-form 内响应栅格,
  // 但 el-row 内的 gutter(padding-left/right)只对 ElCol 生效
  return h(
    ElCol as never,
    {
      span,
      offset,
      ...(colObj?.responsive ? { responsive: colObj.responsive } : {}),
    } as never,
    { default: () => inner }
  ) as VNode
}

export function pickBreakpointConfig(
  responsive: NonNullable<ColConfig['responsive']>,
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): { span?: number; offset?: number; push?: number; pull?: number } | undefined {
  const order: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl']
  const currentIdx = current ? order.indexOf(current) : -1
  for (let i = currentIdx; i >= 0; i--) {
    if (responsive[order[i]!]) return responsive[order[i]!]
  }
  for (const k of order) {
    if (responsive[k]) return responsive[k]
  }
  return undefined
}

export function mergeColResponsive(
  col: SchemaNode['col'],
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): SchemaNode['col'] {
  if (col === undefined || col === false) return col
  if (typeof col !== 'object') return col
  const responsive = col.responsive
  if (!responsive) return col
  const picked = pickBreakpointConfig(responsive, current)
  if (!picked) return col
  const merged: ColConfig = { ...col }
  if (picked.span !== undefined) merged.span = picked.span
  else if (merged.span === undefined) delete merged.span
  if (picked.offset !== undefined) merged.offset = picked.offset
  if (picked.push !== undefined) merged.push = picked.push
  if (picked.pull !== undefined) merged.pull = picked.pull
  delete (merged as { responsive?: unknown }).responsive
  return merged
}

/** row.responsive 拍平：与 mergeColResponsive 同逻辑，但 row 没有 span/offset/push/pull，gutter/type/align/justify 是可选覆盖 */
export function mergeRowResponsive(
  row: RowConfig | undefined,
  current?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): RowConfig | undefined {
  if (!row) return row
  const responsive = row.responsive
  if (!responsive) return row
  const picked = pickBreakpointConfig(responsive as never, current)
  if (!picked) return row
  const merged: RowConfig = { ...row, ...picked }
  delete (merged as { responsive?: unknown }).responsive
  return merged
}
