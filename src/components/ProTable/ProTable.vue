<script setup lang="ts">
/**
 * ProTable —— 配置驱动的表格组件（spec §4 文件清单 / §五组件树 / §六数据流）
 *
 * 编排层角色：持有 3 个 composables 的解构输出，把状态透传给子组件
 * SearchForm / TableHeader / ElTable / ElPagination / ColSetting。
 * 业务编排收敛到 composables/*.ts（CLAUDE.md §一 #11 Hook 拆分）。
 *
 * @see [`./composables/useSearch`](./composables/useSearch.ts) 搜索参数管理
 * @see [`./composables/useColumns`](./composables/useColumns.ts) 列解析与持久化
 * @see [`./composables/useTable`](./composables/useTable.ts) 数据请求与分页
 * @see [`./adapters/engine`](./adapters/engine.ts) 引擎工厂
 * @group ProTable 组件
 */
import { ref, useAttrs, watch, h, isVNode, type Ref } from 'vue' // vue 生命周期/底层 API（CLAUDE.md §1.6.1）
import 'element-plus/dist/index.css' // 与 form-schema/XForm.vue 对齐：直接引入全量 CSS（覆盖 ProTable 用的所有组件：ElTable / ElPagination / ElForm / ElInput 等）
import './styles/element-protable-overwrite.scss' // ProTable 特定的样式覆盖（BEM 嵌套，对齐 form-schema 模式）
import {
  ElTable,
  ElTableColumn,
  ElPagination,
  ElEmpty,
  ElConfigProvider,
  ElTag,
} from 'element-plus' // element-plus 按需注入（unplugin-vue-components）
import AsyncState from '@/components/common/AsyncState.vue' // 项目内 default import（unplugin-vue-components 自动注册全局组件）
import SearchForm from './components/SearchForm.vue'
import TableHeader from './components/TableHeader.vue'
import ColSetting from './components/ColSetting.vue'
import { useSearch } from './composables/useSearch'
import { useColumns } from './composables/useColumns'
import { useTable } from './composables/useTable'
import { useTableCapabilities } from './composables/useTableCapabilities'
import { resolveEngine } from './adapters/engine'
import type { ProColumn, ProTableExpose, ProTableProps, TableDensity } from './types'

const props = withDefaults(defineProps<ProTableProps>(), {
  tableEngine: 'element-plus',
  pagination: true,
  pageSize: 10,
  searchRows: 3,
  density: 'default',
  initParam: () => ({}),
})

const attrs = useAttrs()
defineOptions({ inheritAttrs: false })

/* ───────────── 编排层：用 3 个 composables 接管所有状态 ───────────── */

/** 引擎 ref —— spec 决策 4：setup 阶段一次性捕获 */
const engineRef: Ref<'element-plus' | 'vxe-table'> = resolveEngine(props.tableEngine)
watch(
  () => props.tableEngine,
  (v) => {
    // 仅在首次渲染前有效；运行时修改无效（JSDoc 约束）
    if (engineRef.value === 'element-plus' || engineRef.value === 'vxe-table') {
      engineRef.value = v
    }
  }
)

/** 列设置抽屉状态（spec 附录 A #8：默认关闭） */
const colSettingVisible = ref(false)

// exactOptionalPropertyTypes 兼容：withDefaults 返回的 props 含 undefined optional，
// ProTableProps 严格不允 undefined。cast 一次解决（CLAUDE.md §四严禁 any；用 unknown 收口）
const propsForComposables = props as unknown as ProTableProps

// 注意顺序：useSearch 需要 useTable.refresh 作 fetchHook；
// useTable 需要 useSearch.searchParams 序列化参数；形成循环。
// 解决方案：useTable 创建时不传 search（仅用 props.columns.search 初始化 searchParams）；
//           useSearch 创建时拿已存在的 table.refresh 作 fetchHook。
const columns = useColumns({ props: propsForComposables, engine: engineRef })
const table = useTable({ props: propsForComposables, columns, engine: engineRef })

