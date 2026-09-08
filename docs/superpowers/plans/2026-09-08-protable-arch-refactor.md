# ProTable 架构优化实施计划（5 步）

> 来源：2026-09-08 架构深度评估报告（问题编号 H1-H7 / M1-M8 / L1-L6 与本计划对应）。
> 使用方式：**每完成一个子任务就把 `[ ]` 改为 `[x]` 并注明完成日期**；跨会话继续时先读本文件与 git log。
> 底线：每步完成后 `pnpm test src/components/ProTable` 全绿 + `pnpm type-check:full` + `pnpm lint` 通过，再做下一步。

---

## 进度总览

| 步骤 | 内容 | 状态 | 完成日期 |
|------|------|------|----------|
| 第 0 步 | 行为等价清理（死代码 / 单源化 colSettingVisible / engine 锁定 / M4 判定） | ✅ 已完成 | 2026-09-08 |
| 第 1 步 | searchParams 单源化（修 H1/H2/M6，核心） | ⬜ 未开始 | — |
| 第 2 步 | 能力编排归位（H4/H7/M8 + EditCell 抽取） | ⬜ 未开始 | — |
| 第 3 步 | props 保护（M2 列对象拷贝 / M5 派生 direction） | ⬜ 未开始 | — |
| 第 4 步 | vxe 死路径决策 + useRowEdit rowKey 注入（H3/H5） | ⬜ 未开始 | — |

---

## 第 0 步：行为等价清理（零风险，先行）

目标：删死代码、消除 colSettingVisible 双份、修正自相矛盾的 engine watch、M4 硬编码判定。**不改任何运行时行为**（M4 需同步改 demo 断言）。

- [x] 0.1 删除模板死代码：`<component :is="'div'" v-if="false" />`（`ProTable.vue:431`）✅ 2026-09-08
- [x] 0.2 删除 useTable 三个死字段 `editingKeys/treeExpandedKeys/isTreeMode`（`useTable.ts:42-47, 90-92, 199-201`），同步删 `UseTableReturn` 接口声明 ✅ 2026-09-08
- [x] 0.3 engine 锁定语义统一：删除 `ProTable.vue:53-61` 的 watch（JSDoc 已声明"首次 mount 锁定"），保留 `resolveEngine` 一次性捕获 ✅ 2026-09-08
- [x] 0.4 colSettingVisible 单源化：删除 `ProTable.vue:64, 98-106` 本地副本 + 两个 watch；模板与 `handleColSettingUpdate` 改绑 `columns.colSettingVisible`（`useColumns.ts:52` 已有该 ref）✅ 2026-09-08
- [x] 0.5 M4：`useCellSpan.ts:114` 的 `params.column?.property === 'amount'` 改为「该列 `span.judge` 存在」判定（在 `cellClassName` 内查 `columnsRef.value.find(c => c.prop === params.column?.property)?.span?.judge`）✅ 2026-09-08
- [x] 0.6 同步更新 demo：检查 `src/modules/demo/examples/ProTable/ProTableCellSpan.vue` 中 `amount` 列的 judge 合并颜色断言/样式是否仍命中（judge 存在 → 橙色 class 逻辑不变，理论上无需改；需人工浏览器确认）✅ 2026-09-08（代码级验证：`amount` 列声明 `span.judge`（demo 111/128-130 行），判定行为等价；浏览器回归见 0.7）
- [x] 0.7 验证：`pnpm test src/components/ProTable && pnpm type-check:full && pnpm lint`；浏览器过一遍 `/demo/pro-table-overview` ✅ 2026-09-08（13 文件 81 测试全绿 + vue-tsc + eslint 零错误；浏览器回归列为手动验证项）

---

## 第 1 步：searchParams 单源化（核心，修 H1/H2/M6）

目标：searchParams 唯一由 `useSearch` 持有；`useTable` 改为读取回调；输入路径与请求路径分离；输入加防抖。

### 1.1 useTable 改造

- [ ] `UseTableOptions` 增加 `getSearchParams: () => Record<string, unknown>`；删除内部 `searchParams` ref、`setSearchParams`、`resetSearchParams`、`serializeParams`（`useTable.ts:62-79, 163-176`）
- [ ] 请求参数组装改为 `serializeParams({ ...options.getSearchParams(), pageNum, pageSize })`（`useTable.ts:97-101`）；`serializeParams` 迁移到 useTable 内唯一保留一份（或抽 `utils`，优先留在 useSearch 一处、useTable 直接拿序列化后的——二选一，原则是全库仅一份实现）
- [ ] 删 `UseTableReturn` 中对应字段

