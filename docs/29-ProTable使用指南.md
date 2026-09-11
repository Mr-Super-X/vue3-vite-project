# ProTable 配置驱动表格使用指南

> **文档版本**：v1.0.0 | **最后更新**：2026-09-11
> **覆盖版本**：v2.0（含 v2.1 vxe-table 引擎 + 服务端排序）
> **源码位置**：`src/components/ProTable/`
> **demo 站**：`/demo/pro-table-overview`（9 个演示：Overview / EngineCompare / Expand / ServerSort / Tree / StyleOverride / CellSpan / RowDrag / RowEdit）

---

## 📋 概述

`ProTable` 是项目内**配置驱动的企业级表格组件**，目标是替代传统「template 手写 + script 写状态 + 写一堆 watch」的散点式表格写法。

**3 大特色**：

| 特色                   | 体现                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **配置驱动**           | 一份 `columns` 同时驱动表头 + 表格列 + 搜索表单 + 列设置                                |
| **双引擎**             | `element-plus`（默认）+ `vxe-table`（v2.1 动态加载），自动回退                          |
| **6 composables 编排** | `useSearch` / `useColumns` / `useTable` / `useTableCapabilities` / 4 个能力 composables |
| **4 大能力**           | v2.0 新增：行内编辑 / 树形 / 单元格合并 / 行拖拽（按需启用）                            |
| **三态闭环**           | 与 `AsyncState` / `useRequest` 配合，loading/error/empty 完整处理                       |

**适用场景**：

- 中后台列表页（搜索 + 分页 + 多选 + 排序）
- 需要服务端排序 / 服务端筛选的「重表格」页面
- 树形数据展示（如组织架构、菜单管理）
- 单元格合并的报表类需求
- 需要行内编辑的快速录入场景

---

## 1. 基础用法

### 1.1 最小可运行

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import ProTable from '@/components/ProTable/ProTable.vue'
import type { ProColumn } from '@/components/ProTable/types'
import { userApi } from '@/api/modules/user'

interface UserRow {
  id: number
  username: string
  status: 'active' | 'disabled'
  createTime: string
}

const searchParams = reactive({})

const columns: ProColumn<UserRow>[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'username', label: '账号', search: { el: 'input' } },
  {
    prop: 'status',
    label: '状态',
    enum: [
      { label: '启用', value: 'active', tagType: 'success' },
      { label: '禁用', value: 'disabled', tagType: 'danger' },
    ],
    search: { el: 'select' },
  },
  { prop: 'createTime', label: '创建时间', width: 180 },
]

async function requestApi(params: Record<string, unknown>) {
  const { data } = await userApi.getList(params)
  return {
    data: data.list,
    total: data.total,
    pageNum: params.pageNum as number,
    pageSize: params.pageSize as number,
  }
}
</script>

<template>
  <ProTable :columns="columns" :request-api="requestApi" row-key="id" />
