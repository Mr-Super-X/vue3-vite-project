# ProTable 组件

> 配置驱动的企业级表格组件（Element Plus 引擎，vxe-table 引擎 v2.1 计划支持）。参考 vue-element-plus-admin 的 ProTable 设计哲学。

## 安装

依赖已包含：

- `element-plus`（项目基础 UI 库）
- `sortablejs ^1.15.7`（列设置拖拽）
- `vxe-table ^4.21.7`（vxe-table 引擎预留依赖，v2.1 交付，动态按需加载）

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

## 引擎（v2.1 计划支持 vxe-table）

v2.0 仅实现 element-plus 引擎。传入 `table-engine="vxe-table"` 时会 `console.warn` 并回退 element-plus：

```vue
<!-- 实际渲染 element-plus 表格，控制台提示 vxe-table 暂未实现 -->
<ProTable :columns="columns" :request-api="requestApi" table-engine="vxe-table" />
```

> 注意：引擎 prop 仅在首次 mount 前生效，运行时修改需 reload（spec 决策 4）。

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