### 1.2 useSearch 改造

- [ ] 新增 `updateParams(params: Record<string, unknown>): void`——**纯写参数，不触发请求**（供搜索区输入绑定）
- [ ] `setSearchParams` 语义不变（写 + 回第 1 页 + 请求），仅程序化 expose 使用
- [ ] `reset()` 保持「恢复 defaultValue + fetchHook({reset:true})」

### 1.3 ProTable.vue 接线

- [ ] `useTable({...})` 传入 `getSearchParams: () => search.searchParams.value`——注意初始化顺序：`useSearch` 需先于 `useTable` 创建（当前顺序相反，需交换 `ProTable.vue:74-88` 的创建顺序，并重新校验 fetchHook 闭包）
- [ ] 删除桥接 watch（`ProTable.vue:91-95`）
- [ ] SearchForm 的 `@update:search-params`（`ProTable.vue:280`）从 `search.setSearchParams` 改绑 `search.updateParams`
- [ ] SearchForm 输入控件加防抖：优先复用项目已有 `v-inputDebounce` 指令（`src/directives/`），在 `SearchForm.vue` 各 `@update:model-value` 处应用

### 1.4 测试

- [ ] `useSearch.spec.ts` 增补：`updateParams` 不触发 fetchHook；`setSearchParams` 仍触发
- [ ] `useTable.spec.ts` 改造：mock `getSearchParams` 验证请求参数组装；删除已删方法的用例
- [ ] 集成测试（`ProTable.integration.spec.ts`）增补场景：「输入搜索词 → 点搜索按钮 → requestApi 收到正确参数」；「暴露的 setSearchParams → requestApi 收到传入参数（回归 H1）」

### 1.5 验证

- [ ] `pnpm test src/components/ProTable && pnpm type-check:full && pnpm lint`
- [ ] 浏览器验证：输入框逐字符输入**不发请求**（Network 面板确认），点搜索发一次且参数正确；`reset` 恢复默认值并请求

---

## 第 2 步：能力编排归位（H4/H7/M8 + 模板减负）

### 2.1 useRowDrag 自持 DOM 挂载

- [ ] `UseRowDragOptions` 增加 `getTbody: () => HTMLElement | null`（替代外部传 tbody）
- [ ] useRowDrag 内部 `watch(data, flush: 'post')` 自动 `detach + attach`；对外保留 `attachSortable/detachSortable` 签名兼容（spec 复用）
- [ ] 删除 `ProTable.vue:133-156` 的 `tryAttachSortable` + 3 个 `setTimeout` + 2 个 watch；`onMounted` 仅剩首次 attach
- [ ] `ProTable.vue` 传 `getTbody: () => proTableEl.value?.$el?.querySelector('.el-table__body tbody') ?? null`

### 2.2 树形索引映射（H6）

- [ ] `onEnd` 不再直接用 DOM index splice 顶层数组：先由 `getRowKey` 收集视图行 key 序列 → 映射到顶层数组索引 → 再 splice
- [ ] `UseRowDragOptions` 增加 `getViewRowKeys?: () => (string|number)[]` 与 `resolveTopIndex?: (viewIndex: number) => number`；树形模式（crossLevelDrag=false）下映射失败时 `console.warn` 并跳过（替代现状静默错位）
- [ ] 补 useRowDrag.spec：树形模式拖拽非顶层行的用例

### 2.3 useTreeData 响应式与资源清理

- [ ] `flattenData()` 普通方法改为内部 `computed`，返回对象增加 `flatData: Ref<TreeNode[]>`；`ProTable.vue:126-128` 的 `flatTreeData` computed 删除，模板直接用 `treeData.flatData`
- [ ] 返回 `dispose(): void` 清理 `timers` Map + `expanded/loading`（`useTreeData.ts:14`）
- [ ] `useTableCapabilities.ts:134-136` 的 `onUnmounted` 增加 `treeData?.dispose()`

### 2.4 模板减负

- [ ] 抽取 `components/EditCell.vue`：props `(rowKey, col, value, editConfig)` + emit `update`；承接 `ProTable.vue:380-428` 四分支编辑控件与 `resolveEditComp`
- [ ] 抽取 `components/CellContent.vue`：承接 VNode 包装 trick（`ProTable.vue:367-376, 432-442` 两处 `v-for="(item,i) in [resolveCell(...)]"`）
- [ ] 树形缩进 span（`ProTable.vue:352-377`）抽 `TreeCell.vue` 或保留在模板（视抽完后 ProTable.vue 行数决定，目标 ≤400 行）
- [ ] `resolveEditComp` 随 EditCell 迁移出 ProTable.vue

