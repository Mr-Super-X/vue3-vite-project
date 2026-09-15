# ProTable 组件

> 配置驱动的企业级表格组件（Element Plus / vxe-table 双引擎）。参考 vue-element-plus-admin 的 ProTable 设计哲学。

## 安装

依赖已包含：

- `element-plus`（项目基础 UI 库）
- `sortablejs ^1.15.7`（列设置拖拽）
- `vxe-table ^4.21.7`（vxe-table 引擎，v2.1 交付；动态按需加载，chunk 不进首屏）

## 基础用法

```vue
<script setup lang="ts">
import { ProTable, type ProColumn } from '@/components/ProTable'

const columns: ProColumn[] = [
  {
    prop: 'name',
    label: '名称',
    search: { el: 'input', defaultValue: '' },
  },
  {
    prop: 'status',
    label: '状态',
    enum: [
      { label: '启用', value: 1, tagType: 'success' },
      { label: '禁用', value: 0, tagType: 'info' },
    ],
  },
  { prop: 'operation', label: '操作', type: 'operation' },
]

async function requestApi(params: Record<string, unknown>) {
  return await api.user.list(params)
}
</script>

<template>
  <ProTable :columns="columns" :request-api="requestApi" row-key="id" />
</template>
```

## 完整 API

详见 [`./types/index.ts`](./types/index.ts) 类型定义。

## 泛型（M1）

```ts
interface User {
  id: number
  name: string
  status: 0 | 1
}

const columns: ProColumn<User>[] = [
  {
    prop: 'name', // IDE 自动补全 'id' | 'name' | 'status'
    label: '名称',
    render: ({ row }) => h('span', row.name), // row: User，类型精确
  },
]
```

不传泛型时默认 `Record<string, unknown>`，存量代码零改动。

## 服务端排序（M2）

```ts
const columns: ProColumn<Order>[] = [
  { prop: 'amount', label: '金额', sortable: 'custom' }, // 点击表头 → 请求带 orderByColumn/isAsc
]
// 后端约定不同可改序列化：
<ProTable :sort-params-adapter="(s) => ({ sortBy: s.prop, sortOrder: s.order })" ... />
```

`sortable: true` 仍是 el-table 客户端排序；`sort-change` 事件与 `getSortState()` 暴露可用。

## 响应结构适配（M3）

后端返回非 `{ data, total, pageNum, pageSize }` 时：

```ts
<ProTable
  :request-api="rawApi as ProTableRequestApi<Order>"
  :response-adapter="(raw) => {
    const r = raw as { records: Order[]; totalCount: number }
    return { data: r.records, total: r.totalCount, pageNum: 1, pageSize: 10 }
  }"
  ...
/>
```

适配结果结构非法（data 非数组 / total 非数字）会 console.error 并进入错误态（AsyncState 展示 + 重试）。

## 引擎（v2.1 交付 vxe-table）

`table-engine` 支持双引擎，默认 `element-plus`：

```vue
<!-- element-plus 引擎（默认） -->
<ProTable :columns="columns" :request-api="requestApi" />

<!-- vxe-table 引擎：首次 mount 动态加载（JS + CSS 按需注入，chunk 不进首屏）；
     加载失败自动回退 element-plus 并 console.warn -->
<ProTable :columns="columns" :request-api="requestApi" table-engine="vxe-table" />
```

> 注意：引擎 prop 仅在首次 mount 前生效，运行时修改需 reload（spec 决策 4）。

### vxe 引擎能力矩阵（v2.1）

| 能力           | element-plus | vxe-table                         |
| -------------- | ------------ | --------------------------------- |
| 多选 selection | ✅           | ✅（checkbox-change/all 合并）    |
| 服务端排序     | ✅           | ✅（同一 sortParamsAdapter 协议） |
| 行内编辑       | ✅           | ✅                                |
| 单元格合并     | ✅           | ✅                                |
| 树形数据       | ✅           | ❌ 暂不支持（warn 并忽略）        |
| 行拖拽排序     | ✅           | ❌ 暂不支持（warn 并忽略）        |

### ProColumn.vxeProps