</template>
```

### 1.2 Props 表（v2.0）

| Prop                | 类型                                    | 默认值           | 说明                                              |
| ------------------- | --------------------------------------- | ---------------- | ------------------------------------------------- |
| `columns`           | `ProColumn<T>[]`                        | 必填             | 列定义（驱动表头 + 表格 + 搜索 + 列设置）         |
| `requestApi`        | `ProTableRequestApi<T>`                 | 必填             | 数据请求方法（必填）                              |
| `initParam`         | `Record<string, unknown>`               | `{}`             | 固定查询参数（与搜索值合并）                      |
| `dataCallback`      | `(data: T[]) => T[]`                    | `undefined`      | 数据后处理（拿到 result 之后）                    |
| `requestError`      | `(error: unknown) => void`              | `undefined`      | 请求错误回调                                      |
| `pagination`        | `boolean \| Record<string, unknown>`    | `true`           | 是否显示分页 / 透传分页 props                     |
| `sortParamsAdapter` | `(state: SortState<T>) => Record`       | 缺省约定         | 排序参数序列化（默认 `{ orderByColumn, isAsc }`） |
| `responseAdapter`   | `(raw: unknown) => ProTableResponse<T>` | 缺省直通         | 响应结构适配（非约定后端用）                      |
| `tableEngine`       | `'element-plus' \| 'vxe-table'`         | `'element-plus'` | 表格引擎（首次 mount 锁定）                       |
| `tableKey`          | `string`                                | `undefined`      | localStorage 持久化列设置的 key                   |
| `rowKey`            | `string`                                | 必填（多选）     | 行 key 字段名                                     |
| `pageSize`          | `number`                                | `10`             | 初始每页大小                                      |
| `searchRows`        | `number`                                | `3`              | 搜索项默认显示行数（超出可展开）                  |
| `density`           | `'compact' \| 'default' \| 'loose'`     | `'default'`      | 表格密度                                          |
| `enableRowEdit`     | `boolean \| RowEditConfig`              | `false`          | 行内编辑（v2.0）                                  |
| `enableTree`        | `boolean \| TreeConfig`                 | `false`          | 树形数据（v2.0）                                  |
| `enableCellSpan`    | `boolean \| CellSpanConfig`             | `false`          | 单元格合并（v2.0）                                |
| `enableRowDrag`     | `boolean \| RowDragConfig`              | `false`          | 行拖拽排序（v2.0）                                |

### 1.3 defineExpose（v2.0）

```ts
interface ProTableExpose<T> {
  // —— 基础 ——
  refresh(): Promise<void>
  reset(): Promise<void>
  getSelectedRows(): T[]
  clearSelection(): void
  getSearchParams(): Record<string, unknown>
  setSearchParams(params: Record<string, unknown>): Promise<void>
  element: Ref<ComponentPublicInstance | null>
  engine: TableEngine
  getSortState(): SortState<T> | null

  // —— 行内编辑（v2.0） ——
  startEdit(rowKey: string | number): void
  cancelEdit(rowKey?: string | number): void
  saveEdit(rowKey?: string | number): Promise<boolean>

  // —— 树形（v2.0） ——
  expandNode(rowKey: string | number, expanded?: boolean): void
  collapseNode(rowKey: string | number): void
  refreshChildren(rowKey: string | number): Promise<void>

  // —— 行拖拽（v2.0） ——
  setRowOrder(newOrder: T[]): void
}
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ProTable from '@/components/ProTable/ProTable.vue'

const tableRef = ref<InstanceType<typeof ProTable>>()

async function handleExport() {
  const rows = tableRef.value?.getSelectedRows() ?? []
  if (rows.length === 0) return ElMessage.warning('请先勾选')
  await exportApi(rows)
}

