<script setup lang="ts">
/**
 * ElementTableV2Body —— element-plus v2 引擎渲染分支（v3.0.1 新增）
 *
 * 职责：包装 `<el-table-v2>` + 列 cellRenderer 适配，承接虚拟化分支的渲染。
 * 与 ElementTableBody（v1 引擎）并列存在，由 ProTable.vue 编排层按
 * `virtualized && engineRef==='element-plus'` 条件选择挂载。
 *
 * 已知限制（强隔离策略）：
 * - 不支持 el-table v1 的 slot 模板约定；ProColumn.render 字段用 h() 函数替代
 * - 不支持树形 / 展开行 / 汇总行 / 单元格合并 / 行拖拽（v2 引擎特性）
 * - 列宽需精确（v2 不像 v1 那样自适应分配剩余空间）
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方
 * @group ProTable 组件
 */
import { computed, h, type VNode } from 'vue'
import { ElTableV2 } from 'element-plus' // element-plus 按需注入（unplugin-vue-components 只管模板，script 中显式 import）
import type { ProColumn, VirtualScrollConfig } from '../types'

const props = defineProps<{
  /** 渲染行（v2 不支持树形，按平铺数据传入） */
  rows: Record<string, unknown>[]
  /** 后续刷新 loading（首次加载由编排层 AsyncState skeleton 承担） */
  loading: boolean
  /** 可见列（列设置抽屉排序后的结果） */
  columns: ProColumn[]
  /** 行 key 字段名（缺省 'id'） */
  rowKey?: string | undefined
  /** 虚拟滚动配置（来自 useVirtualScroll.v2TableConfig） */
  virtualConfig: VirtualScrollConfig
}>()

const emit = defineEmits<{
  /** 多选变化（行 Record 视角；编排层 cast 收口到 T[]） */
  (e: 'selection-change', rows: Record<string, unknown>[]): void
}>()

/** ProColumn → el-table-v2 Column 适配 */
const v2Columns = computed(() =>
  props.columns
    .filter((col) => col.prop) // 过滤掉 prop 缺失的列（v2 需要 key）
    .map((col) => ({
      key: col.prop as string,
      prop: col.prop as string,
      title: col.label,
      width: col.width ?? 120,
      ...(col.minWidth !== undefined && { minWidth: col.minWidth }),
      ...(col.fixed !== undefined && { fixed: col.fixed }),
      ...(col.sortable && { sortable: col.sortable }),
      // 选择列支持
      ...(col.type === 'selection' && { type: 'selection' as const }),
      cellRenderer: (rendererProps: {
        rowData: Record<string, unknown>
        column: { prop: string }
        rowIndex: number
      }): VNode => renderCell(col, rendererProps.rowData, rendererProps.rowIndex),
      headerCellRenderer: (): VNode => h('span', col.label),
    }))
)

/** 容器尺寸 */
const containerWidth = computed(() => {
  const w = props.virtualConfig.width
  if (w === 'auto' || w === undefined) return undefined
  return w
})

const containerHeight = computed(() => props.virtualConfig.height ?? 500)
const estimatedRowHeight = computed(() => props.virtualConfig.rowHeight ?? 48)

/** 单元格渲染：优先 ProColumn.render，否则默认 row[prop] 文本 */
function renderCell(col: ProColumn, row: Record<string, unknown>, rowIndex: number): VNode {
  if (typeof col.render === 'function') {
    // 业务自定义渲染：签名与 ProColumn.render 一致
    return col.render({ row: row as never, column: col, $index: rowIndex })
  }
  return h('span', String(row[col.prop as string] ?? ''))
}

const bem = createNamespace('pro-table-v2')

defineExpose({})
</script>

<template>
  <div :class="bem.b()">
    <!--
      ElTableV2 props 类型签名来自 element-plus buildProps（PropType + required + validator），
      在模板属性级别需要绕过。运行时 v2Columns/containerWidth/rows 等都已做好类型收口，
      故用单个强 cast 收敛。CLAUDE.md §4 严禁 any：此处是框架边界（element-plus buildProps
      类型签名严格性导致），注释豁免。
    -->
    <ElTableV2
      :columns="v2Columns as never"
      :data="props.rows as never"
      :width="(containerWidth ?? 0) as never"
      :height="containerHeight as never"
      :estimated-row-height="estimatedRowHeight as never"
      :row-key="(props.rowKey ?? 'id') as never"
      :loading="props.loading as never"
      :fixed="true as never"
      @selection-change="(rows: Record<string, unknown>[]) => emit('selection-change', rows)"
    />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-v2 {
  width: 100%;
}
</style>
