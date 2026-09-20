<script setup lang="ts" generic="T extends object = Record<string, unknown>">
/**
 * VxeTableBody —— vxe-table 引擎渲染分支（v2.1 P3 + v3.5 PR1-B 树形/拖拽补齐）
 *
 * 展示层角色：与 ElementTableBody 同级的第二引擎分支。onMounted 时经 useVxeTable
 * 动态加载 vxe-table（JS + CSS + app 安装，详见 composables/useVxeTable），加载完成
 * 后解析 VxeTable / VxeColumn 组件对象渲染；加载失败 emit engine-fallback
 * （编排层切回 element-plus，spec §九 #7 失败兜底）。
 *
 * 能力（v3.5 PR1-B 补齐后）：行编辑 / 单元格合并 / 树形 / 行拖拽全部支持。
 * - 树形：通过 createVxeTreeAdapter 把 useTreeData 状态映射到 vxe-table tree-config
 *   + 监听 toggle-tree-expand 把 vxe UI 变化回流 useTreeData
 * - 行拖拽：通过 useRowDrag 挂 vxe 行 DOM（v3.5 PR1-B Task 6 接线）
 *
 * v3.5 PR3：补 generic<T> 透传——rows / columns 绑 T，与 ElementTableBody 对齐。
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方
 * @see [`../composables/useVxeTable`](../composables/useVxeTable.ts) 动态加载与安装
 * @see [`../adapters/vxe-column`](../adapters/vxe-column.ts) ProColumn → VxeColumn 映射
 * @see [`../adapters/tree-adapter`](../adapters/tree-adapter.ts) TreeAdapter 引擎胶水
 * @group ProTable 组件
 */
import { onMounted, shallowRef, ref, computed, watch } from 'vue' // vue 生命周期/底层 API（CLAUDE.md §1.6.1）
import { ElSkeleton } from 'element-plus' // element-plus 按需注入（unplugin-vue-components 只管模板，script 中显式 import）
import type { FilterValuesMap, ProColumn, SortChangeEvent, TableDensity } from '../types'
import type { useRowEdit } from '../composables/useRowEdit'
import type { useCellSpan } from '../composables/useCellSpan'
import type { useTreeData } from '../composables/useTreeData'
import type { useRowDrag } from '../composables/useRowDrag'
import { useVxeTable } from '../composables/useVxeTable'
import { toVxeColumnProps, hasCustomSort, hasReserveSelection } from '../adapters/vxe-column'
import { resolveCellContent } from '../adapters/cell-render'
import { createVxeTreeAdapter } from '../adapters/tree-adapter'
import EditCell from './EditCell.vue'
import CellContent from './CellContent.vue'

const props = defineProps<{
  /** 渲染行 */
  rows: T[]
  /**
   * 后续刷新 loading（分页/排序/搜索请求期间的遮罩）。
   * 首次加载由编排层 AsyncState skeleton 承担，本组件收到时恒为 false —— 避免双重 loading。
   * 遮罩由模板外层容器 v-loading 渲染（非 vxe 自带 loading prop，原因见模板注释）。
   */
  loading: boolean
  /** 可见列（列设置抽屉排序后的结果） */
  columns: ProColumn[]
  /** 行 key 字段名（缺省 'id'，映射 vxe row-config.keyField）；显式联合 undefined —— exactOptionalPropertyTypes 兼容 */
  rowKey?: string | undefined
  /** 行编辑能力实例（未启用为 null） */
  rowEdit: ReturnType<typeof useRowEdit> | null
  /** 单元格合并能力实例（未启用为 null，span-method 不绑定） */
  cellSpan: ReturnType<typeof useCellSpan> | null
  /**
   * v3.1：自动高度（useAutoHeight 计算结果）—— 非 null 时绑定 vxe 表级 max-height
   * （vxe max-height 运行时代码实证，表体滚动 + 表头固定）；null 不绑定
   */
  maxHeight?: number | null
  /**
   * v3.1：当前密度档位 —— 透传给 EditCell，编辑态控件尺寸随密度联动
   * （vxe 行高由 --vxe-ui-table-row-height-* 变量覆盖，编辑控件需要显式 size 映射）
   */
  density?: TableDensity | undefined
  /** 列宽拖拽：true 时映射列级 resizable（vxe 列 resizable 默认 false，语义天然契合） */
  columnResize?: boolean | undefined
  /** v3.5 PR1-B：树形能力实例（未启用为 null；启用时由编排层 useTableCapabilities 注入） */
  treeData?: ReturnType<typeof useTreeData> | null
  /** v3.5 PR1-B：行拖拽能力实例（未启用为 null；启用时由编排层 useTableCapabilities 注入） */
  rowDrag?: ReturnType<typeof useRowDrag> | null
}>()

