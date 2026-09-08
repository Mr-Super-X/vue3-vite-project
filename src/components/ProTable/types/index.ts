/**
 * ProTable 类型集中定义（spec §4 文件清单 / §7 props 透传 / §八 defineExpose 的类型源头）。
 *
 * 所有类型通过 `src/components/ProTable/index.ts` barrel re-export 暴露给业务方。
 * JSDoc 单属性只允许一段（§5.1 陷阱 #2），barrel 用 `export { type X }`（陷阱 #3），
 * JSDoc 必须紧贴 export（陷阱 #4），@group 不能代替业务描述（陷阱 #5）。
 *
 * @group ProTable 类型
 */
import type { ComponentPublicInstance, Ref, VNode } from 'vue'

/** 行内编辑配置 —— 列粒度控制哪些字段可编辑 @group ProTable 类型 */
export interface ColumnEditConfig {
  el: 'input' | 'select' | 'input-number' | string
  props?: Record<string, unknown>
  rules?: Record<string, unknown> | Record<string, unknown>[]
  editable?: boolean | Ref<boolean>
}

/** 树形数据配置 —— 列粒度标识「该列展示树形缩进 + 展开/折叠」 @group ProTable 类型 */
export interface ColumnTreeConfig {
  indentSize?: number
  expandSlot?: string
}