### 2.5 验证

- [ ] `pnpm test src/components/ProTable && pnpm type-check:full && pnpm lint`
- [ ] 浏览器回归：行拖拽排序（平铺 + 树形同层）、单元格合并、行内编辑双击、树形展开/懒加载

---

## 第 3 步：props 保护（M2 / M5）

### 3.1 useColumns 列对象拷贝

- [ ] 初始化 `allColumns` 时白名单拷贝列对象：拷贝数据字段（`prop/label/width/...`）、`hidden` 转本地 `ref<boolean>`（外部传 `Ref<boolean>` 时包 `computed` 读 + 本地 ref 写，保持响应式）、保留函数/数组引用（`render/headerRender/enum/search/tableProps`，不 deep clone）
- [ ] `toggleVisible`（`useColumns.ts:107-119`）不再原地改写调用方对象结构；`toggleFixed`/`resetToDefault` 同理基于本地副本
- [ ] 注意：`sortedColumns`/`searchColumns` 消费的是拷贝后的列，`ProColumn.hidden` 的 `Ref<boolean>` 公开类型保持不变
- [ ] 补 useColumns.spec：外部 columns 常量不被修改（深比较前后对象）；两个实例共享同一 columns 常量互不污染

### 3.2 validateCapabilities 派生化（M5）

- [ ] `useTableCapabilities.ts:129` 不再 `cellSpanConfig.value.direction = 'row'` 原地改；改为 `const effectiveSpanDirection = computed(() => props.enableTree && config.direction === 'column' ? 'row' : config.direction)`，useCellSpan 入参消费该派生值
- [ ] validateCapabilities 仅保留 `console.warn` 提示

### 3.3 验证

- [ ] `pnpm test src/components/ProTable && pnpm type-check:full && pnpm lint`
- [ ] 浏览器验证列设置：显隐切换、固定列、拖拽排序、恢复默认、localStorage 持久化（tableKey 场景）

---

## 第 4 步：vxe 死路径决策 + rowKey 注入（H3 / H5）

### 4.1 vxe 决策（**实现前需用户拍板**，默认推荐方案 A）

- [ ] 方案 A（推荐）：`'vxe-table'` 时 `console.warn('[ProTable] vxe-table 引擎暂未实现，已回退 element-plus')` 并回退；删除 `useVxeTable.ts` 及其 spec；`types/index.ts` 删除 `vxeProps` 字段；README/ARCHITECTURE 标注 v2.1 计划
- [ ] 方案 B：保留代码，README/ARCHITECTURE 显式标注"实验性未接线"
- [ ] 补测试：传 `table-engine="vxe-table"` 渲染 el-table 且 warn（方案 A）

### 4.2 useRowEdit rowKey 注入（H5）

- [ ] `UseRowEditOptions` 增加 `rowKey?: string`（默认 `'id'`）；`_save` 内 `data.find((r) => r[options.rowKey ?? 'id'] === rowKey)`（`useRowEdit.ts:58, 69`）
- [ ] `useTableCapabilities.ts:78-82` 透传 `props.rowKey ?? 'id'`
- [ ] 补 useRowEdit.spec：自定义 rowKey（如 `uuid`）保存成功用例

### 4.3 验证

- [ ] `pnpm test src/components/ProTable && pnpm type-check:full && pnpm lint`
- [ ] 全量 demo 回归：`/demo/pro-table-overview|row-edit|tree|cell-span|row-drag`

---

## 附：风险与防新 bug 清单

| 风险点 | 措施 |
|--------|------|
| 第 1 步后旧 demo 依赖「输入即搜」 | H2 本身即 bug 修复；全量 demo 路由人工回归 |
| 第 3 步拷贝列对象后 hidden 响应式断链 | 外部 Ref 包 computed 读 + 本地 ref 写 |
| 第 2 步拖拽挂载时序变化 | watch flush:'post' + 保留公开签名；现有 spec 复跑 |
| 每步顺序不可调换 | 0 → 1 → 2 → 3 → 4；每步跑全绿再进下一步 |

## 附：变更说明模板（每步完成时输出）

```
- 新增文件：…
- 修改函数：…
- 自检清单通过情况：[n / 26]
- src/ 写操作清单：…
- 建议验证：…
```