async function handleProgrammaticSearch() {
  await tableRef.value?.setSearchParams({ status: 'active' })
}
</script>
```

---

## 2. 列定义 `ProColumn`

`columns` 是 ProTable 的核心入口，**一份配置驱动 4 个区域**（表头 / 表格 / 搜索 / 列设置）。

### 2.1 字段表

| 字段           | 类型                                                | 说明                                                        |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `prop`         | `keyof T \| string`                                 | 字段名（v-for key + column prop + search 表单 key）         |
| `label`        | `string`                                            | 显示文本（表头 + form label）                               |
| `type`         | `'index' \| 'selection' \| 'expand' \| 'operation'` | 特殊列（序号 / 多选 / 展开 / 操作）                         |
| `width`        | `number \| string`                                  | 列宽                                                        |
| `minWidth`     | `number \| string`                                  | 最小列宽                                                    |
| `fixed`        | `'left' \| 'right'`                                 | 固定列                                                      |
| `sortable`     | `boolean \| 'custom'`                               | 是否可排序（`true` 客户端；`'custom'` 服务端，M2 触发请求） |
| `hidden`       | `boolean \| Ref<boolean>`                           | 是否隐藏（支持响应式，列设置抽屉切换）                      |
| `search`       | `SearchConfig`                                      | 搜索项配置（缺省则该列不参与搜索区）                        |
| `enum`         | `EnumProps[]`                                       | 字典映射（自动渲染 ElTag + 搜索下拉）                       |
| `headerRender` | `(scope) => VNode`                                  | 自定义表头渲染（`h()` 或 JSX）                              |
| `render`       | `(scope) => VNode`                                  | 自定义单元格渲染                                            |
| `tableProps`   | `Record<string, unknown>`                           | 透传给 ElTableColumn 的 props                               |
| `vxeProps`     | `Record<string, unknown>`                           | 透传给 VxeColumn 的 props（仅 vxe 引擎生效）                |
| `edit`         | `ColumnEditConfig`                                  | 行内编辑配置（不声明 = 只读）                               |
| `tree`         | `ColumnTreeConfig`                                  | 树形列声明（仅一列生效，默认第一列）                        |
| `span`         | `ColumnSpanConfig`                                  | 单元格合并配置（不声明 = 不参与）                           |
| `draggable`    | `boolean`                                           | 该列是否参与行拖拽（默认 false）                            |

### 2.2 枚举自动渲染（`enum` 字段）

`enum` 字段会让该列自动用 ElTag 渲染（颜色按 `tagType`），搜索区自动渲染为 select：

```ts
{
  prop: 'status',
  label: '状态',
  enum: [
    { label: '启用', value: 'active', tagType: 'success' },
    { label: '禁用', value: 'disabled', tagType: 'danger' },
    { label: '审核中', value: 'pending', tagType: 'warning' },
  ],
  search: { el: 'select' }, // 自动渲染为下拉
}
```

### 2.3 自定义渲染（`render`）

```vue
<script setup lang="ts">
import { h } from 'vue'
import { ElButton } from 'element-plus'

const columns: ProColumn<UserRow>[] = [
  {
    prop: 'username',
    label: '账号',
    render: ({ row }) =>
      h(ElButton, { link: true, onClick: () => viewDetail(row.id) }, () => row.username),
  },
]
</script>
```

**作用域参数**：

```ts
interface RenderScope<T> {
  row: T // 当前行数据
  column: ProColumn<T> // 当前列定义
  $index: number // 行索引
}
```

`headerRender` 作用域类似：`{ column, $index }`。

### 2.4 搜索配置（`search` 字段）

```ts
{
  prop: 'createTime',
  label: '创建时间',
  search: {
    el: 'date-picker',          // 控件类型
    props: { type: 'daterange', valueFormat: 'YYYY-MM-DD' }, // 透传给控件
    defaultValue: [],            // reset 时恢复
    span: 8,                    // el-col 占位（默认 6，4 列布局）
    order: 1,                   // 排序权重
    slot: 'custom-createTime',  // 自定义插槽名（spec §7）
  },
}
```

**支持的 `el` 类型**：

| `el` 值        | 渲染控件        |
| -------------- | --------------- |
| `input`        | el-input        |
| `select`       | el-select       |
| `date-picker`  | el-date-picker  |
| `tree-select`  | el-tree-select  |
| `cascader`     | el-cascader     |
| `input-number` | el-input-number |

### 2.5 特殊列 `type`

| `type`      | 行为                                               |
| ----------- | -------------------------------------------------- |
| `index`     | 序号列（自动计算 `$index + 1`）                    |
| `selection` | 多选列（必须配 `rowKey`）                          |
| `expand`    | 展开列（与 `expand` 插槽配合）                     |
| `operation` | 操作列（与 `operation` 插槽配合，默认靠右 + 固定） |

```vue
<template>
  <ProTable :columns="columns" :request-api="requestApi" row-key="id">
    <template #operation="{ row }">
      <el-button link type="primary" @click="edit(row)">编辑</el-button>
      <el-button link type="danger" @click="remove(row)">删除</el-button>
    </template>
    <template #expand="{ row }">
      <p>详情：{{ row.description }}</p>
    </template>
  </ProTable>
