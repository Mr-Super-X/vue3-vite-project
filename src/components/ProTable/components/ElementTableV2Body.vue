<script setup lang="ts">
/**
 * ElementTableV2Body —— element-plus v2 引擎渲染分支（v3.0.1 新增）
 *
 * 职责：包装 `<el-table-v2>` + 列 cellRenderer 适配，承接虚拟化分支的渲染。
 * 与 ElementTableBody（v1 引擎）并列存在，由 ProTable.vue 编排层按
 * `virtualized && engineRef==='element-plus'` 条件选择挂载。
 *
 * 关键差异：ElTableV2 是 fixed-size 容器（必须 px 数字），与 el-table v1 的
 * 自适应容器不同。本组件用 ResizeObserver 监听父容器尺寸变化，回填实际 px
 * 到 width/height，让虚拟滚动表格跟着父容器自适应。
 *
 * 已知限制（强隔离策略）：
 * - 不支持树形 / 展开行 / 汇总行 / 单元格合并 / 行拖拽 / 多选列（v2 引擎无对应能力，
 *   type='selection' 列命中时 warn + 忽略，见下方 selection 守卫）
 * - v3.0.2 修复（C1）：具名插槽透传已通过 useSlots() 桥接到 cellRenderer，
 *   v1 `<template #prop="scope">` 写法在 v2 引擎下也生效（优先级：
 *   render > slot > formatter > enum > 默认 row[prop]）
 *
 * 关键实现决策（与 element-plus 2.14 源码对齐，勿回退）：
 * - 传 table 级 `fixed` prop（v1 语义模式）：useColumns 走 rigid 布局——列宽精确 =
 *   配置宽度、总宽超出容器时产生横向滚动条（bodyWidth = max(columnsTotalWidth, 容器宽)）。
 *   v3.0.2 C2 文档化：`fixed=true` 模式下源码禁用 `flexGrow` / `minWidth` CSS，
 *   剩余空间填充由下方 fillColumnsToContainer 用 v1 算法（按 minWidth 比例分配）自己算；
 *   列宽拖拽通过 TableV2 内置列分隔符（column separator）拖拽实现，与 CSS flexGrow
 *   无关，仍可用。详见下方 fillColumnsToContainer。
 * - 用 `row-height`（fixed-size 模式）而非 `estimated-row-height`：后者走 DynamicSizeGrid，
 *   按 rowKey 缓存实测行高，density 切换不会重新测量（密度切换失效），且逐行测量拖慢滚动
 * - 排序用 `onColumnSort` callback prop（TableV2 不 emit sort-change）+ `sortBy` 驱动表头图标
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方
 * @group ProTable 组件
 */
import { computed, h, onBeforeUnmount, onMounted, ref, watch, type VNode } from 'vue'
import { ElTableV2, ElTag } from 'element-plus' // element-plus 按需注入（unplugin-vue-components 只管模板，script 中显式 import）
import type { ProColumn, SortChangeEvent, TableDensity, VirtualScrollConfig } from '../types'

/** density → 行高映射（el-table-v2 不响应 CSS 变量，必须显式传 rowHeight）
 *
 * ⚠️ H1 单源化约束：此字典是 v2 引擎的行高真理源。
 * v1 引擎（el-table）走 SCSS 变量定义在 `styles/element-protable-overwrite.scss`
 * 的 `$pro-table-density-tokens`。两处数值必须保持同步：
 *   compact: 32px
 *   default: 48px
 *   loose:   64px
 * 调整密度档位时两处都要改（v3.0.1 已知约束，引入 CSS 变量桥接会让 v2 引擎多一层
 * 运行时 getComputedStyle 开销，权衡后维持双源）。 */
const DENSITY_ROW_HEIGHT: Record<TableDensity, number> = {
  compact: 32,
  default: 48,
  loose: 64,
}

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
  /** v3.0.1：表格密度（el-table-v2 不响应 CSS 变量，需显式传 estimatedRowHeight） */
  density?: TableDensity | undefined
  /**
   * v3.0.2 P0 C1 修复：父作用域具名插槽映射（v1 `<template #prop="scope">` 透传）。
   *
   * key = 列 prop，value = 插槽渲染函数（接收 { row, column, $index } 返回 VNode）。
   * 子组件 useSlots() 拿不到父级插槽，必须由 ProTable 编排层把 $slots 透传下来。
   */
  slots?:
    | Record<
        string,
        (scope: { row: Record<string, unknown>; column: ProColumn; $index: number }) => VNode
      >
    | undefined
}>()

