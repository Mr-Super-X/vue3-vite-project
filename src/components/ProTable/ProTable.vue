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
import { computed, ref, useAttrs, watch, onUnmounted, type Ref } from 'vue' // vue 生命周期/底层 API（CLAUDE.md §1.6.1）
import 'element-plus/dist/index.css' // 与 form-schema/XForm.vue 对齐：直接引入全量 CSS（覆盖 ProTable 用的所有组件：ElTable / ElPagination / ElForm / ElInput 等）
import './styles/element-protable-overwrite.scss' // ProTable 特定的样式覆盖（BEM 嵌套，对齐 form-schema 模式）
import { ElPagination, ElEmpty, ElConfigProvider } from 'element-plus' // element-plus 按需注入（unplugin-vue-components）
import AsyncState from '@/components/common/AsyncState.vue' // 项目内 default import（unplugin-vue-components 自动注册全局组件）
import SearchForm from './components/SearchForm.vue'
import TableHeader from './components/TableHeader.vue'
import ColSetting from './components/ColSetting.vue'
import ElementTableBody from './components/ElementTableBody.vue'
import ElementTableV2Body from './components/ElementTableV2Body.vue' // v3.0.1：el-table-v2 真虚拟化引擎分支
import VxeTableBody from './components/VxeTableBody.vue' // v2.1 P3：vxe-table 引擎分支（动态加载，失败回退 element-plus）
import { useSearch } from './composables/useSearch'
import { useColumns } from './composables/useColumns'
import { useTable } from './composables/useTable'
import { useTableCapabilities } from './composables/useTableCapabilities'
import { useTableEngineDom } from './composables/useTableEngineDom'
import { useEngineFallback } from './composables/useEngineFallback' // v3.0.3：引擎回退状态抽离
import { resolveEngine } from './adapters/engine'
import type {
  ProColumn,
  ProTableExpose,
  ProTableProps,
  SortChangeEvent,
  SortState,
  TableDensity,
  TableEngine,
} from './types'

/* ───────────── 局部工具 ───────────── */

/**
 * 泛型 ProColumn<T> → 非泛型 ProColumn cast 收敛 helper
 * bivariance 让 ProColumn<T> 在消费方可赋值到 ProColumn(无泛型)位置,
 * 此 cast 仅用于消除 Volar 在模板处"类型无法收敛"警告,运行时零开销。
 * 把 cast 集中到这一处,模板代码不再有 as ProColumn[] 噪音。
 *
 * v3.0.3：函数名从 `looseColumn` 重命名为 `toNonGenericColumn`，与 `*NonGeneric`
 * 变量族语义对齐（旧名"loose"暗示类型不安全，与 cast 实际语义不符）。
 */
function toNonGenericColumn<T extends object>(col: ProColumn<T>): ProColumn {
  return col as unknown as ProColumn
}

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
  /** 引擎回退事件。vxe-table 加载失败时触发,父组件可联动监控/提示用户 */
  (e: 'engine-fallback', reason: string): void
}>()

/* ───────────── 编排层：用 3 个 composables 接管所有状态 ───────────── */

/**
 * 引擎 ref —— spec 决策 4：setup 阶段一次性捕获，运行时修改 prop 无效（锁定语义）。
 *
 * v3.0.3：vxe 加载失败回退由 useEngineFallback 接管，effectiveEngine 才是当前生效引擎。
 * engineRef 仅作为初始值传入 useEngineFallback（fallbackEngineRef === null 时回退到 engineRef）。
 */
const engineRef: Ref<TableEngine> = resolveEngine(props.tableEngine)

/**
 * 引擎回退状态 —— v3.0.3：从主组件抽到 composable，含 console.warn 兜底提示。
 * handleEngineFallback 绑定到 VxeTableBody 的 @engine-fallback 事件；effectiveEngine
 * 替代 engineRef 在所有"运行时当前引擎"语义处使用（v-if 链 / nextTick recalculate / defineExpose）。
 */
const { handleEngineFallback, effectiveEngine } = useEngineFallback({
  initialEngine: engineRef,
  onFallback: (reason) => emit('engine-fallback', reason),
})

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
    // v2.2-M1：reset 且 page≠1 时仅 setPage(1) —— page watch 会触发请求，
    // 再手动 refresh 会双发（对齐 useTable.onSortChange 同场景的处理模式）
    if (opts?.reset && table.page.value !== 1) {
      table.setPage(1)
      return
    }
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

/**
 * ElementTableBody 实例 ref —— 提前到能力编排之前声明，供 useTableEngineDom 接收。
 * ElementTableBody 通过 defineExpose 暴露 elTable getter,编排层再同步进 useTable.tableRef。
 * 用 InstanceType 精确化,IDE hover 可看到 elTable / $el 等完整暴露属性。
 */