const emit = defineEmits<{
  /** 多选变化（合并 checkbox-change / checkbox-all 后的事件行集合） */
  (e: 'selection-change', rows: Record<string, unknown>[]): void
  /** v3.1：单选选中（vxe 内置 radio 列 radio-change 事件上行；编排层收敛到统一选中区） */
  (e: 'radio-select', row: Record<string, unknown>): void
  /** 双击单元格（已解析 rowKey；编排层转发给 rowEdit._start） */
  (e: 'cell-dblclick', rowKey: string | number, rowData: Record<string, unknown>): void
  /** 排序变化（已适配为内部 SortChangeEvent；编排层判定 sortable==='custom' 后走 M2 服务端排序） */
  (e: 'sort-change', evt: SortChangeEvent): void
  /** 引擎加载失败 —— 编排层切回 element-plus */
  (e: 'engine-fallback'): void
  /** v3.5 PR1-B：树形展开/折叠（vxe toggle-tree-expand 已映射 rowKey；编排层转发给 treeData.toggle） */
  (e: 'expand-toggle', rowKey: string | number): void
  /**
   * v3.5 PR2：列头筛选变化（vxe filter-change 协议 → 全表快照形态）。
   *
   * vxe 内置 filter 协议（@filter-change）payload = { property, values, ... }，
   * 单列触发；本组件维护 localFilterMap 合并多列筛选后转全表快照形态 emit 给编排层，
   * 与 el-table filter-change 事件负载形态对齐（useTable.filterState 可直接接收）。
   *
   * 业务方启用筛选：在 column.vxeProps.filters 声明 + filter-config.remote=true
   * （服务端筛选）；本地筛选时 vxe 自身处理，本组件仅做协议翻译。
   */
  (e: 'filter-change', filters: FilterValuesMap): void
}>()

/** vxe-table 引擎加载状态（true = 加载中 / 未加载，渲染骨架屏） */
const engineLoading = ref(true)
/** 解析出的 vxe 组件对象（shallowRef：组件定义无深层响应式需求） */
const vxeTableComp = shallowRef<unknown>(null)
const vxeColumnComp = shallowRef<unknown>(null)

/**
 * vxe 表格组件实例（vxe v4 setup 返回 $xeTable 全量方法，模板 ref 可直接调 recalculate）。
 * 类型只声明用到的 recalculate —— 动态组件实例无静态类型可引（vxe 类型链依赖未安装的 vxe-pc-ui）
 */
const vxeTableInst = ref<{ recalculate?: (reFull?: boolean) => Promise<unknown> } | null>(null)

/**
 * 密度切换后重算行高 —— vxe 行高变量（--vxe-ui-table-row-height-*）经隐藏尺寸元素测量后
 * 缓存（rowHeightStore），data-density 变化不会自动触发重测，由编排层 ProTable.handleDensityChange
 * 在切密度后调用（el 引擎行高是纯 CSS，无需此步）
 *
 * @see [`../../styles/element-protable-overwrite.scss`](../../styles/element-protable-overwrite.scss) 密度变量覆盖机制
 *
 * v3.5 PR1-B：getTbody 暴露给编排层 useTableEngineDom，让 useRowDrag 的 getTbody 回调
 * 能查询到 vxe-table 的 .vxe-table--body-wrapper tbody DOM 节点
 */
