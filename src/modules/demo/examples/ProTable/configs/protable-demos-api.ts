/**
 * ProTable 各 demo 私有 API 表格数据集合（spec §八.5）
 *
 * 命名约定：xxxItems（如 rowEditItems / treeItems / cellSpanItems / rowDragItems）
 * 字段约定：name / type / required / default / description
 *
 * @group Demo API
 */

export interface ApiItem {
  name: string
  type: string
  required?: boolean
  default?: string
  description: string
}

/* ───────────── 行内编辑 demo（ProTableRowEdit） ───────────── */

export const rowEditPropsItems: ApiItem[] = [
  {
    name: 'enableRowEdit',
    type: 'boolean | RowEditConfig',
    required: false,
    default: 'false',
    description: '启用行内编辑能力。传 boolean 启用默认配置；传对象启用细粒度配置。',
  },
  {
    name: 'trigger',
    type: "'dblclick' | 'manual'",
    required: false,
    default: "'dblclick'",
    description: '编辑触发方式：dblclick 双击进入 / manual 仅 API 触发。',
  },
  {
    name: 'onSave',
    type: '(row, changes) => boolean | Promise<boolean>',
    required: false,
    description: '保存钩子：返回 false 阻止保存，reject 视为保存失败（保留 editing + 错误态）。',
  },
  {
    name: 'onSaved',
    type: '(row) => void',
    required: false,
    description: '保存成功回调。',
  },
  {
    name: 'onSaveError',
    type: '(row, error) => void',
    required: false,
    description: '保存失败回调（async onSave reject 触发）。',
  },
]

export const rowEditColumnItems: ApiItem[] = [
  {
    name: 'edit.el',
    type: "'input' | 'select' | 'input-number' | string",
    required: false,
    description: '编辑控件类型；自定义组件名可通过 XForm-style 注册。',
  },
  {
    name: 'edit.props',
    type: 'Record<string, unknown>',
    required: false,
    description: '透传给编辑控件的 props（如 precision / options）。',
  },
  {
    name: 'edit.rules',
    type: 'Record | Record[]',
    required: false,
    description: '字段级校验规则（async-validator 协议）。',
  },
  {
    name: 'edit.editable',
    type: 'boolean | Ref<boolean>',
    required: false,
    description: '该字段是否可编辑（响应式 Ref 支持按行状态切换）。',
  },
]

export const rowEditExposeItems: ApiItem[] = [
  {
    name: 'startEdit(rowKey)',
    type: 'fn',
    description: '进入编辑态（manual trigger 下手动调用）。',
  },
  { name: 'cancelEdit(rowKey?)', type: 'fn', description: '取消编辑；不传 rowKey 取消所有。' },
  {
    name: 'saveEdit(rowKey?)',
    type: 'fn',
    description: '保存编辑；不传 rowKey 保存所有。返回 Promise<boolean>。',
  },
]

/* ───────────── 树形数据 demo（ProTableTree） ───────────── */

export const treeConfigItems: ApiItem[] = [
  {
    name: 'loadChildren',
    type: '(row) => Promise<Record[]>',
    required: false,
    description: '懒加载方法；不传 = 一次性返回 children。',
  },
  {
    name: 'childrenKey',
    type: 'string',
    required: false,
    default: "'children'",
    description: '子节点字段名。',
  },
  {
    name: 'defaultExpandDepth',
    type: 'number',
    required: false,
    default: '1',
    description: '默认展开深度。',
  },
  {
    name: 'rowKey',
    type: 'string',
    required: false,
    default: "'id'",
    description: '树形节点唯一 id 字段。',
  },
  {
    name: 'loadDebounce',
    type: 'number',
    required: false,
    default: '200',
    description: '懒加载防抖（ms），防止快速点击触发多次请求。',
  },
  {
    name: 'showLine',
    type: 'boolean',
    required: false,
    default: 'false',
    description: '是否显示连接线。',
  },
]

export const treeExposeItems: ApiItem[] = [
  { name: 'expandNode(rowKey, expanded?)', type: 'fn', description: '展开/折叠指定节点。' },
  { name: 'collapseNode(rowKey)', type: 'fn', description: '折叠指定节点。' },
  {
    name: 'refreshChildren(rowKey)',
    type: 'fn',
    description: '刷新节点子节点（重新触发 lazy load）。',
  },
]

/* ───────────── 单元格合并 demo（ProTableCellSpan） ───────────── */

export const cellSpanColumnItems: ApiItem[] = [
  {
    name: 'span.direction',
    type: "'row' | 'column' | 'both'",
    required: false,
    description: '合并方向。row=同列相邻合并 / column=跨列合并 / both=两者。',
  },
  {
    name: 'span.judge',
    type: '(a, b) => boolean',
    required: false,
    description: '自定义合并判定函数；不传按相邻值相等自动合并。',
  },
]

