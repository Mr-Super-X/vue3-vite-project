<script setup lang="ts">
/**
 * VxeTableBody —— vxe-table 引擎渲染分支（v2.1 P3）
 *
 * 展示层角色：与 ElementTableBody 同级的第二引擎分支。onMounted 时经 useVxeTable
 * 动态加载 vxe-table（JS + CSS + app 安装，详见 composables/useVxeTable），加载完成
 * 后解析 VxeTable / VxeColumn 组件对象渲染；加载失败 emit engine-fallback
 * （编排层切回 element-plus，spec §九 #7 失败兜底）。
 *
 * 能力差异（v2.1 决策 5）：行编辑 / 单元格合并支持（cell-dblclick / span-method
 * 协议与 el-table 单参数对象签名兼容）；树形 / 行拖拽不支持，由编排层
 * useTableCapabilities 启动校验 warn（本组件不接收 treeData）。
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方
 * @see [`../composables/useVxeTable`](../composables/useVxeTable.ts) 动态加载与安装
 * @see [`../adapters/vxe-column`](../adapters/vxe-column.ts) ProColumn → VxeColumn 映射
 * @group ProTable 组件
 */
import { onMounted, shallowRef, ref } from 'vue' // vue 生命周期/底层 API（CLAUDE.md §1.6.1）
import { ElSkeleton } from 'element-plus' // element-plus 按需注入（unplugin-vue-components 只管模板，script 中显式 import）
import type { ProColumn, SortChangeEvent } from '../types'
import type { useRowEdit } from '../composables/useRowEdit'
import type { useCellSpan } from '../composables/useCellSpan'
import { useVxeTable } from '../composables/useVxeTable'
import { toVxeColumnProps, hasCustomSort } from '../adapters/vxe-column'
import { resolveCellContent } from '../adapters/cell-render'
import EditCell from './EditCell.vue'
import CellContent from './CellContent.vue'

const props = defineProps<{
  /** 渲染行 */
  rows: Record<string, unknown>[]
  /** 可见列（列设置抽屉排序后的结果） */
  columns: ProColumn[]
  /** 行 key 字段名（缺省 'id'，映射 vxe row-config.keyField）；显式联合 undefined —— exactOptionalPropertyTypes 兼容 */
  rowKey?: string | undefined
  /** 行编辑能力实例（未启用为 null） */
  rowEdit: ReturnType<typeof useRowEdit> | null
  /** 单元格合并能力实例（未启用为 null，span-method 不绑定） */
  cellSpan: ReturnType<typeof useCellSpan> | null
}>()

const emit = defineEmits<{
  /** 多选变化（合并 checkbox-change / checkbox-all 后的事件行集合） */
  (e: 'selection-change', rows: Record<string, unknown>[]): void
  /** 双击单元格（已解析 rowKey；编排层转发给 rowEdit._start） */
  (e: 'cell-dblclick', rowKey: string | number): void
  /** 排序变化（已适配为内部 SortChangeEvent；编排层判定 sortable==='custom' 后走 M2 服务端排序） */
  (e: 'sort-change', evt: SortChangeEvent): void
  /** 引擎加载失败 —— 编排层切回 element-plus */
  (e: 'engine-fallback'): void
}>()

/** vxe-table 引擎加载状态（true = 加载中 / 未加载，渲染骨架屏） */
const engineLoading = ref(true)
/** 解析出的 vxe 组件对象（shallowRef：组件定义无深层响应式需求） */
const vxeTableComp = shallowRef<unknown>(null)
const vxeColumnComp = shallowRef<unknown>(null)

const { loadVxeTable } = useVxeTable()

onMounted(async () => {
  try {
    const mod = await loadVxeTable()
    // 具名导出取组件对象（vxe-table v4：export { VxeTable, VxeColumn }），
    // 动态 <component :is> 渲染，避免依赖全局注册时序
    const named = mod as unknown as Record<string, unknown>
    vxeTableComp.value = named.VxeTable ?? null
    vxeColumnComp.value = named.VxeColumn ?? null
  } catch (err) {
    // 加载失败兜底（spec §九 #7）：表格是页面主内容，引擎故障不应白屏
    console.warn('[ProTable] vxe-table 引擎加载失败，已回退 element-plus:', err)
    emit('engine-fallback')
  } finally {
    engineLoading.value = false
  }
})