</template>
```

---

## 3. 数据请求与响应适配

### 3.1 `requestApi` 必填

```ts
type ProTableRequestApi<T> = (params: Record<string, unknown>) => Promise<ProTableResponse<T>>

interface ProTableResponse<T> {
  data: T[]
  total: number
  pageNum: number
  pageSize: number
}
```

`params` 是合并后的搜索参数（含 `pageNum` / `pageSize` / 各列搜索值 / `initParam`）。

### 3.2 默认响应约定

后端约定响应为 `{ data: T[], total, pageNum, pageSize }` 时，`requestApi` 可直接返回约定结构：

```ts
async function requestApi(params) {
  return {
    data: result.list,
    total: result.total,
    pageNum: params.pageNum as number,
    pageSize: params.pageSize as number,
  }
}
```

### 3.3 `responseAdapter` 适配非约定后端

```ts
// 后端返回 { items: [...], pagination: { total: 100, page: 1, pageSize: 10 } }
async function rawRequestApi(params) {
  return await orderApi.getList(params) // 类型侧 cast 一次
}

const adaptedRequestApi = (params: Record<string, unknown>) =>
  rawRequestApi(params).then(
    responseAdapter({
      raw => ({
        data: raw.items,
        total: raw.pagination.total,
        pageNum: raw.pagination.page,
        pageSize: raw.pagination.pageSize,
      })
    })
  )
```

> 映射结果结构非法（`data` 非数组 / `total` 非数字）时 `console.error` + 抛错（经 `useRequest` 错误通道进入 error 态）。

### 3.4 `dataCallback` 数据后处理

```ts
<ProTable
  :columns="columns"
  :request-api="requestApi"
  :data-callback="rows => rows.filter(r => r.status !== 'deleted')"
  row-key="id"
/>
```

---

## 4. 搜索表单（自动渲染）

`columns` 中声明 `search` 的列会自动出现在 `<SearchForm>`（默认 3 行，超出可展开）。

### 4.1 显隐搜索区

若 `columns` 中没有任何 `search` 字段，搜索区自动不渲染。

### 4.2 自定义插槽

```vue
<template>
  <ProTable :columns="columns" :request-api="requestApi" row-key="id">
    <template #search-createTime="{ searchParams, updateParams }">
      <el-date-picker
        v-model="searchParams.createTime"
        type="daterange"
        @change="(v) => updateParams({ createTime: v })"
      />
    </template>
  </ProTable>
</template>
```

插槽命名规范：`search-<prop>`（kebab-case）。

### 4.3 程序化触发搜索

```ts
const tableRef = ref<InstanceType<typeof ProTable>>()

// 修改搜索参数并触发搜索 + 回到第 1 页
await tableRef.value?.setSearchParams({ status: 'active' })

// 重置搜索参数 + 分页 + 刷新（保留多选）
await tableRef.value?.reset()
```

---

## 5. 分页 + 服务端排序（M2）

### 5.1 分页配置

```ts
// 简单开关
<ProTable pagination :columns="columns" :request-api="requestApi" />

// 透传分页 props
<ProTable
  :pagination="{ layout: 'total, sizes, prev, pager, next, jumper', background: true }"
  :columns="columns"
  :request-api="requestApi"
/>

// 关闭分页
<ProTable :pagination="false" :columns="columns" :request-api="requestApi" />
```

### 5.2 服务端排序

`sortable: 'custom'` 列声明会触发 `sort-change` 事件 → ProTable 内部回第 1 页 + 重新请求，同时通过 `sort-change` 事件向外 emit 当前排序状态：

```ts
const columns: ProColumn<OrderRow>[] = [
  { prop: 'amount', label: '金额', sortable: 'custom' },
  { prop: 'createTime', label: '时间', sortable: 'custom' },
]