defineExpose({
  recalculate: () => {
    void vxeTableInst.value?.recalculate?.()
  },
  /** v3.5 PR1-B：vxe-table 根 DOM（含 .vxe-table--body-wrapper tbody），useRowDrag 挂载点 */
  getTbody(): HTMLElement | null {
    // 优先从 vxe 实例 ref 拿根 DOM；退化走组件根 DOM（onMounted 前 ref 还未绑定）
    const root = (vxeTableInst.value as unknown as { $el?: HTMLElement } | null)?.$el
    if (root instanceof HTMLElement) {
      return root.querySelector('.vxe-table--body-wrapper tbody') as HTMLElement | null
    }
    // onMounted 前：fallback 用 ref="proTableVxeRoot" 抓模板根 div 再 query
    return proTableVxeRoot.value?.querySelector(
      '.vxe-table--body-wrapper tbody'
    ) as HTMLElement | null
  },
})

/** 模板根 div ref —— vxe-table 尚未挂载时 fallback getTbody 用 */
const proTableVxeRoot = ref<HTMLDivElement | null>(null)

const { loadVxeTable } = useVxeTable()

/**
 * v3.5 PR1-B：树形引擎适配器 —— 仅在 treeData 启用时实例化。
 * getVxeTable 是 getter 闭包：vxeTableInst.value 在 onMounted 异步加载完成后才有值，
 * 用 getter 而非 ref 直传避免捕获过期快照。
 *
 * 不在 onMounted 外捕获：getter 让每次访问都读最新值，适配器与组件实例生命周期一致。
 */
const treeAdapter = computed(() =>
  props.treeData ? createVxeTreeAdapter(() => vxeTableInst.value as never) : null
)

/** 树形配置（treeData 启用时返回 tree-config；未启用返回 undefined 避免污染 vxe props） */
const treeConfigBinding = computed<Record<string, unknown> | undefined>(() =>
  treeAdapter.value ? treeAdapter.value.getTreeConfig() : undefined
)

/** 树形列定位：首个声明 col.tree 的列；多列声明取首（与 el-table 同语义） */
const treeColumnIndex = computed<number>(() => {
  if (!props.treeData) return -1
  const idx = props.columns.findIndex((c) => Boolean(c.tree))
  // 无声明时默认第一列，避免 vxe-column.tree-node 必须手动标
  return idx === -1 ? 0 : idx
})

/**
 * v3.5 PR1-B：watch expandedKeys 把 useTreeData 状态全量回灌 vxe 引擎侧 Map。
 * 触发场景：① revealKeys 批量展开 ② 外部 expandNode/collapseNode API 调用
 * ③ defaultExpandDepth 启动默认展开。
 *
 * rowsByKey 用当前 props.rows 构造（vxe-table 平铺渲染后的视图行）。
 */
watch(
  () => (props.treeData ? [...props.treeData.expandedKeys.value] : []),
  (keys) => {
    if (!treeAdapter.value || !props.treeData) return
    const rowsByKey = new Map<string | number, Record<string, unknown>>()
    for (const r of props.rows) {
      const k = (r as Record<string, unknown>)[props.rowKey ?? 'id'] as string | number | undefined
      if (k !== undefined) rowsByKey.set(k, r as Record<string, unknown>)
    }
    treeAdapter.value.syncExpanded(keys, rowsByKey)
  },
  { flush: 'post' }
)

/**
 * v3.5 PR1-B：vxe toggle-tree-expand 事件转发 —— vxe 内置 UI 触发后把状态回流
 * useTreeData，让 el-table 与 vxe-table 在树形展开/折叠上行为一致（共享同一 useTreeData 实例）。
 */
function handleToggleTreeExpand(payload: {
  row?: Record<string, unknown>
  expanded?: boolean
}): void {
  if (!props.treeData || !payload.row) return
  const rowKey = rowKeyOf(payload.row)
  // 当前 useTreeData 状态与 vxe 期望是否一致：一致则 noop 避免循环
  const isCurrentlyExpanded = props.treeData.isExpanded(rowKey)
  if (payload.expanded === isCurrentlyExpanded) return
  if (payload.expanded) {
    props.treeData.expandedKeys.value.add(rowKey)
  } else {
    props.treeData.expandedKeys.value.delete(rowKey)
  }
}

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
const selectedRows = ref<T[]>([])

