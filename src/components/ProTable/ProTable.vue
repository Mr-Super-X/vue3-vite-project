<script setup lang="ts" generic="T extends object = Record<string, unknown>">
/**
 * ProTable —— 配置驱动的表格组件（spec §4 文件清单 / §五组件树 / §六数据流）
 *
 * 编排层角色：持有 3 个 composables 的解构输出，把状态透传给子组件
 * SearchForm / TableHeader / ElTable / ElPagination / ColSetting。
 * 业务编排收敛到 composables/*.ts（CLAUDE.md §一 #11 Hook 拆分）。
 *
 * 泛型 T = 行数据类型（M1）：render 回调的 row 精确到 T；默认 Record<string, unknown> 向后兼容，
 * 存量调用零改动。
 *
 * @see [`./composables/useSearch`](./composables/useSearch.ts) 搜索参数管理
 * @see [`./composables/useColumns`](./composables/useColumns.ts) 列解析与持久化
 * @see [`./composables/useTable`](./composables/useTable.ts) 数据请求与分页
 * @see [`./adapters/engine`](./adapters/engine.ts) 引擎工厂
 * @group ProTable 组件
 */
import { ref, useAttrs, watch, type Ref } from 'vue' // vue 生命周期/底层 API（CLAUDE.md §1.6.1）
import 'element-plus/dist/index.css' // 与 form-schema/XForm.vue 对齐：直接引入全量 CSS（覆盖 ProTable 用的所有组件：ElTable / ElPagination / ElForm / ElInput 等）
import './styles/element-protable-overwrite.scss' // ProTable 特定的样式覆盖（BEM 嵌套，对齐 form-schema 模式）
import { ElPagination, ElEmpty, ElConfigProvider } from 'element-plus' // element-plus 按需注入（unplugin-vue-components）
import AsyncState from '@/components/common/AsyncState.vue' // 项目内 default import（unplugin-vue-components 自动注册全局组件）
import SearchForm from './components/SearchForm.vue'
import TableHeader from './components/TableHeader.vue'
import ColSetting from './components/ColSetting.vue'
import ElementTableBody from './components/ElementTableBody.vue'
import { useSearch } from './composables/useSearch'
import { useColumns } from './composables/useColumns'
import { useTable } from './composables/useTable'
import { useTableCapabilities } from './composables/useTableCapabilities'
import { resolveEngine } from './adapters/engine'
import type {
  ProColumn,
  ProTableExpose,
  ProTableProps,
  SortChangeEvent,
  SortState,
  TableDensity,
} from './types'

const props = withDefaults(defineProps<ProTableProps<T>>(), {
  tableEngine: 'element-plus',
  pagination: true,
  pageSize: 10,
  searchRows: 3,
  density: 'default',
  initParam: () => ({}),
})

const attrs = useAttrs()
defineOptions({ inheritAttrs: false })

const emit = defineEmits<{
  /** 服务端排序变化（仅 sortable='custom' 列触发；payload 为 null 表示清除排序） */
  (e: 'sort-change', payload: SortState<T> | null): void
}>()

/* ───────────── 编排层：用 3 个 composables 接管所有状态 ───────────── */

/** 引擎 ref —— spec 决策 4：setup 阶段一次性捕获，运行时修改 prop 无效（锁定语义） */
const engineRef: Ref<'element-plus' | 'vxe-table'> = resolveEngine(props.tableEngine)

// exactOptionalPropertyTypes 兼容：withDefaults 返回的 props 含 undefined optional，
// ProTableProps<T> 严格不允 undefined。cast 一次解决（CLAUDE.md §四严禁 any；用 unknown 收口）
const propsForComposables = props as unknown as ProTableProps<T>

// 注意顺序（第 1 步单源化）：useSearch 先创建并持有唯一 searchParams；
// useTable 通过 getSearchParams 闭包读取。fetchHook 闭包内引用后声明的 table ——
// 仅在用户交互/程序化调用时执行，此时 table 已初始化（避免 useSearch ↔ useTable 循环依赖）。
const columns = useColumns({ props: propsForComposables, engine: engineRef })

// useSearch 仅承担"用户搜索 UI ↔ 参数"职责，refresh 由 useTable.fetchHook 闭包触发
const search = useSearch({
  props: propsForComposables,
  engine: engineRef,
  fetchHook: async (opts) => {
    if (opts?.reset) table.setPage(1)
    await table.refresh()
  },
})
const table = useTable({
  props: propsForComposables,
  columns,
  engine: engineRef,
  getSearchParams: () => search.searchParams.value,
})

// 列设置抽屉状态（单一真相源在 useColumns.colSettingVisible，见 ./composables/useColumns）
function handleColSettingUpdate(visible: boolean): void {
  columns.colSettingVisible.value = visible
}