// useSearch 仅承担"用户搜索 UI ↔ 参数"职责，refresh 由 useTable.fetchHook 闭包触发
const search = useSearch({
  props: propsForComposables,
  engine: engineRef,
  fetchHook: async (opts) => {
    if (opts?.reset) {
      table.resetSearchParams()
      table.setPage(1)
    }
    await table.refresh()
  },
})

// useSearch.searchParams → useTable.searchParams 同步（避免重复维护）
watch(
  () => search.searchParams.value,
  (v) => table.setSearchParams(v),
  { deep: true }
)

// 列设置抽屉状态同步（useColumns.colSettingVisible → ProTable.colSettingVisible）
watch(
  () => columns.colSettingVisible.value,
  (v) => (colSettingVisible.value = v)
)

// 列设置抽屉 emit（ProTable → useColumns）
function handleColSettingUpdate(visible: boolean): void {
  colSettingVisible.value = visible
}

/* ───────────── v2.0 四类能力编排（已抽到 useTableCapabilities.ts） ───────────── */

const { rowEdit, treeData, cellSpan, rowDrag, v2Expose } = useTableCapabilities({
  props: propsForComposables,
  columns,
  table,
})

/** v2.0 树形：data 变化时 normalize + 扁平化生成 el-table 可用数据 */
watch(
  () => table.data.value,
  (data) => {
    if (treeData && data && data.length > 0) {
      treeData.normalize(data as never)
    }
  },
  { immediate: true }
)
const flatTreeData = computed(() =>
  treeData ? (treeData.flattenData() as Record<string, unknown>[]) : (table.data.value ?? [])
)

/** v2.0 行拖拽：通过本地 ref="proTableEl" 拿 el-table 实例的 $el DOM，挂载 sortablejs */
const proTableEl = ref<{ $el?: HTMLElement } | null>(null)

const tryAttachSortable = (): void => {
  if (!rowDrag || !proTableEl.value?.$el) return
  const root = proTableEl.value.$el
  if (!root || typeof root.querySelector !== 'function') return
  const tbody = root.querySelector('.el-table__body tbody') as HTMLElement | null
  if (!tbody) return
  rowDrag.detachSortable()
  rowDrag.attachSortable(tbody)
}

onMounted(() => {
  nextTick(() => tryAttachSortable())
  setTimeout(() => tryAttachSortable(), 100)
  setTimeout(() => tryAttachSortable(), 500)
})

watch(
  [() => table.data.value, () => props.columns],
  () => {
    if (!rowDrag) return
    nextTick(() => tryAttachSortable())
  },
  { flush: 'post' }
)

/** v2.0 单元格合并：data/columns 变化时重新构建 spanMethod 缓存 */
watch(
  [() => table.data.value, () => props.columns],
  () => {
    if (cellSpan && table.data.value) {
      nextTick(() => cellSpan.resetCache())
    }
  },
  { flush: 'post' }
)

/** v2.0 双击单元格触发编辑（element-plus el-table cell-dblclick） */
function handleCellDblClick(row: Record<string, unknown>, _column: unknown): void {
  if (!rowEdit) return
  const key = row[props.rowKey ?? 'id'] as string | number
  rowEdit._start(key)
}

/** v2.0 树形模式：el-table expand-icon 点击桥接到 treeData.toggle */
function handleExpandChange(row: Record<string, unknown>, _expandedRows: unknown): void {
  if (!treeData) return
  const key = row[props.rowKey ?? 'id'] as string | number
  void treeData.toggle(key)
}

/** v2.0 解析编辑控件（el: 'input' | 'select' | 'input-number' | 自定义组件名） */
function resolveEditComp(el: string): string {
  switch (el) {
    case 'input':
      return 'el-input'
    case 'select':
      return 'el-select'
    case 'input-number':
      return 'el-input-number'
    default:
      return el
  }
}

/* ───────────── 辅助函数 ───────────── */

/**
 * 解析列渲染（enum → ElTag；render → 调用返回 VNode；默认 → 字段值）
 *
 * @group ProTable 组件
 */