<ProTable
  :columns="columns"
  :request-api="requestApi"
  @sort-change="(s) => console.log('服务端排序状态：', s)"
/>
```

默认 `sortParamsAdapter` 输出 `{ orderByColumn: prop, isAsc: 'asc' | 'desc' }`。后端约定不同时覆盖：

```ts
<ProTable
  :columns="columns"
  :request-api="requestApi"
  :sort-params-adapter="(state) => ({ sortBy: state.prop, sortOrder: state.order })"
/>
```

> 客户端排序（`sortable: true`）维持 element-plus 原生行为，**不**触发请求。

---

## 6. 双引擎架构（element-plus / vxe-table）

### 6.1 引擎决策

```vue
<ProTable table-engine="element-plus" :columns="..." :request-api="..." />
<ProTable table-engine="vxe-table" :columns="..." :request-api="..." />
```

引擎在**首次 mount 前**锁定，运行时修改 `tableEngine` prop 无效（需 reload）。

### 6.2 何时用哪个

| 引擎           | 适用场景                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| `element-plus` | 默认；与 Element Plus 主题深度集成；功能完整（编辑/树形/合并/拖拽均支持）             |
| `vxe-table`    | 大数据量（> 1 万行虚拟滚动）；需 vxe 特有能力（如虚拟树 / 复杂合并 / 单元格编辑内嵌） |

### 6.3 引擎回退机制

vxe-table 模块是动态加载（`import('vxe-table')`），加载失败时 ProTable 内部会自动回退 element-plus：

```ts
// ProTable.vue 内部
function handleEngineFallback() {
  engineRef.value = 'element-plus'
}
```

回退完成后 `engine` expose 返回 `'element-plus'`，业务代码无需关心。

### 6.4 vxe 引擎能力缺失

`useTableCapabilities` 在 vxe 引擎下会启动时 `console.warn` 并忽略以下能力（仅 element-plus 引擎生效）：

- 树形数据（vxe-tree 实现差异较大）
- 行拖拽（vxe 自带 drag-sort 但 API 不一致）
- 单元格合并（vxe 自带 span-method 但配置不同）
- 行内编辑（vxe 自带 edit-config 但事件流不同）

**这 4 个能力仅在 element-plus 引擎下生效**。

---

## 7. v2.0 新增四大能力

### 7.1 行内编辑 `enableRowEdit`

```ts
const columns: ProColumn<UserRow>[] = [
  {
    prop: 'username',
    label: '账号',
    edit: {
      el: 'input',
      rules: { required: true, message: '账号不能为空' },
      editable: true, // 或 Ref<boolean>
    },
  },
]

<ProTable :columns="columns" :request-api="requestApi" :enable-row-edit="{
  onSave: async (row, changes) => {
    await userApi.update(row.id, changes)
    return true
  },
}" />
```

**开启双击编辑**：

```vue
<template #tableHeader>
  <el-button @click="tableRef?.startEdit(rowKey)">编辑选中行</el-button>
</template>
```

### 7.2 树形数据 `enableTree`

```ts
<ProTable
  :columns="columns"
  :request-api="requestApi"
  :enable-tree="{
    loadChildren: async (row) => await menuApi.getChildren(row.id),
    childrenKey: 'subMenus',
    defaultExpandDepth: 2,
    rowKey: 'id',
  }"
/>
```

```vue
<script setup lang="ts">
const tableRef = ref<InstanceType<typeof ProTable>>()
tableRef.value?.expandNode('org-1', true) // 展开 org-1
tableRef.value?.refreshChildren('org-1') // 重新加载 org-1 子节点
</script>
```

> **树形 + 编辑互斥**：v2.0 与编辑共存时，编辑仅作用于叶子节点；`enable-tree` 加 `exclusive: true` 可禁用编辑按钮。

### 7.3 单元格合并 `enableCellSpan`

```ts
{
  prop: 'date',
  label: '日期',
  span: { direction: 'row' }, // 相同 date 合并行
}