export const cellSpanConfigItems: ApiItem[] = [
  {
    name: 'maxMergeSpan',
    type: 'number',
    required: false,
    default: '10',
    description: '同列相邻合并上限（防单列合并成 1 行的 UX 灾难）。',
  },
  {
    name: 'spanHeader',
    type: 'boolean',
    required: false,
    default: 'false',
    description: '列表头是否参与合并。',
  },
]

/* ───────────── 行拖拽 demo（ProTableRowDrag） ───────────── */

export const rowDragColumnItems: ApiItem[] = [
  {
    name: 'draggable',
    type: 'boolean',
    required: false,
    default: 'false',
    description: '该列是否参与行拖拽（拖拽手柄列）。',
  },
]

export const rowDragConfigItems: ApiItem[] = [
  {
    name: 'handle',
    type: "string | '__all__'",
    required: false,
    default: "'first-col'",
    description: "拖拽手柄列 prop；'__all__' = 整行可拖。",
  },
  {
    name: 'onSortChange',
    type: '(newOrder) => boolean | Promise<boolean>',
    required: false,
    description: '排序变化回调：返回 false 回滚，返回 Promise 等待异步确认。',
  },
]

export const rowDragExposeItems: ApiItem[] = [
  {
    name: 'setRowOrder(newOrder)',
    type: 'fn',
    description: '程序化设置行顺序（拖拽后的新顺序）。',
  },
]

/* ───────────── 服务端排序 demo（ProTableServerSort） ───────────── */

export const sortColumnItems: ApiItem[] = [
  {
    name: 'sortable',
    type: "boolean | 'custom'",
    required: false,
    default: 'false',
    description:
      "true 客户端排序（el-table 原生）；'custom' 服务端排序（点击表头把排序参数发给后端）。",
  },
]

export const sortPropsItems: ApiItem[] = [
  {
    name: 'sortParamsAdapter',
    type: '(state: SortState) => Record<string, unknown>',
    required: false,
    description: '排序参数序列化适配；缺省 { orderByColumn, isAsc }。',
  },
]

export const sortExposeItems: ApiItem[] = [
  {
    name: 'getSortState()',
    type: 'SortState | null',
    description: '当前排序状态；组件同时向外 emit sort-change 事件。',
  },
]

/* ───────────── 引擎对比 demo（ProTableEngineCompare，v2.1） ───────────── */

export const enginePropsItems: ApiItem[] = [
  {
    name: 'tableEngine',
    type: "'element-plus' | 'vxe-table'",
    required: false,
    default: "'element-plus'",
    description:
      '渲染引擎：vxe-table 首次 mount 时动态加载（JS + CSS 按需注入，chunk 不进首屏）；加载失败自动回退 element-plus。',
  },
]

export const engineColumnItems: ApiItem[] = [
  {
    name: 'vxeProps',
    type: 'Record<string, unknown>',
    required: false,
    description:
      '透传 VxeColumn props（仅 vxe 引擎生效）；定位为补充不覆盖——与 ProTable 派生字段（field/title/sortable 等）冲突时以派生值为准。',
  },
]

export const engineMatrixItems: ApiItem[] = [
  {
    name: '多选 selection',
    type: '✅ 支持',
    description: 'checkbox-change / checkbox-all 合并为 selection-change。',
  },
  {
    name: '服务端排序',
    type: '✅ 支持',
    description: "sortable: 'custom' 走同一 sortParamsAdapter 协议。",
  },
  {
    name: '行内编辑',
    type: '✅ 支持',
    description: 'cell-dblclick 协议与 el-table 单参数对象签名兼容。',
  },
  {
    name: '单元格合并',
    type: '✅ 支持',
    description: 'span-method / cellClassName 直绑 vxe-table。',
  },
  {
    name: '树形数据',
    type: '❌ 暂不支持',
    description: '启动时 console.warn 并忽略 enableTree 配置。',
  },
  {
    name: '行拖拽排序',
    type: '❌ 暂不支持',
    description: '启动时 console.warn 并忽略 enableRowDrag 配置。',
  },
]

/* ───────────── v3.0 客户端汇总行 demo（ProTableSummary） ───────────── */

