<script setup lang="ts">
/**
 * ProTable —— 配置驱动的表格组件（spec §4 文件清单 / §五组件树 / §六数据流）
 *
 * 编排层角色：持有 4 个 composables 的解构输出（P1 后接入），把状态透传给子组件
 * SearchForm / TableHeader / ElTable / ElPagination / ColSetting。
 * 业务编排收敛到 composables/*.ts（CLAUDE.md §一 #11 Hook 拆分）。
 *
 * **P0 骨架版本**：本版本硬编码 el-table 渲染，**不调用 composables**（P1 阶段接入 useSearch/useTable/useColumns/useVxeTable）。
 * 这样 P0 独立可运行（types 类型可被引用），P1 是行为增强。
 *
 * @see [`./composables/useSearch`](./composables/useSearch.ts) 搜索参数管理
 * @see [`./composables/useColumns`](./composables/useColumns.ts) 列解析与持久化
 * @see [`./composables/useTable`](./composables/useTable.ts) 数据请求与分页
 * @see [`./adapters/engine`](./adapters/engine.ts) 引擎工厂
 * @group ProTable 组件
 */
import { ref, useAttrs, watch, type Ref } from 'vue' // vue 生命周期/底层 API（CLAUDE.md §1.6.1）
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
import type { ProColumn, ProTableExpose, ProTableProps } from './types'

const props = withDefaults(defineProps<ProTableProps>(), {
  tableEngine: 'element-plus',
  pagination: true,
  pageSize: 10,
  searchRows: 3,
  density: 'default',
  initParam: () => ({}),
})

const emit = defineEmits<{
  search: [Record<string, unknown>]
  reset: []
}>()

const attrs = useAttrs()
defineOptions({ inheritAttrs: false })

/* ───────────── P0 骨架版：硬编码状态，P1 替换为 composables ───────────── */

/** 引擎 ref —— spec 决策 4：setup 阶段一次性捕获 */
const engineRef: Ref<'element-plus' | 'vxe-table'> = ref(props.tableEngine)
watch(
  () => props.tableEngine,
  (v) => {
    // 仅在首次渲染前有效；运行时修改无效（JSDoc 约束）
    if (engineRef.value === 'element-plus' || engineRef.value === 'vxe-table') {
      engineRef.value = v
    }
  }
)

/** 列设置抽屉状态 */
const colSettingVisible = ref(false)

/** 数据 / 分页（占位，P1 由 useTable 接管） */
const data = ref<Record<string, unknown>[] | null>(null)
const total = ref(0)
const page = ref(1)
const pageSize = ref(props.pageSize ?? 10)
const loading = ref(false)
const error = ref<Error | null>(null)
const density = ref<'compact' | 'default' | 'loose'>(props.density ?? 'default')
const tableRef = ref<ComponentPublicInstance | null>(null) // element-plus 表格实例
const selectedRows = ref<Record<string, unknown>[]>([])

/** 搜索参数（占位，P1 由 useSearch 接管） */
const searchParams: Ref<Record<string, unknown>> = ref({ ...(props.initParam ?? {}) })
for (const col of props.columns) {
  if (col.search) {
    searchParams.value[col.prop] = col.search.defaultValue ?? null
  }
}

/** 搜索列（按 columns.search 过滤） */
const searchColumns = props.columns.filter((c) => Boolean(c.search))

/** 可见列（按 hidden 过滤 + 响应式） */
const sortedColumns = ref<ProColumn[]>(
  props.columns.filter((c) => {
    if (typeof c.hidden === 'boolean') return !c.hidden
    if (c.hidden && typeof c.hidden === 'object' && 'value' in c.hidden) {
      return !Boolean((c.hidden as Ref<boolean>).value)
    }
    return true
  })
)
const allColumns = ref<ProColumn[]>([...props.columns])

function isEmpty(): boolean {
  return !loading.value && !error.value && (data.value?.length ?? 0) === 0
}

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
 * @group ProTable 组件
 */
function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

function handleRefresh(): void {
  // P1 由 useTable 接入 requestApi.refresh
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

function handleSearch(): void {
  page.value = 1
  handleRefresh()
  emit('search', { ...searchParams.value })
}

function handleReset(): void {
  for (const col of props.columns) {
    if (col.search) {
      searchParams.value[col.prop] = col.search.defaultValue ?? null
    }
  }
  page.value = 1
  handleRefresh()
  emit('reset')
}

function handlePageChange(p: number): void {
  page.value = p
  handleRefresh()
}

function handleSizeChange(s: number): void {
  pageSize.value = s
  page.value = 1
  handleRefresh()
}

function handleSelectionChange(rows: Record<string, unknown>[]): void {
  const key = props.rowKey
  if (!key) {
    selectedRows.value = [...rows]
    return
  }
  const seen = new Set<string>()
  const unique: Record<string, unknown>[] = []
  for (const row of rows) {
    const k = String(row[key])
    if (seen.has(k)) continue
    seen.add(k)
    unique.push(row)
  }
  selectedRows.value = unique
}

const bem = createNamespace('pro-table')

// ───────────── expose（spec §八 defineExpose 清单） ─────────────
defineExpose({
  refresh: async () => handleRefresh(),
  reset: async () => handleReset(),
  getSelectedRows: () => [...selectedRows.value],
  clearSelection: () => {
    selectedRows.value = []
  },
  getSearchParams: () => ({ ...searchParams.value }),
  setSearchParams: async (params: Record<string, unknown>) => {
    Object.assign(searchParams.value, params)
    page.value = 1
    await handleRefresh()
  },
  element: tableRef,
  engine: engineRef.value,
} satisfies ProTableExpose)
</script>

<template>
  <ElConfigProvider>
    <div :class="[bem.b(), attrs.class]" :style="attrs.style">
      <SearchForm
        v-if="searchColumns.length > 0"
        :columns="searchColumns"
        :search-params="searchParams"
        :search-rows="props.searchRows"
        @search="handleSearch"
        @reset="handleReset"
      />
      <TableHeader
        :columns="allColumns"
        :visible-columns="sortedColumns"
        :density="density"
        :col-setting-visible="colSettingVisible"
        @refresh="handleRefresh"
        @update:density="(v) => (density = v)"
        @update:col-setting-visible="(v) => (colSettingVisible = v)"
      >
        <template #tableHeader>
          <slot name="tableHeader" />
        </template>
        <template #toolButton>
          <slot name="toolButton" />
        </template>
      </TableHeader>
      <AsyncState :loading="loading" :error="error" :is-empty="isEmpty()" @retry="handleRefresh">
        <ElTable
          v-if="engineRef === 'element-plus'"
          ref="tableRef"
          :data="data ?? []"
          v-bind="props.rowKey ? { rowKey: props.rowKey } : {}"
          @selection-change="handleSelectionChange"
        >
          <ElTableColumn
            v-for="col in sortedColumns"
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
            <template #default="scope">
              <slot :name="col.prop" :row="scope.row" :column="col" :index="scope.$index">
                <component :is="resolveCell(col, scope.row, scope.$index)" />
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
        :total="total"
        :current-page="page"
        :page-size="pageSize"
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
        :columns="allColumns"
        :visible-keys="sortedColumns.map((c) => c.prop)"
        :fixed-keys="allColumns.filter((c) => c.fixed).map((c) => c.prop)"
      />
    </div>
  </ElConfigProvider>
</template>

<style lang="scss">
/* 命名空间占位 —— 子组件覆盖样式各自下钻到 .#{$BEM_PREFIX}-pro-table__xxx */
.#{$BEM_PREFIX}-pro-table {
}
</style>