/**
 * 选区比较必须按 rowKey 而非引用相等：
 * vxe-table 内部会对 data 做响应式代理 / 数据加工，checkbox 事件回传的行对象
 * 与 :data 传入的原引用可能不是同一对象（集成测试已复现引用不一致），
 * 用 === 去重会导致全选合并时重复行
 */
function sameRow(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return rowKeyOf(a) === rowKeyOf(b)
}

/** 单选 toggle（同 key 先移除再追加，防代理引用不同导致重复入区） */
function handleCheckboxChange(payload: { row: T; checked: boolean }): void {
  // v3.5 PR3：selectedRows.value 类型是 UnwrapRefSimple<T>，与 T 不完全等价，cast Record 视角
  const rest = selectedRows.value.filter(
    (r) =>
      !sameRow(
        r as unknown as Record<string, unknown>,
        payload.row as unknown as Record<string, unknown>
      )
  )
  selectedRows.value = (payload.checked ? [...rest, payload.row] : rest) as T[]
  emit('selection-change', selectedRows.value as unknown as Record<string, unknown>[])
}

/** 全选 toggle：checked 时并入受影响行（同 key 去重），取消时移除（payload.rows 缺省退化全部可见行） */
function handleCheckboxAll(payload: { checked: boolean; rows?: T[] }): void {
  const affected = payload.rows ?? props.rows
  const rest = selectedRows.value.filter(
    (r) =>
      !affected.some((affectedRow) =>
        sameRow(
          affectedRow as unknown as Record<string, unknown>,
          r as unknown as Record<string, unknown>
        )
      )
  )
  selectedRows.value = (payload.checked ? [...rest, ...affected] : rest) as T[]
  emit('selection-change', selectedRows.value as unknown as Record<string, unknown>[])
}

/** vxe sort-change 负载 { field, order: 'asc'|'desc'|null } → 内部 SortChangeEvent */
function handleSortChange(payload: { field?: string; order?: 'asc' | 'desc' | null }): void {
  emit('sort-change', {
    prop: payload.field ?? null,
    order: payload.order === 'asc' ? 'ascending' : payload.order === 'desc' ? 'descending' : null,
  })
}

/**
 * v3.5 PR2：vxe 筛选快照（与 el-table filter-change 协议对齐）。
 *
 * vxe filter-change 事件是单列触发（payload 含 property + values），本组件维护
 * localFilterMap 累加多列筛选后以全表快照形态 emit；useTable.filterState 接收
 * 形态一致，直接覆盖式更新（用户清除某列筛选时 localFilterMap.delete 同步）。
 */
const localFilterMap = ref<FilterValuesMap>({})

/**
 * vxe filter-change 负载 → 全表筛选快照（合并到 localFilterMap 后 emit）。
 * - payload.property = 列字段名（field）
 * - payload.values = 该列当前筛选值数组（空数组 = 清除该列筛选）
 * - payload.filters / filterList = 全表已选筛选项（vxe 内部维护，备选数据源）
 */
function handleFilterChange(payload: {
  property?: string
  values?: unknown[]
  filterList?: Array<{ column?: unknown; property?: string; values?: unknown[] }>
}): void {
  // 优先用 filterList（vxe 全表聚合）；退化用 property+values 单列更新
  if (payload.filterList && payload.filterList.length > 0) {
    const next: FilterValuesMap = {}
    for (const f of payload.filterList) {
      if (f.property) {
        next[f.property] = (f.values ?? []) as FilterValuesMap[string]
      }
    }
    localFilterMap.value = next
  } else if (payload.property !== undefined) {
    // 单列更新语义：空 values = 清除该列
    const next = { ...localFilterMap.value }
    if (!payload.values || payload.values.length === 0) {
      delete next[payload.property]
    } else {
      next[payload.property] = payload.values as FilterValuesMap[string]
    }
    localFilterMap.value = next
  }
  emit('filter-change', { ...localFilterMap.value })
}

/** v3.1：vxe 内置 radio 列选中（radio-change 负载含 row，运行时代码实证）→ 上行编排层统一选中区 */
function handleRadioChange(payload: { row: Record<string, unknown> }): void {
  emit('radio-select', payload.row)
}