function resolveCell(col: ProColumn, row: Record<string, unknown>, index: number): unknown {
  if (col.render) return col.render({ row, column: col, $index: index })
  if (col.enum) {
    const entry = col.enum.find((e) => e.value === row[col.prop])
    if (entry) {
      return h(ElTag, { type: entry.tagType ?? 'info' }, () => entry.label)
    }
  }
  return row[col.prop]
}

/**
 * 过滤对象中的 undefined 字段（exactOptionalPropertyTypes 兼容）
 *
 * @group ProTable 组件
 */
function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** ElPagination 当前页 / size 变化桥接到 useTable */
function handlePageChange(p: number): void {
  table.setPage(p)
}
function handleSizeChange(s: number): void {
  table.setPageSize(s)
}

/** 表格密度切换桥接 */
function handleDensityChange(d: TableDensity): void {
  table.setDensity(d)
}

/** 多选变化桥接 */
function handleSelectionChange(rows: Record<string, unknown>[]): void {
  table.setSelectedRows(rows)
}

/** 是否空数据（给 AsyncState 三态用） */
function isEmpty(): boolean {
  return !table.loading.value && !table.error.value && (table.data.value?.length ?? 0) === 0
}

/* ───────────── BEM 命名空间 ───────────── */

const bem = createNamespace('pro-table')

/* ───────────── defineExpose（spec §八） ───────────── */

defineExpose({
  refresh: () => table.refresh(),
  reset: () => search.reset(),
  getSelectedRows: () => table.getSelectedRows(),
  clearSelection: () => table.clearSelection(),
  getSearchParams: () => search.getParams(),
  setSearchParams: (params: Record<string, unknown>) => search.setSearchParams(params),
  element: table.tableRef,
  engine: engineRef.value,
  ...v2Expose,
} satisfies ProTableExpose)
</script>