<ProTable :columns="columns" :request-api="requestApi" :enable-cell-span="{
  maxMergeSpan: 100, // 安全上限（防止意外合并整列）
}" />
```

```ts
// 自定义合并规则
{
  prop: 'category',
  label: '类别',
  span: {
    direction: 'row',
    judge: (a, b) => a.category === b.category && a.month === b.month,
  },
}
```

### 7.4 行拖拽排序 `enableRowDrag`

```ts
<ProTable :columns="columns" :request-api="requestApi" :enable-row-drag="{
  handle: '__all__', // 或 '.__drag-handle' 指定手柄
  onSortChange: async (newOrder) => {
    await sortApi.update(newOrder.map(r => r.id))
    return true // 返回 true 表示服务端已处理；false 表示本地乐观更新
  },
}" />
```

`draggable: true` 列配置参与拖拽（默认 false）：

```ts
{ prop: 'sort', label: '拖拽', width: 60, draggable: true }
```

---

## 8. 列设置与密度

### 8.1 列设置抽屉

`<TableHeader>` 包含列设置按钮，点击打开抽屉：

- 显示 / 隐藏列
- 调整列固定方向（左 / 右 / 不固定）
- 顺序调整（如启用）

### 8.2 持久化

```ts
<ProTable
  table-key="user-list"  // localStorage key（vue3-vite-project:user-list-cols）
  :columns="columns"
  :request-api="requestApi"
/>
```

未传 `tableKey` 则不持久化（刷新页面恢复默认）。

### 8.3 密度切换

```ts
<ProTable density="compact" :columns="columns" :request-api="requestApi" />
// 'compact' | 'default' | 'loose'
```

`<TableHeader>` 提供密度切换按钮（紧凑 / 默认 / 宽松）。vxe 引擎切密度会触发 `recalculate` 重算行高（vxe 行高变量有缓存，data-density 变更不会自动重测）。

---

## 9. 异步三态

ProTable 内部已与 `<AsyncState>` 集成：

```vue
<!-- ProTable 内部模板 -->
<AsyncState
  :loading="initialLoading"
  :error="table.error.value"
  :is-empty="isEmpty()"
  @retry="table.refresh"
>
  <!-- ElementTableBody 或 VxeTableBody -->