const proTableEl = ref<InstanceType<typeof ElementTableBody> | null>(null)

/** tbody DOM 访问点 —— 经 useTableEngineDom composable 收敛，原内联查询已删除（重复实现） */
const { getTbody } = useTableEngineDom({ proTableEl })

/* ───────────── v2.0 四类能力编排（已抽到 useTableCapabilities.ts） ───────────── */

const { rowEdit, treeData, cellSpan, summary, virtualScroll, extendedExpose } =
  useTableCapabilities({
    props: propsForComposables,
    columns,
    table,
    engine: engineRef, // v2.1 决策 5：vxe 引擎不支持树形/行拖拽，由能力层检出 warn + 忽略
    getTbody,
  })

/** v2.0 树形：data 变化时 normalize + 扁平化（flatData computed 随 expanded 自动重算） */
const hasTableMounted = ref(false)
/** 合并 treeData.normalize 与 hasTableMounted 为单一监听点，避免同一数据源双 watcher */
watch(
  () => table.data.value,
  (data) => {
    if (data && data.length > 0) {
      treeData?.normalize(data as never)
      hasTableMounted.value = true
    }
  },
  { immediate: true }
)

/**
 * ElementTableBody 暴露的 ElTable 实例同步进 useTable.tableRef
 * （对外 element expose + clearSelection 清 UI 勾选态的载体）。
 * 捕获 watch 返回的 stop，onUnmounted 调用避免组件卸载后
 * 引用已销毁 ElementTableBody 实例导致无意义赋值。
 */
const stopProTableElWatcher = watch(
  proTableEl,
  (inst) => {
    table.tableRef.value = inst?.elTable ?? null
  },
  { flush: 'post' }
)
onUnmounted(() => {
  stopProTableElWatcher()
})

/** v2.1 vxe 引擎分支实例 ref —— 目前用于密度切换后触发 vxe 行高重算（见 handleDensityChange） */
const proTableVxe = ref<InstanceType<typeof VxeTableBody> | null>(null)

/* ───────────── 辅助函数 ───────────── */

/** ElPagination 当前页 / size 变化桥接到 useTable */
function handlePageChange(p: number): void {
  table.setPage(p)
}
function handleSizeChange(s: number): void {
  table.setPageSize(s)
}

/**
 * 表格密度切换桥接。
 * vxe 引擎需额外触发行高重算：vxe 行高变量（--vxe-ui-table-row-height-*）测量结果有缓存，
 * data-density 变更不会自动重测（el 引擎行高是纯 CSS 即时生效，无需此步）
 */