仅 vxe 引擎生效，透传 VxeColumn props。定位为**补充不覆盖**——与 ProTable 派生字段（field/title/sortable 等）冲突时以派生值为准：

```ts
const columns: ProColumn<Order>[] = [
  { prop: 'amount', label: '金额', sortable: 'custom', vxeProps: { align: 'right' } },
]
```

引擎并排对比见 demo：`modules/demo/examples/ProTable/ProTableEngineCompare.vue`。

## 插槽系统

| 插槽                                 | 说明                    |
| ------------------------------------ | ----------------------- |
| `tableHeader`                        | 左上角标题 + 自定义按钮 |
| `toolButton`                         | 工具栏右侧扩展按钮      |
| `[prop]`                             | 覆盖对应列单元格        |
| `operation`                          | 操作列内容              |
| `search-[prop]`                      | 覆盖对应搜索项          |
| `empty`                              | 空状态自定义            |
| `expand`                             | 展开行内容              |
| `paginationLeft` / `paginationRight` | 分页区扩展              |

## 更多信息

- 架构：[`./ARCHITECTURE.md`](./ARCHITECTURE.md)
- 维护：[`./CONTRIBUTING.md`](./CONTRIBUTING.md)
- Spec：[`../../../docs/superpowers/specs/2026-09-07-protable-design.md`](../../../docs/superpowers/specs/2026-09-07-protable-design.md)
- Plan：[`../../../docs/superpowers/plans/2026-09-07-protable-impl.md`](../../../docs/superpowers/plans/2026-09-07-protable-impl.md)
- v3.0 重构：[`../../../docs/superpowers/plans/2026-09-14-protable-v3-refactor.md`](../../../docs/superpowers/plans/2026-09-14-protable-v3-refactor.md)

## 常见 TypeScript 陷阱（v3.0 L5）

### 1. ProTableProps\<T\> 透传到非泛型组件

T 未解析时 `ProColumn<T>` 双向均不可赋值（TS **bivariance** 仅对具体类型生效）。

**处理方式**（v3.0 M3 过渡方案）：组件层声明 `<script setup lang="ts" generic="T extends object = Record<string, unknown>">`，
模板绑定处经 `as ProColumn[]` cast 收口（命名 `*NonGeneric`，明确"丢泛型版本"语义）。

**完整消除 cast** 需 6 个子组件（SearchForm / TableHeader / ColSetting / ElementTableBody / VxeTableBody）
改 `generic<T>`，影响面大，留待 v3.0.1。

### 2. `useColumns` 内部 cast 集中点

`useColumns.ts:148-153`（toggleVisible）的 cast 原因：

- `Ref<ProColumn[]>.value` 经 `UnwrapRef` 把 `hidden` 的 `Ref<boolean>` 解成 boolean
- `exactOptionalPropertyTypes` 排除 undefined
- 还原为 `ProColumn<T>` 类型后按公开声明赋值

### 3. Vue reactive 自动解包陷阱（C2 修复）

访问 `allColumns.value[i].hidden` 时，reactive 代理自动解包 `Ref<boolean>` / `computed` → boolean primitive。
**运行时 typeof 永远只能拿到 'boolean'**，无法区分"静态 boolean" vs "动态 Ref"。

**正确做法**（参考 `useColumns.ts:91-95`）：在 setup 时基于**原始 props.columns** 记录静态列集合
（按 prop 查找），不依赖运行时 typeof 判断。

### 4. exactOptionalPropertyTypes 兼容

项目开启 `exactOptionalPropertyTypes: true`，传 `{ tableKey: undefined }` 给 `{ tableKey?: string }`
参数会 TS 2379 报错。

**正确做法**（参考 `useTable.ts:148-152`）：

```ts
// ❌ 报错
assertValidResponse(adapted, { tableKey: props.tableKey })

// ✅ 条件构造
assertValidResponse(adapted, props.tableKey ? { tableKey: props.tableKey } : {})
```

## v3.0 变更摘要

完整 16 项修复 + 优化见 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 顶部"v3.0 增量摘要" + 改造计划文档。