/** 单元格合并配置 —— 列粒度声明「该列参与合并」 @group ProTable 类型 */
export interface ColumnSpanConfig {
  direction: 'row' | 'column' | 'both'
  judge?: (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => boolean
}

/** 行编辑顶层配置 @group ProTable 类型 */
export interface RowEditConfig {
  trigger?: 'dblclick' | 'manual'
  exclusive?: boolean
  onSave?: (
    row: Record<string, unknown>,
    changes: Record<string, unknown>
  ) => boolean | Promise<boolean>
  onSaved?: (row: Record<string, unknown>) => void
  onSaveError?: (row: Record<string, unknown>, error: unknown) => void
}

/** 树形数据顶层配置 @group ProTable 类型 */
export interface TreeConfig {
  loadChildren?: (row: Record<string, unknown>) => Promise<Record<string, unknown>[]>
  childrenKey?: string
  defaultExpandDepth?: number
  rowKey?: string
  showLine?: boolean
  loadDebounce?: number
  /** v2.0 与编辑共存时，编辑仅作用于叶子节点；true 时禁用编辑按钮 */
  exclusive?: boolean
}

/** 单元格合并顶层配置 @group ProTable 类型 */
export interface CellSpanConfig {
  judge?: (params: {
    row: Record<string, unknown>
    column: ProColumn
    rowIndex: number
    columnIndex: number
  }) => { rowspan: number; colspan: number }
  spanHeader?: boolean
  maxMergeSpan?: number
  /** v2.0 列级合并方向（与 ColumnSpanConfig.direction 同义，作用于全局） */
  direction?: 'row' | 'column' | 'both'
}

/** 行拖拽排序顶层配置 @group ProTable 类型 */
export interface RowDragConfig {
  handle?: string | '__all__'
  onSortChange?: (newOrder: Record<string, unknown>[]) => boolean | Promise<boolean>
}

/** 搜索项 el 控件类型 —— 决定 SearchForm 渲染哪种 element-plus 控件 @group ProTable 类型 */
export type SearchElType =
  'input' | 'select' | 'date-picker' | 'tree-select' | 'cascader' | 'input-number'

/** 表格引擎枚举 —— spec 决策 4：首次 mount 锁定，运行时 prop 修改无效；'vxe-table' v2.0 未实现（回退 element-plus，v2.1 支持） @group ProTable 类型 */
export type TableEngine = 'element-plus' | 'vxe-table'

/** 表格密度三档 —— 附录 A #7 默认 'default' @group ProTable 类型 */
export type TableDensity = 'compact' | 'default' | 'loose'

/**
 * 排序状态 —— 组件向外暴露 / emit 的形态；null 表示未排序（表头第三击清除）。
 *
 * 泛型 T = 行数据类型（M2 服务端排序），prop 联合 string 与 ProColumn.prop 同理由。
 *
 * @group ProTable 类型
 */
export interface SortState<T extends object = Record<string, unknown>> {
  /** 排序列字段名（IDE 优先补全 T 的键；联合 string 放行特殊列） */
  prop: Extract<keyof T, string> | string
  /** 升序 / 降序 */
  order: 'ascending' | 'descending'
}

/**
 * el-table sort-change 事件负载（order 为 null = 第三击清除排序；prop 对齐 element-plus 声明可为 null）。
 *
 * @group ProTable 类型
 */
export interface SortChangeEvent {
  prop: string | null
  order: 'ascending' | 'descending' | null
}

/**
 * 枚举项（与 element-plus el-option / ProTable enum 渲染对齐）。
 *
 * @group ProTable 类型
 */
export interface EnumProps {
  /** 显示文本 */
  label: string
  /** 值（用于回填 searchParams 与表格 cell 显示） */
  value: string | number | boolean
  /** ElTag 类型（enum 渲染时使用） */
  tagType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 是否禁用（搜索下拉场景） */
  disabled?: boolean
}

/**
 * 搜索项配置 —— 描述一个 search 控件的渲染与默认值。
 *
 * @group ProTable 类型
 */
export interface SearchConfig {
  /** 渲染哪种 element-plus 控件 */
  el: SearchElType
  /** 透传给 element-plus 控件的 props（type / placeholder / clearable 等） */
  props?: Record<string, unknown>
  /** 初始默认值（reset 时恢复，附录 A #1） */
  defaultValue?: unknown
  /** 排序权重（升序；缺省按 columns 数组顺序） */
  order?: number
  /** el-col 占位（默认 6，4 列布局） */
  span?: number
  /** 自定义搜索插槽名（spec §7 `search-[prop]`） */
  slot?: string
}

/**
 * ProTable 列定义 —— 同时驱动表格列与搜索项（spec §1 配置驱动）。
 *
 * 泛型 T = 行数据类型（M1 泛型化，默认 Record<string, unknown> 向后兼容）。
 * render/headerRender 用「方法语法」声明：TS 对方法参数做双变（bivariance）检查，
 * 使 ProColumn<T> 可赋值给 ProColumn（默认 Record）——下游子组件与能力层消费方
 * 无需泛型化（§5.1 JSDoc 陷阱 #2：单属性一段注释）。
 * ⚠️ 行类型建议用 type 别名而非 interface：interface 无隐式索引签名，
 * 赋值到默认 T 位置（Record<string, unknown>）可能报 TS #15300 相关错误。
 *
 * @group ProTable 类型
 */
export interface ProColumn<T extends object = Record<string, unknown>> {
  /** 字段名（v-for key + table column prop + search 表单 key）—— IDE 优先补全 T 的键；联合 string 放行 'operation' 等特殊列（决策 D1） */
  prop: Extract<keyof T, string> | string
  /** 显示文本（表头 + 表单 label） */
  label: string
  /** 特殊列类型（index 序号 / selection 多选 / expand 展开 / operation 操作） */
  type?: 'index' | 'selection' | 'expand' | 'operation'
  width?: number | string
  minWidth?: number | string
  /** 固定列（left/right；false 由列设置抽屉控制） */
  fixed?: 'left' | 'right'
  /** 是否可排序 —— true 客户端排序（el-table 原生行为）；'custom' 服务端排序（M2：sort-change → 请求参数） */
  sortable?: boolean | 'custom'
  /** 是否隐藏（支持 Ref 响应式，列设置抽屉切换） */
  hidden?: boolean | Ref<boolean>
  /** 搜索配置（缺省则该列不参与搜索区） */
  search?: SearchConfig
  /** 字典映射（自动渲染 ElTag） */
  enum?: EnumProps[]
  /** 是否从 useDict 异步字典过滤（spec §九 #9） */
  isFilterEnum?: boolean
  /** el-option fieldNames（label/value 映射，与 element-plus 对齐） */
  fieldNames?: { label: string; value: string }
  /** 自定义表头渲染（返回 VNode；支持 h() 与 JSX）—— 方法语法（bivariance），见接口级注释 */
  headerRender?(scope: { column: ProColumn<T>; $index: number }): VNode
  /** 自定义单元格渲染（返回 VNode；不传则按 enum/字段值渲染）—— 方法语法（bivariance），见接口级注释 */
  render?(scope: { row: T; column: ProColumn<T>; $index: number }): VNode
  /** 透传给 ElTableColumn 的 props */
  tableProps?: Record<string, unknown>
  /** 透传给 VxeColumn 的 props（仅 vxe-table 引擎生效；补充不覆盖映射派生值 field/title/sortable 等） */
  vxeProps?: Record<string, unknown>
  /** 行内编辑配置（不声明 = 该列只读） */
  edit?: ColumnEditConfig
  /** 树形列声明（仅一列生效，默认第一列） */
  tree?: ColumnTreeConfig
  /** 单元格合并配置（不声明 = 该列不参与合并） */
  span?: ColumnSpanConfig
  /** 该列是否参与行拖拽（默认 false 不参与） */
  draggable?: boolean
}

/**
 * ProTable requestApi 响应结构 —— 后端约定（data + total + pageNum + pageSize）。
 *
 * 泛型 T = 行数据类型（M1 泛型化，默认 Record<string, unknown> 向后兼容）。
 *
 * @group ProTable 类型
 */
export interface ProTableResponse<T extends object = Record<string, unknown>> {
  data: T[]
  total: number
  pageNum: number
  pageSize: number
}

/**
 * ProTable requestApi 方法签名。
 *
 * 泛型 T = 行数据类型（M1 泛型化，默认 Record<string, unknown> 向后兼容）。
 *
 * @group ProTable 类型
 */
export type ProTableRequestApi<T extends object = Record<string, unknown>> = (
  params: Record<string, unknown>
) => Promise<ProTableResponse<T>>

/**
 * ProTable 组件 props —— 公开 API 的类型契约（spec §4 / §7）。
 *
 * 泛型 T = 行数据类型（M1 泛型化，默认 Record<string, unknown> 向后兼容）。
 *
 * @group ProTable 类型
 */
export interface ProTableProps<T extends object = Record<string, unknown>> {
  /** 列定义（同时驱动表格列与搜索项） */
  columns: ProColumn<T>[]
  /** 数据请求方法（必填） */
  requestApi: ProTableRequestApi<T>
  /** 固定查询参数（搜索时与表单值合并；附录 A #10 序列化规则） */
  initParam?: Record<string, unknown>
  /**
   * 数据预处理（在 useTable 拿到 result 之后）—— 方法语法（bivariance），
   * 与 render 同理由：保证 ProTableProps<T> 在下游非泛型消费时可赋值
   */
  dataCallback?(data: T[]): T[]
  /** 请求错误回调（useRequest.onError 已自动捕获错误） */
  requestError?: (error: unknown) => void
  /** 是否显示分页（true / false / 透传 props） */
  pagination?: boolean | Record<string, unknown>
  /**
   * 排序参数序列化适配（决策 D2）—— 缺省用内置约定 { orderByColumn, isAsc }；
   * 后端约定不同时用它改键名/形态（如 (state) => ({ sortBy: state.prop, sortOrder: state.order })）
   */
  sortParamsAdapter?: (state: SortState<T>) => Record<string, unknown>
  /**
   * 响应结构适配器（决策 D5 fail-fast）—— 兼容非 { data, total, pageNum, pageSize } 约定的后端。
   * requestApi 可原样返回后端结构（类型侧 cast 一次），由本回调映射为 ProTableResponse<T>；
   * 映射结果结构非法（data 非数组 / total 非数字）时 console.error + 抛错（经 useRequest 错误通道进入 error 态）。
   */
  responseAdapter?: (raw: unknown) => ProTableResponse<T>
  /** 表格引擎（spec 决策 4：首次 mount 前设置，运行时修改需 reload） */
  tableEngine?: TableEngine
  /** 用于 localStorage 缓存列设置的 key（未传则不持久化，附录 A #5） */
  tableKey?: string
  /** 行 key 字段名（多选必填） */
  rowKey?: string
  /** 初始每页大小（默认 10） */
  pageSize?: number
  /** 搜索项默认显示行数（默认 3 行；超出可展开） */
  searchRows?: number
  /** 默认密度（附录 A #7 默认 'default'） */
  density?: TableDensity
  /** 行内编辑（v2.0） */
  enableRowEdit?: boolean | RowEditConfig
  /** 树形数据（v2.0） */
  enableTree?: boolean | TreeConfig
  /** 单元格合并（v2.0） */
  enableCellSpan?: boolean | CellSpanConfig
  /** 行拖拽排序（v2.0） */
  enableRowDrag?: boolean | RowDragConfig
}

/**
 * ProTable 实例对外暴露的 API（spec §八）—— 父组件通过 ref 调用。
 *
 * 泛型 T = 行数据类型（M1 泛型化，默认 Record<string, unknown> 向后兼容）。
 *
 * @group ProTable 类型
 */
export interface ProTableExpose<T extends object = Record<string, unknown>> {
  /** 重新执行当前搜索条件（搜索参数不变） */
  refresh: () => Promise<void>
  /**
   * 重置搜索参数到 defaultValue + 清空分页 + 刷新
   * 默认行为：保留多选选中行（附录 A #1；调用方需清可调 clearSelection）
   */
  reset: () => Promise<void>
  /** 当前多选选中的行（按 row-key 去重） */
  getSelectedRows: () => T[]
  /** 清空所有选中 */
  clearSelection: () => void
  /** 当前搜索参数（响应式 read-only snapshot） */
  getSearchParams: () => Record<string, unknown>
  /**
   * 程序化修改搜索参数（修改后自动触发搜索 + 回到第 1 页，附录 A #9）
   * 默认行为：保留多选选中行（附录 A #3）
   */
  setSearchParams: (params: Record<string, unknown>) => Promise<void>
  /**
   * element-plus 表格实例（v2.0 vxe-table 引擎未实现，传入时回退 element-plus，故恒有值）。
   * 使用 ComponentPublicInstance 而非 InstanceType<typeof ElTable>，
   * 原因：el-table 是 functional 组件定义，InstanceType 不适用。
   * 父组件如需直接调用 el-table 方法，可通过类型断言访问具体方法。
   */
  element: Ref<ComponentPublicInstance | null>
  /** 当前激活的引擎（首次挂载锁定） */
  engine: TableEngine
  /** 当前排序状态（null = 未排序；M2 服务端排序） */
  getSortState: () => SortState<T> | null
  // 行内编辑（v2.0 —— Task 7 实施后改为 required）
  startEdit?: (rowKey: string | number) => void
  cancelEdit?: (rowKey?: string | number) => void
  saveEdit?: (rowKey?: string | number) => Promise<boolean>

  // 树形（v2.0 —— Task 7 实施后改为 required）
  expandNode?: (rowKey: string | number, expanded?: boolean) => void
  collapseNode?: (rowKey: string | number) => void
  refreshChildren?: (rowKey: string | number) => Promise<void>

  // 行拖拽（v2.0 —— Task 7 实施后改为 required）
  setRowOrder?: (newOrder: T[]) => void
}