const emit = defineEmits<{
  /** 排序变化（翻译自 TableV2 onColumnSort；负载对齐 el-table v1 sort-change 约定） */
  (e: 'sort-change', evt: SortChangeEvent): void
}>()

/** 容器 DOM ref —— ResizeObserver 监听 */
const containerRef = ref<HTMLDivElement | null>(null)

/** 实际容器尺寸（响应父容器变化） */
const measuredWidth = ref(0)
const measuredHeight = ref(0)

/** 配置高度的缺省值（virtualConfig.height 优先） */
const configuredHeight = computed(() => props.virtualConfig.height ?? 500)

/**
 * ElTableV2 必须传 px 数字，不能是 'auto' / 百分比 / undefined。
 * 策略：mounted 时通过 ResizeObserver 测量父容器实际宽高，缺省时
 * 容器宽度 = 父容器 clientWidth，高度 = 配置的 virtualConfig.height。
 *
 * 优先级（H2 修复）：
 * - width：virtualConfig.width 数字 → 实测 → fallback 800（首次测量前）
 * - height：virtualConfig.height 数字（>0） → 实测 → configuredHeight 兜底
 *
 * 用户显式配置 px 数字时优先于父容器实测——避免父容器高度异常（如 0 / 视口过小）
 * 时覆盖用户预期。这是与 width 对称的语义。
 */
const effectiveWidth = computed(() => {
  // 配置指定了具体 px 数字 → 用配置；否则用实测
  const w = props.virtualConfig.width
  if (typeof w === 'number' && w > 0) return w
  return measuredWidth.value || 800 // 首次测量前 fallback（避免 width=0）
})

const effectiveHeight = computed(() => {
  // 配置指定了 px 数字 → 优先用配置（H2 修复：避免实测异常值覆盖用户预期）
  const configured = props.virtualConfig.height
  if (typeof configured === 'number' && configured > 0) return configured
  // 未配置 → 实测优先，缺测 fallback 到 DEFAULT_V2_HEIGHT
  return measuredHeight.value || configuredHeight.value
})

/** ResizeObserver 实例 —— onUnmounted disconnect */
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!containerRef.value) return
  // 首次同步测量
  const rect = containerRef.value.getBoundingClientRect()
  measuredWidth.value = Math.round(rect.width)
  measuredHeight.value = Math.round(rect.height) || configuredHeight.value

  // ResizeObserver 监听父容器尺寸变化。
  // typeof 守卫：vitest jsdom 环境 + Node SSR 不提供 ResizeObserver，
  // 缺测时 fallback 到初始测量值（容器变化时不响应，但能正常渲染）。
  if (typeof ResizeObserver === 'undefined') return

  // 监听父容器尺寸变化（响应式同步）
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect
      measuredWidth.value = Math.round(cr.width)
      // height 用父容器实测（避免 fixed height 配置和 ResizeObserver 冲突）
      const target = entry.target as HTMLElement
      if (target) {
        const h = Math.round(target.getBoundingClientRect().height)
        if (h > 0) measuredHeight.value = h
      }
    }
  })
  resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

/** ProColumn → el-table-v2 Column 适配
 *
 * 关键字段映射（el-table-v2 与 v1 API 差异最大处）：
 * - key      ↔ ProColumn.prop（v2 唯一标识）
 * - dataKey  ↔ ProColumn.prop（v2 取行数据字段名，**不是 prop**）
 * - title    ↔ ProColumn.label
 * - width    ↔ 见下方 fillColumnsToContainer（v1 填充算法 + 精确宽度）
 * - sortable ↔ boolean（ProColumn 允许 'custom'，v2 只认布尔）
 *
 * table 级 fixed=true（rigid 布局）下源码禁用 flexGrow/minWidth CSS，列宽全部需精确数字：
 * 总宽超出容器 → bodyWidth 撑出横向滚动条（v1 语义）；不足 → 由 fillColumnsToContainer
 * 把剩余宽度按 minWidth 比例分配给可拉伸列（对齐 el-table v1 的 flex-grow 行为）。
 *
 * selection 列在此过滤（warn 见上方守卫）；headerCellRenderer 不自定义，
 * 用默认渲染（title + sort 图标由 TableV2 内部组合，自定义反而会丢样式类名）。
 */

/** 可拉伸列判定：仅 minWidth、无显式 width（v1 中只有这类列参与剩余空间分配） */
function isStretchable(col: ProColumn): boolean {
  return col.width === undefined && col.minWidth !== undefined
}