<template>
  <ElConfigProvider>
    <div :class="[bem.b(), attrs.class]" :style="attrs.style" :data-density="table.density.value">
      <SearchForm
        v-if="columns.searchColumns.length > 0"
        :columns="columns.searchColumns"
        :search-params="search.searchParams.value"
        :search-rows="props.searchRows"
        @search="search.search"
        @reset="search.reset"
        @update:search-params="(v) => search.setSearchParams(v)"
      />
      <TableHeader
        :columns="columns.allColumns.value"
        :visible-columns="columns.sortedColumns.value"
        :density="table.density.value"
        :col-setting-visible="colSettingVisible"
        @refresh="table.refresh"
        @update:density="handleDensityChange"
        @update:col-setting-visible="handleColSettingUpdate"
      >
        <template #tableHeader>
          <slot name="tableHeader" />
        </template>
        <template #toolButton>
          <slot name="toolButton" />
        </template>
      </TableHeader>
      <AsyncState
        :loading="table.loading.value"
        :error="table.error.value"
        :is-empty="isEmpty()"
        @retry="table.refresh"
      >
        <ElTable
          v-if="engineRef === 'element-plus'"
          ref="proTableEl"
          :data="treeData ? flatTreeData : (table.data.value ?? [])"
          v-bind="{
            ...(props.rowKey ? { rowKey: props.rowKey } : {}),
            ...(cellSpan
              ? { spanMethod: cellSpan.spanMethod, cellClassName: cellSpan.cellClassName }
              : {}),
          }"
          @selection-change="handleSelectionChange"
          @cell-dblclick="handleCellDblClick"
          @expand-change="handleExpandChange"
        >
          <ElTableColumn
            v-for="col in columns.sortedColumns.value"
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
                      @click="treeData.toggle(scope.row[props.rowKey ?? 'id'])"
                    >
                      {{ treeData.isExpanded(scope.row[props.rowKey ?? 'id']) ? '▾' : '▸' }}
                    </button>
                    <template
                      v-for="(item, i) in [resolveCell(col, scope.row, scope.$index)]"
                      :key="i"
                    >
                      <template v-if="isVNode(item)">
                        <component :is="item" />
                      </template>
                      <template v-else>
                        {{ item }}
                      </template>
                    </template>
                  </span>
                </template>
                <!-- v2.0 编辑控件（编辑态 + 含 edit 配置） -->
                <template
                  v-else-if="rowEdit?.isEditing(scope.row[props.rowKey ?? 'id']) && col.edit"
                >
                  <el-input
                    v-if="col.edit.el === 'input'"
                    :model-value="
                      rowEdit.getValue(scope.row[props.rowKey ?? 'id'], col.prop) as string
                    "
                    @update:model-value="
                      (v: string | number) =>
                        rowEdit?.setValue(scope.row[props.rowKey ?? 'id'], col.prop, v)
                    "
                    v-bind="col.edit.props ?? {}"
                    size="small"
                  />
                  <el-input-number
                    v-else-if="col.edit.el === 'input-number'"
                    :model-value="
                      rowEdit.getValue(scope.row[props.rowKey ?? 'id'], col.prop) as number
                    "
                    @update:model-value="
                      (v: number | undefined) =>
                        rowEdit?.setValue(scope.row[props.rowKey ?? 'id'], col.prop, v)
                    "
                    v-bind="col.edit.props ?? {}"
                    size="small"
                  />
                  <!-- TODO v2.1: el-select 类型适配后改回 el-option 列表 -->
                  <el-select
                    v-else-if="col.edit.el === 'select'"
                    :model-value="
                      rowEdit.getValue(scope.row[props.rowKey ?? 'id'], col.prop) as never
                    "
                    @update:model-value="
                      (v: unknown) =>
                        rowEdit?.setValue(scope.row[props.rowKey ?? 'id'], col.prop, v)
                    "
                    v-bind="col.edit.props ?? {}"
                  />
                  <component
                    v-else
                    :is="resolveEditComp(col.edit.el)"
                    :model-value="rowEdit.getValue(scope.row[props.rowKey ?? 'id'], col.prop)"
                    @update:model-value="
                      (v: unknown) =>
                        rowEdit?.setValue(scope.row[props.rowKey ?? 'id'], col.prop, v)
                    "
                  />
                </template>
                <!-- 默认渲染（v1 resolveCell） -->
                <template v-else>
                  <component :is="'div'" v-if="false" />
                  <template
                    v-for="(item, i) in [resolveCell(col, scope.row, scope.$index)]"
                    :key="i"
                  >
                    <template v-if="isVNode(item)">
                      <component :is="item" />
                    </template>
                    <template v-else>
                      {{ item }}
                    </template>
                  </template>
                </template>
              </slot>
            </template>
          </ElTableColumn>
        </ElTable>
        <template #empty>
          <slot name="empty">
            <ElEmpty description="暂无数据" />
          </slot>
        </template>
      </AsyncState>
      <ElPagination
        v-if="props.pagination !== false"
        :total="table.total.value"
        :current-page="table.page.value"
        :page-size="table.pageSize.value"
        layout="total, sizes, prev, pager, next, jumper"
        v-bind="(props.pagination as Record<string, unknown>) ?? {}"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      >
        <template #default>
          <slot name="paginationLeft" />
        </template>
        <template #append>
          <slot name="paginationRight" />
        </template>
      </ElPagination>
      <ColSetting
        v-if="engineRef === 'element-plus'"
        v-model:visible="colSettingVisible"
        :columns="columns.allColumns.value"
        :visible-keys="columns.visibleKeys.value"
        :fixed-keys="columns.fixedKeys.value"
        @update:visible-keys="(keys) => columns.setVisibleKeys(keys)"
        @reorder="(order) => columns.setColumnOrder(order)"
        @reset-to-default="columns.resetToDefault"
      />
    </div>
  </ElConfigProvider>
</template>

<style lang="scss">
/* ProTable 根容器：宽度占满即可，内部子组件自带布局 */
.#{$BEM_PREFIX}-pro-table {
  width: 100%;

  /* 内部各区域之间的间距 */
  & > * + * {
    margin-top: 12px;
  }

  /* v2.0 树形模式：复用 el-table__expand-icon，隐藏自定义 toggle + 隐藏展开行内容 */
  .pro-table-tree-toggle {
    display: none;
  }
  .el-table__expanded-cell {
    display: none;
  }
}
</style>