/** 统一取行 rowKey（props.rowKey 字段，默认 'id'） */
function rowKeyOf(row: unknown): string | number {
  return (row as Record<string, unknown>)[props.rowKey ?? 'id'] as string | number
}

/** vxe 多选无合并的 selection-change，需自行维护选区 */
const selectedRows = ref<Record<string, unknown>[]>([])

/** 单选 toggle */
function handleCheckboxChange(payload: { row: Record<string, unknown>; checked: boolean }): void {
  selectedRows.value = payload.checked
    ? [...selectedRows.value, payload.row]
    : selectedRows.value.filter((r) => r !== payload.row)
  emit('selection-change', selectedRows.value)
}

/** 全选 toggle：checked 时并入受影响行，取消时移除（payload.rows 缺省退化全部可见行） */
function handleCheckboxAll(payload: { checked: boolean; rows?: Record<string, unknown>[] }): void {
  const affected = payload.rows ?? props.rows
  const rest = selectedRows.value.filter((r) => !affected.includes(r))
  selectedRows.value = payload.checked ? [...rest, ...affected] : rest
  emit('selection-change', selectedRows.value)
}

/** vxe sort-change 负载 { field, order: 'asc'|'desc'|null } → 内部 SortChangeEvent */
function handleSortChange(payload: { field?: string; order?: 'asc' | 'desc' | null }): void {
  emit('sort-change', {
    prop: payload.field ?? null,
    order: payload.order === 'asc' ? 'ascending' : payload.order === 'desc' ? 'descending' : null,
  })
}

/** 双击单元格 → 行编辑进入 */
function handleCellDblclick(payload: { row: Record<string, unknown> }): void {
  emit('cell-dblclick', rowKeyOf(payload.row))
}
</script>

<template>
  <ElSkeleton v-if="engineLoading" :rows="5" animated />
  <component
    :is="vxeTableComp"
    v-else-if="vxeTableComp"
    :data="rows"
    :row-config="{ keyField: rowKey ?? 'id' }"
    :sort-config="hasCustomSort(columns) ? { remote: true } : undefined"
    v-bind="{
      ...(cellSpan
        ? { spanMethod: cellSpan.spanMethod, cellClassName: cellSpan.cellClassName }
        : {}),
    }"
    @sort-change="handleSortChange"
    @checkbox-change="handleCheckboxChange"
    @checkbox-all="handleCheckboxAll"
    @cell-dblclick="handleCellDblclick"
  >
    <component
      :is="vxeColumnComp"
      v-for="col in columns"
      :key="col.prop"
      v-bind="toVxeColumnProps(col)"
    >
      <!-- 自定义表头渲染（col.headerRender） -->
      <template v-if="col.headerRender" #header="scope">
        <component :is="col.headerRender({ column: col, $index: scope.$columnIndex ?? 0 })" />
      </template>
      <template #default="scope">
        <slot :name="col.prop" :row="scope.row" :column="col" :index="scope.rowIndex ?? 0">
          <!-- 行编辑控件（编辑态 + 含 edit 配置）；树形分支 vxe 引擎不支持，无对应模板 -->
          <EditCell
            v-if="rowEdit?.isEditing(rowKeyOf(scope.row)) && col.edit"
            :row-key="rowKeyOf(scope.row)"
            :col="col"
            :value="rowEdit.getValue(rowKeyOf(scope.row), col.prop)"
            @update="(prop, v) => rowEdit?.setValue(rowKeyOf(scope.row), prop, v)"
          />
          <!-- 默认渲染（与 ElementTableBody 共用 cell-render 适配层） -->
          <CellContent v-else :content="resolveCellContent(col, scope.row, scope.rowIndex ?? 0)" />
        </slot>
      </template>
    </component>
  </component>
</template>