/* ───────────── v2.0 四类能力编排（已抽到 useTableCapabilities.ts） ───────────── */

const { rowEdit, treeData, cellSpan, v2Expose } = useTableCapabilities({
  props: propsForComposables,
  columns,
  table,
  // v2.0 行拖拽：tbody DOM 由 capabilities 内部透传给 useRowDrag，挂载生命周期自持
  // （onMounted + watch data 自动重挂），此处仅需提供模板 ref 的 DOM 访问口
  getTbody: () => {
    const root = proTableEl.value?.$el
    if (!root || typeof root.querySelector !== 'function') return null
    return root.querySelector('.el-table__body tbody') as HTMLElement | null
  },
})

/** v2.0 树形：data 变化时 normalize + 扁平化（flatData computed 随 expanded 自动重算） */
watch(
  () => table.data.value,
  (data) => {
    if (treeData && data && data.length > 0) {
      treeData.normalize(data as never)
    }
  },
  { immediate: true }
)

/** v2.0 el-table 实例 ref —— 供 getTbody 查询 tbody DOM（行拖拽挂载点；P1 起指向 ElementTableBody 实例，$el 透传到底层 ElTable） */
const proTableEl = ref<{ $el?: HTMLElement } | null>(null)

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

/* ───────────── 辅助函数 ───────────── */

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

/**
 * M2 服务端排序桥接：仅 sortable='custom' 列生效（客户端排序列维持 el-table 原生行为）。
 * 经 useTable.onSortChange 更新状态 + 回第 1 页 + 触发请求，随后向外 emit 当前排序状态。
 */
function handleSortChange(evt: SortChangeEvent): void {
  const col = columns.sortedColumns.value.find((c) => c.prop === evt.prop)
  if (!col || col.sortable !== 'custom') return
  table.onSortChange(evt)
  emit('sort-change', table.sortState.value)
}

/** 多选变化桥接 —— el-table 事件行为 Record 视角（非泛型），cast 收口到 T[]（运行时同一引用）。 */
function handleSelectionChange(rows: Record<string, unknown>[]): void {
  table.setSelectedRows(rows as unknown as T[])
}

/** 是否空数据（给 AsyncState 三态用） */
function isEmpty(): boolean {
  return !table.loading.value && !table.error.value && (table.data.value?.length ?? 0) === 0
}

/* ───────────── BEM 命名空间 ───────────── */

const bem = createNamespace('pro-table')

/**
 * 下游子组件消费非泛型 ProColumn：T 未解析时 ProColumn<T> 双向均不可赋值
 * （bivariance 仅对具体类型生效），模板绑定处用 Record 视角 computed 收口 cast —— 运行时同一引用。
 */
const searchColumnsLoose = computed(() => columns.searchColumns as ProColumn[])
const allColumnsLoose = computed(() => columns.allColumns.value as ProColumn[])
const sortedColumnsLoose = computed(() => columns.sortedColumns.value as ProColumn[])

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
  getSortState: () => table.getSortState(),
  ...v2Expose,
} satisfies ProTableExpose<T>)
</script>

<template>
  <ElConfigProvider>
    <div :class="[bem.b(), attrs.class]" :style="attrs.style" :data-density="table.density.value">
      <SearchForm
        v-if="columns.searchColumns.length > 0"
        :columns="searchColumnsLoose"
        :search-params="search.searchParams.value"
        :search-rows="props.searchRows"
        @search="search.search"
        @reset="search.reset"
        @update:search-params="(v) => search.updateParams(v)"
      />
      <TableHeader
        :columns="allColumnsLoose"
        :visible-columns="sortedColumnsLoose"
        :density="table.density.value"
        :col-setting-visible="columns.colSettingVisible.value"
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
        <ElementTableBody
          v-if="engineRef === 'element-plus'"
          ref="proTableEl"
          :rows="
            (treeData ? treeData.flatData.value : (table.data.value ?? [])) as Record<
              string,
              unknown
            >[]
          "
          :columns="sortedColumnsLoose"
          :row-key="props.rowKey"
          :row-edit="rowEdit"
          :tree-data="treeData"
          :cell-span="cellSpan"
          @selection-change="handleSelectionChange"
          @cell-dblclick="(rowKey) => rowEdit?._start(rowKey)"
          @expand-toggle="(rowKey) => treeData && void treeData.toggle(rowKey)"
          @sort-change="handleSortChange"
        >
          <!-- 透传业务插槽（col.prop 命名插槽等），保持 v1 插槽契约不变 -->
          <template v-for="(_, name) in $slots" :key="name" #[name]="scope">
            <slot :name="name" v-bind="scope" />
          </template>
        </ElementTableBody>
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
        v-model:visible="columns.colSettingVisible.value"
        :columns="allColumnsLoose"
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
