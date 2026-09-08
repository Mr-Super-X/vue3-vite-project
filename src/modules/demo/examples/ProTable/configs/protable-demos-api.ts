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
    description: '启用行内编辑能力（v2.0）。传 boolean 启用默认配置；传对象启用细粒度配置。',
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
