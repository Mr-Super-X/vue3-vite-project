<script setup lang="ts">
/**
 * ElementTableBody —— element-plus 引擎渲染分支（v2.1 P1 自 ProTable.vue 抽取）
 *
 * 展示层角色：承接 ElTable + ElTableColumn 列循环模板（含行编辑 / 树形 / 单元格合并 /
 * 拖拽手柄四个能力分支）。能力实例由编排层（ProTable.vue）以 props 注入，本组件仅做
 * 读取与事件转发，不直接持有 composables（保持展示组件纯粹，v2 设计 §3.3）。
 *
 * 抽取动机：ProTable.vue 超 300 行业务组件上限；且 vxe-table 分支（VxeTableBody）
 * 需要同级的渲染分支插槽位（v2.1 决策 1）。
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方
 * @see [`../adapters/cell-render`](../adapters/cell-render.ts) resolveCellContent 共用渲染逻辑
 * @group ProTable 组件
 */
import { ElTable, ElTableColumn } from 'element-plus' // element-plus 按需注入（unplugin-vue-components 只管模板，script 中显式 import）
import type { ComponentPublicInstance } from 'vue' // 类型导入（TS 编译器需要，不参与运行时）
import type { ProColumn, SortChangeEvent } from '../types'
import type { useRowEdit } from '../composables/useRowEdit'
import type { useTreeData } from '../composables/useTreeData'
import type { useCellSpan } from '../composables/useCellSpan'
import { resolveCellContent } from '../adapters/cell-render'
import EditCell from './EditCell.vue'
import CellContent from './CellContent.vue'

const props = defineProps<{
  /** 渲染行（树形模式为扁平化后的 flatData） */
  rows: Record<string, unknown>[]
  /** 可见列（列设置抽屉排序后的结果） */
  columns: ProColumn[]
  /** 行 key 字段名（缺省 'id'）；显式联合 undefined —— exactOptionalPropertyTypes 下模板绑定可能传 undefined */
  rowKey?: string | undefined
  /** 行编辑能力实例（未启用为 null，v-else-if 分支跳过） */
  rowEdit: ReturnType<typeof useRowEdit> | null
  /** 树形能力实例（未启用为 null，树形缩进分支跳过） */
  treeData: ReturnType<typeof useTreeData> | null
  /** 单元格合并能力实例（未启用为 null，spanMethod 不绑定） */
  cellSpan: ReturnType<typeof useCellSpan> | null
}>()

const bem = createNamespace('pro-table') // kebab-case，与 ProTable.vue 同源：拖拽手柄类名必须与 useRowDrag 选择器一致

const emit = defineEmits<{
  /** 多选变化（行 Record 视角；编排层 cast 收口到 T[]，运行时同一引用） */
  (e: 'selection-change', rows: Record<string, unknown>[]): void
  /** 双击单元格（已解析 rowKey；编排层转发给 rowEdit._start） */
  (e: 'cell-dblclick', rowKey: string | number): void
  /** 树形展开/折叠（已解析 rowKey；编排层转发给 treeData.toggle） */
  (e: 'expand-toggle', rowKey: string | number): void
  /** 排序变化（原始 el-table 负载；编排层判定 sortable==='custom' 后走 M2 服务端排序） */
  (e: 'sort-change', evt: SortChangeEvent): void
}>()

/** 统一取行 rowKey（props.rowKey 字段，默认 'id'）—— 事件桥接与树形模板共用 */
function rowKeyOf(row: unknown): string | number {
  // unknown 入参解耦 T：树形扁平行含 _level/_hasChildren 附加字段，事件行来自 el-table（any）
  return (row as Record<string, unknown>)[props.rowKey ?? 'id'] as string | number
}

/** 过滤对象中的 undefined 字段（exactOptionalPropertyTypes 兼容） */
function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/**
 * ElTable 实例 ref —— v2.2-M1 起经 defineExpose 转发给编排层，
 * 同步进 useTable.tableRef（对外 element expose + clearSelection 清 UI 勾选态）。
 */
const elTableRef = ref<ComponentPublicInstance | null>(null)

// defineExpose 后父级模板 ref 只能拿到本对象（默认实例属性不再透出），
// 故 $el 用 getter 显式转发 —— ProTable.vue 的 getTbody（行拖拽挂载点查询）依赖它
defineExpose({
  /** el-table 组件实例（编排层同步进 useTable.tableRef） */
  elTable: elTableRef,
  /** 根 DOM（透传 ElTable 根元素） */
  get $el() {
    return elTableRef.value?.$el as HTMLElement | undefined
  },
})
</script>

<template>
  <ElTable
    ref="elTableRef"
    :data="rows"
    v-bind="{
      ...(rowKey ? { rowKey } : {}),
      ...(cellSpan
        ? { spanMethod: cellSpan.spanMethod, cellClassName: cellSpan.cellClassName }
        : {}),
    }"
    @selection-change="(rows) => emit('selection-change', rows)"
    @cell-dblclick="(row) => emit('cell-dblclick', rowKeyOf(row))"
    @expand-change="(row) => emit('expand-toggle', rowKeyOf(row))"
    @sort-change="(evt) => emit('sort-change', evt)"
  >
    <ElTableColumn
      v-for="col in columns"
      :key="col.prop"
      :prop="col.prop"
      :label="col.label"
      v-bind="
        filterUndefined({
          type: col.type,
          width: col.width,
          minWidth: col.minWidth,
          fixed: col.fixed,
          sortable: col.sortable,
          ...(col.tableProps ?? {}),
        })
      "
    >
      <!-- 自定义表头渲染（col.headerRender，spec §一 ProColumn.headerRender 字段） -->
      <template v-if="col.headerRender" #header="scope">
        <component :is="col.headerRender({ column: col, $index: scope.$index })" />
      </template>

      <template #default="scope">
        <slot :name="col.prop" :row="scope.row" :column="col" :index="scope.$index">
          <!-- v2.0 行拖拽手柄（sortablejs 通过此 handle 选择器绑定） -->
          <span
            v-if="col.draggable"
            class="pro-table-drag-handle"
            :data-col="col.prop"
            :class="bem.e('drag-handle')"
            style="cursor: grab; user-select: none"
          >
            ⋮⋮
          </span>
          <!-- v2.0 树形缩进 + 展开按钮（最高优先级） -->
          <template v-if="col.tree && treeData">
            <span
              :style="{
                paddingLeft: (scope.row._level ?? 0) * (col.tree.indentSize ?? 24) + 'px',
              }"
            >
              <button
                v-if="scope.row._hasChildren"
                type="button"
                :class="'pro-table-tree-toggle'"
                @click="treeData.toggle(rowKeyOf(scope.row))"
              >
                {{ treeData.isExpanded(rowKeyOf(scope.row)) ? '▾' : '▸' }}
              </button>
              <CellContent :content="resolveCellContent(col, scope.row, scope.$index)" />
            </span>
          </template>
          <!-- v2.0 编辑控件（编辑态 + 含 edit 配置） -->
          <EditCell
            v-else-if="rowEdit?.isEditing(rowKeyOf(scope.row)) && col.edit"
            :row-key="rowKeyOf(scope.row)"
            :col="col"
            :value="rowEdit.getValue(rowKeyOf(scope.row), col.prop)"
            @update="(prop, v) => rowEdit?.setValue(rowKeyOf(scope.row), prop, v)"
          />
          <!-- 默认渲染（v1 resolveCell，P1 起走共用 cell-render 适配层） -->
          <CellContent v-else :content="resolveCellContent(col, scope.row, scope.$index)" />
        </slot>
      </template>
    </ElTableColumn>
  </ElTable>
</template>