/** 列宽数值化：el-table v1 允许数字字符串（如 '200'），v2 布局数学只认 number */
function toPxWidth(w: number | string | undefined): number {
  if (typeof w === 'number' && Number.isFinite(w) && w > 0) return w
  if (typeof w === 'string') {
    const parsed = Number(w)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 0
}

/** 基础列宽：显式 width 优先，其次 minWidth，最后 fallback 120（v1 ?? minWidth ?? 120 语义） */
function resolveBaseWidth(col: ProColumn): number {
  return toPxWidth(col.width) || toPxWidth(col.minWidth) || 120
}

/**
 * v1 列宽填充算法：剩余宽度按可拉伸列的 minWidth 比例分配（末列吸收取整余数，
 * 保证列宽总和精确等于容器宽，避免亚像素漂移）。容器未测量到时用 fallback 宽度。
 */
function fillColumnsToContainer(columns: ProColumn[], containerWidth: number): number[] {
  const base = columns.map(resolveBaseWidth)
  const stretchable = columns
    .map((col, index) => (isStretchable(col) ? index : -1))
    .filter((index) => index >= 0)
  const total = base.reduce((acc, w) => acc + w, 0)
  if (containerWidth <= total || stretchable.length === 0) return base
  const extra = containerWidth - total
  const stretchableMinWidthSum = stretchable.reduce(
    (acc, index) => acc + toPxWidth(columns[index]!.minWidth),
    0
  )
  const widths = [...base]
  let assigned = 0
  stretchable.forEach((colIndex, order) => {
    // 末列吸收取整余数：前 N-1 列向下取整，余数全给末列，总和精确 = containerWidth
    const share =
      order === stretchable.length - 1
        ? extra - assigned
        : Math.floor((extra * toPxWidth(columns[colIndex]!.minWidth)) / stretchableMinWidthSum)
    widths[colIndex] = base[colIndex]! + share
    assigned += share
  })
  return widths
}

const v2Columns = computed(() => {
  const list = props.columns.filter((col) => col.prop && col.type !== 'selection')
  const widths = fillColumnsToContainer(list, effectiveWidth.value)
  return list.map((col, index) => ({
    key: col.prop as string,
    dataKey: col.prop as string, // el-table-v2 用 dataKey 从 rowData 取值，**不是 prop**
    title: col.label,
    width: widths[index],
    ...(col.fixed !== undefined && { fixed: col.fixed }),
    ...(col.sortable && { sortable: true }),
    // M2 修复：cellRenderer 闭包捕获 col（不变）+ rowData/rowIndex（运行时传入），
    // 避免每次 measuredWidth 变化都创建新函数引用触发 TableV2 内部 diff 重渲。
    cellRenderer: (rendererProps: {
      rowData: Record<string, unknown>
      column: { dataKey: string; key: string }
      rowIndex: number
    }): VNode => renderCell(col, rendererProps.rowData, rendererProps.rowIndex),
  }))
})

/** density → cell padding（行高由 rowHeight 固定，padding 提供水平缩进 + 垂直留白） */
const DENSITY_CELL_PADDING: Record<TableDensity, string> = {
  compact: '4px 8px',
  default: '12px 8px',
  loose: '20px 8px',
}

/** 实际 rowHeight：density 优先，否则用 virtualConfig.rowHeight，否则 fallback 48 */
const effectiveRowHeight = computed(() => {
  if (props.density) return DENSITY_ROW_HEIGHT[props.density]
  return props.virtualConfig.rowHeight ?? 48
})

/**
 * TableV2 排序状态（驱动表头 SortIcon 展示）。
 * TableV2 只认 sortBy {key, order:'asc'|'desc'}；点击时取 oppositeOrder，
 * 故初始 'desc' 让首击升序，与 el-table v1 sort-change 默认行为一致。
 *
 * ⚠️ M3 已知语义差异：el-table v1 排序初始态为 'asc'（首击升序），TableV2 内部
 * 取 oppositeOrder 故初始为 'desc'。两者最终行为一致（首击升序），但若业务方
 * 通过 `sortBy` prop 强制预设排序状态，需注意此差异。详见 demo ProTableVirtualScroll
 * 验证步骤 4。 */
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }>({ key: '', order: 'desc' })

/**
 * TableV2 排序点击回调 —— onColumnSort 是 callback prop，TableV2 不 emit sort-change。
 * 把 'asc'|'desc' 翻译为编排层 SortChangeEvent 的 'ascending'|'descending' 后抛出。
 */
function handleColumnSort(param: { key: string; order: 'asc' | 'desc' }): void {
  sortBy.value = { key: param.key, order: param.order }
  emit('sort-change', {
    prop: param.key,
    order: param.order === 'asc' ? 'ascending' : 'descending',
  })
}