/**
 * v3.1：多选跨页保持 —— 任一 selection 列声明 reserveSelection 时开启 vxe
 * checkbox-config.reserve（vxe 运行时代码 checkboxOpts.reserve 分支实证）
 */
const checkboxConfig = computed(() =>
  hasReserveSelection(props.columns as ProColumn[]) ? { reserve: true } : undefined
)

/** 双击单元格 → 行编辑进入（纯事件转发：编排层 useProTableEvents 调 rowEdit._start） */
function handleCellDblclick(payload: { row: Record<string, unknown> }): void {
  emit('cell-dblclick', rowKeyOf(payload.row), payload.row)
}

/**
 * 2026-09-18 review：非 reserve 语义下翻页/数据刷新须清空镜像选区——
 * 原实现仅 checkbox 事件维护 selectedRows，rows 替换后旧行残留并持续 emit，
 * 与 el 引擎「非 reserve 翻页自动清选区」行为不一致，编排层拿到脏选区。
 * reserve 分支由 vxe 内部按 keyField 自行管理跨页选区，不动。
 */
watch(
  () => props.rows,
  () => {
    if (hasReserveSelection(props.columns as ProColumn[])) return
    if (selectedRows.value.length === 0) return
    selectedRows.value = []
    emit('selection-change', [])
  }
)
</script>

<template>
  <ElSkeleton v-if="engineLoading" :rows="5" animated />
  <!--
    后续刷新遮罩由外层容器 v-loading 承担（与 element-plus 引擎同款视觉）。
    不用 vxe 自带 loading prop：vxe-table esm 版不含遮罩组件 VxeLoading（由 vxe-pc-ui 包提供，
    项目未安装，VxeUI.getComponent('VxeLoading') 返回 undefined → prop 传了也不渲染）。
    若未来引入 vxe-pc-ui，可换回 vxe 原生 loading prop
  -->
  <div v-else-if="vxeTableComp" ref="proTableVxeRoot" v-loading="loading">
    <component
      :is="vxeTableComp"
      ref="vxeTableInst"
      :data="rows"
      :max-height="maxHeight ?? undefined"
      :row-config="{ keyField: rowKey ?? 'id' }"
      :sort-config="hasCustomSort(columns as ProColumn[]) ? { remote: true } : undefined"
      :checkbox-config="checkboxConfig"
      v-bind="{
        ...(cellSpan
          ? { spanMethod: cellSpan.spanMethod, cellClassName: cellSpan.cellClassName }
          : {}),
        ...(treeConfigBinding ?? {}),
      }"
      @sort-change="handleSortChange"
      @checkbox-change="handleCheckboxChange"
      @checkbox-all="handleCheckboxAll"
      @radio-change="handleRadioChange"
      @cell-dblclick="handleCellDblclick"
      @toggle-tree-expand="handleToggleTreeExpand"
      @filter-change="handleFilterChange"
    >
      <!-- key 必须带序位：vxe-table 在 VxeColumn 挂载时按 DOM 位置注册 staticColumns，
         此后按注册序（renderSortNumber）渲染表头，Vue 按 key 移动组件实例不会触发重注册。
         列设置拖拽排序后若 key 仅 col.prop，实例只移动不重挂载，vxe 列序不更新（v2.1 修复的 bug） -->
      <component
        :is="vxeColumnComp"
        v-for="(col, index) in columns"
        :key="`${col.prop}:${index}`"
        v-bind="{
          ...toVxeColumnProps(col),
          ...(props.columnResize ? { resizable: true } : {}),
          ...(props.treeData && index === treeColumnIndex ? { 'tree-node': true } : {}),
        }"
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
              :col="col as ProColumn"
              :value="rowEdit.getValue(rowKeyOf(scope.row), col.prop)"
              :density="density"
              @update="(prop, v) => rowEdit?.setValue(rowKeyOf(scope.row), prop, v)"
            />
            <!-- 默认渲染（与 ElementTableBody 共用 cell-render 适配层） -->
            <CellContent
              v-else
              :content="resolveCellContent(col, scope.row, scope.rowIndex ?? 0)"
            />
          </slot>
        </template>
      </component>
    </component>
  </div>
</template>