function handleDensityChange(d: TableDensity): void {
  table.setDensity(d)
  if (effectiveEngine.value === 'vxe-table') {
    nextTick(() => proTableVxe.value?.recalculate())
  }
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

/**
 * 模板内联箭头函数提取为具名 handler —— 便于后续埋点 / row 焦点状态扩展。
 * v3.0.3：原 handleCellDblClick 空函数已删除（ElementTableBody 已直接调用
 * rowEdit._start，无需编排层中转）；模板里 @cell-dblclick 也移除。
 */

/** v3.0 L4：模板内联箭头函数提取 */
function handleExpandToggle(rowKey: string | number): void {
  if (treeData) void treeData.toggle(rowKey)
}

/* ───────────── 插槽代理 handler（v3.0.3：模板内联箭头提取） ───────────── */

/**
 * 模板里 `update:search-params` 的具名转发 —— 避免内联 `(v) => search.updateParams(v)`
 * 每次 render 创建新函数引用。
 */
function updateSearchParams(v: Record<string, unknown>): void {
  search.updateParams(v)
}

/** 列设置抽屉：可见列 keys 更新 */
function updateVisibleKeys(keys: string[]): void {
  columns.setVisibleKeys(keys)
}

/** 列设置抽屉：列顺序更新 */
function updateColumnOrder(order: string[]): void {
  columns.setColumnOrder(order)
}

/**
 * vxe 引擎加载失败回退 —— v3.0.3：已抽到 useEngineFallback composable，
 * handleEngineFallback 由 useEngineFallback() 解构注入。此处仅保留 hook 占位注释
 * 提醒维护者：原逻辑在 ./composables/useEngineFallback.ts，回退态在 effectiveEngine。
 */

/**
 * v3.0.3：表格数据标准化 —— 收敛模板中 3 处 `(table.data.value ?? []) as Record<string, unknown>[]`。
 * 引用稳定：data 不变时所有引擎分支共享同一数组，子组件 prop 浅比较不会误判变化，
 * 避免 ElTableV2 内部 columns diff 走慢路径。
 *
 * 类型 cast 解释：T 是泛型 `extends object`，TS 严格模式不能直接 cast 到 Record 数组；
 * 用 `unknown` 中转一次。运行时引用同一。
 */
const tableRows = computed<Record<string, unknown>[]>(
  () => (table.data.value ?? []) as unknown as Record<string, unknown>[]
)

/**
 * v3.0.3：分页 props —— 收敛模板 cast `(props.pagination as Record<string, unknown>) ?? {}`。
 * 引用稳定（pagination 为 false 或缺省时返回单例 {}，避免 ElPagination 内部 computed 失效）。
 */
const paginationProps = computed<Record<string, unknown>>(() => {
  const p = props.pagination
  if (p && typeof p === 'object') return p as Record<string, unknown>
  return EMPTY_PAGINATION_PROPS as Record<string, unknown>
})

/** 单例空对象 —— 给 paginationProps 在 prop 为 false 时复用，避免每次重渲创建新对象 */
const EMPTY_PAGINATION_PROPS = Object.freeze({}) as Readonly<Record<string, unknown>>

/** 是否空数据(给 AsyncState 三态用) —— 用 tableRows 替代 (table.data.value?.length ?? 0) === 0 */
const isEmptyData = computed(
  () => !table.loading.value && !table.error.value && tableRows.value.length === 0
)

/**
 * 首次加载判定：AsyncState 的 loading 分支会用 skeleton 替换插槽、卸载整个表格——
 * 若每次翻页/搜索刷新都走 loading 分支，ElTable 实例反复重建，其 store 内的
 * 多选选区（reserve-selection 跨页记忆）、展开行等交互态全部丢失。
 * 因此仅「从未渲染过数据」时显示 skeleton；之后刷新保留表格实例（loading 期间展示旧数据，
 * useTable.onError 才清 data，故刷新中途不会误入 empty 分支）。
 *
 * hasTableMounted ref 定义 + watch 已在 v2.0 树形能力编排处合并（避免同源 data 双 watcher），
 * 此处仅引用。
 */
/** 首次加载中（skeleton 态）；后续刷新为 false，保持表格挂载 */
const initialLoading = computed(() => table.loading.value && !hasTableMounted.value)

/* ───────────── BEM 命名空间 ───────────── */

const bem = createNamespace('pro-table')

/**
 * v3.0 M3 升级路径：
 *
 * 当前 cast 收敛：T 未解析时 ProColumn<T> 双向均不可赋值（bivariance 仅对具体类型生效），
 * 模板绑定处用 Record 视角 computed 收口 cast —— 运行时同一引用。
 *
 * 命名"nonGeneric"（替代旧"loose"）明确语义：这些 computed 是"丢泛型版本"，提供给
 * 非泛型子组件使用。完整消除 cast 需要 6 个子组件（SearchForm / TableHeader /
 * ColSetting / ElementTableBody / VxeTableBody）改为 generic<T>，影响面大，留待 v3.0.1。
 *
 * @see [`./components/SearchForm.vue`](./components/SearchForm.vue) 等子组件
 */
const searchColumnsNonGeneric = computed(() => columns.searchColumns.map(toNonGenericColumn))
const allColumnsNonGeneric = computed(() => columns.allColumns.value.map(toNonGenericColumn))
const sortedColumnsNonGeneric = computed(() => columns.sortedColumns.value.map(toNonGenericColumn))

/**
 * v3.0 5a：汇总行参数 —— el-table 内置 show-summary + summary-method 机制。
 * 当 enableSummary 启用时，summary?.summaryRows 提供按列汇总值。
 */
const showSummary = computed(() => Boolean(summary))
const summaryMethod = computed(() => {
  if (!summary) return undefined
  // 闭包捕获 summaryRows（响应式追踪 data 变化自动重算）
  return (): string[] => summary.summaryRows.value
})

/**
 * v3.0 5b：虚拟滚动 tableProps（高度限制 + rowHeight）
 */
const virtualScrollTableProps = computed(() => virtualScroll?.tableProps.value ?? {})

/**
 * v3.0.3：引擎模式枚举 —— 单一 computed 替代 `useVirtualEngine` + `useVxeEngine` 两个布尔。
 * 模板 v-if 链一次判别，依赖追踪链路从 2 减到 1。
 *
 * 判定优先级：virtualized > vxe-table > element-plus。
 * virtualized 仅在 element-plus 引擎下生效（vxe 引擎自带虚拟化，无需 el-table-v2）。
 *
 * 引擎回退（useEngineFallback）通过 effectiveEngine 接入后，此处读 effectiveEngine。
 */
const useVirtualEngine = computed(
  () => effectiveEngine.value === 'element-plus' && Boolean(virtualScroll?.enabled)
)
const useVxeEngine = computed(() => effectiveEngine.value === 'vxe-table')

/* ───────────── defineExpose（spec §八） ───────────── */

defineExpose({
  refresh: () => table.refresh(),
  reset: () => search.reset(),
  getSelectedRows: () => table.getSelectedRows(),
  clearSelection: () => table.clearSelection(),
  getSearchParams: () => search.getParams(),
  setSearchParams: (params: Record<string, unknown>) => search.setSearchParams(params),
  element: table.tableRef,
  // getter：vxe 加载失败回退后，调用方读到的是当前引擎而非初始快照
  get engine(): TableEngine {
    return effectiveEngine.value
  },
  getSortState: () => table.getSortState(),
  ...extendedExpose,
} satisfies ProTableExpose<T>)
</script>

<template>
  <ElConfigProvider>
    <div
      :class="[bem.b(), bem.is('tree', !!treeData), attrs.class]"
      :style="attrs.style"
      :data-density="table.density.value"
    >
      <SearchForm
        v-if="columns.searchColumns.length > 0"
        :columns="searchColumnsNonGeneric"
        :search-params="search.searchParams.value"
        :search-rows="props.searchRows"
        @search="search.search"
        @reset="search.reset"
        @update:search-params="updateSearchParams"
      />
      <TableHeader
        :columns="allColumnsNonGeneric"
        :visible-columns="sortedColumnsNonGeneric"
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
        :loading="initialLoading"
        :error="table.error.value"
        :is-empty="isEmptyData"
        @retry="table.refresh"
      >
        <!-- v3.0.1：virtualized 优先于 engine，命中时挂载 v2 引擎分支 -->
        <ElementTableV2Body
          v-if="useVirtualEngine"
          :rows="tableRows"
          :loading="table.loading.value && hasTableMounted"
          :columns="sortedColumnsNonGeneric"
          :row-key="props.rowKey"
          :virtual-config="virtualScroll?.config.value ?? {}"
          :density="table.density.value"
          :slots="$slots as never"
          @sort-change="handleSortChange"
        />
        <ElementTableBody
          v-else-if="effectiveEngine === 'element-plus'"
          ref="proTableEl"
          :rows="treeData ? treeData.flatData.value : tableRows"
          :loading="table.loading.value && hasTableMounted"
          :columns="sortedColumnsNonGeneric"
          :row-key="props.rowKey"
          :row-edit="rowEdit"
          :tree-data="treeData"
          :cell-span="cellSpan"
          :show-summary="showSummary"
          :summary-method="summaryMethod"
          :virtual-scroll-props="virtualScrollTableProps"
          @selection-change="handleSelectionChange"
          @expand-toggle="handleExpandToggle"
          @sort-change="handleSortChange"
        >
          <!-- 透传业务插槽（col.prop 命名插槽等），保持 v1 插槽契约不变 -->
          <template v-for="(_, name) in $slots" :key="name" #[name]="scope">
            <slot :name="name" v-bind="scope" />
          </template>
        </ElementTableBody>
        <!-- v2.1 P3：vxe-table 引擎分支（无树形/拖拽；加载失败由 engine-fallback 回退） -->
        <VxeTableBody
          v-else-if="useVxeEngine"
          ref="proTableVxe"
          :rows="tableRows"
          :loading="table.loading.value && hasTableMounted"
          :columns="sortedColumnsNonGeneric"
          :row-key="props.rowKey"
          :row-edit="rowEdit"
          :cell-span="cellSpan"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
          @engine-fallback="handleEngineFallback"
        >
          <!-- 透传业务插槽（col.prop 命名插槽等），与 el 分支契约一致 -->
          <template v-for="(_, name) in $slots" :key="name" #[name]="scope">
            <slot :name="name" v-bind="scope" />
          </template>
        </VxeTableBody>
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
        v-bind="paginationProps"
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
      <!-- 列设置：引擎无关 —— 操作 useColumns 数据层（visibleKeys/columnOrder），
           el / vxe 两引擎都消费 sortedColumns，抽屉 UI 用 element-plus 组件无引擎耦合 -->
      <ColSetting
        v-model:visible="columns.colSettingVisible.value"
        :columns="allColumnsNonGeneric"
        :visible-keys="columns.visibleKeys.value"
        :fixed-keys="columns.fixedKeys.value"
        @update:visible-keys="updateVisibleKeys"
        @reorder="updateColumnOrder"
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

  /* v2.2 树形模式：展开开关走树列内联自定义箭头（ElementTableBody 渲染，随 _level 缩进体现层级） */
  &.is-tree {
    /* 使用方若仍声明 type:'expand' 列：隐藏其自带 icon 与展开行内容，避免与内联箭头形成双开关 */
    .el-table__expand-icon,
    .el-table__expanded-cell {
      display: none;
    }
  }

  /* 树列内联展开箭头按钮：reset 浏览器默认 button 外观（边框/底色），对齐单元格文本基线 */
  .pro-table-tree-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--el-text-color-regular);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}
</style>