</AsyncState>
```

**首次加载 vs 后续刷新**（关键设计）：

- **首次加载中**（`initialLoading = true`）：显示 skeleton
- **后续刷新中**（`table.loading.value = true && hasTableMounted = true`）：保留表格实例，展示旧数据
- **错误态**：显示错误提示 + 重试按钮
- **空数据**（`!loading && !error && data.length === 0`）：显示空状态占位

为什么这样？ElTable 实例反复重建会丢失多选选区（`reserve-selection`）、展开行等交互态。ProTable 通过 `hasTableMounted` 标志位避免非必要的重建。

---

## 10. 决策表

| 场景                            | 推荐                                        |
| ------------------------------- | ------------------------------------------- |
| 简单列表 + 搜索 + 分页          | ProTable + `sortable: 'custom'`（如需排序） |
| 服务端排序 / 服务端筛选         | ProTable + `sortable: 'custom'`             |
| 树形数据展示                    | ProTable + `enableTree`                     |
| 单元格合并（报表）              | ProTable + `enableCellSpan`                 |
| 行内编辑（快速录入）            | ProTable + `enableRowEdit`                  |
| 行拖拽排序（拖动调整顺序）      | ProTable + `enableRowDrag`                  |
| 大数据量（> 1 万行虚拟滚动）    | ProTable + `tableEngine: 'vxe-table'`       |
| 简单的两列表格（< 10 列无搜索） | 直接用 `<el-table>`，不必上 ProTable        |
| 复杂表单 + 字段联动             | 用 XForm（`docs/24-XForm使用指南.md`）      |

---

## 11. 已知限制

| #   | 限制                                                                                       | 应对方式                      |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| 1   | 引擎运行时切换不支持（首次 mount 锁定）                                                    | reload 页面 / 重新挂载        |
| 2   | 树形 + 编辑互斥（编辑仅作用于叶子节点；`exclusive: true` 禁用编辑按钮）                    | 二选一                        |
| 3   | vxe 引擎不支持 4 大能力（树形 / 拖拽 / 合并 / 编辑）—— 启动 warn + 忽略                    | 切回 element-plus 引擎        |
| 4   | vxe 行高变量有缓存，密度切换后需手动 `recalculate()`                                       | ProTable 内部已自动处理       |
| 5   | `responseAdapter` 映射非法结构会抛错                                                       | `console.error` + 走 error 态 |
| 6   | `setSearchParams` 会回到第 1 页（如不要回到第 1 页，先 `getSearchParams` 再手动 setState） | 自定义场景                    |
| 7   | 多选 + 跨页记忆依赖 `rowKey`，未配会清不掉选区                                             | 业务必填 `rowKey`             |

---

## 12. 测试覆盖

| 文件                                                      | 覆盖范围                               |
| --------------------------------------------------------- | -------------------------------------- |
| `src/components/ProTable/composables/useSearch.spec.ts`   | 搜索参数管理 + 重置 + 程序化 setParams |
| `src/components/ProTable/composables/useColumns.spec.ts`  | 列解析 / 隐藏 / 持久化 / 列设置        |
| `src/components/ProTable/composables/useTable.spec.ts`    | 数据请求 / 分页 / 排序 / 响应适配      |
| `src/components/ProTable/composables/useCellSpan.spec.ts` | 单元格合并边界数学                     |
| `src/components/ProTable/composables/useRowDrag.spec.ts`  | 行拖拽位移 / 边界                      |
| `src/components/ProTable/composables/useRowEdit.spec.ts`  | 行内编辑生命周期                       |
| `src/components/ProTable/adapters/vxe-column.spec.ts`     | vxe 列映射                             |
| `src/modules/demo/examples/ProTable/ProTable*.vue`        | 9 个 demo 覆盖所有主路径               |

完整 demo 站：`/demo/pro-table-overview` 等 9 个路径（auto-import 自动注册）。

---

## 13. 速查

```vue
<!-- 最小 -->
<ProTable :columns="cols" :request-api="api" row-key="id" />

<!-- 带搜索 + 多选 + 编辑 -->
<ProTable
  :columns="cols"
  :request-api="api"
  row-key="id"
  table-key="my-list"
  :enable-row-edit="{ onSave: handleSave }"
/>

<!-- 树形 + 服务端排序 -->
<ProTable
  :columns="cols"
  :request-api="api"
  :enable-tree="{ loadChildren: api.getChildren, rowKey: 'id' }"
  :sort-params-adapter="(s) => ({ sortBy: s.prop, sortOrder: s.order })"
/>
```

```ts
// 程序化控制
const tableRef = ref<InstanceType<typeof ProTable>>()
await tableRef.value?.refresh()
await tableRef.value?.setSearchParams({ status: 'active' })
const rows = tableRef.value?.getSelectedRows()
```

---

## 14. 相关文档

- 组件源码：`src/components/ProTable/ProTable.vue`
- 类型导出：`src/components/ProTable/types/index.ts`
- composables：`src/components/ProTable/composables/`
- 引擎适配：`src/components/ProTable/adapters/`
- Demo 站：`src/modules/demo/examples/ProTable/`
- Element Plus Table 文档：https://element-plus.org/zh-CN/component/table.html
- vxe-table 文档：https://vxetable.cn/
- 设计 spec：`docs/superpowers/specs/2026-09-07-protable-design.md` + `2026-09-08-protable-v2.1-vxe-engine-design.md`