/** selection 列守卫：v2 无内置多选能力，命中即 warn + 忽略（防静默丢列）。
 *
 * H3 修复：原模块级 `let selectionWarned = false` 在多个 ProTable 实例下只触发一次 warn，
 * 导致后续实例命中 selection 列静默丢失。改为实例级 ref，每个实例独立计数。 */
const selectionWarned = ref(false)
watch(
  () => props.columns.some((c) => c.type === 'selection'),
  (hasSelection) => {
    if (hasSelection && !selectionWarned.value) {
      selectionWarned.value = true
      console.warn(
        '[ProTable] virtualized（el-table-v2）不支持 type="selection" 多选列，该列已被忽略'
      )
    }
  },
  { immediate: true }
)

/** 单元格渲染：P0 C1 修复后优先级链
 *
 * 1. ProColumn.render —— 业务自定义 h() 函数（最高优先，向后兼容）
 * 2. 具名插槽（v1 体验对齐） —— `slots[col.prop]?.({ row, column, $index })`
 * 3. ProColumn.formatter —— 简单字符串格式化（新增字段，M4 修复）
 * 4. ProColumn.enum —— 字典 ElTag 渲染（与 v1 cell-render 一致）
 * 5. 默认 row[prop] 文本（fallback）
 *
 * fixed-size 模式下行高由 rowHeight 控制，padding 只负责水平缩进与垂直留白
 * （需在 DENSITY_ROW_HEIGHT 内，超高内容会被裁剪）。
 */
function renderCell(col: ProColumn, row: Record<string, unknown>, rowIndex: number): VNode {
  const cellStyle = props.density ? { padding: DENSITY_CELL_PADDING[props.density] } : undefined
  const cellValue = row[col.prop as string]

  // 1. ProColumn.render —— 业务自定义渲染
  if (typeof col.render === 'function') {
    return h(
      'div',
      { style: cellStyle },
      col.render({ row: row as never, column: col, $index: rowIndex })
    )
  }

  // 2. 具名插槽（v1 透传桥接）—— C1 修复：父级 $slots 由 ProTable 编排层透传至 props.slots
  const propSlot = props.slots?.[col.prop as string]
  if (typeof propSlot === 'function') {
    const vnode = propSlot({ row, column: col, $index: rowIndex })
    return h('div', { style: cellStyle }, vnode)
  }

  // 3. ProColumn.formatter（M4 新增）
  if (typeof col.formatter === 'function') {
    const formatted = col.formatter(row, col, cellValue, rowIndex)
    return h('div', { style: cellStyle }, String(formatted ?? ''))
  }

  // 4. ProColumn.enum —— ElTag 字典
  if (col.enum && Array.isArray(col.enum)) {
    const entry = col.enum.find((e) => e.value === cellValue)
    if (entry) {
      return h(
        'div',
        { style: cellStyle },
        h(ElTag, { type: entry.tagType ?? 'info' }, () => entry.label)
      )
    }
  }

  // 5. fallback
  return h('div', { style: cellStyle }, String(cellValue ?? ''))
}

const bem = createNamespace('pro-table-v2')

defineExpose({})
</script>

<template>
  <!-- v-loading 与 ElementTableBody（v1 引擎）一致：TableV2 无内置 loading prop -->
  <div ref="containerRef" v-loading="loading" :class="bem.b()">
    <!--
      ElTableV2 props 类型签名来自 element-plus buildProps（PropType + required + validator），
      在模板属性级别需要绕过。运行时 v2Columns/effectiveWidth/effectiveHeight 等都已做好类型收口，
      故用单个强 cast 收敛。CLAUDE.md §4 严禁 any：此处是框架边界（element-plus buildProps
      类型签名严格性导致），注释豁免。
      fixed=true 开启 rigid 布局（横向滚动 + 精确列宽）；行高走 row-height、排序接 onColumnSort
      的原因见 <script> 头部「关键实现决策」。
    -->
    <ElTableV2
      :columns="v2Columns as never"
      :data="props.rows as never"
      :width="effectiveWidth as never"
      :height="effectiveHeight as never"
      :row-height="effectiveRowHeight as never"
      :row-key="(props.rowKey ?? 'id') as never"
      :sort-by="sortBy as never"
      :fixed="true as never"
      :on-column-sort="handleColumnSort as never"
    />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-v2 {
  // ElTableV2 是 fixed-size 容器，自身必须有明确尺寸。
  // 父容器决定大小（本组件通过 ResizeObserver 读取）。
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