export const summaryConfigItems: ApiItem[] = [
  {
    name: 'enableSummary',
    type: 'boolean | SummaryConfig',
    required: false,
    default: 'false',
    description: '启用客户端汇总行；传 boolean 启用默认配置，传对象启用细粒度配置。',
  },
  {
    name: 'position',
    type: "'bottom' | 'top'",
    required: false,
    default: "'bottom'",
    description: '汇总行位置（v3.0 当前仅实现 bottom，top 预留）。',
  },
  {
    name: 'columns',
    type: 'Record<prop, ColumnSummaryConfig>',
    required: true,
    description: '按列 prop 声明聚合配置；未声明的列在汇总行不显示值。',
  },
  {
    name: 'label',
    type: 'string',
    required: false,
    default: "'合计'",
    description: '汇总行第一列显示的标签文本。',
  },
]

export const summaryColumnItems: ApiItem[] = [
  {
    name: 'aggregate',
    type: "'sum' | 'avg' | 'count' | 'max' | 'min'",
    required: true,
    description: '聚合函数类型。',
  },
  {
    name: 'formatter',
    type: '(value, rows) => string',
    required: false,
    description: '自定义格式化（如金额前缀 ¥）；默认保留 2 位小数 + 千分位。',
  },
  {
    name: 'label',
    type: 'string',
    required: false,
    description: '该列汇总值的标签前缀（默认继承 config.label）。',
  },
]

/* ───────────── v3.0 虚拟滚动 demo（ProTableVirtualScroll） ───────────── */

export const virtualScrollConfigItems: ApiItem[] = [
  {
    name: 'virtualized',
    type: 'boolean | VirtualScrollConfig',
    required: false,
    default: 'false',
    description: '启用虚拟滚动；传 boolean 启用默认 48px 行高，传对象启用细粒度配置。',
  },
  {
    name: 'rowHeight',
    type: 'number',
    required: false,
    default: '48',
    description: '行高（像素），用于 el-table-v2 / vxe scroll-y 配置。',
  },
  {
    name: 'overscan',
    type: 'number',
    required: false,
    default: '10',
    description: '预渲染行数（视区外多渲染的缓冲行数）。',
  },
  {
    name: 'height',
    type: 'number',
    required: false,
    default: '500',
    description:
      'v3.0.2 新增：容器高度 px 数字（H2 修复）。该值 > 0 时优先于父容器实测值，避免容器异常覆盖用户预期。',
  },
  {
    name: 'width',
    type: "number | 'auto'",
    required: false,
    default: "'auto'",
    description: 'v3.0.1 新增：容器宽度 px 数字或 auto。',
  },
]

export const virtualScrollColumnItems: ApiItem[] = [
  {
    name: 'formatter',
    type: '(row, column, cellValue, $index) => string | VNode',
    required: false,
    description:
      'v3.0.2 新增（M4）：轻量格式化函数。优先级 render > 插槽 > formatter > enum > 默认文本。',
  },
]

export const virtualScrollLimitsItems: ApiItem[] = [
  {
    name: 'enableRowEdit + virtualized',
    type: '互斥',
    description:
      '虚拟行索引 ≠ 真实数据索引会破坏行内编辑 key 映射；启用虚拟滚动时 enableRowEdit 自动失效（启动 warn）。',
  },
  {
    name: 'enableTree + virtualized',
    type: '暂未集成',
    description: 'v3.0 虚拟滚动主要服务平铺场景；树形模式集成留待 v3.0.1。',
  },
]

/* ───────────── v3.0 列分组 demo（ProTableGroupedHeader） ───────────── */

export const groupedHeaderColumnItems: ApiItem[] = [
  {
    name: 'children',
    type: 'ProColumn[]',
    required: false,
    description: '子列数组；声明后该列渲染为多级表头父列。',
  },
  {
    name: 'groupKey',
    type: 'string',
    required: false,
    description: '分组 ID（v3.0 预留字段，持久化按 prop 维度处理）。',
  },
]

export const groupedHeaderKnownLimitsItems: ApiItem[] = [
  {
    name: '完整多级表头',
    type: '⚠️ v3.0.1 待修复',
    description:
      'Element Plus 2.14 el-table-column 嵌套递归在 Vue 3.5 + unplugin-vue-components 组合下未生效（实测只产生 1 行 thead）。v3.0 采用务实方案：父列作单级 + 子列 cellClassName 视觉分组；v3.0.1 评估 h() 函数式渲染。',
  },
]

/* ───────────── v3.0 单元格 v-model demo（ProTableEditCellVModel） ───────────── */

export const editCellVModelColumnItems: ApiItem[] = [
  {
    name: 'edit.el',
    type: "'input' | 'select' | 'input-number' | string",
    required: false,
    description: '编辑控件类型；自定义组件名可通过 XForm-style 注册。',
  },
  {
    name: 'edit.updateEvent',
    type: "'input' | 'blur'",
    required: false,
    default: "'input'",
    description:
      'v3.0 新增：编辑值同步时机。input 即时同步（高频），blur 失焦同步（与 ProTable 默认 trigger 对齐）。',
  },
]
