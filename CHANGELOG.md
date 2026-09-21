# Changelog

## 未发布

### 📝 Docs | v3.5 末次审计 P1 剩余 HIGH 排查结论

> 重盘点发现 63 条 HIGH，实际属于「P1R-9~12 已修（45 条）+ ALIAS-4 已修（14 条）」Agent 滞后报告。真正剩余未修 HIGH 仅 6 条，其中 4 条为设计性问题需重构，2 条为设计性故意保留。

**已修（Agent 报告滞后）**：
- §1.6 AutoImport 45 条已在 P1R-9~12（65 文件清理）覆盖
- §4 #14 深层路径 14 条已在 ALIAS-4（12 demo @mock 替换）覆盖
- BaseChartOverview SNIPPET_INSTANCE 残留 console.log 已在 P1R-1 修复
- XFormOrderCreate「30」→「50+」文案已在 P1R-2 修复
- ProTableServerFilter SNIPPET console.log 已在 P1R-3 修复

**设计性问题跳过（需重构，超出 demo 范围）**：
- `DirectiveAuth.vue` + `DirectivePermission.vue`：`userStore.permissions = [...val]` 绕过 useAuth——需 useAuth 暴露 setter 后改写（设计层）
- `ProTableOverview.vue` line 83-89：操作列 `@click` 直接传 row 到 ElMessage 未走 useAppRouter——演示代码与 §1.5 业务封装规范差异（设计层）
- `ProTableStyleOverride.vue` line 59-61：`isRecent(iso)` 边缘 case（mock 相对时间 + Date.now() 间隔）——需重新设计 mock 数据（绝对时间）

**设计性故意保留（demo 本身机制需要）**：
- `RichTextEditor.vue` line 82：`console.log('[防循环验证] onChange 触发第 N 次')` —— 反例 demo，控制台计数是核心验证机制
- `XFormPersistSchemaVersion.vue` line 44：`console.info('[restoreFilter] 已裁剪废弃字段')` —— v2 schema 升级诊断输出

---

### ✨ Feature | 新增 `@mock` alias + 12 个 ProTable demo 路径规范化

> `mock/` 目录在项目根（不在 `src/`），原 12 个 ProTable demo 用 `../../../../../mock/...` 5 层相对路径（违反 CLAUDE.md §4 #14）。本次新增 `PROJECT_ROOT_ALIASES` 抽象，支持「项目根目录别名」与「src 子目录别名」并存，并替换 12 个 demo 路径。

- **`build/aliases.ts`**：
  - 新增 `PROJECT_ROOT_ALIASES = { '@mock': 'mock' } as const`（独立于 `SRC_DIR_ALIASES`）
  - `resolveSrcDirAliases()` 合并策略：src 子目录优先 + 项目根目录兜底（同名冲突时 src 优先）
  - `generateTsconfigPaths()` 同步处理两条路径：`./mock/index.ts` + `./mock/*`（项目根，不带 `src/`）
  - 旧函数 API 不变（rename 是内部逻辑），现有 15 个 src 别名零影响
- **`build/aliases.spec.ts`**：测试断言数 15→16 / 29→31 + 新增 `PROJECT_ROOT_ALIASES` + `@mock` 解析路径 4 条断言（13/13 PASS）
- **`tsconfig.app.json`**：`pnpm generate:tsconfig-paths` 自动同步，`@mock: [./mock/index.ts]` + `@mock/*: [./mock/*]`
- **12 个 ProTable demo 路径替换**：`ProTableCellSpan / Expand / EngineCompare / GroupedHeader / RowDrag / RowEdit / ServerSort / ServerFilter / StyleOverride / Summary / Tree / VirtualScroll.vue` —— `../../../../../mock/pro-table/xxx` → `@mock/pro-table/xxx`（共 14 行，ProTableExpand + EngineCompare 各 2 行）
- **验证**：`pnpm type-check:full` + `pnpm lint` + `pnpm check:aliases` + `pnpm check:routes` 全部 PASS

---

### 🐞 Fix | demo §1.6 AutoImport 系统性清理（65 文件）

> v3.5 末次审计重盘点发现 39 个 demo 含 `import { ref/computed/watch/... } from 'vue'` 冗余 import（CLAUDE.md §1.6 AutoImport 约束）。Agent 批处理实际扫描发现 65 个文件命中，删除 67 行冗余 import。

- 范围：RichTextEditor / BaseChart × 4 / Directive × 6 / ProTable × 5 / XForm × 46 / ProDialogForm × 1 等共 65 个 demo
- 单文件删除 1 个 API（62 文件） / 2 个 API（3 文件） / ≥3 个 API（4 文件，最多的 XFormLargeSchema 删 6 个）
- 部分保留 8 文件（含 `h` 或 `defineComponent`，不在 AutoImport 范围）：ProTableOperation / ProTableStyleOverride / XFormOverview / XFormRenderRecovery / XFormSlots / XFormUpload / XFormCustomComponent / XFormCustomFormItem —— 仅删 AutoImport 部分
- 验证：`pnpm type-check:full` + `pnpm lint` 全过；Grep 双重确认 AutoImport 残留 0

---

### 🐞 Fix | v3.5 末次审计 P1 demo 剩余 15 条修复（8 简单 + 2 批处理）

> 简单 8 条：console.log 污染 + 文案一致性 + 死代码清理。系统化批处理见上方 §1.6 AutoImport 清理条目。

- **BaseChartOverview.vue SNIPPET_INSTANCE**：line 105 注释声称已删 console.log 但代码残留——重新删除 + 注释位占位（避免用户复制 demo 污染 DevTools）
- **XFormOrderCreate.vue**：line 14 + line 330 「30 个独立 demo」→「50+ 个」文案（与实际 XForm 系列 demo 数对齐）
- **ProTableServerFilter.vue SNIPPET**：line 137 `console.log('筛选快照:', filters)` → 注释占位（避免 console 污染）
- **ProDialogFormOverview.vue onSubmit**：3 处真实 `console.log` 全部删除（其他 demo 全用 ElMessage），改为注释位占位
- **XFormSchemaIndex.vue SCSS**：删 `.tag` 死代码（v3.5 末次审计发现的 SCSS 死类）
- **XFormSchemaIndex.vue**：dependsOnMap.length 加注释「数组，源于 dependsOnMap.entries()」（澄清语义）
- **ProTableStyleOverride.vue 顶部 comment**：注释「6 个场景」+ tocItems 11 项标注「+ 1 个可覆盖钩子清单」+ 场景 ①②③④⑤ 共用一张 ProTable 详情

---

### 🐞 Fix | v3.5 末次审计 P1 demo 重点修复（8 项 HIGH）

> v3.5 末次审计（98 demo / 89 问题）暴露的 31 条 HIGH 中优先修复 8 项：3 处 §1.7 违规、1 处 §1.6 冗余、1 处引导未闭环、3 处死代码/死参数、1 处 mock 数据外迁。

- **`ProDialogOverview.vue`**：删 line 13 `import { ProDialog }` —— `components/common/ProDialog` 全局自动注册，模板直接 `<ProDialog v-model>` 无需 InstanceType，确认是 §1.7 违规（不是 §1.7 例外条款的合法使用）
- **`ProDialogResizable.vue`**：删 line 18 `import { ref } from 'vue'` + line 20 `import { ProDialog }` —— §1.6 AutoImport + §1.7 全局组件注册 双重违规
- **`BaseChartInDialog.vue`**：删 line 14 `import { ProDialog }` —— §1.7 违规（同 ProDialogOverview 情况）
- **`BaseChartOverview.vue`**：② notMerge section 加「先 hover 柱子触发 tooltip 再切换类型」step 提示——原版文案假设用户已 hover，缺前置步骤导致引导未闭环
- **`ProTableStyleOverride.vue`**：删 line 572-577 `tr:has(__tag-on)` 空 CSS 规则（注释「空规则占位，仅演示」但无任何样式输出，是历史遗留死代码）
- **`XFormOrderCreate.vue`**：① 删 line 258 `successMessage: false`（useXFormDemo 默认值，显式传 false 反而误导——读代码的人会以为是关掉了某个能力）② `guideActive = ref([])` → `ref(['guide'])`（默认展开 7 步验证指引——本 demo 是「建议新接入 XForm 先看」入口，默认折叠会与 introductions 矛盾，反而隐藏了 7 步价值）
- **`ProTable/configs/projects-users.ts`**：新建——ProTableOverview 的 UserRow + generateMockData + mockRequestApi + STATUS/ROLE 字典 外迁到 configs 层（与 ProTableStyleOverride 的 `configs/projects.ts` 模式一致）；ProTableOverview.vue 删 56 行内嵌 mock 代码 + import 新文件 + 7 处 `:request-api` 改为 `overviewRequestApi`

---

### 🐞 Fix | v3.5 末次审计 P0 demo 全部修复（7 个 CRITICAL demo）

> v3.5 末次审计（98 demo / 89 问题）暴露的 7 个 CRITICAL 问题全部修复。修复以「演示合理性 = 实际行为」「代码-注释-TOC 三方一致」「不传播错误用法」三原则为指引。

- **`DirectiveAuth.vue`**：① line 47-54 `userStore.permissions = [...val]` 加 `⚠️ DEMO-ONLY` 注释（明确真实业务应走 `useAuth()` 封装 setter，避免读者照搬错误用法到生产代码）② line 66 注释改为实际行为（`useAuth().permissions` watchEffect 驱动，无需 binding 自身响应式）③ line 102 `aria-hidden=false` → `aria-disabled=true`（与 `auth.ts:78-85` 实现一致）
- **`XFormSchemaIndex.vue`**：line 16 注释 `80+ 字段` → `28 字段（4 父列 + 12 子列 + 12 server-error 字段）`（与实际生成数量对齐，避免性能基线误导）
- **`ProTableStyleOverride.vue`**：① 7 项 tocItems 中 ②③④⑤ 共享 `demo-row-cell-styling` 锚点 + label 标注「见上文 ①」（避免 5 个 TOC 项无对应 section）② 删 line 291 空三元 `${densityList[0] ? '' : ''}`（历史遗留死代码）
- **`ProTableGroupedHeader.vue`**：① introductions 加「ProColumn.children 字段 API 已规划，v3.0 暂未实装完整 el-table-column 嵌套多级表头」说明 ② ApiTable title 加「（v3.0 已规划，暂未实装）」标注（避免读者按 demo 复制 `children` 字段得不到预期）
- **`DirectiveOverview.vue`**：加 3 个真实可交互 demo（v-copy / v-inputDebounce / v-buttonDebounce）—— 解决「0 个可交互控件，纯静态速查表」CRITICAL 问题
- **`ProTableOverview.vue`**：补齐 `<ProTable>` 条件渲染（`:enable-row-edit / enable-tree / enable-cell-span / enable-row-drag` 接 capabilityConfig）—— 解决「能力切换面板只渲染开关没渲染 ProTable，演示是假的」CRITICAL 问题
- **`XFormOrderCreate.vue`**：删 `import xFormSource from './XFormOrderCreate.vue?raw'`（脆弱的自引用 + 514 行 raw 过长），改为 `JSON.stringify(schema, null, 2)`（DemoField 展示 schema 本体 ~80 行 JSON，可读、可复制、可作为业务参考）

---

### 🐞 Fix | demo SNIPPET 编译失败 bug（BaseChartOverview.vue）

> BaseChart Overview 页两个 SNIPPET 字符串含「复制即坏」的演示代码：用户复制后会编译失败。

- `BaseChartOverview.vue:101-106` `SNIPPET_INSTANCE`：`const ref = useTemplateRef<InstanceType<typeof BaseChart>>('chart')` 中 `const ref` 遮蔽 AutoImport 的 `ref()`，且 `InstanceType<typeof BaseChart>` 要求消费方 import BaseChart 违反 §1.7
- 修复：变量重命名为 `chartRef`；用文件内已定义的 `BaseChartExposed` interface（line 23-27）替代 `InstanceType`；删除污染性的 `console.log`，改用注释占位
- `BaseChartOverview.vue:170-173` `SNIPPET_MANUAL`：`<BaseChart ref="ref" :option="...">` 模板 ref 名 `ref` 与 AutoImport `ref()` 冲突；`<button @click="ref?.resize()">` 同名变量更混乱
- 修复：模板 ref 名重命名为 `chartRef`（与 SNIPPET_INSTANCE 保持命名一致）
- 模板中**实际**的 `<BaseChart ref="chartRef" :option="clickOption" />`（line 228）和 `<BaseChart ref="manualChartRef" :option="resizeOption" :auto-resize="false" />`（line 277）已用正确名称，无需改
- 演示逻辑完全不变（SNIPPET 仅是给用户看的代码片段）
- 详见 `docs/36-demo-质量检查清单.md` §四 Pattern B 与 §四 案例 1

---

### 📝 Docs | 新增 demo 质量检查清单

> 防止 demo 模块出现 v3.5 末次审计（89 条问题）暴露的「演示合理性 ≠ 实际行为」「复制即坏」「§1.6/§1.7 违规」等系统性问题。

- `docs/36-demo-质量检查清单.md`：4 维度检查清单（演示合理性 / 文案准确性 / 测试步骤完整性 / 用户可理解性）+ 5 类 Pattern 预防清单 + 自动化检查路线图 + 历史问题案例库（BaseChartOverview 案例）
- 关联 v3.5 末次审计：`.claude/.agent-reports/2026-09-21-demo-audit-report.md`（98 demo / 89 问题 / 10 CRITICAL / 31 HIGH）
- 后续 PR 模板建议新增 check：「本次涉及的 demo 是否已同步 `introductions` / `<DocToc>` / `source` 属性？」

---

### 💄 Style | default 布局头部下拉箭头随展开旋转（布局/语言/用户信息）

> 交互反馈补全：三个下拉（LayoutSwitcher / LocaleDropdown / UserInfo）展开时右侧 `ArrowDown` 旋转 180°，收起回正，与面板 fade/slide 动画同节奏（160ms）。

- `LayoutSwitcher.vue`：箭头挂 `__trigger-caret` + `is-open`（open ref 为根节点既有面板状态，直接复用）
- `LocaleDropdown.vue` / `UserInfo.vue`：el-dropdown 不自动给 trigger 加状态 class，新增 `open` ref 经 `visible-change` 事件同步，箭头挂 `__caret` + `is-open`
- 三处样式统一：`transition: transform 160ms ease` + `.is-open { rotate(180deg) }`，无新增依赖

---

### 🔧 Chore | check:doc-currency 阈值再锚定（13 项全过）

> 3 项校验失败系 `fdc5809`（form-schema 引擎多批次能力升级）提交时未同步文档阈值所致，属历史遗留漂移，非本次代码改动引入。

- composable 文件数 46→49（+3：render-tabs-steps-node / use-model-expression-rerender / use-scan-async-options，fdc5809 批次）
- spec 文件数 62→65（+3：上述 3 个新 composable 各配 1 spec；utils 4→5）
- use-xform-composer.ts 行数上限 285→300（容差 50 → 250-350）：Wave4 能力装配使 composer 达 350 行（split 计数），增量为 composition root 接线（useModelExpressionRerender + modelExpressionEpoch / showDirtyMark / permissionResolver 条件展开），非业务逻辑膨胀。**已贴近上限：下次增长应先抽离 cross-field 编排块（composer 内约 30 行，含 resetFields tick 包装），而非继续放宽阈值**
- 同步更新：`scripts/check-doc-currency.ts` 阈值与构成注释、`src/components/form-schema/ARCHITECTURE.md`（§1.1 目录树 47→50 含 barrel、§9.1 表 62→65 及分项、§4 #7 行数清单校正为实测值、§4 #11 实现/spec 配平数）、`docs/25` TL;DR 62→65

---

### 💄 Style | 首页移除多页签固定形态（Home 完全排除 tags-view）

> 产品决策：首页是 portal 落地页，经顶部导航 / Logo 返回即可，无页签上下文切换需求，不再作为固定页签常驻（也不再出现在页签中）。固定页签由 Workbench 工作台首页（default 布局，`meta.affix: true`，用户自行添加）承接。

- `store/modules/tags-view.ts`：`NO_TAGS_ROUTE_NAMES` 新增 `Home`（此前已暂存），补全排除 rationale 注释（系统页 / 首页两类），并标注与 `filterAffixRoutes` 直读路由表路径的同步维护约束
- `modules/home/routes/index.ts`：移除 `meta.affix: true`——affix 预置走 `filterAffixRoutes` 直读路由表、不经 `NO_TAGS` 名单，残留标记会把首页重新钉回页签；标题"仪表盘"→"首页"（此前已暂存）
- 同步过时描述：`TagsView.vue` 预置注释（"如首页"）、`docs/23-权限设计.md` 3 处（RouteMeta 注释 + 2 处后端菜单 JSON 示例不再给 Home 配 affix）
- 测试：`tags-view.spec.ts` 修复 Home 排除后必然失败的 affix 用例（fixture 改名 `Pinned`），新增"首页不加入页签"用例（含残留 affix 标记的防御场景）

---

### ✨ Feature | default 布局侧栏拖拽调宽（主栏 + mixed/dual 二级侧栏）

> sidebar 模式左栏与 mixed/dual 二级侧栏右缘新增拖拽手柄，实时调整宽度；折叠 / 移动端（抽屉态）不渲染手柄，行为不变。

- 数据：`appStore` 新增 `sidebarWidth` / `secondaryWidth`（`number | null`，null = 跟随设计 token 默认 224px），纳入 `persist` `pick` 持久化
- 交互原语：`layouts/default/components/SidebarResizer.vue`——纯鼠标/键盘交互组件（mousedown→document 级 mousemove→mouseup，拖出窗口 mouseleave 兜底；`ArrowLeft/Right` 步进 8px，含 `role="separator"` + aria 值域），emit 实时宽度（v-model）与 `commit` 最终值，不感知 store 语义
- 钳制：`layouts/default/config/resize.ts`——`clampMenuWidth` 上下界 160/480px + 默认值 224（与 `--left-menu-max-width` 双真源，改 token 需同步），持久化脏值回灌同样过钳制
- 细节：拖拽中 `is-resizing` 禁用 width 过渡（防橡皮筋滞后）；`body.vv-menu-resizing` 全局禁文本选择 + 锁定 col-resize 光标；组件卸载兜底清理全局监听
- 修复：AppMenu 根节点展开态宽度由写死 `var(--left-menu-max-width)`（恒 224px）改为 `100%` 跟随 aside——拖拽加宽后菜单不同步留白的问题；顺带消除移动端小屏抽屉（82vw < 224px 时）菜单溢出 aside 的隐患
- 溢出 tooltip：新增 `OverflowText.vue`——ResizeObserver 检测 `scrollWidth > clientWidth`，仅文字被 ellipsis 截断时启用 el-tooltip（未溢出弹提示是干扰），折叠态仍走 AppMenu 原生折叠 tooltip 分支；AppMenu 菜单标题 6 处（根实例 4 + 递归实例 2）全部接入，原 `__title` ellipsis 样式迁入组件
- 布局壳拆分：`useMenuResizing`（拖拽调宽接线）+ `useMenuTree`（菜单树派生）抽至 `config/`，`index.vue` 463 → 424 行回到浮动上限内
- 测试：`resize.spec.ts` 5 例（回退/取整/上下界）+ `SidebarResizer.spec.ts` 7 例（事件序列/钳制/清理/键盘/a11y/卸载兜底）+ `OverflowText.spec.ts` 4 例（RO mock 驱动溢出联动）

---

### 🐞 Fix | 多页签排除系统页（Login/403/404/500 不再污染 tags-view）

> 修复：退出登录跳 `/login?redirect=/workbench` 后重新登录，"登录"页签残留在多页签栏。

- 根因：`router.afterEach` 对所有导航触发 `addRouteView`，`toTag` 仅排除无 name 路由，Login 具名且带 title 被加入 `visitedViews`
- 修复：`tags-view.ts` 新增 `NO_TAGS_ROUTE_NAMES` 名单（Login / Forbidden / NotFound / ServerError），`toTag` 显式排除系统页；顺带修复访问 403/404/500 时错误页签污染同类问题
- 说明：未复用守卫白名单 `isWhiteListed`——dev 模式白名单含全部 demo 路由名，按白名单过滤会误伤 demo 页签
- 测试：`tags-view.spec.ts` 补 2 例（系统页不加入 / 不影响业务页正常加入）

---

### ✨ Feature | ProTable v3.5 PR2：服务端筛选 + 事件完整披露（filterParamsAdapter / sort-change / filter-change / engine-fallback）

> v3.5 PR1-B 完成 vxe-table 引擎能力补齐后，PR2 解决「服务端筛选」与「事件契约」两个核心缺口。前者补 `filterParamsAdapter` prop + `getFilterState()` expose；后者将 `sort-change` / `filter-change` / `engine-fallback` 3 个事件完整披露到 `defineEmits` 公共 API。

**新增 `filterParamsAdapter` prop**（v3.5 PR2）：

- 类型：`(filters: FilterValuesMap) => Record<string, unknown>`
- 默认行为：直接传 `{ [列字段名]: values }`（多数后端可直接消费）
- 典型用法：将多选数组 join 成 `csv` 字符串传给 `?status=active,pending`
- 详见 `docs/29-ProTable使用指南.md §3.5`

**新增 `getFilterState()` expose**（v3.5 PR2）：

- 返回当前所有筛选列的 `{ [列字段名]: value[] }` Map
- 与 `getSortState()` 对称；用于状态回显 / 持久化

**新增 3 个公共事件**（v3.5 PR2 起 vxe/element-plus 双引擎均触发）：

| Event | Payload | 触发 |
|-------|---------|------|
| `sort-change` | `SortState<T> \| null` | 排序列变化 |
| `filter-change` | `Record<string, (string \| number \| boolean)[]>` | 任意筛选列值变化 |
| `engine-fallback` | `string` | 引擎自动降级（vxe + 树形 + 拖拽三者冲突） |

**子类型对外披露**：`FilterValue` / `FilterValuesMap` / `FilterParamsAdapter` / `SummaryAggregate` 已添加到 `docs/29 §1.4 Events` 与 `§7.5 汇总`。

---

### ✨ Feature | ProTable v3.5 PR3：ProColumn\<T\> 泛型透传改造（9 commit）

> v3.5 PR3 将 ProTable 的 7 个子组件泛型化（CellContent / SearchForm / VxeTableBody / SelectedTags / ColSetting / TableHeader / ElementTableBody），让 `ProColumn<T>` 的 T 可正确推导至各组件内部，包括 `render` 回调 / `formatter` / `cellRender` 的入参类型。

**关键 commit**：

- `8fb7cff` `c5ce5d6` `6b83168` `c0193ee` `7dfca28` `a5924cc` `4bdbbac` `8b40bf7`：ProColumn\<T\> 泛型改造 7 个组件（移除 `as ViewColumn` 强制 cast）
- `a662760`：searchForm 加 `generic<T>` + spec 泛型透传测试
- `0d2efb5` `5dd4fd4` `21dd800`：tableHeader/searchForm 回滚 ProColumn[]（与 PR3 配套）

**消费方影响**：`render: (row) => row.xxx` 的 `row` 类型现在严格为 T（之前是 `any`）。

---

### ♿ A11y | ProTable v3.5 A11y 改造（10 commit）

> v3.5 A11y 系列解决无障碍合规问题，对接 WCAG 2.1 AA：

- `70f904a` `3fc08e9` `ab88e51` `d304819` `4bc3c9d` `2cf1c9d` `1ffab58` `98df3af` `da67ceb`：A11y 改进 9 commit（prefers-reduced-motion 媒体查询支持、aria-live 区域、role=toolbar / region、focus-visible 焦点样式）
- `playwright e2e` 基建 + `vitest-axe` 集成：新增 `@playwright/test` ^1.63.0 + `vitest-axe` ^0.1.0 依赖，自动化 A11y 回归测试

---

### ✨ Feature | ProTable v3.5 PR1-B：vxe-table 引擎树形 + 行拖拽能力补齐

> v3.5 PR1-A 通过 A11y + E2E 后，PR1-B 解决 v2.1 决策 5 遗留：vxe-table 引擎能力与 element-plus 对等。树形 + 行拖拽两个 v2.0 起只支持 el 引擎的能力，PR1-B 起在 vxe 引擎下也完整可用。

**新增 Adapter 引擎胶水层**（`src/components/ProTable/adapters/`）：

- `tree-adapter.ts` + `tree-adapter.spec.ts`：`TreeAdapter` 接口 + `createElementPlusTreeAdapter`（el: treeProps 占位符 + flatData 重算）+ `createVxeTreeAdapter(getVxeTable)`（vxe: tree-config 协议 + `setTreeExpand(row, expanded)` 双向同步 + `syncExpanded(keys, rowsByKey)` 全量回灌）
- `row-drag-adapter.ts` + `row-drag-adapter.spec.ts`：`RowDragAdapter` 接口 + `createElementPlusRowDragAdapter(rowKey='id')`（el: `.el-table__body-wrapper tbody` + `:data-row-key` 反查）+ `createVxeRowDragAdapter({ getRowsByIndex, getLevelByViewIndex, rowKey })`（vxe: `.vxe-table--body-wrapper tbody` + 视图索引 → `props.rows` 反查 + 可选 tree 模式 `_level`）

**VxeTableBody.vue 接线**：

- 新增 `treeData` + `rowDrag` props（`ReturnType<typeof useTreeData | useRowDrag> | null`）
- 新增 `expand-toggle` emit（vxe `toggle-tree-expand` 事件已映射 rowKey）
- 实例化 `createVxeTreeAdapter`（getter 闭包访问 `vxeTableInst.value`，适配器与组件实例生命周期一致）
- `treeConfigBinding` computed + `treeColumnIndex` computed 定位首个 `col.tree` 列
- watch `expandedKeys` 全量回灌 vxe 引擎侧 Map（覆盖 revealKeys 批量展开、外部 expandNode/collapseNode API、defaultExpandDepth 启动默认展开三个场景）
- `handleToggleTreeExpand` 把 vxe UI 触发展开/折叠回流 `useTreeData`，双引擎共享同一 useTreeData 实例
- defineExpose 新增 `getTbody`：优先从 vxe 实例 ref 拿根 DOM 再 query `.vxe-table--body-wrapper tbody`；onMounted 前 fallback 用模板根 div ref query

**ProTable.vue + useTableCapabilities.ts 双引擎条件透传**：

- `useTableCapabilities` 移除 `treeData !isVxeEngine` 守卫：vxe 引擎也支持树形
- 移除 `rowDrag !isVxeEngine` 守卫：vxe 引擎也支持拖拽
- 新增 `isVxeTreeConflict` 检测：vxe + 树形 + 拖拽 三者同时启用时 rowDrag 退化 null（sortablejs 与 vxe tree-node 行结构冲突）
- `useTableEngineDom` 双引擎 tbody 路由：新增 `proTableVxe` + `effectiveEngine` 参数，按 `effectiveEngine.value === 'vxe-table'` 走 vxe tbody 查询路径
- `validateCapabilities` 改写：单一 warn「三者冲突」替代原 vxe 不支持树形/拖拽两条
- ProTable.vue `vxeTableBindings` 接收 treeData + rowDrag（与 elTableBindings 对称）
- 顶层解构 useTableCapabilities 加 rowDrag（之前漏掉）

**测试覆盖**：

- `tree-adapter.spec.ts` 13 例：elementPlusTreeAdapter 5 例 + vxeTreeAdapter 8 例
- `row-drag-adapter.spec.ts` 23 例：elementPlusRowDragAdapter 10 例 + vxeRowDragAdapter 11 例 + 3 个常量导出断言
- `VxeTableBody.spec.ts` 新增 6 例：treeData 启用 / toggle 事件 / treeData=null 不绑 tree-config / rowDrag=null / rowDrag 启用 / getTbody 暴露
- `useTableCapabilities.spec.ts` 改写：vxe + enableTree → treeData 正常实例化；vxe + enableRowDrag → rowDrag 正常实例化；vxe + 树形 + 拖拽 三者冲突 → rowDrag 退化 null + warn
- `ProTable.engine.spec.ts` 新增 4 例 capability matrix：vxe + enableTree mount / vxe + enableRowDrag mount / el + enableTree 回归保护 / vxe + 树形 + 拖拽 三者冲突 warn
- `ProTable.integration.spec.ts` 改写旧断言：vxe + 纯 enableTree / 纯 enableRowDrag 不再 warn「暂不支持」；vxe + 树形 + 拖拽 三者冲突 warn

**Demo 更新**：

- `ProTableEngineCompare.vue` 新增「树形 + 行拖拽双引擎对照」section：左右两栏分别渲染 el-table 和 vxe-table 引擎同一份 columns + enable-tree + enable-row-drag，验证 v3.5 PR1-B 起双引擎行为一致
- `engineMatrixItems` 树形/行拖拽两行从「❌ 暂不支持」改为「✅ 支持」+ 描述

**文档**：

- `README.md` §引擎能力矩阵（v2.1 → v3.5 PR1-B）：树形/行拖拽两行升级 + 三者冲突 warn 说明
- `README.md` 新增 v3.5 PR1-B 变更摘要段：TreeAdapter/RowDragAdapter 4 个工厂对照表 + 双引擎能力对照（v2.1 → v3.5 PR1-B）+ 实现要点 + 唯一约束
- `ARCHITECTURE.md` 顶部「当前版本」从 v3.4 升到 v3.5（PR1-A + PR1-B），新增 PR1-B 增量摘要

**已知约束**：

- vxe + 树形 + 行拖拽 **三者同时启用**会触发 console.warn（sortablejs 与 vxe tree-node 行结构不兼容），行拖拽自动退化 null，业务方按需取舍
- 视觉对照：本环境下无浏览器截图能力，由用户在 dev server 打开 `/demo/pro-table-engine-compare` 手动验证双引擎树形 + 行拖拽对等

### 🐛 Bug Fixes | XForm 布局容器节点：column 分区失效，children 全堆单 ElCol 纵向排列（xform-grid 模式3）

> 用户实测 `/demo/xform-grid` 模式3「布局容器节点」：demo 设计意图是「无 name 节点带 row/column → 渲染为纯栅格容器，分区组织字段」（分区1 `column:2` 放订单号+状态 2 列并排，分区2 `column:3` 放金额+日期+备注 3 列并排），实际渲染成 5 个字段全纵向单列堆叠。根因：`renderWithRowColumn`（无组件无 name 的 row/column 容器节点渲染路径，dispatch 顺序 permission → array → tabs/steps → visual → formItem → **rowColumn** → default）把 `node.column` 错当「整个分区占 `24/column` 宽」，children 全塞进**单个** ElCol——column 的语义应是「该容器内 children 分配到 N 个独立 ElCol」。**既有实现缺陷**（087f000 引入 grid demo 时即如此），非本轮 SchemaField 重构回归——但 SchemaField 系列修复后此路径暴露为可见 bug。与视觉容器 Card 的 `renderToComponentWithGrid` 对齐（column 分配优先，child 自有 col 在 column 容器内不另包，避免双嵌套 ElCol）。模式1（column 统一分配）/ 模式2（row+col.span）经浏览器实测**不受影响**（顶层 column 与 col 对象语义保留原路径）。

* **fix(src/components/form-schema/composables/render-form-item.ts):** `renderWithRowColumn` 新增分支——`node.column !== undefined && children 非空数组` 时走 grid 分区：每个 child 经 `opts.render(c)` 递归渲染后包独立 ElCol（`span=Math.floor(24/column)`，key 取 `c.key ?? i`），ElRow 沿用 `mergeRowResponsive` 拍平；`col` 对象（span/offset/responsive）而无 column、或 children 为空时保留「单 ElCol 整段占宽」原语义（向后兼容现有测试与 Card 兜底路径）
* **test(src/components/form-schema/composables/render-form-item.spec.ts):** 新增 2 例——`column:2 + 2 children → 2 个 ElCol 各 span=12` / `column:3 + 3 children → 3 个 ElCol 各 span=8`；新增 `findAllVNodesByType` 辅助函数（slot 展开 + 数组递归，支持「分配成 N 个 vnode」类断言）
* **已验证:** `pnpm vitest run src/components/form-schema` 65 文件 1175 例全绿（+2 例）+ `pnpm type-check` 0 错误 + `pnpm exec eslint` 改动文件 0 警告；浏览器实测（chrome-devtools，真实 DOM 结构）——模式3：分区1 `directCols:2 spans:[12,12]`（订单号/订单状态各占一列）、分区2 `directCols:3 spans:[8,8,8]`（金额/日期/备注各占一列）；回归确认模式1 `spans:[8,8,8,8,8]`、模式2 `spans:[6,6,12,12,12]` 均不变

### 🐛 Bug Fixes | XForm SchemaField：reaction 写回 node 属性不触发重渲（xform-expression demo「功能都失效」根因）

> 用户打开 `/demo/xform-expression` 反馈「功能都失效」。浏览器实证分两类：(A) **reaction 写回类**（币种联动 label / 选「其他」显隐补充说明）——根因是 2026-09-18 把 `rendered` computed 改为 `renderNode()` 普通函数后，Card 等视觉容器经多层 slot 闭包（`renderVisualContainer → renderToComponentWithGrid`）递归渲染子字段，子字段 `node.label` / `node.hidden` 的读取被推迟到 ElCard patch 期的 slot 调用栈，**脱离 SchemaField 自身 render effect 的同步执行期**——之前 computed 的 deps 容器会收纳这些深层读取并挂到本组件 effect，改动后该机制丢失，reaction 写回正确但 DOM 不刷新；(B) **表达式求值类**（顶层 readonly 锁定 / permission 三态 / on.change 日志）——根因是表达式沙箱 `toSafeDtoCached` 深拷贝 model 为安全 DTO，切断响应式追踪（顶层 readonly computed 只依赖 `props.model` 引用 + `reactiveSchema.value`，model 字段 mutation 不触发重算），此为引擎自 ba8879d 诞生起的固有架构行为，**非本轮回归**。

* **fix(src/components/form-schema/components/SchemaField.vue):** 新增 deep watch `props.node` → `tick++` 重渲兜底——node 任一属性（含深层 children 字段的 label/hidden）变化时触发本字段重渲，重建等价于旧 computed deps 的响应式订阅；成本为每 SchemaField 一个 deep watcher，仅属性实际变化时 tick++
* **fix(src/components/form-schema/composables/use-model-expression-rerender.ts):** 新增 composable——检测 schema 是否含「model 依赖表达式」（顶层 readonly/disabled 或字段 permission 的函数/'{{ }}' 形态），含则挂 `watch(model, {deep})` → `triggerRender()` + `onModelChange()` 重渲兜底；**按需启用**（无这类表达式的纯 v-model 表单零 deep watch 开销，保留字段级重渲隔离性能卖点）。解决表达式沙箱 `toSafeDtoCached` 深拷贝切断响应式追踪的固有缺口——这类表达式的宿主 computed 只依赖 `props.model` 引用，model 字段 mutation 不重算
* **fix(src/components/form-schema/components/SchemaField.vue):** `renderNode()` 返回值改**三态语义**区分「合法空」与「渲染失败」——`null`=合法空渲染（permission 'hidden' / node.ignore / 无组件映射等 renderFn 正常返回 undefined 的场景）、`undefined`=渲染失败（renderFn 同步 throw / patch 阶段 renderError）。模板判定从 `!renderNode()` 改为 `renderNode() === undefined`。修复 `permission: 'hidden'` 字段（internalNote / 权限码 admin.delete 等）被误报「字段渲染失败（详见 console）」红色占位——hidden 是「按设计消失」而非「渲染出错」（2026-09-18 用户反馈 xform-field-permission 两个字段渲染失败根因）；`<component :is="null">` 渲染为空节点，hidden 字段正常从 DOM 消失
* **fix(src/components/form-schema/composables/use-render-root.ts):** `renderToComponent` 新增订阅 `modelExpressionEpoch`——model 依赖表达式的求值在 Card 等视觉容器的 slot 闭包里（`resolvePermission`），脱离 SchemaField 自身 render effect 同步追踪；composer bump 此 epoch 强制整树 SchemaField 重跑，permission 才得以重算（顶层 readonly 走 `topLevelReadonly` computed 追踪无需 epoch，permission 在 slot 闭包必须靠 epoch）
* **fix(src/components/form-schema/composables/use-xform-composer.ts):** 接线 `useModelExpressionRerender` + 创建 `modelExpressionEpoch` 传 useRenderRoot
* **已验证(A+B 类修复):** `pnpm vitest run src/components/form-schema` 65 文件 1173 例全绿 + `pnpm type-check` 0 错误；浏览器实测（chrome-devtools，真实 UI 交互）——① 锁定开关切 on → 6 字段 view 化、切 off 恢复可编辑；② 币种切 USD → 金额 label 联动 `报销金额（美元 $）`；③ 费用类型选「其他」→ 补充说明显示；④ on.change 日志面板追加「费用类型 → xxx」；⑤ 角色切 viewer → 审批意见 view 纯文本、切回 admin → 恢复可编辑；⑥ **xform-field-permission**：permission 'hidden' 字段（内部备注 / 权限码-管理员）不再误报「字段渲染失败」红色占位（`errCount:0`），正常从 DOM 消失；动态权限函数形态（adminNote 随 role 切 admin/guest 显隐）正常

### 🐛 Bug Fixes | XForm Tabs/Steps demo：三条用户反馈修复（onTabChange 误报 / budget 类型 / 首 tab 未选中）

> 用户打开 `/demo/x-form-tabs-steps` 反馈 2 条控制台警告 + 1 条交互异常：(1) dev props 校验误报「Tabs props 包含未声明键：onTabChange」——事件回调形态（`onTabChange` / `onUpdate:modelValue`）合法透传但不在 Component.props 反射白名单内；(2) ElInputNumber `modelValue` 要求 `Number | Null`，demo 初始值 `''` 触发类型检查警告；(3) Tabs 首 tab「基础信息」初始未选中，需手动点击才渲染表单——根因是 schema 给 Tabs 加了 `beforeLeave: async`（EP beforeLeave 须同步返 false 才阻止，async 恒真不阻止；且初始 mount 走 Promise 分支 + schema computed 重求值新闭包，打乱首个 tab 初始渲染）。KISS 修复：校验器加 `^on[A-Z]` 豁免 / demo 初始值改 `null` / Tabs 回归纯视觉容器（门控只保留在 Steps「下一步」按钮）。

* **fix(src/components/form-schema/components/SchemaField.vue):** `rendered` computed 改为 `renderNode()` 普通函数——`renderFn` 内可能含 `applyDirectives → withDirectives`，后者要求活跃渲染上下文（currentRenderingInstance !== null）；computed 求值可能在 watch flush / 副作用阶段，此时 rendering instance 已清空 → withDirectives 守卫命中警告 + **跳过指令挂载**（2026-09-18 用户反馈 xform-directives demo 控制台警告根因，此前 focus / audit 指令均不生效）。真正的组件 render() 函数执行期渲染上下文必定活跃，故改为模板内 `{{ renderNode() }}` 调用（每次组件重渲染重新执行）
* **fix(src/components/form-schema/components/SchemaField.spec.ts):** 改写「字段级重渲隔离」用例——renderNode 是普通函数（非 computed 缓存），调用次数从精确 2 次放宽为 >= 2；关键断言保持 node1/node2 各自被独立调用（隔离语义不变）
* **fix(src/modules/demo/examples/XForm/XFormDirectives.vue):** 临时调试标记已移除（验证 mounted 真实执行后清理）
* **fix(src/components/form-schema/composables/render-tabs-steps-node.spec.ts):** 改写「children 每项 → ElStep」用例——断言 title prop 映射 + label prop 不存在；新增「Steps child.label 缺省 → title 回退 `面板 N`」用例
* **fix(src/components/form-schema/composables/validate-component-props.spec.ts):** 新增 1 例——Tabs + `modelValue` / `onTabChange` / `onUpdate:modelValue` 不警告（合法透传）
* **fix(src/components/form-schema/composables/render-tabs-steps-node.ts):** `renderPanes` 把 `child.name` 透传为 ElTabPane 的 `name` prop——EP 用 `currentName`（来自 modelValue）匹配 `paneName` 决定 active pane；此前不传 name 时 paneName fallback 到 index（'0'/'1'），与 modelValue（如 'basic'）永远不匹配，导致所有 pane `v-show=none`（首次打开看不到表单，2026-09-18 用户反馈二次根因；首次误判为 beforeLeave 副作用已回滚）
* **fix(src/components/form-schema/composables/render-tabs-steps-node.spec.ts):** 新增 2 例——child.name 透传为 pane name（回归）/ child.name 缺省不传 name prop（EP fallback 到 index）
* **fix(src/components/form-schema/composables/apply-default-values.ts):** `setInitialValues` 快照同步限定为**仅首次**——此前 `watch(() => props.schema, {deep: true})` 在 schema 任何重求值（含业务把 schema 包成 computed 依赖 model 字段的场景）都会触发 `applyDefaultsAndSync → setInitialValues(props.model)`，把当前脏 model 同步为 el-form 的 initialValue 快照；用户随后点重置时 `resetField` 回到被污染的快照（=当前值），表现为「重置没反应」。修复后首次挂载同步一次快照，后续 schema watch 只应用 `defaultValue` 不再覆盖快照；**这是通用 XForm 引擎 bug**（所有 schema 是 computed 的 41 个 demo 均受影响），2026-09-18 用户反馈第四次根因
* **fix(src/components/form-schema/composables/apply-default-values.spec.ts):** 改写「schema 引用变化时重跑」用例——断言 setInitialValues 在后续 watch 触发时**不再被调**（仍 1 次）+ 新增 1 例 `applyDefaultsAndSync(syncSnapshot=false)` 只应用 defaultValue 不同步快照
* **feat(src/modules/demo/examples/XForm/XFormTabsSteps.vue):** 重置按钮升级为 `onResetAll`——除 `resetFields()` 外同步归零 `activeStep=0` + `activeTab='basic'`（此前只清表单字段，step 进度和 tab 停留原位，用户看到「空白表单 + step 停在 2」困惑）；CSS 覆盖区分 `is-process`（当前激活）vs `is-success`（已完成）vs `is-wait`（未到达）三态视觉——EP 把 state class 加在 `.el-step__head` 而非 `.el-step` 本身（demo 初次覆盖选择器写错已修正），给 `is-process` 图标加 3px 主色粗边框 + 4px 光晕 + 连接线主色，让用户一眼看到「当前在哪一步」
* **已验证:** `pnpm type-check` 0 错误；`pnpm vitest run src/components/form-schema` 64 文件 1156 例全绿；浏览器实测（chrome-devtools MCP）pane id=`pane-basic` + `is-active` + 3 个 `el-form-item` 渲染成功

### 📚 Docs | 修正 CLAUDE.md §1.7 组件自动注册范围描述：三目录 deep 注册（Wave4-4 决策）

> Wave4-4 触发 AskUserQuestion 决策（选 B 修订 CLAUDE.md）：vite.config `dirs: ['src/components/common', 'src/components/ProTable', 'src/components/form-schema']` + `deep: true` 实际**深扫三目录所有 .vue**（含 ProDialog/ / XForm / ProTable 子组件），与 CLAUDE.md §1.7 旧描述「只扫 components/common 一级 / 子目录组件需显式 import」矛盾。保留 vite.config 现状，同步修订 CLAUDE.md §1.7 / §1.6 / §4 #15 三处 + vite.config 注释。

* **docs(CLAUDE.md §1.7):** 修订「自动扫描 components/common/**」→「dirs 三目录（common + ProTable + form-schema）+ deep: true 深扫所有 .vue」；范围段同步明确 ProDialog / ProDialogForm / XForm / ProTable / SearchForm 等均自动注册不要 import；删除「unplugin 默认 dirs 只扫一级」错误机制说明；检测方法从「删除 import from '@/components/common/...'」泛化为「删除 import from '...'」
* **docs(CLAUDE.md §1.6):** 「全局组件」行扩为三目录示例（BaseChart / ProTable / XForm）；「子目录组件（非自动注册）」反例从「form-schema/ProDialog/ 等」改为「components/ 下其他自建子目录」（因 form-schema/ProDialog 实际在 dirs 内自动注册）
* **docs(CLAUDE.md §4 #15 + 头部 v1.7.0 变更记录):** 约束表同步三目录描述 + 本次修订归因
* **docs(vite.config.ts):** Components dirs 注释明确三目录 + deep: true 语义 + 指向 CLAUDE.md §1.7
* **已验证:** 全项目 Grep 无其他「只扫一级 / 子目录不自动注册」残留描述；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### ✨ Features | XForm 设计器演进类型字段预留：id / meta / schemaVersion 三字段（PM 审查发现 12）

> 产品经理审查发现 12：低代码设计器接口预留评估——基础良好（schema 纯 JSON 可序列化、{{ }} 表达式支持后端下发、类型契约完整导出），但缺顶层 `schemaVersion` 字段（schema 升级靠 useFormPersist.restoreFilter 手工裁剪）+ 节点级 `id`/`meta` 约定（设计器选中/锚定/回写需要）。本轮仅做**接口预留**（不实现设计器）：SchemaNode 加可选 `id?: string` / `meta?: Record<string, unknown>`（节点级，identity 命名空间），顶层容器加可选 `schemaVersion?: string`（SchemaNodeTopLevel）；可视化工具有了锚点后再评估 PoC。

* **feat(src/components/form-schema/types/identity.ts):** `SchemaNodeIdentity` 加 `id?: string`（节点稳定 id，同层唯一，设计器选中/锚定/回写；XForm 渲染与校验不消费，仍按 name/key 做标识）+ `meta?: Record<string, unknown>`（透传不透明键值对，不消费/不校验/不序列化到 model；建议仅放可 JSON 序列化的纯数据）——4 → 6 字段
* **feat(src/components/form-schema/types/top-level.ts):** `SchemaNodeTopLevel` 加 `schemaVersion?: string`（'major.minor.patch' 或业务自定义；XForm 渲染不消费，供 useFormPersist.restoreFilter 升级裁剪 + 设计器 schema 升级策略锚定）——6 → 7 字段
* **feat(src/components/form-schema/types/schema-node.ts):** SchemaNode 文件头字段分组表 + @see 同步（31 → 35 字段；identity 4 → 6 / top-level 5 → 7）
* **test(src/components/form-schema/index.spec.ts):** 新增「设计器演进字段类型契约」2 例——SchemaNode 接受 id/meta/schemaVersion 可选字段（值正确透传）/ 三字段均可缺省（业务手写 schema 无设计器需求不填）
* **docs(src/components/form-schema/README.md):** 新增「设计器演进接口预留」小节——三字段语义/消费侧/缺省约定对照表
* **docs(src/components/form-schema/ARCHITECTURE.md):** §2.1 字段分类表节点标识 4 → 6（加 id/meta）+ 顶层配置 5 → 7（加 watchFallback/schemaVersion）+ 合计 31 → 35；目录树 identity/top-level/schema-node 字段数注释同步
* **ci(scripts/check-doc-currency.ts):** SchemaNode 字段数 expected 32 → 35（注释同步「Wave4-3 +3 id/meta/schemaVersion」）
* **已验证:** index.spec 9/9 通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` SchemaNode 字段数 35/35 通过

### ✨ Features | XForm Tabs/Steps 视觉容器内置：children 即面板 + 激活态绑定 model + 校验门控（PM 审查发现 9）

> 产品经理审查发现：Tabs/折叠分组容器 / Steps 分步表单在能力矩阵标「❌ 缺失（仅 Card）」，CONTRIBUTING §3.2 已铺好扩展路径。本轮复用 render-visual-container 分支模式新增 Tabs/Steps 视觉容器——`component: 'Tabs'/'Steps'`（或 El 全名），children 每项 → ElTabPane/ElStep 面板（label 取 child.label，缺省回退 `面板 N`）。定位纯视觉容器（与 Card 同级），激活态绑定 / 校验门控通过**透传 EP 原生 props/events** 实现（Tabs：`modelValue` + `onTabChange` + `beforeLeave`；Steps：`active` + 外层按钮驱动），不在 XForm 侧做二次抽象。

* **feat(src/components/form-schema/composables/render-tabs-steps-node.ts):** 新增 Tabs/Steps 视觉容器渲染分支——`isTabsNode` / `isStepsNode` 判定（短名 / El 全名 / 组件对象三形态）；`renderPanes` 把 children 每项映射为 ElTabPane / ElStep（label 取 child.label 缺省回退 `面板 N`）；面板内容 child.row/column 走 renderToComponentWithGrid 栅格；props 合并优先级与 renderVisualContainer 对齐（componentProps → node.props → asyncProps → disabled/key）
* **feat(src/components/form-schema/composables/render-schema-node.ts):** 主调度加分支 2b（Tabs/Steps 视觉容器）——先于 Card 视觉容器判定，无 name + children 数组才命中，否则返回 undefined 落入后续分支
* **feat(src/components/form-schema/composables/resolve-component.ts):** EL_COMPONENT_MAP 加 `Tabs: ElTabs` / `TabPane: ElTabPane` / `Steps: ElSteps` / `Step: ElStep` 四项
* **feat(src/components/form-schema/types/schema-node.ts):** ComponentPropsRegistry 加 `Tabs: ElTabsProps` / `TabPane: ElTabPaneProps` / `Steps: ElStepsProps` / `Step: ElStepProps` 四项
* **feat(src/components/form-schema/builders/containers.ts + index.ts):** 新增 `xTabs` / `xSteps` 链式 builder（Ext 方法：Tabs.modelValue/beforeLeave；Steps.active/processStatus）；builder 入口 27 → 29
* **test(src/components/form-schema/composables/render-tabs-steps-node.spec.ts):** 新增 14 例——isTabsNode/isStepsNode 三形态判定 / Tabs children → ElTabPane（label 取 child.label）/ label 缺省回退 / modelValue 透传 / child.row/column 走 grid（产出 ElRow）/ Steps children → ElStep / 非 Tabs-Steps（Card）返回 undefined / 有 name / children 非数组 / children 空数组边界
* **demo(src/modules/demo/examples/XForm/XFormTabsSteps.vue):** 活动创建场景——Tabs 分组（基础信息 / 高级设置）+ Steps 分步（填写 / 确认 / 完成）；schema 用 computed 包让 modelValue/active 随 model 响应；Tabs beforeLeave 校验门控（切走 basic 前 validateField BASIC_FIELDS，失败 return false 阻止切换 + ElMessage 提示）；Steps 外层「上一步 / 下一步」按钮驱动 activeStep；sidebar 注册「Tabs/Steps 容器」
* **docs(src/components/form-schema/README.md):** 新增「视觉容器（Card / Tabs / Steps，children 即面板）」小节——容器/面板组件/label 来源/激活态+校验门控对照表；demo 计数 55 → 56 三处
* **docs(docs/24-XForm使用指南.md):** §19 示例索引 55 → 56 + 加 `/demo/x-form-tabs-steps` 行
* **docs(src/components/form-schema/ARCHITECTURE.md):** §8.1 builder 工厂 27 → 29 + builders.ts 目录树注释 + 表加 xTabs / xSteps 两行
* **ci(scripts/check-doc-currency.ts):** XForm demo 数 expected 55 → 56；builder 入口数 expected 27 → 29（注释同步「Wave4-2 +2 xTabs/xSteps」）
* **已验证:** 全量 form-schema 64 文件 1151 例通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### ⚡ Performance | XForm 性能三热点优化：表达式 toSafeDto 微任务缓存 84x + cross-field watchFallback 逃逸口 + schema 管线文档化（架构师审查 #7/#8/#6）

> 架构师审查性能三热点一次性落地：① 表达式沙箱每次 compiled 调用都对 model 全量深拷贝（`toSafeDto`），同 tick 多字段 reaction 同批触发时重复拷贝 N 次——加微任务级缓存同 tick 只拷一次（跨 tick 失效保行为一致，bench 实证 84x 加速）；② cross-field 反向校验常驻 deep watch + 每键 lodash isEqual 快照 diff，纯 v-model 表单（所有写入经 onValueChange）是白白付的成本——加 `watchFallback: false` 逃逸口（schema 顶层字段）显式关闭；③ schema 变更管线对根引用 deep watch + cloneDeep 重建（含索引 / reaction 预算 / crossRule 拍平等 N 次 walk），原地 mutate 深层字段不会热更——文档化「须整体替换」约束。

* **perf(架构审查 #7, src/components/form-schema/composables/use-expression.ts):** 新增模块级 `safeDtoCache: { raw, dto }` + `queueMicrotask` 失效——`compiled()` 同 tick 多次调用只深拷贝一次（N reaction 同批触发场景），跨 tick 缓存失效保证行为一致（WeakMap 方案被否：嵌套对象变化会读旧快照）
* **perf(架构审查 #7, src/components/form-schema/bench/expression-safe-dto.bench.ts):** 新增 vitest bench 两例（同 tick 缓存命中 vs 跨 tick 每次新建）；实测 17,509 hz vs 207 hz = **84.23x faster**
* **perf(架构审查 #8, src/components/form-schema/composables/use-cross-field-trigger.ts):** `UseCrossFieldTriggerOptions` 新增 `watchFallback?: boolean`（默认 true 向后兼容）；deep watch 兜底块包在 `if (opts.watchFallback !== false)`——纯 v-model 表单可关 deep watch 省每键 isEqual 成本；JSDoc 量化 trade-off
* **perf(架构审查 #8, src/components/form-schema/types/top-level.ts):** `SchemaNodeTopLevel` 新增 `watchFallback?: boolean`（仅顶层 schema 生效，SchemaNodeTopLevel 5→6 字段 / SchemaNode 31→32 字段）
* **perf(架构审查 #8, src/components/form-schema/composables/use-xform-composer.ts):** useCrossFieldTrigger 调用接线 `watchFallback: reactiveSchema.value.watchFallback ?? true`
* **docs(架构审查 #6, docs/24-XForm使用指南.md):** §17 故障排查 + §18 已知限制各加一行——schema 变更管线对根引用 deep watch + cloneDeep 重建（含 N 次 walk），不支持原地 mutate 热更，须整体赋新引用触发单次重建
* **test(src/components/form-schema/composables/use-cross-field-trigger.spec.ts):** 新增 watchFallback 3 例（false → 直改 model 不触发 / false → 精确 trigger 路径仍可用 / 缺省向后兼容同显式 true）；makeOpts 扩 extra 透传；33/33 通过
* **ci(scripts/check-doc-currency.ts):** SchemaNode 字段数 expected 31 → 32（注释同步「Wave4-1 +1 watchFallback」）
* **已验证:** 全量 form-schema 63 文件 1137 例通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过；`pnpm vitest bench src/components/form-schema/bench/expression-safe-dto.bench.ts` 84.23x 加速

### ✨ Features | XForm 交互增强：F7 拖拽落点指示线 + F9 size 密度 + F13 dirty 标记（设计师审查）

> 设计师审查的三个交互/体验增强一次性落地：数组行拖拽排序新增落点指示线 + 源行拖拽态（此前只有 dragover preventDefault，无任何视觉反馈）；XFormProps 新增 `size` 透传 ElConfigProvider（此前内部硬编码 'default'，中后台紧凑表单场景需外层再包一层 ConfigProvider）；XFormProps 新增 `showDirtyMark` 字段级 dirty 视觉指示（此前 dirty 追踪能力完整但表单上无任何视觉线索，"我改了哪里"只能靠外挂面板）。

* **feat(F9 密度控制, src/components/form-schema/types/xform.ts):** XFormProps 新增 `size?: 'large' | 'default' | 'small'`，JSDoc 说明场景 / 向后兼容（未传入保持 'default'）/ schema 顶层不预留 size（密度是表单级视觉决策）
* **feat(F9, src/components/form-schema/components/XForm.vue):** `elConfig.size` 由硬编码 `'default'` 改 `props.size ?? 'default'`
* **feat(F13 dirty 标记, src/components/form-schema/types/xform.ts):** XFormProps 新增 `showDirtyMark?: boolean`（默认 false）；JSDoc 说明数据侧能力已就绪 + resetDirty 自动清空
* **feat(F13, src/components/form-schema/composables/use-form-dirty.ts):** 新增 `dirtyFieldsRef: Readonly<Ref<ReadonlySet<string>>>` 响应式导出——recompute 时整体替换新 Set 触发响应式依赖（render-form-item 的 is-dirty class 绑定订阅它）；`recompute` 由原地 clear/add 改构造新 Set 赋 value
* **feat(F13, src/components/form-schema/composables/use-render-root.ts + render-schema-node.ts + use-xform-composer.ts):** `showDirtyMark` / `dirtyFields` 沿 renderOpts 链路透传到 render-form-item；exactOptionalPropertyTypes 用 `| undefined` 联合 + 条件展开兼容
* **feat(F13, src/components/form-schema/composables/render-form-item.ts):** form-item h() props 加 `class: 'is-dirty'` 条件（showDirtyMark 开启 + node.name 在 dirtyFields 集合中）；render effect 内 `.has()` 建立响应式依赖
* **feat(F13, src/components/form-schema/styles/element-form-overwrite.scss):** `.el-form-item.is-dirty .el-form-item__label::after` 6px 圆点（`--el-color-warning`）
* **feat(F7 拖拽指示, src/components/form-schema/composables/render-array-node.ts):** 模块级 `dragSourceIndex` / `dropTargetIndex` / `dropPosition` ref（同一时刻只在一个数组上拖拽）；`onDragstart` 记源 index；`onDragover` 计算鼠标在行内垂直位置（上半 before / 下半 after）；`onDragleave` 清落点；`onDrop` 换算落点（before → index-1 / after → index）调 moveItem；`onDragend` 清状态；row class 数组拼 `is-dragging` / `is-drop-before` / `is-drop-after`
* **feat(F7, src/components/form-schema/styles/element-form-overwrite.scss):** `.array-node__row.is-dragging { opacity: 0.5 }` + `.is-drop-before::before` / `.is-drop-after::after` 2px `--el-color-primary` 插入线（绝对定位跨整行宽度）
* **test(src/components/form-schema/composables/use-form-dirty.spec.ts):** 新增 dirtyFieldsRef 响应式 1 例（recompute 触发 Set 替换 / has 查询 / resetDirty 清空），16/16 通过
* **test(src/components/form-schema/index.spec.ts):** XFormProps 契约快照补 `size: true` / `showDirtyMark: true`，toHaveLength(16) → (18)
* **docs(docs/24-XForm使用指南.md):** §2 Props 表标题 16→18 + 补 size / showDirtyMark 两行 + 表尾「18 个 prop」
* **docs(src/components/form-schema/README.md):** §props 标题 16→18 + 表补 size / showDirtyMark 两行
* **ci(scripts/check-doc-currency.ts):** XFormProps 字段数 expected 16 → 18（注释同步「Wave3-6 交互增强 +2 size/showDirtyMark」）
* **已验证:** 全量 form-schema 63 文件 1134 例通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### ✨ Features | 概念地图页 + deps/dependsOn 命名统一（PM 审查发现 4）

> 产品经理审查发现：XForm 有 ~20 个核心概念，其中「三套依赖 / 三种隐藏 / 三层拦截」三组近义词是新人主要认知税；reaction/asyncOptions 用 `deps`、跨字段校验用 `dependsOn`，命名不统一加剧学习成本。本轮在 README 新增「概念地图」章节（三组近义概念对照），并把 `deps` 统一为跨字段校验的推荐别名（`dependsOn` 保留向后兼容）。

* **docs(src/components/form-schema/README.md):** 新增「概念地图」章节——三种「依赖」（reaction deps / asyncOptions deps / crossValidator dependsOn|deps）对照表 + 三种「隐藏」（hidden / ignore / permission:'hidden'）语义光谱表 + 三层「写入前拦截」（Props 全局 → beforeChangeRules 命名空间 → 字段级）对照表；下沉引用 docs/24 §4.2 / §10 详细决策树
* **feat(src/components/form-schema/types/rule.ts):** `RuleItem` 新增 `deps?: string | string[]` 作为 `dependsOn` 的别名（与 reaction / asyncOptions 命名统一）；JSDoc 说明优先级（dependsOn 优先）+ 推荐新代码写 deps
* **feat(src/components/form-schema/composables/cross-rule-runner.ts):** `runCrossRuleMaybeSync` / `runCrossRule` 签名扩 `deps`；取值归一改为 `rule.dependsOn ?? rule.deps`
* **feat(src/components/form-schema/composables/use-cross-field-rule-trigger.ts):** 事件触发路径过滤条件 `!rule.dependsOn` → `!(rule.dependsOn ?? rule.deps)`（不漏 deps 别名）
* **feat(src/components/form-schema/composables/use-validate.ts):** 批量 validate 路径同上
* **feat(src/components/form-schema/composables/use-schema-index.builder.ts):** 反向触发索引构建的 dependsOn 提取改为 `ri.dependsOn ?? ri.deps`（同时声明时 dependsOn 优先）；存在性过滤放宽（不再要求 'dependsOn' in r，由 raw 存在性兜底）
* **test(src/components/form-schema/composables/cross-rule-runner.spec.ts):** 新增 3 例——deps 别名等效 / dependsOn 优先于 deps / 缺 dependsOn 与 deps 时 threw（不调 crossValidator）
* **docs(docs/24-XForm使用指南.md):** §5.2 标题改「dependsOn / deps + crossValidator」+ blockquote 说明命名统一 + 示例 dependsOn → deps
* **已验证:** 全量 form-schema 63 文件 1133 例通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### ✨ Features | XForm label 函数式 i18n + XFormProps.t 注入（PM 审查发现 3）

> 产品经理审查发现：XForm 无任何 i18n 机制，多语言场景 label 只能预烘焙字符串，切换语言需重建 schema。本轮落地「label 函数式」方案——label 类型放宽为 `string | (t) => string`，函数由 XForm 渲染期以注入的 t 求值；XForm 不绑定 i18n 库（vue-i18n 的 t / 字典闭包均可注入），缺省 identity。t 在 render effect 内求值，vue-i18n 场景语言切换自动重渲，无需重建 schema。

* **feat(src/components/form-schema/types/identity.ts):** 新增 `XFormTranslateFn = (key: string) => string` + `XFormLabelFn = (t) => string`；`label?: string | XFormLabelFn`（含与 reaction 函数式风格区分的 JSDoc——reaction.label 在管线求值成 string 后才写入 node.label，渲染层拿到的函数必是 i18n 函数）
* **feat(src/components/form-schema/types/xform.ts):** XFormProps 新增 `t?: XFormTranslateFn`（JSDoc 说明分层铁律：components/ 不 import locales/；调用方注入 vue-i18n 的 t 或字典闭包；缺省 identity）；字段数 15 → 16
* **feat(src/components/form-schema/utils/resolve-label.ts):** 新建 `resolveLabel(label, t?)`——函数式 label 以注入 t（缺省 FALLBACK_T identity）求值；string label 原样返回
* **feat(src/components/form-schema/composables/render-form-item.ts):** `resolveLabel(node.label, opts.t)` 求值后传入 ElFormItem.label + compileRules 默认「<label>必填」消息（函数式 label 不会漏成 undefined）
* **feat(src/components/form-schema/composables/render-schema-node.ts):** view 态 label 前缀同步 resolveLabel；RenderSchemaNodeOptions 加 `t?: XFormProps['t']`
* **feat(src/components/form-schema/composables/render-array-node.ts):** 数组行 title `cfg.title ?? resolveLabel(node.label, opts.t) ?? listName`
* **feat(src/components/form-schema/composables/use-render-root.ts):** renderOpts 加 `t: (key) => props.t?.(key) ?? key`——getter 闭包非 setup 快照，父级换 t 引用无需 optsEpoch 覆盖
* **feat(src/components/form-schema/builders/core.ts + containers.ts):** `label(label: string | XFormLabelFn): this`（import XFormLabelFn）
* **feat(src/components/form-schema/types.ts):** barrel 补 `export { type XFormTranslateFn }` / `export { type XFormLabelFn }`（带 JSDoc）
* **test(src/components/form-schema/components/XForm.spec.ts):** ElFormItemStub 加 `props: ['label']` + template 渲染 `.fi-label`；新增 i18n describe 3 例（t 注入渲染翻译文案 / 未注入 identity / setProps 换 t 重渲）；断言目标 `.el-form-item__label`（render-form-item.ts 直接 import ElFormItem 不走 global.components stub）
* **test(src/components/form-schema/index.spec.ts):** 契约快照补 `t: true`，toHaveLength(16)
* **demo(src/modules/demo/examples/XForm/XFormI18n.vue):** 新增 label 函数式 i18n demo——字典 DICTS zh/en + locale ref + t computed 闭包（模拟 vue-i18n）；三字段函数式 label + crossValidator 密码确认；语言切换按钮（zh/en）
* **demo(src/modules/demo/examples/XForm/configs/xform-demos-api.ts):** `i18nItems` 3 项 API 说明
* **demo(src/modules/demo/config/sidebar-groups.ts):** `XFormI18n: 'label 函数式 i18n'`（插在 XFormIgnore 前）
* **docs(docs/24-XForm使用指南.md):** §2 Props 表加 `t` 行（类型 XFormTranslateFn）+ 标题「15 个」→「16 个」+ line 77「15 个 prop」→16；§19 示例索引加 XFormI18n 行
* **docs(src/components/form-schema/README.md):** §props 标题 15→16 + 说明行 + 表补 `t` 行
* **ci(scripts/check-doc-currency.ts):** XFormProps 字段数注释补「Wave3-4 i18n +1 t」；XForm demo 数 54→55（含注释）
* **已验证:** 全量 form-schema 63 文件 1130 例通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### ♻️ Refactor | cross 校验三路径执行语义统一于 cross-rule-runner（架构审查 #11）

> 三条 crossValidator 执行路径（反向 model 触发 / 正向 blur-change 事件触发 / validate 批量全量）各自手写「dependsOn 取值 + 同步异步分流 + 抛错兜底 + seq 竞态令牌」，共 3 份重复实现。收敛为单一原语模块，行为保持（含同步 crossValidator 同步写入、seq bump 时机、空值三策略差异）。

* **refactor(src/components/form-schema/composables/cross-rule-runner.ts):** 新建——`runCrossRuleMaybeSync`（同步 crossValidator 直返 outcome 保持同步写入语义；异步返回 Promise）+ `runCrossRule`（async 包装，事件/批量路径 await 串行消费）+ `createCrossSeqGuard`（seq 令牌原语 begin/isCurrent/clear）；文件头显式声明「刻意不统一」清单（seq bump 时机、空值策略、结果写入三路径语义不同，保留调用方）
* **refactor(use-cross-field-trigger.ts):** executeRule 改经 runner——空值清错 + seq bump 在空值检查后（原语义）+ 同步结果同步写入 / 异步 then 内 seq 过期丢弃
* **refactor(use-cross-field-rule-trigger.ts):** seq Map 收敛为 createCrossSeqGuard（bump 时机 = 触发开始先于空值检查，原语义）；循环内 await runCrossRule，pass → setFieldError(name,'','')，fail → setFieldError(name,msg)，threw → 继续下一条（原 catch-continue 语义）
* **refactor(use-validate.ts):** runNodeCrossRules 内层 try/catch + Promise.resolve 收敛为 await runCrossRule（批量路径无空值跳过、无 seq，原语义）；移除 lodash get import
* **refactor(use-form-validation.ts):** 删除 line 72-77 过时注释（seq Map 本体早已迁走），改为指向 runner 的函数级 JSDoc
* **style:** console.error 文案三处统一为 `[XForm] crossValidator threw:`（原 reverse/blur trigger 变体）；2 处 spec 断言同步更新
* **test(cross-rule-runner.spec.ts):** 新增 15 例（同步直返 / 异步分流 / dependsOn 归一 / 抛错兜底 / 嵌套路径 / seq 递增-过期-clear）
* **docs(ARCHITECTURE.md):** §9.1 表 61 → 62（composables 48→49）；§4 #11 行 48→49 spec 文件；docs/25 TL;DR 61 → 62
* **ci(scripts/check-doc-currency.ts):** spec 文件数 expected 61 → 62（tolerance 收紧同步）
* **已验证:** cross 相关 5 文件 128 例通过；全量 form-schema 套件通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### ♻️ Refactor | 组件映射表单源化：EL_COMPONENT_MAP 唯一 runtime 真源（架构审查 #2）

> 架构审查发现组件映射存在两份手写表：adapters/element-plus-adapter.ts 的 DEFAULT_COMPONENT_MAP（31 条 name→string）与 composables/resolve-component.ts 的 EL_COMPONENT_MAP（30 条 name→Component），新增组件需双处登记必然漂移（Icon 已在 adapter 侧独存）。本轮收敛为单一真源 + 派生表，并修复 builders 拆分的 import 路径与 composer 返回类型两处遗留类型错误。

* **refactor(src/components/form-schema/composables/resolve-component.ts):** EL_COMPONENT_MAP 补 `Icon: ElIcon`，升级为唯一 runtime 真源（31 条），header 注释声明「DEFAULT_COMPONENT_MAP 从此表派生，禁止再手写第二份映射表」
* **refactor(src/components/form-schema/adapters/element-plus-adapter.ts):** DEFAULT_COMPONENT_MAP 31 条手写表 → `deriveComponentNameMap()` 从 EL_COMPONENT_MAP 派生（依赖 EP 组件对象稳定 `.name` 属性；InputPassword/ElInputTextArea 等别名键共享 ElInput 对象自动派生正确；缺 `.name` 时回退短名键）；JSDoc 说明派生关系与假设
* **test(src/components/form-schema/adapters/element-plus-adapter.spec.ts):** 新增 2 例——键集合与 EL_COMPONENT_MAP 一致（防双表漂移契约）+ Icon/别名键 `.name` 派生正确；45/45 通过
* **fix(src/components/form-schema/builders/core.ts + containers.ts):** Wave3-1 拆分的 import 路径修正 `'../../types'` → `'../types'`（types.ts 与 types/ 目录并存时文件优先解析，vue-tsc 编译失败但 vitest 解析通过致当时漏检）
* **fix(src/components/form-schema/composables/use-xform-composer.ts):** `UseXFormComposerReturn` 接口 + return 补 `scrollToField`（Wave2-2 banner @locate 接线时 XForm.vue 已解构使用，返回类型遗漏声明）
* **已验证:** adapter/resolve-component/use-dev-runtime/use-validate 92 例通过；builders/composer/XForm 72 例通过；`pnpm type-check` 0 错误；`pnpm check:doc-currency` 13/13 通过

### 🐛 Fixes | XForm scrollToError/scrollIntoViewOptions 死 prop 修复（schema 优先、props 兜底）

> 三视角审查（架构师/设计师/产品经理）发现：`scrollToError` / `scrollIntoViewOptions` 两个 props 仅声明从未接线——`use-top-level-fields.ts` 只从 schema 顶层节点读取，props 传入时被静默忽略。修复后形成「schema 显式配置 > props 兜底 > false」三级优先级。

* **fix(src/components/form-schema/composables/use-top-level-fields.ts):** 两个 computed 增加 props 兜底分支（`s?.scrollToError ?? props?.scrollToError ?? false`）；header 注释更新说明例外
* **fix(src/components/form-schema/composables/use-xform-composer.ts):** deps 传入 `props`
* **test(src/components/form-schema/composables/use-top-level-fields.spec.ts):** 新增 5 例（props 兜底 true / schema 显式 false 优先于 props true / 双缺省 false / scrollIntoViewOptions 透传 / schema 优先级），58/58 通过

### ✨ Features | ProDialogForm xformProps 透传 + 稳定 rules 引用 + asyncOptions 不可达位置 dev 警告 + 数组行默认布局

> 同一轮审查的四个集成/体验缺口一次性补齐。ProDialogForm 此前仅透传 3/15 个 XForm props（schema/model/rules），其余能力（components/zodSchema/beforeChange/permissionResolver/showErrorToast 等）完全无法使用；数组节点行内布局样式缺失导致控件错位挤压。

* **feat(src/components/common/ProDialogForm/):** 新增 `xformProps?: Partial<XFormProps>` 透传入口（`v-bind="xformProps"`，同名键优先级：显式 props > xformProps）；`:rules` 缺省改绑模块级 `EMPTY_RULES` 稳定空对象——修复 `props.rules ?? {}` 每次渲染新建引用导致 XForm renderOpts 全量失效的性能隐患
* **test(src/components/common/ProDialogForm/ProDialogForm.spec.ts):** 新增 `xformProps 透传` describe 3 例（透传 / 优先级深比较 / 引用稳定性 toBe），21/21 通过
* **feat(src/components/form-schema/):** 新增 `use-scan-async-options.ts`（walkSchema 集差扫描：全量遍历 minus registerAsyncOptions 实际遍历，自动跟随 walker 选项，单一事实源）——dev 环境下 asyncOptions 位于不支持位置（formItem.slots / array.itemSchema 内）时 console.warn + errorBus.report（新错误码 `ASYNC_OPTIONS_UNSUPPORTED_POSITION`），debug banner 同步渲染警告行
* **test(src/components/form-schema/):** 新增 `use-scan-async-options.spec.ts` 6 例 + dev-runtime 集成 1 例，21/21 通过
* **style(src/components/form-schema/styles/element-form-overwrite.scss):** 数组行补齐默认布局——`.array-node__row`（flex + gap 12）/ `__row-body`（flex:1）/ `__row-actions`（flex-shrink:0 + `--xform-array-actions-offset` 对齐变量）/ `__empty`（虚线占位空态）
* **fix(src/components/form-schema/composables/render-array-node.ts):** 空态文案改为「暂无数据，点击上方「添加X」按钮添加一行」（原「右上角」与实际按钮位置不符）
* **test(src/components/form-schema/):** render-array-node 19/19 通过
* **docs(docs/31-ProDialogForm使用指南.md):** Props 表补 `xformProps` 行 + 「XForm 能力透传」blockquote（用法示例 + 优先级说明）
* **docs(docs/24-XForm使用指南.md):** §8 asyncOptions 字段表后补「位置限制」警告块（formItem.slots / array.itemSchema 内不发起请求）

### ♻️ Refactor | builders.ts 621 行拆分 builders/ 子目录 + 兼容 barrel（架构审查 #3）

> builders.ts 621 行超项目 400 行硬上限 1.45 倍；27 个 builder 的「makeBuilder + Ext 子类 + xXxx 入口」三件套是纯结构重复。按域拆 6 文件，导出面 27 入口 + NodeBuilder + ArrayBuilder 完全不变。

* **refactor(src/components/form-schema/builders/):** 新建 core.ts（NodeBuilder 基类 + makeBuilder/makeSimpleBuilder 工厂）+ fields-input.ts（Input/Textarea/InputNumber/Mention 等 7 个）+ fields-select.ts（Select/Autocomplete/Cascader/RadioGroup/Checkbox 等 11 个）+ fields-date.ts（DatePicker/TimePicker/TimeSelect）+ fields-data.ts（Transfer/TreeSelect/Upload/ColorPicker）+ containers.ts（Card + ArrayBuilder）+ index.ts barrel
* **refactor(builders.ts):** 621 行 → 兼容 barrel（`export * from './builders/index'`）；⚠️ 必须保留本文件 —— 全部消费方（14 处 demo/docs/spec）以无扩展名路径导入，Vite/TS 在 builders.ts 与 builders/ 并存时优先解析文件
* **ci(scripts/check-doc-currency.ts):** countBuilders 扫描范围 builders.ts → builders/ 子目录（排除 index barrel）；实测 27/27 不变
* **docs(ARCHITECTURE.md):** 目录树补 builders/ 条目；模块表 builders.ts → builders/；相关文件链接更新；composer 行「1 个 watch 守护」描述同步 Wave2-3 的删除
* **已验证:** form-schema 全量 61 文件 1107 例通过；`pnpm type-check` 0 错误（含 custom-component.test-d.ts 对 '../builders' 路径的类型推导）；builders.spec 45/45 不变

### ♻️ Refactor | composer 失效 watch 实证删除 + 错误传播依赖路径收敛（架构审查 #4）

> 架构审查发现 composer 的 `watch(fieldErrors, () => triggerRender())` 疑似失效：setFieldError 走 reactive 键级写入，watch 的 ref 源监听不到键 mutation。本轮先写 spec 实证，再删除死代码并收敛隐式耦合。

* **test(use-xform-composer.spec.ts):** 新增「错误传播链路验证」describe 2 例 —— ①setFieldError 键级写入后 `window.__triggerRenderCalled` 计数不变（实证 watch 从未生效）②Object.keys 派生（模拟 XForm.vue `:data-field-errors` 绑定）随键级写入更新（实证渲染兜底路径有效）
* **refactor(use-xform-composer.ts):** 删除失效的 `watch(fieldErrors, () => triggerRender())` 与 `triggerRender` 解构/unused `watch` import；注释说明真实依赖路径（XForm.vue `:data-field-errors` 显式绑定 + render-form-item 渲染期读键），并警示勿复活该 watch
* **refactor(use-top-level-fields.ts):** 删除 `nodes` computed 内的 `void Object.keys(fieldErrors.value).length` fake read（同为失效代码）+ `UseTopLevelFieldsDeps` 移除无人消费的 `fieldErrors` 字段与 `TopLevelFieldErrors` 类型
* **test(use-top-level-fields.spec.ts):** 删除断言恒真的假用例「fieldErrors 写入时 nodes computed 重新求值」；makeDeps 同步收敛
* **已验证:** form-schema + ProDialogForm 全量 64 文件 1138 例通过；`pnpm type-check` 0 错误

### ✨ Features | XForm 错误反馈层集群改造（三视角审查 F3/F4/F5/F6）

> 设计师审查发现错误反馈层「面向用户的界面是开发者语义」：SCHEMA_VALIDATE_FAILED 这类 code 排在 toast 视觉前排、toast 永不自动消失、超量无聚合、debug banner 只能看不能点。四个发现一次性改造。

* **feat(use-form-error-bus.ts):** `FormErrorEvent` 新增 `userMessage?: string` —— toast 展示优先级高于 message；dev 语义 message 保留供 console 留痕
* **feat(components/XFormErrorToastItem.vue):** 标题主体改为 `userMessage ?? message`（F3）；code/source 降为 dev-only 弱化 meta 行（prod 零渲染）；色板全面替换为 EP CSS 变量（F6），暗色模式随主题自动切换
* **feat(components/XFormErrorToast.vue):** 三项体验改造（F4）——①新 toast 7s 自动 dismiss（定时器以 id 为 key 手动管理，卸载/手动 dismiss 双向清理防泄漏）②TransitionGroup 进出过渡对称（slideIn/slideOut）③可见 toast 超 3 条聚合为「还有 N 条错误」卡片 + 「全部关闭」按钮（emit dismissAll，XForm 接线 errorBus.dismissAll）
* **feat(components/XFormDebugBanner.vue):** 三项交互改造（F5）——①keyPath 序列化为 EP 风格 `items[0].name`（与 async-validator 报错格式对齐）②点击错误项 emit `locate(path)` → XForm `scrollToField` 滚到对应字段（role="button" + Enter 键支持）③「复制全部」按钮复制纯文本错误清单（clipboard API + execCommand 双降级，✓ 已复制 1.5s 反馈）；色板同步 EP 变量（F6）
* **test:** use-form-error-bus +1（userMessage 透传）/ ToastItem +2（userMessage 优先 / message 兜底）/ Toast +5（聚合卡 3 + 自动 dismiss 时序 2；解除 VTU transition-group stub 以真实渲染 ul）/ DebugBanner +3（EP keyPath / locate emit / 复制入口）——form-schema 全量 61 文件 1106 例通过
* **docs(docs/24-XForm使用指南.md):** showErrorToast props 行补行为描述（userMessage 分层 / 7s 自动消失 / 超量聚合）

### 🛡️ CI | check-doc-currency 扩展 + XFormProps 契约快照（Wave2-1）

> 三视角审查 Wave1-5 一次性同步的 9 处硬数据（props 15 个 / demo 54 个 / spec 61 个等）此前无任何机制守护，重构后必然再次漂移。本轮把最关键的三项纳入 CI 阻断校验，并加编译期契约测试互锁。

* **ci(scripts/check-doc-currency.ts):** 新增 2 项校验——`XFormProps 字段数`（types/xform.ts interface 体 = 15，对应 docs/24 §2 + README）与 `XForm demo 数`（examples/XForm/ 下 .vue = 54，对应 docs/24 §19）；`spec 文件数`统计范围扩展为全目录（composables + components + adapters + utils + 根级），expected 52±5 → 61±2；`composable 文件数`收紧 44±4 → 46±2（Wave1-5 后的精确地面真值）；头部覆盖清单同步更新至 13 项。实测 13/13 PASS
* **test(src/components/form-schema/index.spec.ts):** 新增 `XFormProps 契约` describe——`satisfies Record<keyof XFormProps, true>` 编译期锁定字段集合（漏字段/多字段直接 TS 报错）+ `toHaveLength(15)` 运行期锁数量；与 check-doc-currency 第 12 项互锁。7/7 通过

### 📝 Docs | XForm 文档硬数据一次性同步（三视角审查收尾）
> Wave1-1~1-4 功能变更引发的 9 处文档硬数据漂移一次性对齐：props 计数、demo 计数、spec 计数、行数、composables 清单。此后由 Wave2-1 的 check-doc-currency 扩展持续守护。

* **docs(src/components/form-schema/README.md):** props 段改为「15 个」并补 permissionResolver/reactionBudget 行、scrollToError 描述改为「schema 优先、props 兜底」；demo 计数统一为「54 个 XForm demo + 4 个通用组件 demo」；§29 示例表头改为「38 个高频入门 demo（全量 54 个见 docs/24 §19）」+ 单一事实源维护注释
* **docs(docs/24-XForm使用指南.md):** §2 Props 改为「15 个」并补 4 行；§13.2 builder 计数 28 → 27；§19 表头改为「54 个 demo，含 1 个主入口」
* **docs(src/components/form-schema/ARCHITECTURE.md):** 组件树 XForm.vue 121 → 149 行；composables 清单补 11 个遗漏条目（use-xform-expose / use-cross-field-rule-trigger / use-render-root / use-zod-validator / validate-component-props / use-scan-async-options / use-dev-runtime / use-expression-functions / apply-default-values / array-row-key / barrel）；§9 测试统计 61 个 spec（composables 48 + components 5 + adapters 1 + utils 4 + 根级 3）；§4 #6/#7/#11 行数与 spec 覆盖描述同步
* **docs(docs/25-XForm架构与决策记录.md):** TL;DR spec 计数「约 30 个」→「61 个 `.spec.ts` + 2 个 `.test-d.ts`」（实测磁盘计数）

### 🐛 Fixes | ProTable SelectedTags 回显区永不渲染（showSelectedTags 默认值失效）

> 高级筛选抽屉选值后「当前筛选」tag 区不出现的根因：`showSelectedTags` 仅声明类型（`showSelectedTags?: boolean`）未进 `withDefaults`，Vue 对 absent Boolean prop 做 **boolean casting（absent → false）**，原守卫 `v-if="props.showSelectedTags !== false"` 恒为 false，组件从未挂载。文档契约「默认开启」在运行时失效。

* **fix(src/components/ProTable/ProTable.vue):** `withDefaults` 显式声明 `showSelectedTags: true`；v-if 由 `!== false` 改为真值判断（`props.showSelectedTags && columns.searchColumns.length > 0`），与 README/ARCHITECTURE「默认 true」契约对齐
* **test(src/components/ProTable/ProTable.integration.spec.ts):** 新增「SelectedTags 已选条件回显区」3 例回归（默认开启渲染 tag / 显式 false 不渲染 / 显式 true 渲染），锁死三态
* **已验证:** ProTable 全量 39 spec 402 例通过；浏览器实测 drawer 选值 → 回显区出现 → 单个 × / 清除全部均正常

### ✨ Features | ProTable 工具栏 / 批量操作条 / CSV 导入导出

> 真实业务页面的「新增 / 批量 / 导入 / 导出」按钮扩展能力落地。设计 spec：`docs/superpowers/specs/2026-09-18-pro-table-toolbar-design.md`（L1 slot 作用域增强 → L2 配置式 toolbar → L3 内置 SelectionBar → L4 CSV utils 四层渐进）。

* **feat(src/components/ProTable/types/index.ts):** 新增 `ToolbarCtx`（selectedRows/selectedCount/loading/refresh）+ `ToolbarAction`（label/type/icon/perm/confirm/disabled/hidden/loading/onClick/children）+ `ToolbarConfirm` 类型；`ProTableProps` 末尾新增 `toolbar` / `selectionBarActions` / `maxVisibleActions`（默认 3）三 prop。⚠️ 类型文件刻意不 import `@/composables/useConfirm`（vue-tsc --build 下会触发 ProDialog.vue 全局 auto-import 声明丢失 TS2304×15，ToolbarConfirm 字段内联声明规避）
* **feat(src/components/ProTable/components/ToolbarRenderer.vue + SelectionBar.vue):** 工具栏渲染管线（perm 过滤 → hidden 计算 → maxVisibleActions 截断折叠「更多」下拉 → useConfirm 包装 → onClick(ctx)，Promise 未结算锁定防重入）+ 批量操作条（选中 > 0 浮出，配置式 actions 与 `#selectionBar` slot 完全接管双通道，slot 优先；`role="status"` + `aria-live="polite"` 无障碍）
* **feat(src/components/ProTable/utils/):** 零依赖 CSV 导入导出——`exportCsv`（BOM 防 Excel 中文乱码 + RFC4180 引号转义 + Blob 下载）+ `importCsv`/`parseCsvText`（引号感知状态机 + 表头 label→prop 映射 + 全空行剔除 + BOM 去除）。职责边界：utils 只管「行数据 ↔ 文件」，全量拉取/类型转换/校验/提交归业务层
* **feat(src/components/ProTable/ProTable.vue + TableHeader.vue + composables/useAutoHeight.ts):** `toolbarCtx` computed 下发 + SelectionBar 挂载（TableHeader 后、AsyncState 前）+ `#tableHeader`/`#toolButton` slot 作用域透传 ToolbarCtx（向后兼容）+ `selectors.selectionBar` 高度扣除
* **test(src/components/ProTable/):** 新增 4 个 spec 共 41 例（ToolbarRenderer 9 / SelectionBar 6 / exportCsv 7 / importCsv 7 + TableHeader 适配重写 12），全部通过；`pnpm type-check:full` 0 错误
* **demo(src/modules/demo/examples/ProTable/):** 新增 `ProTableHeaderActions.vue`（toolbar 配置 + 双通道 SelectionBar + slot 作用域）与 `ProTableImportExport.vue`（CSV 导出/导入业务接线），sidebar 中文名 + demo API 表同步注册（路由 `/demo/pro-table-header-actions` / `/demo/pro-table-import-export`）
* **docs(docs/29-ProTable使用指南.md):** 新增 §9 工具栏与批量操作（toolbar 渲染管线 / ToolbarAction 字段表 / SelectionBar 双通道 / slot 作用域增强 / CSV utils 用法与职责边界）；§1.2 Props 表补 3 行；§13 测试覆盖表 +4 spec；§16 示例索引 19 → 21 个 demo；原 §9~§15 顺延为 §10~§16

### 📝 Docs | 文档深度同步：useDict v2 契约形态 / useConfirm 章节 / 项目推荐说明

> 扫描全量 docs/ 与最新 src/ 代码，按 P0/P1/P2 分级产出 9 项差异清单并完成修复。无代码变更，纯文档与 README/CLAUDE.md 顶部同步。

* **docs(docs/11-字典使用规范.md):** v2 重写 —— `useDict` 由旧版「单 key 返回 `{ options, getLabel, refresh, loading }`」改为「多 code 契约形态 `useDict('gender', 'user_status') → { gender, user_status, refreshDict }`」。补 §2.1 核心 API + §2.4 强制刷新 + §9 v1→v2 迁移速查；§7 单测覆盖同步（useDict.spec.ts 5 例新描述）
* **docs(docs/27-ProDialog使用指南.md):** 新增 §8.5 `useConfirm` 命令式二次确认章节（基础用法 / HTML 富文本 / 与 ElMessageBox.confirm 差异表 / 已知限制）；顶部"覆盖范围"扩到 `useDialog + useConfirm`；§3 三种入口对比表 + §1 痛点表补 useConfirm 行；§8 测试覆盖表补 `useConfirm.spec.ts` 4 例
* **docs(docs/10-新手指引.md):** 新增 §3.7 命令式弹窗（useConfirm 一行 API + useDialog + DialogCancelledError 错误识别）
* **docs(docs/26-项目推荐说明.md):** 新增"组件级杀手锏"小节（ProTable v3.4 / ProDialog v1.1 / ProDialogForm / XForm / RichTextEditor / BaseChart / AsyncState / ErrorBoundary / DictSelect / DictTag）+ Composable 一行 API 总览；版本号升 v1.0.0 → v1.1.0；补 5 篇相关文档外链（27/29/30/31/32）
* **docs(docs/32-常用交互指令.md):** 修正 §3 `docs/34-权限设计.md` 错位路径 → `docs/23-权限设计.md`；顶部"源码位置"补 `import.meta.glob` 自动扫描说明；§7 相关文档补 v-copy 自身引用 + 指令数从 5 改为 6
* **docs(docs/04-构建与测试工具.md):** 测试覆盖表 composables 行补 `useDialog` / `useConfirm` / `useTheme` 三个 spec
* **docs(README.md):** 顶部"最近更新"对齐本轮同步范围（6 项 docs/ 改动）
* **docs(CLAUDE.md):** 文档版本 v1.5.0 → v1.6.0；新增"最近更新（2026-09-17）"段列出本轮同步明细
* **未改动（已对齐无需更新）:** `docs/29-ProTable使用指南.md` Props 表 + §4.4 searchLayout + v3.4 变更摘要、`docs/27-ProDialog使用指南.md` §2.8 resizeMinToInitial、`docs/32-常用交互指令.md` §1 v-copy + §2 防抖指令、`src/components/ProTable/{README,ARCHITECTURE,CONTRIBUTING}.md`、`docs/08-模块化架构总览.md` 主表
* **已验证（无代码变更无须跑测试）:** 仅 markdownlint 风格警告（表格对齐 / 代码内空格），与内容正确性无关

### 📝 Docs | demo 索引修复 + 9 月 spec 交付对照（深度扫描第二轮）

> 实测 `src/modules/demo/examples/` 下 94 个 `.vue` 文件后，按 demo 数量与主入口错位产出 7 项差异（DP-1~DP-7），并核对 9 月份 12 个 design spec 全部已交付代码。无代码变更，纯文档。

* **fix(docs/24-XForm使用指南.md):** DP-1 §19 示例索引从 38 → 54 个 demo（+16）；主入口错位 `XForm.vue` → `XFormOverview.vue`；按"基础 → 反应式联动 → 校验 → 异步 → 数组 → 样式与扩展"重排分组
* **fix(docs/29-ProTable使用指南.md):** DP-2 §15 新增示例索引（19 个 demo 完整表格）；§12 测试覆盖表"9 个 demo" → "19 个 demo + 详见 §15"
* **fix(docs/28-BaseChart使用指南.md):** DP-4 §11 新增示例索引（5 个 demo：Overview / Dashboard / RealTime / SaleFunnel / InDialog）
* **fix(docs/27-ProDialog使用指南.md):** DP-6 §概述 demo 站描述补全（3 个 ProDialog demo + 1 个 ProDialogForm demo）
* **fix(docs/30-RichTextEditor使用指南.md):** DP-3 末尾 demo 描述改为"单文件 RichTextEditor.vue 按 tab 内嵌三类场景"
* **fix(docs/31-ProDialogForm使用指南.md):** DP-7 末尾 demo 描述改为"ProDialogFormOverview.vue 单 demo 分章节演示"
* **fix(docs/32-常用交互指令.md):** DP-5 演示站描述补 DirectiveOverview 总览（实际 7 个 demo 不是 6 个）
* **verify(specs/2026-09-*):** DP-8 9 月份 12 个 design spec 全部已在 14 天窗口内交付：beforeChange 三层（form-schema composables 落地）/ demo sidebar 搜索（commit b423c62）/ ProTable v1-v3.0.1 全周期（types+composables+demos）/ form-schema 架构审计 3 批次 / vite.config 工程化抽离（build/ + generate-tsconfig-paths.ts）
* **未改动（已对齐无需更新）:** 12 个 spec 文档自身、CHANGELOG 时间线与 git log 9 月以来 commit 完全对齐
* **已验证（无代码变更无须跑测试）:** markdownlint + cSpell 累计 ~30 条警告（表格对齐 MD060 + 拼写 mousemove/vueuse），与内容正确性无关

### 📝 Docs | 第五轮扫描：mock URL 约定 + ESLint 规则范围对齐

> 第四轮扫描发现 5 项 DS-* 文档差异（mock URL vs API URL 的 `/api` 前缀约定 + ESLint `no-restricted-imports` 覆盖范围与 CLAUDE.md §1.5 措辞不一致）。修复 4 项（DS-3/4/6/7/8），DS-1（ESLint 新增 useUserStore 拦截规则）由项目配置保护 hook 拦截，未执行。

* **docs(docs/22-mock使用规范.md):** DS-3/DS-6 §10 字典 mock 段补"API URL vs mock URL 关键约定"——API 代码 url 字段**不含** `/api` 前缀（由 http.ts baseURL 统一拼装），mock URL **必含** `/api` 前缀（vite-plugin-mock 直连独立 mock 服务器）；典型错误示例 `request({ url: '/api/user/list' })` → 实际变成 `/api/api/user/list`（双拼 404）+ 正确写法 `request({ url: '/user/list' })`
* **docs(docs/02-代码质量工具链.md):** DS-4/DS-7 新增 §"项目自定义 ESLint 规则"章节，列当前已配置 2 条规则（vue-router/useRouter + axios）与 CLAUDE.md §1.5 强制 5 条的对照表 + 解释"为什么不全量加规则"（误报风险/重构成本/CALUDE.md 措辞）+ "后续扩展"草稿方案（启用前需全局排查 5+ 处 useUserStore 越级）
* **docs(CLAUDE.md):** DS-8 §1.5 标题与表格修订 —— 标题改为"ESLint 规则 + 规范双轨制"，表格新增"ESLint 规则约束"列（✅ 已约束 / ⚠️ 规范 + code review 兜底），明确"5 条封装实际只有 2 条走 ESLint 自动 warning，其他 3 条靠规范 + code review 兜底"
* **verify(eslint.config.mjs):** DS-1/DS-2 评估完成。ESLint 配置保护 hook 拦截了 useUserStore 规则新增（"禁止修改 eslint.config.mjs"）→ 尊重项目工程纪律，DS-1 不执行；DS-2（环境变量硬编码凭证）项目当前无对应违规实例，规则加不加影响为零，亦不执行。两项均通过 docs/02 §"项目自定义 ESLint 规则" / §"未来扩展"作为待办记录
* **未改动（已对齐无需更新）:** 4 个模块 index.ts 全部符合 §1.2 铁律；API 类型 `UserItem` / `Pagination<T>` 与 mock 返回结构一致；6 个 types/*.d.ts 文档引用一致；9 个核心组件 JSDoc 完善
* **已验证（无代码变更无须跑测试）:** markdownlint 累计 ~50 条风格警告（新增 docs/02 §自定义规则表格），与内容正确性无关；eslint.config.mjs 未改动（git diff 验证）

### ✨ Feat | ProDialog resizeMinToInitial：resize 最小尺寸锁定初始打开宽高（只能放大）

> 此前 resizable 开启后最小尺寸硬编码 320×200，业务方无法阻止用户把弹窗拖到比内容设计尺寸还小导致排版错乱。本次新增 `resize-min-to-initial` 开关：开启后本次打开弹窗的初始宽高即最小可缩尺寸（只能放大、不能缩小到初始以下），每次重新打开重新记录；关闭时保持原有 320×200 行为完全兼容

* **feat(src/components/common/ProDialog/ProDialog.vue):** 新增 `resizeMinToInitial` prop（默认 false）；open 事件经 `nextTick` 记录本次打开初始宽高（`initialDialogSize`），`useProDialogResize` 钳制最小值改为经 `ResizeMinSource` 注入（get 取最小值 / ensure 在 open 记录未就绪时首次拖拽补记，兼容弹窗内容异步挂载时序）；上限仍 viewport - 16px 不变（可放大）；全屏态禁用 resize 行为不变
* **feat(src/components/common/ProDialog/types.ts):** `ProDialogProps.resizeMinToInitial?: boolean`（JSDoc 含默认值与语义），命令式 `useDialog` 经 `UseDialogOptions` 自动获得该配置
* **feat(src/modules/demo/examples/ProDialog/ProDialogResizable.vue):** 新增「⑤ 最小尺寸锁定初始打开宽高」演示（480px 初始宽弹窗：左下拖钳回初始 / 右上拖正常放大），DemoFrame 钳制规则说明与目录同步
* **已验证：** ProDialog spec 15 用例全通过（新增 2 个：钳制到初始 400×300 + 可放大断言 / 开关关闭仍为 320×200 断言，prototype 级 offset mock 覆盖打开即记录时序）、`vue-tsc --build` 无报错、ESLint 无告警

### 🔍 Review | ProTable 深度 Code Review 批次修复（review R1-R13）

> 对 ProTable 全目录（编排层 + 8 composables + 子组件 + 类型层）的深度审查批次修复。R1 为真实功能缺陷（initParam 与搜索列同名时被 `defaultValue ?? null` 静默覆盖丢失），其余为性能/可维护性/类型诚实性修复；交互行为默认不变（R3 抽屉即改即搜语义涉及业务确认，本次未动）。完整审查报告见 `.claude/.agent-reports/2026-09-17-protable-deep-review.md`

* **fix(src/components/ProTable/composables/useSearch.ts):** review R1 —— 初始化合并顺序调整为「字段 defaultValue 先、initParam 后覆盖」，reset 时无 defaultValue 的字段回退恢复 initParam 同名键；修复固定查询参数被静默丢失的缺陷（useSearch spec + 2 回归用例锁定）
* **refactor(src/components/ProTable/components/SelectedTags.vue):** review R2 + R12 —— 删除为「原地 mutation 生产者」设计的 deep watch + version 计数器（useSearch v3.2 起契约即 re-assign 新引用，浅依赖 props.searchParams 即可），消除每次变更 O(n) deep traverse；对象值显示不再 `JSON.stringify` 截断（防内部字段泄露 + 多字节截断乱码），daterange 二元组显示 `start ~ end`、其余对象显示 `[对象]`
* **refactor(src/components/ProTable/composables/useTable.ts + ProTable.vue):** review R5 —— 新增 `waitForRefresh()`（pendingRefresh 统一登记所有刷新路径的 in-flight 句柄），reset 且 page≠1 时 fetchHook 经 `nextTick` 等 page watcher flush 后再等请求完成，`reset()`/`setSearchParams()` 的 Promise 语义修正为「数据刷新完成后 resolve」
* **chore(src/components/ProTable/components/SearchForm.vue):** review R4 —— 删除死代码：Transition 挂载点 `v-show` 恒为 true 导致 6 个 JS 过渡钩子永不执行（约 40 行），折叠展开行为删除前后完全一致（均无动画）
* **refactor(src/components/ProTable/types/index.ts + 4 处消费方):** review R7 —— `DEFAULT_ROW_KEY` 常量上移至 types 并全链路消费（原 ProTable.vue 局部常量声称「三处共用」实际 4 处硬编码 `'id'`：useTableCapabilities ×2 / ElementTableBody / useTreeData）
* **refactor(src/components/ProTable/components/ElementTableBody.vue):** review R8 —— 模板 5 处内联箭头事件 handler 改为具名函数（稳定引用，与编排层 useProTableEvents「零内联箭头」同一标准）
* **fix(src/components/ProTable/composables/useTreeData.ts):** review R6 —— 懒加载 timer 触发后即从 timers Map 移除，防长会话无界累积
* **fix(src/components/ProTable/composables/useColumns.ts):** review R11 —— `searchColumns` 改 `let` + return getter 暴露，resetToDefault 重建 allColumns 后同步重建，消除旧克隆快照「同一数据两个真相」陷阱（spec + 1 回归用例锁定与 allColumns 同源）
* **refactor(src/components/ProTable/types/index.ts):** review R13 —— 移除 `SummaryConfig.position`（运行时从未实现，类型承诺超出能力）；`initParam` JSDoc 补注同名键合并语义
* **docs(src/components/ProTable/composables/useTable.ts):** review R9 —— hasWarnedMissingRowKey 注释修正（模块级 = 应用生命周期一次，非「composable 实例级」）
* **已验证：** ProTable 全部 35 个 spec 364 用例通过（新增 4 个回归用例）、`vue-tsc --build --force` 无报错；浏览器实测（chrome-devtools）见下方验证记录

### ⚙️ Chore | 构建产物分目录输出：js / css / img 各归其位

> 此前 dist 产物全部平铺在 assets/ 单目录，运维排查与 CDN 差异化缓存策略不便。本次按资源类型分目录：js → dist/js/、css → dist/css/、常见图片（png/jpg/jpeg/gif/svg/webp/ico/bmp/avif/tiff/apng）→ dist/img/，字体等其它资源兜底 dist/assets/（本项目当前无字体产物，目录在有对应资源时生成）

* **chore(vite.config.ts):** `build.rollupOptions.output` 新增 `entryFileNames` / `chunkFileNames`（统一 js/ 前缀）+ `assetFileNames` 函数按扩展名分流 css/ → img/ → assets/ 兜底；`assetInfo.name` 在 rolldown 类型中已 @deprecated，改用 `names` 数组（取首个原始文件名判定）
* **已验证：** `pnpm type-check:full` 通过、`pnpm build` 产物实测（js 26 / css 16 / img 10 全部归位，根目录无散落资源）、index.html 引用路径正确（`/js/*` `/css/*`）、css 内 `url(/img/*)` 绝对路径无相对路径 404 风险、`vite preview` 实测 index/js/css/img 全部 HTTP 200

### ✨ Feat | ProTable searchLayout：搜索区布局档位下放业务方（v3.4）

> 此前 SearchForm 布局档位（flat/collapse/flat-large/drawer）纯按 basic 字段数自动判定，真实业务两类场景不适配：① 宽屏页面 6 个字段想全平铺却被强制折叠（字段数 ≠ 页面空间需求）② searchDisplay 联动使字段数动态变化时档位在 flat/collapse 间跳变（展开/收起按钮时有时无、布局抖动）。本次把判定权下放：新增 `searchLayout` prop，'auto'（默认）保持自动行为完全向后兼容，显式档位跳过字段数判定

* **feat(src/components/ProTable/types/index.ts):** `SearchLayoutMode = 'auto' | 'flat' | 'collapse' | 'flat-large' | 'drawer'` + `ProTableProps.searchLayout?: SearchLayoutMode`；`index.ts` barrel 同步导出
* **feat(src/components/ProTable/components/SearchForm.vue):** `layoutMode` 判定顺序调整为「advanced 字段存在（永远 drawer，保证 advanced 字段可达，优先级高于强制档位——防止强制 flat 时 advanced 字段静默丢失）> searchLayout 非 auto 强制档位 > 字段数自动判定」；文件头档位矩阵注释同步
* **feat(src/components/ProTable/ProTable.vue):** SearchForm v-bind 透传 `searchLayout`（缺省不传，保持子组件默认）
* **feat(src/modules/demo/examples/ProTable/ProTableSearchAdvanced.vue):** 新增 ⑩ 号演示「searchLayout：6 basic 强制 flat 档」——与 ② 号 demo 同字段对照（自动 collapse vs 强制 flat 平铺）
* **已验证：** SearchForm spec + 3 新用例（强制 flat 6 字段无 toggle 全平铺 / 强制 collapse 2 字段有 toggle / advanced 存在时强制 flat 让位 drawer）全通过、`vue-tsc --build` 无报错、ESLint 无告警

### ✨ Feat | ProTable 列设置置顶 + 列宽拖拽 column-resize（默认关闭）

> ① 列设置抽屉每列新增置顶按钮（复用 reorder 通道——useColumns.setColumnOrder 同步顺序并持久化，与拖拽排序同一链路，零 composable 改动）② ProTable 新增 column-resize 属性：开启后表头列边框可拖动调宽，默认关闭

* **feat(src/components/ProTable/components/ColSetting.vue):** 每列 item 尾部新增置顶按钮（Top 图标 + tooltip，首位列禁用）——点击 emit reorder `[目标列, ...其余保持原序]`
* **feat(src/components/ProTable/types/index.ts + ProTable.vue):** `ProTableProps.columnResize?: boolean`（默认 false）——el 引擎显式绑 el-table-column `resizable`（ep 默认 true，必须显式 false 才能默认关闭；`:resizable` 置于列级 `tableProps` 展开之前，列级显式配置可覆盖组件级）；vxe 引擎映射列级 `resizable: true`（vxe 默认 false，语义天然契合）；virtualized（TableV2）分支不支持（列宽受控，留待后续）
* **fix(src/components/ProTable/components/ElementTableBody.vue):** column-resize 联动表级 `border` —— ep 列宽拖拽硬依赖 border（`table-header/event-helper.mjs` handleMouseMove 首行守卫 `if (!props.border) return`，边框线即 th 右缘拖拽手柄命中区）；首版仅绑 resizable 未联动 border，用户实测光标无变化不可拖，本次修复（DOM 级 spec 断言 `.el-table--border` class 锁定联动）
* **feat(src/modules/demo/examples/ProTable/ProTableColumnResize.vue):** 新 demo——开启/默认关闭双表对照（悬停表头边框光标 col-resize vs 不可拖）
* **已验证：** ColSetting + integration 新用例（置顶 emit reorder 断言 / columnResize 默认 false 与开启 true 透传断言）全通过、`vue-tsc --build` 无报错、ESLint 无告警

### 🐛 Fix | ProTable 列设置抽屉：未命名列空显示 + 拖拽热区误导

> 用户验证列设置抽屉两处体验缺陷：① 列未设置 label（空串）时复选框后空白无法辨别是哪列 ② 整条 item 显示 grab 手型暗示可拖，但 sortablejs handle 仅限 ⋮⋮ 图标、可拖区域过小交互不流畅

* **fix(src/components/ProTable/components/ColSetting.vue):** 未命名列（label 空串/缺失）以 prop 兜底展示，灰色斜体弱化样式标识「这是字段名不是显示名」；`data-drag-handle` 从图标 span 上移到 item 根 div（拖拽热区 = 整行），sortablejs 新增 `filter: '.el-checkbox'` 排除勾选区（命中 filter 不启动拖拽、checkbox 正常勾选——handle 原注释「避免 checkbox 抢 pointer event」的诉求改由 filter 承接）；拖拽图标负边距外扩点击热区 + hover 高亮
* **feat(src/types/sortablejs.d.ts):** 最小声明补 `filter?: string` 字段
* **已验证：** ColSetting spec + 2 新用例（label 兜底渲染断言 / sortable filter 配置 + handle 位置断言）全通过、`vue-tsc --build` 无报错、ESLint 无告警

### ✨ Feat | ProTable 新 demo：操作列下拉收纳 + 表头 Tooltip

> 真实业务操作按钮众多时的收纳模式演示。两项能力本身已存在（`type:'operation'` 插槽 / `headerRender` 双引擎接线），本次补齐演示与文档化写法

* **feat(src/modules/demo/examples/ProTable/ProTableOperation.vue):** 新增聚焦 demo —— 操作列「编辑/详情」高频直出 + 「更多」ElDropdown 折叠低频操作（trigger:'click' 防悬停误触，fixed:'right' 惯例）；表头 Tooltip 经 `headerRender` + ElTooltip 函数式默认插槽挂问号图标（label + 图标 BEM 类名经非 scoped 全局样式命中 el-table 表头内部 DOM）
* **已验证：** sidebar-groups spec（CN_NAMES 注册一致性）通过、`vue-tsc --build` 无报错、ESLint 无告警

### ✨ Feat | ProTable v3.1 能力补全：自动高度 / 状态保持 / 全屏 / 单选列 / 内置格式化器

> 对照社区最佳实践（vue-pure-admin / vben-admin）能力清单审查：12 项中 7 项已具备，4 项部分缺失、2 项完全缺失，本次全部补齐。第三方 API 全部经 node_modules 运行时代码实证（vxe `radio-change` 事件 / `checkboxOpts.reserve` / 表级 `max-height`；ep `reserveSelection` / ElRadio `value` prop / `FullScreen` 图标），无凭记忆编造

* **feat(src/components/ProTable/composables/useAutoHeight.ts):** 表格区自动撑满视口剩余高度 —— 表头/分页器固定、表体随窗口伸缩滚动。算法实测 DOM（视口高 - 根容器 top - 搜索区/工具栏/分页器高度 - 固定间距 - 用户 offset），重算时机 mounted + window resize + ResizeObserver(根容器)；jsdom/SSR 无 ResizeObserver 走 typeof 守卫（与 ElementTableV2Body 同模式）；窄视口钳制下限 100px。`autoHeight: true | { offset }`，virtualized 同开时忽略并 warn
* **feat(src/components/ProTable/composables/useStatePersist.ts):** 搜索参数/页码/每页大小/排序状态路由级持久化。localStorage 存快照（`${tableKey}:state`）+ sessionStorage 存 alive 标记：组件 mounted 写 alive、window beforeunload 清 alive —— 路由跳走返回恢复、F5 刷新/新标签页不恢复（用户决策的全量恢复粒度）。快照经 initialState 注入 useTable ref 初值（setup 早期同步，避开 page watcher 与 onMounted 双发）；快照结构 fail-safe 校验（version/字段类型不符丢弃并清除）
* **feat(src/components/ProTable/composables/useFullscreen.ts):** 表格全屏切换（CSS fixed 方案：z-index 1500 低于 el-dialog 遮罩，全屏内开弹窗不遮挡；Esc 退出 + 组件卸载兜底清监听；watch flush:'sync' 消除"切换后瞬间 Esc 未监听"竞态）
* **feat(src/components/ProTable/components/TableHeader.vue):** 工具栏新增全屏按钮（全屏态 primary 高亮 + tooltip 切换文案）
* **feat(src/components/ProTable/adapters/cell-format.ts):** 内置格式化器预设 —— `formatter: 'dateTime' | 'date' | 'time' | 'amount' | 'percent' | 'boolTag'`，非法输入（非数字金额/非法日期/null）一律原样返回不吞错。`ProColumn.formatter` 类型放宽为 `ColumnFormatter<T>`（函数 | 预设 key），向后兼容
* **fix(src/components/ProTable/adapters/cell-render.ts):** formatter 分支接线补齐 —— v3.0.1 引入 formatter 时仅虚拟滚动分支（ElementTableV2Body）生效，el/vxe 引擎分支缺失本次修复；优先级链对齐 v2 分支（render > formatter > enum > raw）。ElementTableV2Body.renderByFormatter 同步走 resolveFormatter 统一解析层，三引擎格式化行为一致
* **feat(src/components/ProTable):** radio 单选列（el 引擎自绘 ElRadio 控件——ep 无内置 radio 列；vxe 引擎映射内置 type='radio'，运行时代码 isRadioType 分支实证）。选中收敛到 useTable 统一选中区（selectedRows 单元素），`getSelectedRows` / `clearSelection` 多选单选同构，跨页保持天然支持
* **feat(src/components/ProTable):** 多选跨页保持一等字段 `ProColumn.reserveSelection`（el 引擎透传 el-table-column reserve-selection、vxe 引擎映射 checkbox-config.reserve——checkboxOpts.reserve 运行时代码实证），替代 `tableProps: { reserveSelection: true }` 手写透传
* **feat(src/components/ProTable/components/ElementTableBody.vue + VxeTableBody.vue):** autoHeight 的 maxHeight 透传（el 引擎绑 ElTable max-height、vxe 引擎绑表级 max-height）
* **test:** 新增 4 个 spec 文件 46 用例 —— cell-format（分发四态/日期/金额/百分比/布尔标签 22 用例）/ useFullscreen（切换/Esc/竞态/清理 8 用例）/ useStatePersist（恢复时机/写回/beforeunload/清理 9 用例）/ useAutoHeight（算法/resize/钳制/守卫 7 用例）
* **docs:** README v3.1 摘要 + 新能力用法示例；ARCHITECTURE 版本 v3.1 + composables 依赖表 + 状态归属表同步
* **已验证：** 新增 46 用例全通过、ProTable 全量测试套件（23 文件 204+ 用例）无回归、`vue-tsc --build` 无报错

### 🐛 Fix | ProTable 列分组 demo 分组样式失效：非 scoped 样式下 `:deep()` 被浏览器整条丢弃

> 用户验证 `/demo/pro-table-grouped-header` 不通过：表格渲染正常但蓝/绿分组边框、父标题列着色全部缺失。根因：`ProTableGroupedHeader.vue` 的 `<style lang="scss">` 按项目 BEM 规范**非 scoped**，其中 5 处 `:deep()` 无编译器接管、被浏览器当未知伪类**整条规则丢弃**（CLAUDE.md §3.3 反模式 #8）

* **fix(src/modules/demo/examples/ProTable/ProTableGroupedHeader.vue):** 5 处 `:deep(.xxx)` 全部改为直接后代选择器（`.vv-demo-pro-table-grouped-header .xxx`）；文件头验证步骤描述与渲染实际对齐（蓝/绿组各 4 列、ID 列无边框），并补样式注意事项注释防再犯
* **chore(src/modules/demo/examples/ProTable/ProTableSummary.vue):** 移除 demo 内多加的密度切换 radio-group（`density` ref / `handleDensityChange` / `:density` 绑定 / el-radio-group）——ProTable 工具栏（TableHeader）已自带密度切换，demo 内重复添加属多余；刷新按钮与汇总演示不受影响
* **feat(src/components/ProTable/styles/element-protable-overwrite.scss):** `.vv-pro-table-search` 块新增 `&__actions { display: flex; justify-content: flex-end; }`——搜索/重置/展开按钮组在 el-col 内默认左对齐，改为右对齐（对齐多数中后台工具栏惯例）
* **已验证：** `vue-tsc --build` 无报错、ESLint 无告警、ProTable 23 测试文件 204 用例全通过；浏览器实测（5174 dev server）：分组 demo 9 列 + 蓝绿边框 + 父标题着色生效（注：姓名列此前被列设置抽屉持久化隐藏，清理 `demo-pro-table-grouped-header:columns` 后完整 9 列——持久化功能本身正常）、汇总 demo 密度 radio 已移除且汇总行正常、overview 搜索按钮右对齐

### 🐛 Fix | ProTable el-table-v2 虚拟化分支功能修复：排序 / 密度切换 / loading / 搜索接入

> 上一轮 v3.0.1 虚拟化引擎落地后实测：列设置可用，但排序点击无响应、密度切换不生效、刷新/重置无 loading、demo 无搜索项无法验证。根因全部定位到 element-plus TableV2 的 API 差异（源码层实证）

* **fix(src/components/ProTable/components/ElementTableV2Body.vue):** 四项引擎适配修复
  * 排序接线：TableV2 不 emit `sort-change`，需传 `onColumnSort` callback prop（接收 `{key, order:'asc'|'desc'}`），翻译为编排层 `SortChangeEvent`（`'ascending'|'descending'`）后 emit；本地 `sortBy` ref 回传驱动表头 SortIcon（初始 `'desc'` 使首击升序，与 el-table v1 默认行为一致）
  * 密度切换：`estimated-row-height`（DynamicSizeGrid）按 rowKey 缓存实测行高，density 变更不重新测量 → 改用 fixed-size `row-height`，prop 变更即重排且滚动性能更好
  * loading：TableV2 无 `loading` prop（此前传了无效 prop）→ 容器 `v-loading` 指令（与 v1 引擎 ElementTableBody 一致）
  * 列宽：传 table 级 `fixed` prop=true 开启 rigid 布局（useColumns 强制 flexGrow/flexShrink=0 且忽略 column.minWidth，源码 calcColumnStyle 实证 → 列宽精确 = 配置值、总宽超出容器撑出横向滚动条；flex 模式实证永远无横向滚动条）。剩余空间填充由适配层自实现 v1 算法：列宽数值化（el-table v1 允许数字字符串，`toPxWidth` 归一），可拉伸列（仅 minWidth 无 width）按 minWidth 比例分配、末列吸收取整余数，总和精确 = 容器宽；`sortable` 归一 boolean
* **fix(src/components/ProTable/ProTable.vue):** v2 分支 `@selection-change`（TableV2 无此事件，死代码）→ `@sort-change="handleSortChange"`（服务端排序链路复用）
* **feat(src/components/ProTable/components/ElementTableV2Body.vue):** 强隔离补漏 —— `type="selection"` 列在 v2 分支 warn + 忽略（原先把 v1 的 selection 列类型透传给 TableV2 是无效字段，静默丢列）
* **fix(mock/pro-table/big-data.ts):** ① `sortByField` 的 `isAsc` 判定从 `'ascending'` 改为项目约定 `'asc'|'desc'`（useTable serializeSort D2 决策），此前排序恒为降序；② `BigDataRequest` 新增 `name` 参数（与 `keyword` 等义），支持搜索表单挂列直传
* **feat(src/modules/demo/examples/ProTable/ProTableVirtualScroll.vue):** name 列挂 `search: { el: 'input' }`，搜索/重置可验证；验证步骤补排序/密度/搜索
* **test(src/components/ProTable/components/ElementTableV2Body.spec.ts):** 10 用例（原 5 改造 + 新增 5）：rowHeight fixed-size 传递 / density 优先 / 列适配 v1 填充算法（按 minWidth 比例、总和精确 = 容器宽、无 flexGrow）/ rigid 溢出（容器窄于列总宽时列宽不被压缩）/ selection 过滤 + warn / onColumnSort→sort-change 翻译 / v-loading 遮罩
* **docs(src/components/ProTable/README.md + ARCHITECTURE.md):** 保留能力清单去除「多选」（v2 不支持），补 v2 关键实现决策（fixed rigid 布局 + v1 填充算法 / row-height 模式 / onColumnSort 回调）
* **已验证：** 9/9 单测通过、`vue-tsc --build` 无报错、浏览器实测（5174 dev server）：排序升/降 + 图标、密度 32/48/64、刷新 loading 遮罩、搜索过滤 + 重置、10 万行滚至第 5 万行固定列同步、列弹性填充无横向滚动条

### ♻️ Refactor | RichTextEditor 源头处理「视觉为空」映射：v-model emit('') 而非占位段落，消费方无须做字符串剥离

> 之前 demo 把字符串 `'required'` 改成 RuleItem 数组（含自定义 validator + trigger: 'change'）来兜底 wangEditor V5 永远输出 `<p><br></p>` 占位段落的问题——但这是让消费方为组件内部数据形态买单。本应在组件源头完成语义映射：编辑器内容「视觉为空」时 v-model emit 空字符串 `''`，让业务方继续用 `rules: 'required'` 这种标准写法

* **feat(src/components/common/RichTextEditor/RichTextEditor.vue):** 新增 `isVisualEmpty(html)` 工具 —— 剥 HTML 标签 + `&nbsp;` + trim 判空。handleChange 检测「视觉为空」时 emit('') 而非 sanitizeHtml 后内容；watch 处理外部 prop 置空场景——编辑器已视觉为空时跳过 setHtml 防循环（setHtml('') 后 wangEditor 仍可能保留占位段落，与 emit('') 会形成 setHtml 循环）
* **test(src/components/common/RichTextEditor/RichTextEditor.spec.ts):** 新增 4 个用例覆盖源头修复：① `<p><br></p>` 占位段落 → emit('')；② 内容仅 `&nbsp;` 占位 → emit('')；③ 外部 prop 置空 + 编辑器非空 → setHtml('') 清空；④ 外部 prop 置空 + 编辑器已空 → 跳过 setHtml（防循环）。原 8 用例 + 新增 4 用例 12/12 通过
* **refactor(src/modules/demo/examples/XForm/XFormBase.vue):** RichTextEditor 字段 rules 由 RuleItem 数组（自定义 validator + trigger: 'change'）改回字符串 `'required'`。源头修好，业务侧无须做字符串处理与 trigger 调整，与项目中其他 Input / Select 等原生组件写法一致
* **不变量：** v-model 协议语义不变——`update:modelValue` 仍 emit 字符串，仅当内容「视觉为空」时把占位段落的非空字符串映射为 `''`，业务侧按字符串标准理解即可

### ♻️ Refactor | resolveComponentFor 全局组件 fallback：schema.component 直接写项目级组件名

### ♻️ Refactor | resolveComponentFor 全局组件 fallback：schema.component 直接写项目级组件名

> 此前 schema.component 字符串仅支持 4 类解析——userComponents 注册 / EL 短名 / ElXxx 全名 / 原生 HTML 标签。项目级组件（如 RichTextEditor）必须通过 XFormProps.components 重复注册一遍才能用，冗余且增加 boilerplate。借助 unplugin-vue-components 已把 src/components/common/** 自动注入到 GlobalComponents 的事实，把 vue.resolveComponent 加入解析链 fallback

* **feat(src/components/form-schema/composables/resolve-component.ts:resolveComponentFor):** 在原生 HTML 标签判定的 fallthrough 前追加 `try { resolveComponent(name) } catch {}` —— vue 命中返回组件对象，fallthrough 返回 null（与 ElXxx 路径同语义）。JSDoc 同步更新。userComponents / EL_COMPONENT_MAP / ElXxx 优先级不变
* **feat(src/components/form-schema/composables/use-dev-runtime.ts):** 新增 `collectResolvableComponents(schema, userComponents)` 工具 —— 递归收集 schema.component 字符串名（去重），过滤 builtin / ElXxx / 原生 HTML 后逐个调用 resolveComponentFor 探测，命中者（unplugin-vue-components 自动注册的项目级组件如 RichTextEditor / BaseChart）加入 dev validate 的 user 集合。watch callback 在 validate 调用前同步注入 runtimeResolved 集合。**目的：** dev mode validate 不感知运行时 resolveComponentFor 的 fallback 能力，会把 RichTextEditor 误报为「未知组件名」（实测堆栈：`use-validate.ts:77 → use-dev-runtime.ts:81 → use-form-error-bus.ts:179`）；此处动态探测让 dev 校验与运行时解析对齐。**拼写错误检测能力保留** —— Inpurt 这类 resolveComponentFor 返回 null 的错误仍被识别
* **test(src/components/form-schema/composables/resolve-component.spec.ts):** 文件顶层 `vi.mock('vue')` 拦截 resolveComponent（默认实现 mock 出 vue 未命中行为 `name => name`，让 fallback → null 路径可断言）；新增 3 个用例：① RichTextEditor 命中返回组件对象；② 未注册返回字符串 → fallthrough → null（拼写错误如 Inpurt 仍被正确识别为错误）；③ userComponents 优先于全局 fallback。原 24 用例 + 新增 3 用例 27/27 通过
* **test(src/components/form-schema/composables/use-dev-runtime.spec.ts):** 文件顶层 `vi.mock('./resolve-component')` 拦截 resolveComponentFor（保留其他导出实际实现）；新增 3 个用例：① schema 含 RichTextEditor（mock 解析成功）→ validateErrors 为空；② schema 含 Inpurt（mock 解析失败）→ validateErrors 仍含 1 项「未知组件名」；③ props.components 显式注册 → 不依赖运行时探测。原 11 用例 + 新增 3 用例 14/14 通过
* **feat(src/modules/demo/examples/XForm/XFormBase.vue):** schema 末尾追加「商品描述」字段（col span 24 + props height: '320px' + placeholder），component: 'RichTextEditor'，无 :components 注册；introductions 段落同步说明 fallback 机制
* **fix(src/modules/demo/examples/XForm/XFormBase.vue):** RichTextEditor 字段 rules 由字符串 `'required'` 改为 RuleItem 数组（含自定义 validator + trigger: 'change'）。双 bug 修复：① wangEditor V5 空内容时 emit 永远输出 `<p><br></p>` 占位段落而非空字符串，async-validator 的 required 规则对非空字符串视为已填 → 自定义 validator 去掉 HTML 标签 + `&nbsp;` 后再判空；② XForm 默认 rules trigger='blur'，RichTextEditor 内容变化走 update:modelValue 不触发 blur → 显式声明 trigger='change' 才能在保存前自动校验（实测：不修复则清空富文本后点保存不触发红字）
* **不变量：** 未在 builtin/user/全局命中的字符串仍返回 null（拼写错误检查能力不变）；原生 HTML 标签（小写）走 `name === name.toLowerCase()` 兜底，不进 vue.resolveComponent

### ♻️ Refactor | RichTextEditor 目录化整改：单文件散落 common/ 一级 → ProDialogForm 同款四件套

> 对齐项目复合组件编写规范（ProDialog / ProDialogForm 模式），此前 `RichTextEditor.vue` 单文件散落在 `components/common/` 一级、Props/Emits 内联未导出、缺 spec

* **refactor(src/components/common/RichTextEditor.vue → src/components/common/RichTextEditor/):** 组件移入独立目录，四件套齐备
  * `RichTextEditor.vue` 组件本体（逻辑零变更）+ script 级 JSDoc + `defineOptions({ name: 'RichTextEditor' })`
  * `types.ts` 抽出 `RichTextEditorProps / RichTextEditorEmits / UploadResult` 命名导出（此前内联 `interface Props/Emits` 不可复用）
  * `index.ts` barrel 导出组件 + 全部类型（与 ProDialogForm 同模式；全局自动注册不受影响——unplugin dirs deep 扫描，注册名按文件名不变）
  * `RichTextEditor.spec.ts` 新增 8 个用例：挂载渲染 / onChange 清洗 emit（script 剔除）/ watch 回写 sanitize / 防循环不重复 setHtml / customUpload 成功·未传·失败 3 分支 / 卸载 destroy。stub 掉 Editor/Toolbar（jsdom 不完整支持 Selection/Range），`vi.hoisted` 提升 fake editor 规避 mock 工厂 TDZ
* **refactor(src/modules/demo/examples/RichTextEditor.vue):** `?raw` 源码提取路径 + `source=` 字符串同步到新路径（2 处）
* **已验证：** 新 spec 8/8 通过、`vue-tsc --build` 无报错、demo 页全局注册渲染正常

### 🐛 Fix | RichTextEditor 加粗/斜体"HTML 对但视觉无效"：reset.css `*` 重置压平 Slate 文本 span

> 工具栏加粗/斜体命令生效、HTML 结构正确，但视觉无变化；连在 strong 上手写 `element.style font-style: italic` 也无效

* **fix(src/components/common/RichTextEditor/RichTextEditor.vue):** 样式覆盖选择器补 `[data-slate-string]` 后代——WangEditor V5 基于 Slate，文本渲染在 `<strong><span data-slate-string>文本</span></strong>` 的内层 span；项目 `reset.css` 的 `*{font-weight:normal;font-style:normal}` 以「指定值优先于继承」直接压平该 span（仅恢复 strong/b 包裹层无效，strong 计算 700 是假正常）。b/strong/i/em 均扩展命中文本层；text-decoration 按规范贯穿内联后代，u/s 无需扩展
* **已验证：** 浏览器实测内层 span 字重 400→700，截图视觉加粗生效
* **排查方向沉淀：** 见项目 memory `reset-css-rich-text-fontweight.md`（查最内层文本元素计算样式 / element.style 无效⇒后代指定值打断继承 / Slate 文本永远在 `[data-slate-string]` span 上）

### ✨ Features | RichTextEditor 富文本编辑器组件：WangEditor V5 + DOMPurify XSS 防御 + 自定义图片上传

> 基于 `@wangeditor/editor@5.1.23` + `@wangeditor/editor-for-vue@5.1.12`（Vue3 next 分支）封装的 `v-model` 富文本编辑器，把 WangEditor V5 工具栏/编辑区分离的复杂度、emit HTML 的 XSS 风险、自定义上传接入样板收敛到一个组件，业务方只关心 `modelValue` + `uploadApi` 两件事

* **feat(src/components/common/RichTextEditor.vue):** 4 大核心能力
  * `v-model` 双向绑定 HTML 内容 + `height / placeholder / readOnly / uploadApi` props
  * **🛡 双向 XSS 防御**：`SANITIZE_CONFIG` 单一入口（USE_PROFILES.html + 显式 FORBID_TAGS 黑名单 `style/script/iframe/object/embed/form` + FORBID_ATTR 黑名单 `onerror/onclick/onload/onmouseover/onfocus/style/formaction`），watch 和 handleChange **共用**同一份配置；emit 链路清洗掉用户输入里的脏数据，prop 链路清洗掉父组件传入的脏数据——之前只清洗 emit 链路导致 `<img onerror=...>` / `<a href="javascript:...">` 通过 `props.modelValue` 直接 `setHtml` 进入编辑器 DOM 并被浏览器执行，是真实 XSS 漏洞，本次修复堵上
  * **防循环更新**：watch `props.modelValue` 时只有与 `editor.getHtml()` 不一致才 `setHtml`；不传 `:model-value` 给 Editor 组件，绕过其内部 `update:modelValue` emit 未清洗 HTML 的通路，由组件自己 watch + onChange + DOMPurify 全链路接管
  * **自定义图片上传**：`editorConfig.MENU_CONF['uploadImage'].customUpload` 拦截默认 base64 调用 `props.uploadApi(file)`，成功 `insertFn(url, alt, href)` 插入，失败 `ElMessage.error` + `console.error`（不静默吞错）；不传 `uploadApi` 时点上传会 `ElMessage.warning` 友好提示
  * **生命周期**：`onBeforeUnmount` 必调 `editor.destroy()` 并把 `editorRef.value` 置 null，避免 toolbar/编辑区 DOM 监听器泄漏；shallowRef 而非 ref（WangEditor 内部 Slate 数据结构深响应化会拖慢渲染）
* **feat(src/components/common/RichTextEditor.vue):** BEM 命名空间 `rich-text-editor`（自动注册到 `components.d.ts`，IDE hover 走 `GlobalComponents` 路径展示完整 `DefineComponent` 类型，无需显式 import）
* **feat(src/modules/demo/examples/RichTextEditor.vue):** 演示页 5 段——基础 v-model + DOMPurify XSS 防御 / 自定义图片上传（axios 模拟 OSS，1.2s 延迟 + 50% 失败率）/ 只读模式切换 / 防循环更新验证（onChange 计数器 + 控制台日志）/ XSS payload 可视化（`<script>` / `onerror` / `javascript:` 等 4 种典型攻击）+ Props/Events/Slots API 表（extractApi 自动提取 + description 字典 merge）；路由 `DemoRichTextEditor` 由 `import.meta.glob` 自动派生
* **refactor(src/modules/demo/config/sidebar-groups.ts):** CN_NAMES 追加 1 行 `RichTextEditor: '富文本编辑器（WangEditor V5）'`，自动归到「通用组件」分组
* **chore(package.json):** 新增依赖 `@wangeditor/editor@^5.1.23` + `@wangeditor/editor-for-vue@^5.1.12` + `dompurify@^3.4.15`（DOMPurify 3.x 内置类型，无需 `@types/dompurify`）
* **⚠ 已知限制：** `@wangeditor/editor-for-vue@5.1.12` 的 package.json `exports` 字段缺 `types` 条件，vue-tsc 找不到 d.ts。组件 import 处加 `@ts-expect-error` + 注释兜底（运行时 vite 用 `module` 字段解析 esm.js 不受影响）。待上游修复或本项目提 PR 加 paths 配置后移除
* **⚠ height 约束：** `height` 不建议 < 300px——WangEditor V5 modal/hoverbar 定位依赖编辑区高度，否则 console 报警告且部分快捷交互偏离。默认 '300px' 是这个临界值，JSDoc 已说明

### ✨ Features | ProDialogForm 弹窗表单组合组件：ProDialog + XForm 内置「校验 → 提交 → 自动关闭 → 自动重置」

> 把「ProDialog 弹窗 + XForm 表单 + 异步提交 + 校验重置」4 个常见样板编排收敛到一个组件，业务方只关心 schema / model / onSubmit 三件事。沿用 ProDialog 子目录 + barrel 模式（与 ProDialog / XForm 调用方式一致）

* **feat(src/components/common/ProDialogForm/ProDialogForm.vue):** 4 大核心能力
  * `v-model` 显隐 + ProDialog 原生 props（width / close-on-click-modal / beforeClose / ...）透传
  * 内置「确定 / 取消」footer：点确定自动 validate → 调 onSubmit → 成功后自动关闭 + emit('success')
  * 关闭弹窗后（动画结束 ~300ms）自动 resetFields 清空数据与校验状态（`setTimeout(resetFields, 300)` 模拟 EP 默认动画时长，避免闪烁感）
  * 防重复提交：submitLoading 标志 + try/finally（即使按钮被绕过也阻断二次提交）
* **feat(src/components/common/ProDialogForm/types.ts):** Props / Emits / Expose 完整契约
  * Props：`modelValue / title / width? / schema / model / rules? / onSubmit / submitButtonText? / cancelButtonText? / resetOnClose?`
  * Emits：`update:modelValue / success / submit-failed`（submit-failed 在 onSubmit reject 时触发，**不** throw 避免 500 重定向）
  * Expose：透传 XFormExpose 全部 19 个方法（validate / resetFields / setFieldError / addItem / isDirty / ...）
* **feat(src/components/common/ProDialogForm/index.ts):** barrel 导出 `ProDialogForm` + 全部类型 + `XFormExpose` re-export
* **feat(src/modules/demo/examples/ProDialogForm/ProDialogFormOverview.vue):** 演示页 5 段——基础用法 / 提交失败（emit submit-failed）/ 关闭自动重置 / footer 作用域插槽 / expose 方法（setFieldError 模拟服务端 422 回填）；路由 + sidebar 通过 glob 自动注册
* **refactor(src/modules/demo/config/sidebar-groups.ts):** CN_NAMES 追加 1 行 `ProDialogFormOverview: '用法总览（弹窗表单）'`，自动归到「ProDialog 弹窗组件」分组

### 🐛 Fix | ProDialogForm onSubmit 失败处理改用 emit 而非 throw：避免全局 errorHandler 500 重定向

> 初始实现用 `throw err` 把 onSubmit 抛出的错误冒泡到全局，导致调用方未监听时 Vue app.config.errorHandler 触发项目全局 500 跳转。改用 emit('submit-failed', err) 让调用方完全控制错误处理（toast / 字段红字 / 静默）

* **fix(src/components/common/ProDialogForm/ProDialogForm.vue):** catch 块改为 `emit('submitFailed', err)`，移除 `throw err`；JSDoc 注释说明设计动机（Vue 模板事件处理器调 async 函数时 Promise reject 会冒泡到 errorHandler）
* **refactor(src/components/common/ProDialogForm/ProDialogForm.vue):** defineExpose 从 Proxy 改为显式对象字面量代理 —— 之前 Proxy.get 在 formRef.value 未就绪时返回 undefined，调用方访问 expose 方法报 `setFieldError is not a function`；现在每个方法都是真实函数（`formRef.value?.xxx`），永远不会"消失"
* **fix(src/modules/demo/examples/ProDialogForm/ProDialogFormOverview.vue):** demo 新增 `onSubmitFailed` 处理函数（toast 提示错误）+ 模板 `@submit-failed` 监听；演示文案更新

### ✨ Features | 字典功能契约化重构：DictItem 类型契约 + Promise 防抖池 + DictSelect / DictTag 组件

> 「前端主导数据结构」落地：字典契约（DictItem）定义在 src/types/dict.ts，后端 / Mock 按 `/api/dict/:code` 返回数组配合实现。useDict 升级为多 code 契约形态（按 code 解构 `Ref<DictItem[]>` + `refreshDict`），store 层 16ms 轮询并发合并替换为 Promise 防抖池（Map<code, Promise>，并发共享同一次请求）。新增 DictSelect（el-select 封装，$attrs 透传 + disabled 契约字段）/ DictTag（el-tag 封装，未命中显示 value 原文）全局组件与 /demo/dict 演示页

* **feat(src/types/dict.ts):** 新增字典类型契约单一来源 —— DictItem（value / label / type / disabled / cssClass + unknown 索引签名严格化契约的 any）+ DictTagType；放 types/ 而非 api 层，API / store / composable / 组件四层平级引用，依赖方向干净
* **feat(mock/dict.ts):** 重写为单条动态路由 `/api/dict/:code` + DICT_DATA 数据表（新增字典只加键值，路由零改动）；gender / user_status / order_type 为契约演示字典（locked 项 `disabled: true`），role（登录预加载依赖）/ order_status 保留兼容
* **refactor(src/api/modules/dict.ts):** `dictApi.getByType(type)` → `getDict(code)`，对齐契约用语；类型从 `@/types/dict` 导入；继续走项目 request 封装（http 层 30s GET 缓存作为防抖池之前的第一层合并）
* **refactor(src/store/modules/dict.ts):** Promise 防抖池（`Map<code, Promise>`，finally 自动出池）替换 16ms setInterval 轮询 —— 零延迟、无定时器；刻意用普通函数而非 async function（async 会把池中 Promise 展开再包新实例，丢失共享语义）；保留 5min TTL / preloadDict / getLabel / clear
* **refactor(src/composables/useDict.ts):** 契约形态 `useDict<T extends string>(...codes): Record<T, Ref<DictItem[]>> & { refreshDict }` —— 泛型保留 code 字面量，解构类型精确；Ref 用 computed 实现（数据所有权在 store，composable 只建视图）；lazy fetch 失败 console.error 降级（Ref 保持 []），消除旧版 unhandled rejection 隐患；移除 onMounted 双触发（防抖池已保证并发安全）
* **feat(src/components/common/DictSelect.vue / DictTag.vue):** 全局组件（构建期自动注册，消费方免 import）——DictSelect 内部自动调用 useDict + `v-bind="$attrs"` 透传 clearable / filterable 等 + 契约 disabled 映射 el-option；DictTag 按 value 匹配 label / type / cssClass，未命中显示 value 原文、空值 '-' 占位
* **feat(src/modules/demo/examples/Dict.vue):** 演示页（表单下拉 + 表格状态列 + useDict 契约形态 / refreshDict 演示），路由 / demo 侧边栏「通用组件」组自动注册
* **feat(vite.config.ts):** AutoImport 注册 `useDict` —— CLAUDE.md §1.6 声称已在列但实际缺失，补上后组件内免 import 调用才成立
* **test(dict.spec.ts / useDict.spec.ts):** 19 用例同步 —— 防抖池「并发共享一次请求」、失败出池后重试、契约形态解构 / 响应式 / refreshDict / 失败降级
* **验证：** `pnpm type-check:full` 0 error；`pnpm lint` 0；`pnpm test` 19/19 通过

### 🐛 Fix | useConfirm.content 类型谎言：VNode 运行时会渲染成 [object Object]

> `UseConfirmOptions.content` 之前声明为 `string | VNode`，但 EP 2.14.3 message-box 模板 (`message-box/src/index.vue:85-94`) 里 message 只被 `textContent` / `innerHTML` 字符串消费，传 VNode 进去 `toDisplayString(vnode)` 只会拿到 `[object Object]`。类型上写允许但运行时不靠谱，等于给调用方挖坑。类型收紧为 `string` 后：
> - 编译期拦截所有「以为支持 VNode」的误用（`type-check:full` 0 错即证明现有 4 个调用方无 VNode 误用）
> - 注释明确指出「业务组件请用 useDialog」—— useConfirm / useDialog 分工固化到代码层
> - 仍然支持 HTML 富文本：传 HTML 字符串 + `dangerouslyUseHTMLString: true`，EP 走 `innerHTML` 分支可渲染 `<el-tag>` 等全局注册组件

* **fix(composables/useConfirm.ts):** `content` 类型由 `string | VNode` 收紧为 `string`；删除冗余的 `import type { VNode }`；JSDoc 注释补三段说明——EP 模板分支机制（`textContent` / `innerHTML`）/ 类型谎言为何根治 / useConfirm vs useDialog 分工
* **验证：** `pnpm type-check:full` 0 error（编译期拦截所有 VNode 误用）；`pnpm test useConfirm + useLogout` 20/20 通过（无回归）；`pnpm lint` 0

### ✨ Features | useConfirm 二次确认 Hook：取消即 resolve(false)

> 封装 `ElMessageBox.confirm`，把取消/关闭从 reject 重塑为 resolve(false)，业务侧可以 `if (await useConfirm('...'))` 一行表达确认流程，无须 try/catch，根除控制台 `Uncaught (in promise) cancel` 噪音；与 `useDialog` 互补分工（前者 bool 询问 / 后者组件级弹窗 reject `DialogCancelledError`）

* **feat(composables/useConfirm.ts):** 新增二次确认 Hook —— 重载双形态 API（位置参数 `useConfirm(content, title?)` / 对象参数 `useConfirm({...})`），danger 危险操作预设（确认按钮转红 + 警告图标，预设可被显式同名字段覆盖），appContext 三层回退（显式 > setup 同步期 > main.ts 通过 useDialog 注册的全局上下文），VNode 形态 content 上下文透传（项目按需引入 EP 不调 `app.use(ElementPlus)`，不补上下文全局组件 / Pinia / i18n 会失效）
* **test(composables/useConfirm.spec.ts):** 16 用例覆盖 —— Promise 重塑（resolve true / 'cancel'→false / 'close'→false / 业务异常原样上抛 / 非哨兵字符串上抛）、参数归一（位置/对象/title 覆盖/HTML 透传）、danger 预设（默认值/字段覆盖/不泄漏）、appContext 透传（缺省回退/显式 null 不回退/不泄漏）
* **feat(composables/useDialog.ts):** 新增 `getDialogAppContext()` 导出 —— 供 useConfirm 复用 main.ts 已注册的 app 上下文，避免每个动态挂载场景各建一套 setXxxAppContext
* **feat(vite.config.ts):** AutoImport 注册 useConfirm —— 与 useDialog 同级待遇，setup 内免 import
* **refactor(composables/useLogout.ts):** 用 useConfirm 替换 9 行 try/catch 样板，confirmLogout 主体从 9 行降至 6 行；useLogout.spec.ts 同步把 mock 从 `element-plus` 切到 `@/composables/useConfirm`
* **docs(CLAUDE.md):** §1.5 命令式弹窗表新增 useConfirm 行（与 useDialog 分工互补）；§1.6 AutoImport 标识符表与 §1.6.1 注释提示表补 useConfirm
* **验证：** `pnpm test src/composables/useConfirm.spec.ts src/composables/useLogout.spec.ts` 20/20 通过；`pnpm type-check:full` 0 error；`pnpm lint` 0；`auto-imports.d.ts:76` 已自动生成 `useConfirm` 声明

### 🔧 Refactor | vite.config.ts 工程化抽离：消除 alias 双维护痛点

> 把 `vite.config.ts` 内的构建期配置抽离到 `build/` 工程配置目录，建立 src 子目录别名的**单一来源**，并通过生成器自动同步 `tsconfig.app.json` 的 `paths` 块，消除双维护痛点；同时为未来大概率需要的 proxy / devServer 等配置预留位置

* **feat(build/):** 新增 6 个语义化模块
  * `aliases.ts` — SRC_DIR_ALIASES 单一来源（15 个别名 `@` + 14 个 `@xxx`），导出 `resolveSrcDirAliases()` (vite resolve) + `generateTsconfigPaths()` (tsconfig paths)
  * `vendor-chunks.ts` — VENDOR_CHUNKS 配置（顺序敏感：vendor-vue / vendor-ui）
  * `proxy.ts` — `createProxyConfig(env)` 预留空壳（联调真实后端时启用）
  * `server.ts` — SERVER_DEFAULTS（port 5174 / strictPort）
  * `scss.ts` — SCSS additionalData 注入 + silenceDeprecations（bem mixin 兼容）
  * `index.ts` — barrel re-export
* **feat(build/scripts/generate-tsconfig-paths.ts):** tsconfig.app.json paths 块自动生成器——读 build/aliases.ts → 写入 tsconfig.app.json；hash 比对无变更秒跳过；`--check` 模式供 CI 校验
* **chore(tsconfig.app.base.json):** 新建手写 base（无 paths），`tsconfig.app.json` 改为 extends base + paths 由生成器注入（单一来源）
* **feat(scripts/check-aliases.ts):** 新增 `pnpm check:aliases` 校验脚本——比对 build/aliases.ts 与 tsconfig.app.json paths，不一致 CI 失败阻断
* **feat(package.json scripts):** 新增 `pnpm generate:tsconfig-paths` 与 `pnpm check:aliases`
* **chore(.husky/pre-commit):** 接入 `pnpm generate:tsconfig-paths`（头）+ `pnpm check:aliases`（lint-staged 之后）—— pre-commit 阶段保证 paths 永远同步
* **refactor(vite.config.ts):** 5 处内联配置替换为 `build/*` import——SRC_DIR_ALIASES / resolveSrcDirAliases / vendorChunks / server / scss；行为完全等价（alias / vendors / scss 注入不变）
* **chore(tsconfig.node.json):** include 加 `build/**/*.ts`（build 模块纳入 type-check）；启用 `allowImportingTsExtensions`（生成器跨文件 .ts import）
* **test(build/):** 新增 7 个 spec / 23 个用例——aliases (9) / vendor-chunks (4) / proxy (2) / server (2) / scss (3) / generate-tsconfig-paths (3)；覆盖单一来源、顺序敏感、hash 比对
* **建议验证：** `pnpm type-check:full` 0 error；`pnpm test` 1779/1779 通过；`pnpm lint` 0；`pnpm build` vendor-vue (6.14 kB) / vendor-ui (708.97 kB) / vendor-utils (1316.55 kB) 三组 chunk 正常生成；`pnpm check:aliases` ✅；漂移测试（手动在 build/aliases.ts 加 `@fake` → 跑生成器 → tsconfig.app.json 自动写入 2 条新 paths → 还原后自动删除）；spec 路径 `docs/superpowers/specs/2026-09-10-vite-config-split-design.md` / plan 路径 `docs/superpowers/plans/2026-09-10-vite-config-split.md`

#### 增量补丁：echarts 单独 chunk + barrel 整合 + 注释

> 4 项反馈落地：echarts 单独打包 / 生成器重复维护确认已修复（用 import 不用内联）/ vite.config.ts 与原版 diff 对比 plugins 数组无意外变更 + 添加必要注释 / vite.config.ts 5 个独立 import 整合为 build/index.ts barrel

* **feat(build/vendor-chunks.ts):** 新增 `vendor-charts` 组（patterns: `['/echarts/']`），单独打包 echarts（~1.1MB）避免污染 vendor-ui 缓存命中；vendor-utils 从 1316 kB 缩至 195 kB
* **refactor(vite.config.ts):** 5 个分散 import（aliases / vendor-chunks / proxy / server / scss）整合为 1 个 build/index.ts barrel re-export
* **docs(vite.config.ts):** 添加 4 处必要注释——文件级 JSDoc（说明本文件定位 + 历史）/ server 字段（说明 SERVER_DEFAULTS + createProxyConfig 来源）/ scss 字段（指向 build/scss.ts）/ manualChunks（强调 VENDOR_CHUNKS 顺序敏感）
* **验证：** git diff vs HEAD 显示 plugins 数组（line 26-84）零变更；`pnpm type-check:full --force` 0 error；`pnpm lint` 0；`pnpm test` 1779/1779；`pnpm build` vendor-vue (6.14 kB) / vendor-ui (708.97 kB) / vendor-charts (1117.85 kB) / vendor-utils (195.64 kB) 四组 chunk 正常；`pnpm check:aliases` ✅

### ✨ Features | demo 模块 sidebar 宽度升级为 localStorage 持久化

> 当前 demo 文档布局（DocLayout）拖拽调宽后只在模块级 ref 保留，刷新 / 跨浏览器会话即丢失。升级为 `Local.set/get` 持久化，跨会话保留用户偏好

* **feat(demo/layouts/sidebar-state):** sidebarWidth 持久化升级——模块加载时 `Local.get('demo-sidebar-width')` 读取初始值（合法 number 直接采用；非 number / null / 字符串等非法值兜底 200）；`watch(sidebarWidth, ...)` 注册 300ms debounce 自动写回，避免 `useSidebarDrag` 拖拽过程中 mousemove 高频触发 setItem。钳制到 [150, 400] 边界由 `useSidebarDrag` 承担（DocLayout 注入），sidebar-state 不重复硬编码边界；存储 key `demo-sidebar-width` 走 storage.ts 自动加 `<APP_NAMESPACE>:` 前缀，与 `app-ui` / `theme-mode` 等 key 命名规则一致
* **test(demo/layouts/sidebar-state):** 新增 8 用例——合法值采用 / 缺值兜底 200 / 字符串兜底 / null 兜底 / 浮点四舍五入 / watch 触发写回 / 拖拽高频写 debounce 合并（连续 250/260/280 改值只写最后一次）/ 跨模块加载一致性（A 模块改值 → reload B 模块读 Local 一致）；`vi.resetModules` 处理模块级单例 + watch 重置，`vi.useFakeTimers` 处理 debounce 时序
* **建议验证：** 浏览器实测 `/demo/pro-table-overview` 拖拽 sidebar 边缘到 320px → 关闭并重新打开浏览器/标签页 → 仍是 320px；浏览器 DevTools 看 `localStorage[vue3-vite-project:demo-sidebar-width]` 数值正确；多次拖拽仅在停止拖拽 300ms 后才落盘（Network/storage 面板观察）；`pnpm type-check` / `pnpm lint` / `pnpm test src/modules/demo --run`（6 文件 49 用例全绿）

### ✨ Features | ProDialog 新增 resizable 可拖拉调整宽高能力

> 需求：弹窗支持右下角三角手柄拖拽调整宽高（企业常见：详情 / 审批 / 报告预览动态调整内容区域），硬编码钳制 min 320×200 / max viewport - 16；为兼容 `useDialog` 命令式入口，新增 `resizeChange` 事件而非暴露 API（弹窗组件不增加方法表面积）

* **feat(components/common/ProDialog):** 新增 `resizable?: boolean` 与 `resizeChange: [w, h]` 事件——mousedown / move / up 事件链；右下角 12×12 px 三角手柄（CSS `::after` 三角 + hover 变蓝）；`resizableEnabled` computed 聚合 `props.resizable && !isFullScreen && visible` 与 draggable 互斥同步策略；钳制常量 `MIN_WIDTH=320 / MIN_HEIGHT=200 / VIEWPORT_MARGIN=8` 硬编码（与 draggable 同风格，YAGNI）；`toggleFullScreen` 加 width / height 内联清理（避免 resize 后切全屏再退出，残留尺寸导致 EP 默认 width 不生效——与 v-draggable 清理 left / top 同思路）；onUnmounted 清 document mousemove / mouseup 监听（防内存泄漏）
* **feat(components/common/ProDialog/types):** `ProDialogProps` 加 `resizable` 字段、`ProDialogEmits` 加 `resizeChange` 事件，JSDoc 完整（默认 `false`、仅 mouseup 抛、与 `draggable` 同步禁用）
* **test(components/common/ProDialog):** ProDialog.spec.ts 4 → 13 用例，新增 8 个 resizable 测试（resizable=true 渲染 handle / resizable=false 无 handle / mousedown-mousemove-mouseup 完整链路抛 resizeChange / 钳制最小 320×200 / 钳制最大 viewport-16 / 全屏态禁用 handle / resize 后切全屏内联 width-height 被清除 / mousemove 不抛事件仅 mouseup 抛 / onUnmounted 清监听）；`mockLayout` 改 getter 模式让 offsetWidth 跟随 style 动态计算（贴近真实浏览器重排行为，避免 emit 拿到 mock 固定值的陷阱）；`mountOpen` 扩展支持 `listeners` 参数（Vue3 `createApp` 第二参数 `onXxx` 自动识别为 emit listener）
* **demo(demo/examples/ProDialog):** 新增 `ProDialogResizable.vue`（305 行，4 个 DemoField：① 基础可调整 ② 视口边界钳制 ③ resizeChange 事件日志 ④ 全屏×resize 交叉），沿用 DocLayout + DemoFrame + DemoField + DocToc 模板
* **fix(demo/ProDialogResizable):** ④ 全屏×resize 交叉 demo 状态字段「最后一次 resize 尺寸」原依赖手动点「记录当前尺寸」按钮（反直觉），改为 `@resize-change="onFullResize"` 直接驱动，删除冗余按钮——状态与用户操作（拖拽）实时同步
* **chore(demo/config):** CN_NAMES 加 `ProDialogResizable: '可拖拉调整宽高'`，自动归入「ProDialog 弹窗组件」分组（分组前缀 `ProDialog` 已存在，无需改 SIDEBAR_GROUPS）
* **chore(.gitignore):** 新增 `.verify/`（浏览器验证截图存档目录不入库）
* **建议验证：** dev `/demo/pro-dialog-resizable` 拖右下角三角，鼠标变 ↘ 光标、body 文字不被选中；事件 demo 日志 mousemove 不刷屏、mouseup 仅一次记录；全屏×resize 交叉 demo 先拖大再切全屏退出，应回到 EP 默认 480 而非拖拽尺寸；浏览器实测基础 demo `480×259 → 680×409`（+200/+150）、最小钳制 `320×200`、最大钳制 `1425×885`（viewport `1441×901 - 16`）；`pnpm type-check:full` / `pnpm lint` / `vitest ProDialog.spec.ts`（13/13）/ `pnpm check:routes` 全绿

### 📖 Documentation | demo 模块文案对齐：清理过期描述与失效 API 引用

> 全量扫描 `src/modules/demo/examples/`（63 个 demo 文件）后批量修正过期文案，确保 sidebar 中文名 / 演示页 introductions / DemoField label 与当前代码实现一致

* **fix(demo/ProTable/ProTableOverview):** propsItems 描述里 `v2.0 传入 'vxe-table' 会 console.warn 并回退 element-plus，v2.1 计划支持` 改为 `v2.1 起支持 vxe-table 引擎，动态按需加载，chunk 不进首屏`（v2.1 实装后 src/components/ProTable/adapters/engine.ts 已删除 vxe 回退分支，原描述过期）
* **fix(demo/ProTable/ProTableOverview):** DemoFrame introductions 与 start-here 引导卡同步 demo 实际包含的 7 个演示区（基础 / enum / render / 插槽 / defineExpose / 多选 / 四类能力）——原 4 场景卡片未涵盖 render / selection / 能力切换三个新增 section
* **fix(demo/ProTable/ProTableOverview):** DemoField label `v2.0 4 类能力一键切换` 与 toc 项改为普适描述（`四类能力一键切换（行内编辑 / 树形 / 单元格合并 / 行拖拽）`）——版本号从用户面文案去除，避免后续版本演进再过期
* **fix(demo/XForm/XFormOverview):** introductions `支持全量 14 字段` 改为 `支持全量 19 字段`（按 configs/xform-api.ts schemaNodeItems 实测条目数：component / props / on / children / name / label / rules / reaction / formItem / modelProp / defaultValue / row / directives / asyncOptions / slots / disabled / permission / ignore / kind+array）
* **fix(demo/XForm/XFormAsyncOptionsError):** 删除 `formRef.refreshOptions(fieldName)` 引用——该方法在 form-schema 实例中不存在（grep src/components/form-schema 无匹配）；"变通方案"改为推荐 asyncOptions.deps 字段依赖（其他字段变化触发 source 重跑）作为实际可用的重试机制，与本 demo「强制失败开关 deps: 'forceFail'」演示一致
* **fix(demo/XForm/XFormBase + XFormNested):** 文件头注释 `参考开源 form-schema 实现的 demo（form/base.vue）` 改为 `XForm 基础用法 demo —— 对照参考仓场景命名（form/base）`——form-schema 是项目自有组件（src/components/form-schema/），非开源 fork；保留括号内命名作为对照溯源
* **fix(demo/config/sidebar-groups):** `XFormValidationDebounce: '实时校验和debounce'` typo 改为 `跨字段校验 debounce`——与 XFormValidationDebounce.vue 实际标题「跨字段校验 debounce 调度（高频输入减负）」对齐
* **建议验证：** `pnpm type-check` / `pnpm lint` / `pnpm test src/modules/demo/config/sidebar-groups.spec.ts`（5 用例全绿）；浏览器实测 `/demo/pro-table-overview` start-here 卡片显示 7 场景、propsItems 描述新文案；`/demo/x-form-async-options-error` 变通方案段落显示 asyncOptions.deps 推荐用法

> 第二轮扫描补充修复（P0 关键描述错误 / 版本号泄漏 user-facing 文案）

* **fix(demo/ProTable/ProTableEngineCompare):** user-facing 文案去除 `v2.1` 标记——introductions L78 改为「vxe-table（动态按需加载）」、h4 标题去 `（v2.1 引擎）`、ApiTable 标题去 `（v2.1）`；开发注释保留版本溯源
* **fix(demo/ProTable/ProTableServerSort):** introductions `经 responseAdapter 映射（M3）` 改为 `经 responseAdapter 映射为约定结构`——M3 是开发里程碑，用户文案不应出现
* **fix(demo/ProTable/ProTableTree):** introductions `vxe-table 引擎 v2.0 不支持树形能力` 改为 `vxe-table 引擎不支持树形能力（启动时 console.warn 并忽略），仅 element-plus 引擎生效`——v2.0 标记混淆当前能力边界
* **fix(demo/ProTable/configs/protable-demos-api):** `启用行内编辑能力（v2.0）` 改为 `启用行内编辑能力`——API 描述去除版本号
* **fix(demo/XForm/XFormDisabled):** introductions `SchemaNode 新增 disabled: ReactionValue<boolean>` 改为 `SchemaNode disabled: ReactionValue<boolean>`——「新增」暗示曾经不存在，与现状不符
* **fix(demo/XForm/XFormCrossField):** introductions `RuleItem 新增 dependsOn + crossValidator` 改为 `RuleItem dependsOn + crossValidator`——同上
* **fix(demo/XForm/XFormBase):** introductions `订单查询表单 ... 5 字段` 改为 `4 字段`——实际只有 4 个字段（订单号 / 状态 / 日期区间 / 备注）
* **fix(demo/XForm/XFormGlobalDisabled):** 顶层 disabled 写法 `3 种` 改为 `4 种`——demo 实际演示 `literal_true / literal_false / fn / expr` 四种 mode，与源代码 schema computed 一致

### ✨ Features | ProDialog 高级弹窗组件（声明式 + 命令式双入口）

> 需求：弹窗支持模板 `v-model` 调用与 `useDialog` 纯 JS 命令式调用双模式，头部可拖拽（限制在视口边界内）、可全屏切换，全程 TS 强类型

* **feat(components/common):** 新增 `ProDialog` 组件（`src/components/common/ProDialog/`）——ElDialog 原生 Props 全量继承（`InstanceType<typeof ElDialog>['$props']` 推导，避开 EP 内部导出路径），扩展 `draggable`（默认 true，全屏态自动禁用）/ `fullScreen`（默认 false，头部带切换按钮，走 EP 原生 `fullscreen` 机制）/ `showFullScreenButton`；透传 default/header/footer 插槽；内置「取消/确定」footer 并抛出语义化事件（`confirm` 仅确定按钮触发，`close` 为所有关闭途径的兜底）。组件经 `@/components/index.ts` 扫描自动全局注册，也可具名导入
* **feat(directives):** 新增 `v-draggable` 指令（`src/directives/draggable.ts`，按现有 install 约定自动全局注册）——绑定元素即拖拽手柄，只有按住手柄才能拖；首次拖拽把 EP「margin 居中」定位切换为 left/top（相对全屏 fixed 的 el-overlay，坐标即视口坐标）；`clampPosition` 把弹窗钳制在视口边界内，下缘保留手柄高度可抓回（而非贴 0）。弃用 EP 原生 draggable 的原因：原生无边界限制，拖出视口后无法找回
* **feat(composables):** 新增 `useDialog` Hook（`src/composables/useDialog.ts`）——接收 Vue 组件 + 配置返回 `{ open, close, setProps, isOpen }`；open 时创建容器 div 挂 body 用 `render()` 动态挂载，EP `closed` 事件（关闭动画结束）后 `render(null)` + `remove()` 销毁，无 DOM 残留；**appContext 双保险继承**：setup 内调用捕获 `getCurrentInstance().appContext`，纯 JS 调用回退到 main.ts `setDialogAppContext(app)` 注册的全局上下文（`main.ts` 追加一行，必须在所有 `app.use` 之后调用），动态挂载的弹窗及其子组件因此可正常访问全局注册的组件 / Pinia / Router / i18n；open() 返回 Promise——点「确定」resolve，取消/关闭/X/ESC/遮罩 reject `DialogCancelledError`（instanceof 可识别，语义对齐 ElMessageBox.confirm）；`setProps` 经响应式状态 + 包装组件 render 实时生效
* **test:** 新增 `draggable.spec.ts`（4 组 clampPosition 边界数学 + 4 用例指令行为：拖拽位移/边界钳制/禁用/动态恢复）与 `useDialog.spec.ts`（6 用例：确认 resolve + 容器销毁、取消 reject、X 关闭 reject、setProps 实时更新、contentProps 透传、close() 语义）；useDialog 测试通过注册 ElDialog/ElButton/v-draggable 的最小上下文模拟纯 JS 调用，`.el-dialog` 能被渲染即证明 appContext 继承生效
* **demo:** 新增 `examples/ProDialog/ProDialogOverview.vue`（声明式：v-model + 原生 props 透传 / 拖拽边界实时坐标 / 全屏×拖拽交叉 / header-footer 插槽）与 `ProDialogUseDialog.vue`（命令式：open Promise 结果反馈 / contentProps + setProps / 句柄复用回归 / appContext 继承验证），sidebar 新增「ProDialog 弹窗组件」分组
* **建议验证：** 页面模板里 `<ProDialog v-model="visible" title="测试" draggable>` 验证拖拽不越界 + 全屏按钮切换；某按钮回调里 `useDialog(组件).open()` 验证命令式唤起、确定/取消的 Promise 语义、弹窗内 el 组件与 Pinia 正常可用

### 🐛 Bug Fixes | ProDialog demo 实测反馈（头部对齐 + 二次拖拽偏移）

> 来源：demo 页 `/demo/pro-dialog-overview` 真实浏览器验证反馈

* **fix(directives/draggable):** 二次拖拽位置偏移——`originLeft/Top` 只在首次拖拽缓存、之后不更新，第二次拖拽以初始位置为原点计算位移，弹窗按下瞬间跳回偏移前位置。改为每次 mousedown 重读 `getBoundingClientRect` 作为原点（上次落点即本次起点）；同时「margin→left/top 定位切换」由一次性 flag 改为按内联 style 实际状态判断，修复全屏切换清除内联定位后拖拽失灵的隐患；垂直钳制由「视口高 - 手柄高」改为「视口高 - 弹窗高」，整个弹窗留在视口内，不再触发 EP `.el-overlay { overflow: auto }` 的滚动条。补 2 个回归用例（连续拖拽坐标累计 / 内联定位被外部清除后自动重切换）
* **fix(components/common/ProDialog):** 头部样式——EP 原生 X 按钮绝对定位、与 flex 流内的全屏按钮对不齐（`padding-right: 44px` 预留间距不可控）。收编为完全自定义头部：全屏 + 关闭按钮组成 actions 组靠右对齐（24×24 等宽），`show-close` 从 $attrs 剥离避免 EP 重复渲染原生 X；自绘关闭按钮语义对齐原生 X——`before-close` 存在时交由它决定是否关闭（kebab/camel 两种写法均识别）。补 2 个用例（beforeClose 拦截 / show-close=false 隐藏）
* **chore(vite.config):** `useDialog` 加入 unplugin-auto-import 注入列表（与 `useAppRouter`/`useRequest`/`useAuth`/`useLogout` 同级），业务 `<script setup>` 内可直接 `useDialog(...)` 无须 import；同模块的 `DialogCancelledError`（class 名 AutoImport 不注入）与 `setDialogAppContext`（仅 main.ts 一次性调用，不应污染 setup 全局）保持具名 import

### 🐛 Bug Fixes | 经典侧栏折叠弹层过高（限高对齐水平弹层策略）

* **fix(layouts/default):** 折叠态 hover 图标弹出的 vertical 二级菜单限高 `calc(100vh - 20px)` 实测 933px 近全屏（demo 模块 60+ 项），用户反馈过高——改为与用户方定值的水平弹层同一偏移 `calc(100vh - 300px)`（实测 653px，约 14 项可见 + 内部滚动），两处弹层限高策略一致。实测定位 top 71→bottom 724 视口内、单层滚动条、docOverflow false，暗色样式无回归

### ♻️ Code Refactoring | 全项目 !important 清零（规范 §4#13 收尾，用户方执行）

> 继 default 布局 AppMenu 24 处之后，用户将其余文件中的 !important 全部清除——`src/` 下声明级 `!important` 已清零（grep 仅剩注释提及）。共 5 文件 29 处

* **refactor(styles):** `reset.css` autofill 3 处 / `PortalHeader.vue` 下拉悬停 2 处 / `PortalNav.vue` 子菜单标题 7 处 / `login.scss` 登录卡片·输入框·复选框 13 处 / `XFormSchemaIndex.vue` 4 处。替代策略与 AppMenu 同一思路——BEM 命名空间/深层嵌套选择器特异性压过 EP 单/双类默认规则，等特异性靠源码顺序决胜，不再依赖 !important
* **保留关注（reset.css autofill）：** Chrome UA 样式表对 autofill 背景色/文字色是 UA 级 !important，作者普通声明本就无法覆盖——原 `!important` 在这三行实际是无效声明；真正压住 UA 自动填充底色的是同行的 `box-shadow: 0 0 0 1000px #f9fafc inset`（盒阴影不在 UA 覆盖范围），该行未动、机制不受影响
* **文档同步：** `2026-07-28-login-ui-refresh.md` / `2026-07-28-portal-header-logout.md` 内嵌代码片段已由用户方同步去 !important
* **建议验证：** 登录页用已保存账号触发浏览器自动填充，确认输入框底色仍被盒阴影盖住（无 UA 黄色泄漏）；portal 布局导航悬停、头部下拉悬停、登录页卡片/输入框聚焦态目测无回归

### ♻️ Code Refactoring | layouts/default 全面清除 !important（对齐项目规范 §4#13）

> 用户要求「检查 default 中的样式，不要出现 !important」——`src/layouts/default` 下 24 处 `!important` 全部清除（全部集中在 AppMenu.vue），视觉零回归

* **refactor(layouts/default):** 根因釜底抽薪——EP el-menu 的 `background-color`/`text-color`/`active-text-color` props 会被以内联样式落到每个 `.el-menu-item`/`.el-sub-menu__title` 及弹层上，CSS 侧覆盖只能上 `!important`（这 24 处的历史来源）。移除三个 props，改走 EP 官方 CSS 变量通道 `--el-menu-bg-color`/`--el-menu-text-color`/`--el-menu-active-color`：容器块与 vertical/horizontal 弹层分别定义（弹层 teleport 到 body，继承不到容器作用域变量），菜单项基色/激活色交给 EP 默认规则按变量渲染。实测菜单项内联 style 属性彻底消失（`(none)`）
* **refactor(layouts/default):** 剩余优先级冲突全部改用特异性解决——`.el-menu` 内部规则（0-3-0/0-4-0）压 EP 单/双类默认规则；弹层边框三件套带 `.el-popper` 前缀（0-2-0）压 EP `.el-popper.is-light`（0-2-0 等特异性靠源码顺序决胜，组件样式注入晚于 EP）；折叠态 `padding: 0`（原 `padding: 0 !important`）平权即胜
* **保留不动：** horizontal 弹层局部 EP 主色变量（teleport 取不到容器作用域紫色主色）+ 文件底部暗色覆盖块（`[data-theme='dark']` 下 #818cf8/#252c49）；用户方改过的水平弹层限高 `calc(100vh - 300px)` 原值保留
* **验证：** `grep !important src/layouts/default` 仅剩注释提及、声明清零；CDP 四模式实测——经典侧栏/折叠态（48px 居中）/top 水平菜单基色·悬停·激活 computed 值亮暗双主题全部正确（暗色 #818cf8/#252c49 覆盖生效）、vertical/horizontal 弹层背景/边框/圆角/阴影/条目色正确、水平弹层内层单层滚动条（外层无）；`pnpm type-check:full` + ESLint + layouts 23 用例全绿

### 🐛 Bug Fixes | top 布局水平菜单弹层超高撑出 body 滚动条

* **fix(layouts/default):** `.vv-app-menu-popper--horizontal` 补限高——vertical 折叠弹层已有 `max-height: calc(100vh - 20px)` 策略，水平弹层遗漏且 `overflow: hidden`，demo 模块 60+ 页时弹层实测 2334px 超出视口、撑出 documentElement 滚动条
* **fix(layouts/default):** 限高引发二次问题——EP 2.14 会把 popper-class **同时复制到外层 el-popper 与内层 .el-menu--popup-container**，两处都挂 max-height + overflow-y 出现双层滚动条。滚动收敛到内层容器（`&.el-menu--popup-container` 限定），实测外层 overflow visible 无滚动条、内层单条滚动条（扣除边框后精确判定），docOverflow false；vertical 弹层行为不变

### 🐛 Bug Fixes | 双栏/混合主导航空项 + 顶部导航子菜单箭头叠字

> 三个布局模式菜单渲染问题一次修复，同根因两项 + CSS 一项

* **fix(layouts/default):** PrimaryNav（mixed 顶横排 / dual 侧栏 rail）直接消费菜单树**原始顶层节点**——`/user` 这类纯布局包装路由自身无 meta（title/icon 为空），渲染出空图标空文案项（dual rail 实测第 3 项空白），混合模式顶横排同因少一项。修复：与 AppMenu 同一套 `resolveSingleChild` 提升语义，显示用 `displayItems` 单子项时替换为子项标题/图标；激活态匹配与 select 事件载荷仍用 raw 顶层节点（提升后子项 path `/user/list ≠ /user`，直接替换会丢激活态）。实测 dual rail 四项齐全、点用户管理跳转 /user/list 且激活态正确；mixed 顶横排四项齐全 + 二级侧栏正常
* **fix(layouts/default):** top 布局水平菜单子菜单标题 `padding: 0 15px` 未给箭头预留空间——EP 水平箭头绝对定位于标题右侧（实测 right:20px、宽 12px），长标题文案伸进箭头下方叠压（工作台/组件示例多级菜单实测）。子菜单标题右内边距改为 34px，实测文案右缘与箭头间距 2px 不再叠压；菜单项（无箭头）padding 不变。新增 `PrimaryNav.spec.ts` 4 用例（提升渲染 / raw path 激活态 / raw 载荷 / rail 模式），layouts 27 用例全绿

### 🐛 Bug Fixes | 切换暗色主题后刷新回到亮色（主题持久化读取格式失配）

* **fix(store/theme):** `readInitialMode` 只比对裸字符串（`'light'/'dark'/'auto'`），而 persist 插件实际写入的是 JSON 序列化对象 `{"mode":"dark"}`——比对永不命中，每次刷新都兜底回 `'auto'`（亮色系统下表现为暗色丢失；legacy key 迁移逻辑同款失配一并修复）。新增 `parseStoredMode` 兼容三种历史格式：JSON 对象 `{"mode":"dark"}`（当前 persist 格式）、JSON 字符串 `"dark"`、裸字符串 `dark`，非法值仍兜底 `'auto'`。浏览器实证修复前后 localStorage 实况（key `vue3-vite-project:theme-mode` 值为 `{"mode":"dark"}` 但刷新后 data-theme 丢失）；修复后往返验证：UI 切浅色/暗色 → 存储格式正确 → 刷新恢复暗色 + 暗色布局变量生效（内容区 bg #0b1120）。新增 `theme.spec.ts` 7 用例覆盖格式兼容 / legacy 迁移 / 非法值兜底 / setMode 应用

### ✨ Features | default 布局页签刷新可见反馈（内容区 180ms 淡入）

> 验收反馈「工作台首页、分析页点刷新没看到任何反馈，用户管理和监控页有反馈」——实证确认刷新机制对全部页面生效（填字→刷新→字被清空 = 组件重挂载），差异在页面内容性质：user/list 有 useRequest 骨架闪烁、监控页有输入状态变化可感知，纯静态页重挂载后像素不变、无可捕捉反馈

* **feat(layouts/default):** AppView 监听布局壳注入的 `refreshKey`，页签刷新命令触发时给 `__content` 挂一次性 `is-refresh-fade`（220ms 后摘除），CSS 动画 `vv-app-view-refresh-fade` 180ms 淡入——静态页刷新"已发生"可感知。关键设计：① watch 只盯 refreshKey，路由切换不触发（负面对照实测无 class、无动画）；② 用 CSS animation 而非 `<Transition>`：避免与 keep-alive out-in 的已知交互风险，且 class 与应用同帧提交、新视图挂载即带动画类；③ 220ms 定时器摘除 class 防无关重渲染误触发，onUnmounted 清理定时器。实测：刷新 60ms 时 class 在 + 动画运行，300ms 后摘除；切页签零触发；23 用例全绿、控制台零警告

### 🐛 Bug Fixes | default 布局暗色主题 el-table stripe 条纹行泛白割裂

* **fix(layouts/default):** `default-tokens.scss` 的 `default-layout-ep-dark` mixin 补齐 fill 阶梯缺失的两档——`--el-fill-color-lighter: #232f45`、`--el-fill-color-extra-light: #2c3a54`。EP el-table 的 stripe 条纹行底色取 `--el-fill-color-lighter`，mixin 原只覆盖到 light/dark 档，缺失档回落 EP 出厂亮色值 #fafafa——暗色下条纹行整块泛白、深色表体+白条纹强烈割裂（/user/list 实测）。暗色阶梯现完整：dark #0f1726 → base #1a2436 → light #1c2638 → lighter #232f45 → extra-light #2c3a54；亮色未动（EP 默认 #fafafa，实测无回归）

### 🐛 Bug Fixes | default 布局面包屑：无标题包装层记录渲染成孤立 "/"（对标参考仓）

* **fix(layouts/default):** Breadcrumb 过滤条件补「必须有标题来源」（`meta.title ?? meta.titleKey`）——`/user` 这类纯布局包装层父记录 meta 为空，原过滤（仅排除 visible/breadcrumb === false）把它放行，`resolveRouteTitle` 兜底返回 `''`，渲染出开头一个空标题可点击项 + 孤立 "/" 分隔符。对标参考仓「只渲染有 title 的记录」：实测 `/user/list` 面包屑从「/ 用户管理」修正为单层「用户管理」（当前页纯文本不可点）；`/workbench/analysis` 多层「工作台/分析页」不受影响

### 🐛 Bug Fixes | workbench 视图与 AppView 双层 padding

* **fix(modules/workbench):** 移除三个视图（Index/Analysis/Monitor）根节点的 `padding: var(--app-content-padding)`——页面级内容区内边距由布局层 `AppView __content` 统一提供（24px，demo 等 60+ 页面均依赖该基线），视图再自加一层叠加成 48px 大间距。全仓 grep 确认仅这 3 个视图有重复，已全清并留 Why 注释防再犯。实测：视图根 padding 0、卡片距内容区边缘 24px

### 🐛 Bug Fixes | default 布局面包屑 duplicate key 警告

* **fix(layouts/default):** Breadcrumb 的 `el-breadcrumb-item` key 由 `crumb.path` 改 `` `${crumb.path}-${index}` ``——空 path 的 index 子路由（`path: ''`）经 vue-router 规范化后与父记录同 path（`/workbench` 的父记录与子记录都是 '/workbench'），父/子标题不同（工作台 / 工作台首页）时相邻去重保留两条、path key 重复触发 `[Vue warn]: Duplicate keys found during update: "/workbench"`。key 加 index 后缀消除重复，面包屑渲染与跳转行为不变（实测 /workbench 控制台零警告、工作台→监控页 crumbs 正常）

### ✨ Features | default 布局折叠侧栏菜单项 hover tooltip

> 折叠态下菜单只剩图标，hover 仅背景高亮、用户无从知晓目标页——补 tooltip 提示

* **feat(layouts/default):** 折叠侧栏（vertical 根实例）的叶子菜单项 hover 弹 `el-tooltip`（placement right、show-after 300ms、dark 主题）——内容为 `promotedNode(node).title`，与展开态可见文字同源，随 locale 切换自动更新；tooltip 默认 teleport 到 body，不被 el-scrollbar 裁剪。实现要点：① 仅根实例生效（`showCollapsedTooltip = isCollapsed && !isNested`）——递归实例渲染在 hover 弹层内（展开态、文字完整可见），且弹层菜单项文字完整，无需 tooltip；② 仅叶子菜单项——折叠态 hover 分组本就会弹子项浮层（有上下文），tooltip 会与浮层重叠冲突；③ tooltip 分支不渲染标题 span——EP collapse 样式本就把直接子 span 隐藏（0×0 + visibility:hidden），等效且保证 tooltip 单根触发；④ 展开态 / horizontal 模式 / 弹层内渲染走原 v-else 分支，零影响。浏览器实测：折叠 hover 仪表盘图标 → dark tooltip「仪表盘」右侧弹出；hover 分组仅弹子项浮层、无 tooltip

### 🐛 Bug Fixes | default 布局折叠菜单不可见修复（图标 kebab→PascalCase 解析 + 折叠弹层限高）

> 用户反馈「经典布局收起左侧菜单栏后，菜单不可见，鼠标 hover 时有一块背景」逐项修复

* **fix(layouts/default):** MenuIcon 图标解析加 `pascalCase` 转换——路由 `meta.icon` 存 kebab-case（`'magic-stick'`），而 `@element-plus/icons-vue` 导出键是 PascalCase（`'MagicStick'`），原实现直接以 kebab-case 取键恒为 `undefined`，导致菜单图标（含折叠态唯一的可见内容）从不渲染；折叠后菜单"只剩一块背景"。经 `pascalCase()` 转换后取键，折叠态 4 个图标 22×22 居中恢复（浏览器实测）
* **fix(layouts/default):** 折叠 hover 弹层（`.vv-app-menu-popper--vertical`）限高——demo 模块 60+ 子项时弹层撑至 1159px 超出视口；加 `max-height: calc(100vh - 20px); overflow-y: auto`，弹层内部可滚动
* **test(layouts/default):** 新增 `MenuIcon.spec.ts` 4 用例——kebab-case 解析（magic-stick→MagicStick）/ 单词名解析 / 未命中不渲染 / 空 name 不渲染，防回归

> Phase 5 功能审查（中英文切换 / 折叠 / 页签刷新 / 左右滚动 / 更多菜单全链路实测）后的用户反馈逐项修复

* **fix(plugins):** errorHandler 增加已知良性错误白名单——`ResizeObserver loop completed with undelivered notifications`（Chromium 布局观测噪声，EP el-scrollbar / 弹层动画高频触发、无堆栈无损害）在 window error 监听处直接丢弃，不再 console.error 也不进上报通道，避免污染 Sentry；真实错误仍正常上报（实测 dispatch 两类错误验证）
* **chore(components):** 删除死代码 `src/components/common/TagsView/`（无任何模板引用，default 布局复刻后仅剩历史包袱；其全局非 scoped 样式曾占用 `vv-tags-view` 命名空间与布局版冲突）——同步清理 `types/components.d.ts` 两处全局组件声明、`tags-view.ts` @see 指向、`TagsView.vue` 命名空间注释改历史说明（`default-tags-view` 命名空间保留不回迁）
* **fix(store):** Pinia persist key 命名空间化——`utils/storage.ts` 新增导出 `namespacedStorageKey()`（与 Local/Session 写入规则一致），`theme.ts` persist key 改 `vue3-vite-project:theme-mode`（保留老裸 key 一次性读取兜底并清除），`app.ts` 改 `vue3-vite-project:app-ui`；实测两个 key 均按新规则落盘、刷新回灌正常。docs/06/10/18/19/21 同步更新（§4.4「裸 key」旧决策重写为「必须经 namespacedStorageKey 拼接」）
* **test(utils):** storage.spec 新增 1 用例——`namespacedStorageKey()` 与 `Local.set` 写入的 key 规则一致
* **verified(layouts/default):** 页签左右滚动按钮实测通过——溢出场景（scrollWidth 1600 > clientWidth 488）下点击右滚 scrollLeft 0→200、左滚 200→0；自动化浏览器 smooth 动画被冻结属测试环境限制，降级瞬时验证按钮真实逻辑（handler → scrollBy(±200) → wrapRef 链路完整）。页签刷新实测正常（输入清空重建 + keep-alive 保留），用户侧如遇失效为 HMR 旧状态，硬刷新即可

### 📖 Documentation | CLAUDE.md BEM 规范新增「非 scoped 样式禁止 :deep()」约束

* **docs(claude-md):** §3.2 强制约定新增第 10 条 + §3.3 反模式新增第 8 条——非 scoped 样式下 `:deep()` / `::v-deep` / `:v-deep` 不会被编译，会以伪类原样输出到浏览器并被整条规则丢弃；BEM 模式下覆盖第三方库组件样式必须直接写后代选择器；§3.2 第 5 条补充交叉引用，文档版本升至 v1.2.0

### ✨ Features | default 布局复刻 vue-element-plus-admin（四模式 + 多页签 + 工作流组件全家桶）

> 计划：`docs/superpowers/plans/2026-09-09-default-layout-replica.md`。复刻 [vue-element-plus-admin](https://github.com/kailong321200875/vue-element-plus-admin) 布局结构与组件功能，对齐 `layouts/portal` 自包含组织约定（components / config / styles，不引用 `@/components/`）

* **feat(layouts/default):** 四模式布局外壳——sidebar（经典侧栏）/ top（顶部导航）/ mixed（顶栏主导航 + 二级侧栏）/ dual（图标 rail + 二级侧栏），移动端（≤767px）自动降级抽屉侧栏 + 遮罩；旧 `Header.vue` / `Sidebar.vue` 删除，14 个自包含组件重写（`index.vue` + `components/{Logo,Collapse,Breadcrumb,AppMenu,PrimaryNav,LayoutSwitcher,LocaleDropdown,UserInfo,ToolHeader,ContextMenu,TagsView,AppView,MenuIcon}.vue`）
* **feat(layouts/default):** 路由 → 菜单树派生（`config/menu.ts`）——基于 vue-router 5 `getRoutes()` 平铺语义构建，覆盖 index 子路由（`path: ''`）/ 单子项提升（`resolveSingleChild`，复刻 `hasOneShowingChild`）/ `menuVisible` 过滤 / affix 页签收集（`filterAffixRoutes`）；外链新窗口打开
* **feat(store):** `app` store 新增 `layout: LayoutMode`（localStorage 持久化）+ `mobile`（matchMedia 监听，移动端强制折叠）；`tags-view` store 新增 `closeLeft` / `closeRight` / `removeCachedView`（页签刷新剔除 keep-alive 缓存）
* **feat(layouts/default):** 多页签 TagsView——滚动页签条 + 右键菜单（刷新 / 关闭 / 关闭左 / 右侧 / 其他 / 全部）+ 左右滚动 / 刷新 / 更多工具按钮；刷新用 AppView 内部 key 重建实现（provide/inject），不新增 `/redirect` 路由
* **feat(modules/workbench):** default 布局验收模块——`pnpm new-module workbench` 生成，父分组菜单（首页 index 子路由 + 分析页 + 监控页），视图 `defineOptions({ name })` 对齐路由 name 保证 keep-alive 缓存命中，页签内输入内容切换后保留可验证
* **fix(layouts/default):** 菜单树构建两处边界——空 path 子路由（home/workbench 首页形态）解析为父路径本身（消除 '/home/' 幽灵路径导致的重复菜单项），index 子路由的标题 / 图标继承到父节点（mixed/dual 模式 PrimaryNav 消费顶层节点 title 不再为空）
* **style(layouts/default):** `styles/default-tokens.scss` 对齐参考仓 `var.css` 精确值（亮：白侧栏 + 紫主色 #5b5bd6 + slate 文字色；暗：#111827/#0b1120/#818cf8）——EP 变量覆盖以 mixin 导出、施加在 `.vv-default-layout` 容器作用域（不污染项目全局主题与 portal 布局），布局专用变量（`--left-menu-*` 等）全局定义供 teleport 菜单弹层取用；顶栏 / 工具条 / 页签条毛玻璃（`color-mix` 94%/96% + `backdrop-filter: blur(16px)` + 双层 slate 阴影），侧栏 224/72、顶栏 60px、页签 38px、内容 padding 24px
* **style(layouts/default):** Logo mark 38px + 按布局模式分色标题；菜单补箭头 1em / 内嵌子菜单列间隙 / 折叠图标 22px；内容区 `min-height` 扣除顶栏页签；TagsView 背景移交布局壳统一毛玻璃；Breadcrumb 修复 EP 2.14 + TS6 下 `:to="undefined"` 的 TS2379（改显式分支渲染）
* **style(layouts/default):** 新增 `styles/element-overwrite.scss`——EP 弹层变量映射：default 布局挂载时 `index.vue` 往 `<html>` 写 `data-layout="default"`（卸载清除），teleport 到 body 的弹层（下拉 / Select / Dialog / Message 等）经 `[data-layout='default']` 选择器命中与容器相同的 EP mixin，获得紫色主题（亮：hover #eeeeff/#5b5bd6；暗：#252c49/#818cf8）；属性随路由切换，portal 布局页面无泄漏；不逐组件写覆盖规则（弹层类名与 portal 全局共享，无法限定作用域）
* **fix(layouts/default):** 滚动职责归位——布局根 `height: 100%` 因 App.vue 的 ErrorBoundary / AsyncState 包装层（block + auto 高）截断 #app→布局的百分比高度链，退化为内容高度、页脚 50px 溢出致 body 滚动；布局根改 `100vh/100dvh` 锚定视口（自包含，不碰全局组件），`__scroll`（main 区）恢复为唯一滚动容器；AppView 内容 `min-height` 补扣 `--app-footer-height`，短内容页页脚恰好沉底
* **fix(layouts/default):** TagsView 页签高度 22px → 31.4286px（与官网逐位一致）——非 scoped 样式下 `:deep()` 规则整体被浏览器丢弃致 `.el-scrollbar__view` 高度链断裂，AppMenu 8 处同款问题一并改为普通后代选择器（菜单 44px / radius 10px / gap 10px 定制恢复生效）；布局 TagsView 命名空间 `tags-view` → `default-tags-view`，规避 `src/components/common/TagsView`（无模板引用的死代码）全局非 scoped 样式的同名命名空间冲突（align-items / padding 被篡改）；`item-body` / `link` 逐级 `font-weight: inherit` 恢复激活页签 600 字重（reset.css 对 div/a 设 normal 阻断继承链）
* **test(layouts/default):** 新增 `config/menu.spec.ts` 15 用例（createRouter 真实实例验证平铺语义：index 子路由无重复 / 单子项提升 / 分组过滤 / 排除项 / affix 收集 / i18n titleKey 优先）
* **i18n:** `menu.workbench*` 4 键入 zh-CN / en-US
* **fix(layouts/default):** 语言切换全链路修复（功能审查实测发现的 Phase 1 遗留）——全仓无写 `i18n.global.locale` 的代码导致切换语言 UI 永不翻译；App.vue watch `appStore.locale` 同步 vue-i18n 实例 + `<html lang>`（immediate 兼刷新回灌），`app` store persist pick 增 `locale`（`app-ui` 实测写入 localStorage）
* **i18n:** 菜单/页签/面包屑随语言热更新——home/user/demo 路由补 `meta.titleKey`（`menu.home` 文案对齐「仪表盘」、新增 `menu.demo`）；`TagView` 增可选 `titleKey`（`toTag` / `filterAffixRoutes` 携带），TagsView 渲染改 `tagTitle() = titleKey ? t(titleKey) : title`；Breadcrumb 改 `resolveRouteTitle(record, t)`；zh/en 同步新增 `header.*` 15 键（布局面板/折叠/dark/退出登录等）与 `tagsView.*` 11 键（工具 aria + 右键菜单 6 项），Collapse/LayoutSwitcher/ToolHeader/UserInfo/LocaleDropdown/遮罩全部接 t()；顺带修正 en-US `app.title` 残留错误产品名
* **fix(layouts/default):** 页签刷新静默失效——TagsView 与 AppView 是 `<main>` 平级兄弟，AppView provide 的 `default-layout-refresh` 对 TagsView 不可见（控制台 injection not found 告警、refresh 空转）；refresh 句柄与 refreshKey 上提 `default/index.vue` 统一 provide，AppView 改 inject key。实测：keep-alive 切走切回输入保留、刷新后组件重建输入清空

### ♻️ Code Refactoring | form-schema 错误守护 watcher 按需挂载（批次 3-3：L2）

> 审计与设计：`docs/superpowers/specs/2026-09-09-form-schema-arch-audit.md`。行为等价重构，零公开 API 变更

* **refactor(form-schema):** `useSetFieldError` 路径 B 守护从「全字段挂载」改为「按需挂载」（`use-set-field-error.ts`）——仅「当前有外部错误条目」的字段挂 validateState watcher，条目清除即 stop。大表单常态（无外部错误）watcher 数从 O(字段数) 降为 0；无条目的字段守护回调本就恒空跑，白挂 watcher 纯属浪费
* **docs(form-schema):** 评估结论写入实现注释——审计原建议「合并为单次遍历比对」不可行：守护的职责是实时纠正（el-form blur 校验通过把 validateState 改回 success 时 externalErrors 未变，须在 ref 变化瞬间纠正），合并后纠正只在 externalErrors 变化时发生，两次变化之间的 drift（红字消失）将可见，属行为回归
* **test(form-schema):** 行为等价由现有 19 个用例锁定（纠正语义 / diff 精准清理 / 幂等 / scope 清理全绿）

### ✨ Features | form-schema 错误浮窗 OSD 可配置化（showErrorToast prop）

* **feat(form-schema):** 新增 `showErrorToast?: boolean` prop（`XFormProps`）——XFormErrorToast 从「耦合 showDebugBanner（dev 环境恒开 / prod 恒关、用户不可控）」改为独立开关，**全环境默认 false（关闭）**，传 `:show-error-toast="true"` 开启；错误主反馈始终是字段红字 + console 留痕，toast 仅为补充提醒，默认开启会对连续输入校验失败场景造成弹窗噪音
* **docs(form-schema):** README §props（10→11 个）+ §prod 错误反馈表 + 生产推荐配置段、ARCHITECTURE.md 目录树与三层错误展示表、XFormErrorToast/XForm 模板注释同步「dev only」旧描述
* **demo(form-schema):** `XFormCrossField.vue` 新增「错误浮窗 OSD」开关，演示 showErrorToast 开启效果（跨字段失败 toast 即时可见）
* **test(form-schema):** XForm 集成 spec 新增 2 用例——未传 prop 时错误事件不渲染浮窗（默认关闭）、传 `show-error-toast` 时渲染

### 🐛 Bug Fixes | form-schema errorBus 去重窗口改固定窗口（批次 3-4：L1）

> 审计与设计：`docs/superpowers/specs/2026-09-09-form-schema-arch-audit.md`

* **fix(form-schema):** 去重命中不再刷新窗口起点 —— 原滑动窗口语义下，高频同码错误（如每键触发的 crossValidator 失败）每次命中都顺延窗口起点，持续触发时首次弹窗后**永不重复展示**；改为固定窗口（节流语义：距上次入列满 5s 后下一条立即入列），错误重新出现后最迟 5s 内再次提醒
* **fix(form-schema):** dedupeCache 增加容量上限 100 —— 历史「code|message」组合原本无限累积导致 Map 无界增长；触顶时先清理窗口起点已过期的条目，仍超限则整体清空（最坏后果 = 去重短暂失效，无正确性影响）
* **docs(form-schema):** `report` JSDoc 明确去重粒度契约：去重键 = code + message，message 变化的错误视为新错误立即入列，调用方须保证 message 承载区分信息（如含字段名/失败数量）或传 `force: true`（9 个现有调用点逐一核对均满足）
* **test(form-schema):** 新增 2 个用例锁定固定窗口语义（命中不刷新窗口起点）与容量上限行为

### 🐛 Bug Fixes | form-schema 错误清除语义修复（跨字段 demo 实测）

> 用户在 `/demo/xform-cross-field` 实测反馈两个错误清除语义 bug，经 chrome-devtools MCP 浏览器实证定位根因后修复

* **fix(form-schema):** 路径 B watch 清理逻辑从「无外部错误条目即清错」改为「上一轮有外部错误条目、本轮没有才清错」的 diff 精准清理（`use-set-field-error.ts`）——修复 el-form 内部错误（如 required 红字）被误清的问题：空保存后填确认密码触发跨字段错误时，日期字段未触碰但其 required 红字被 watch else 分支无差别清空
* **fix(form-schema):** `useCrossFieldTrigger` 新增 `onFormReset()`（取消排队 debounce runner + 重拍 deps 快照），composer 包装 `exposed.resetFields` 在实例重置后同 tick 调用（`use-cross-field-trigger.ts` / `use-xform-composer.ts`）——对齐 el-form 官方「resetFields 后不重新校验」惯例，修复重置后兜底 watch 把「重置造成的值变化」当普通变化重跑 crossValidator 的问题（如 user.age 重置回 10 时「未成年」红字复现）
* **test(form-schema):** 新增 4 个回归用例锁定两个语义（外部错误新增不误清 el-form 内部错误 / 条目删除仅清对应字段；onFormReset 后兜底 watch 空跑不重校验 / 取消排队 debounce runner）

### ♻️ Code Refactoring | form-schema 抽取 walkSchema 公共遍历器（批次 3-2：M5）

> 审计与设计：`docs/superpowers/specs/2026-09-09-form-schema-arch-audit.md` | 计划：`docs/superpowers/plans/2026-09-09-form-schema-batch3-2-walk-schema.md`。零公开 API 变更、零行为变更（各调用方遍历方向集合经 opts 精确保持）

* **refactor(form-schema):** 新增 `utils/walk-schema.ts` —— schema 树「children / slots / formItem.slots / array.itemSchema」四向递归公共遍历器（visitor 模式 + early-exit + 三方向 opts 开关），统一 6 处手写递归：use-reaction.ts `containsReaction` / `applyReactions`、use-schema-renderer.ts `containsAsyncOptions` / `registerAsyncOptions`、use-validate.ts `collectCrossRuleFields`（顺带删除从不消费的 keyPath 死参数）、use-schema-index.builder.ts `buildIndex`（顺带删除本地 traverse / isSchemaNodeLike）。新增一种容器字段类型从改 5+ 处收敛到改 1 处（开闭原则）；净 -131 行
* **refactor(form-schema):** `traverseCross`（use-validate.ts）保持独立不复用 —— array 节点按 model[name] 运行时行数展开 itemSchema，遍历形状由 model 驱动而非 schema 静态结构，语义与静态遍历器本质不同；文件头加 `@see` 注释说明
* **docs(form-schema):** ARCHITECTURE.md 目录树补 utils/ 区块（含批次 1-1 两个 util，此前未列入）；审计文档批次 3 表格 3-2 标完成

### 🐛 Bug Fixes | form-schema 表达式沙箱实例级化（批次 2-3：H2）

> 审计与设计：`docs/superpowers/specs/2026-09-09-form-schema-arch-audit.md` | 计划：`docs/superpowers/plans/2026-09-09-form-schema-batch2-3-expression-scope.md`

* **fix(form-schema):** 表达式沙箱从模块级共享状态改为 per-instance `createExpressionScope()`（H2）——此前函数表 + 编译缓存为模块级共享，同页多 XForm 实例互相污染（浏览器实测三种形态：B mount 覆盖 A 的函数表、A unmount 清表致 B 表达式 ReferenceError、A 重挂载覆盖 B）。composer 统一注入实例 scope 到 4 个消费点：`useTopLevelFields` / `useSchemaRenderer`（reaction 管线 traverse → applyReactions → applyReactionFields）/ `useRenderRoot`（on 事件绑定 / permission 表达式）；`useExpressionFunctions` 改为写注入 scope，删除 onScopeDispose 清表（scope 随实例 GC）
* **deprecate(form-schema):** 模块级 `setExpressionFunctions` / `resolveFunctionExpression` 标 `@deprecated`（对外公共 API，直接删除是 breaking change；form-schema 内部已全部改用实例 scope）

### 🐛 Bug Fixes | form-schema 行为修复（批次 2：H3 + H1）

> 审计与设计：`docs/superpowers/specs/2026-09-09-form-schema-arch-audit.md` | 计划：`docs/superpowers/plans/2026-09-09-form-schema-batch2-behavior-fixes.md`

* **fix(form-schema):** 跨字段兜底 watch 从顶层浅拷贝 diff 改为按 rule 的 deps 值快照 diff（`use-cross-field-trigger.ts`，对齐 use-reaction deps 快照模式）——修复嵌套路径直改（`model.user.age = 30` 绕过 v-model）时新旧快照同引用恒判未变、crossValidator 漏触发的问题（H3）
* **fix(form-schema):** 字段级 `disabled`/`hidden` 的 standalone 函数 / `'{{ fn }}'` 形态在克隆阶段由 `applyReactions` 归一化为 reaction 条目走既有 watch 求值管线（`use-reaction.ts`）——修复函数形态被原样 spread 进组件 props（dev prop type 警告 + 字段永久禁用/恒隐藏）的问题（H1）

### ♻️ Code Refactoring | form-schema 校验/错误子系统内部重构（批次 1）

> 审计与设计：`docs/superpowers/specs/2026-09-09-form-schema-arch-audit.md` | 计划：`docs/superpowers/plans/2026-09-09-form-schema-batch1-refactor.md`。零公开 API 变更、零行为变更

* **refactor(form-schema):** 抽取 `utils/collect-el-field-errors.ts` —— 三处对 `ef.fields` 的 `toRaw → validateState==='error' → validateMessage → propString||prop` 扫描结构重复（use-form-instance validateField / use-form-validation validateForm / validateDetail）统一为单一工具，element-plus 3.0 升级 diff 面从 3 处收敛到 1 处
* **refactor(form-schema):** 抽取 `utils/run-el-form-validate.ts` —— el-form.validate「callback + reject 双轨」Promise 包装两处重复统一；EP 2.x 即使传 callback 仍 reject errorsMap 的兜底行为单点维护
* **refactor(form-schema):** 删除 useFormValidation 死依赖 `crossFieldTrigger`（deps 接口 / 解构 / `void` 占位 / composer 传参 / spec mock 五处同步），合并 validateForm 两个逐字重复的守卫分支
* **refactor(form-schema):** 删除 useFormInstance.validateForm 死代码（生产零调用方，与 useFormValidation.validateForm 同名不同语义，属维护陷阱）+ spec 4 个用例；XFormExpose 上的 validateForm 来自 useFormValidation，对外契约不变
* **perf(form-schema):** composer 的 fieldErrors watch 去 `deep: true` —— setFieldError 对外部错误的写入均为顶层键赋值/删除，浅 watch 即可捕获（use-set-field-error 路径 B 守护内的 deep watch 保留不动）
* **docs(form-schema):** 修正 render-form-item 阶段 3.1 过时注释（原称「不直接修改 elForm.fields[i]」，实际双路径设计——路径 B 的 watch 守护恰恰直接写字段内部 ref）；triggerRender 的 window 调试计数器收敛至 use-dev-runtime 的 `trackTriggerRender()`

### ♻️ Code Refactoring | form-schema 目录归位（components/ + adapters/）

* **refactor(form-schema):** 5 个 Vue 组件（XForm / SchemaField / XFormDebugBanner / XFormErrorToast / XFormErrorToastItem，含各自 spec）从根目录移入 `components/`；`element-plus-adapter.ts`（含 spec）移入 `adapters/`。纯目录归位，零逻辑变更（git mv 保留历史）
* **refactor(form-schema):** 同步修复 70+ 处 import 路径 —— barrel `index.ts`、编排层（use-xform-composer / use-dev-runtime）、被移文件内部对 `types` / `composables` / `styles` 的引用、`xform-contract.spec.ts` 的 CSS 路径正则（`./styles` → `../styles`）、demo 模块 48 个示例 + demo 文档 2 处直接 import 旧路径（`@/components/form-schema/XForm.vue` → `…/components/XForm.vue`）
* **refactor(form-schema):** 2 个编译期类型测试移入 `types/` 并去掉冗余 `types.` 前缀——`types/types-derivation.test-d.ts`、`types/custom-component.test-d.ts`（就近被测对象原则）；demo 提示文案同步
* **docs(form-schema):** ARCHITECTURE.md 目录树 + 演进时间线（v3.1.0）+ spec 分布说明同步；README 生产配置示例 import 路径、CONTRIBUTING 自定义组件指引路径同步

### 💄 Style | ProTable 树形展开箭头改内联自定义图标

* **fix(ProTable):** 树形模式展开开关此前借用 `type:'expand'` 列的 el-table 自带 icon——箭头固定在独立 48px 列、不随 `_level` 缩进，层级感缺失；改为树列内联自定义箭头（`▾`/`▸`，随缩进内联于节点名前），按钮 reset 浏览器默认外观 + hover 主题色
* **fix(ProTable):** 隐藏规则收进 `is-tree` 作用域——根节点新增 `bem.is('tree')` 状态类，el-table 自带 expand icon / 展开行内容仅在树形模式隐藏（此前 `.el-table__expanded-cell` 无条件隐藏，非树形场景 expand 列的「展开行内容」能力被误伤，README 列类型表承诺的 expand 能力随之恢复）
* **fix(ProTable):** 树形懒加载展开后控制台 `Duplicate keys found during update` 警告 + 子行重复渲染——树形行对象带 `children` 字段（useTreeData 懒加载赋值），el-table 默认 `tree-props` 识别该字段把行递归渲染为树节点，与 ProTable 自行扁平化的 flatData 平铺行双渲染同一节点；树形模式下 `treeProps` 指向哨兵字段（`__pro_table_flat__`），el-table 按纯平铺渲染，展开/懒加载由 useTreeData 单一职责接管。mock 中历史「深拷贝防 Duplicate keys」注释的误修根源即此
* **test(ProTable):** 集成 spec 补树形回归用例——懒加载 mount 后断言表体行数 = flatData 行数（修复前多渲染 1 行）且 console.warn 无 Duplicate keys（真实 mount ElTable 复现）。测试 156 → 157
* **docs(demo):** `ProTableTree` 移除 `__expand__` 列（48px icon 列不再需要），展开交互统一走树列内联箭头

### 🐛 Bug Fixes | ProTable 多选列渲染 + 刷新保持表格实例 + 刷新 loading 遮罩

> 由 overview demo 新增「勾选 / 清除勾选」验证入口暴露（此前多选无任何 demo 可验）

* **fix(ProTable):** element-plus 引擎 `type: 'selection'` 列行内勾选框不渲染——`ElementTableBody` 对 ElTableColumn **统一提供 default slot**，覆盖 el-table 对 selection 列的内置 checkbox 渲染（`cellForced.renderCell` 仅在无 default slot 时生效），行内单元格空白只剩表头全选框；selection 列排除出 default slot（`v-if="col.type !== 'selection'"`），交还 el-table 自渲染
* **fix(ProTable):** 多选跨页记忆（`reserve-selection`）失效——`AsyncState` 的 loading 分支以 skeleton 替换插槽，每次翻页/搜索刷新都**卸载重建 ElTable 实例**，其 store 内多选选区 / 展开行等交互态全部丢失；`initialLoading` 收窄判定（仅「从未渲染过数据」时 skeleton，之后刷新保留表格实例、loading 期间展示旧数据），配合 `tableProps: { reserveSelection: true }` 跨页累计选区可用
* **fix(ProTable):** 切分页/排序/搜索刷新期间表格无 loading 指示——`initialLoading` 收窄的补偿缺口：后续刷新表格保持挂载但缺少遮罩；`ElementTableBody` / `VxeTableBody` 新增 `loading` prop，编排层传 `table.loading && hasTableMounted`（首次 skeleton 与表格遮罩不叠加）。el 引擎走 `v-loading` 指令；vxe 引擎走外层容器 `v-loading` —— vxe 自带 `loading` prop 的遮罩组件 `VxeLoading` 由未安装的 vxe-pc-ui 提供（vxe-table esm 版不含，UMD 才内置），`VxeUI.getComponent('VxeLoading')` 返回 undefined 致原生 prop 无效；待评估引入 vxe-pc-ui 后可换回原生 prop（tooltip 等组件同此依赖）
* **fix(ProTable):** el 引擎切密度（紧凑/默认/宽松）时表头高度不变、且与表体行高不对齐——密度覆盖只作用于表体 `.el-table__row td`（`height` 显式设定），表头 `th.el-table__cell` 仅补 padding 时高度 = 内容行高(约 23.6px) + padding，默认档实测 39.57px vs 表体 48px，两引擎并排 demo 出现高度差；表头同步设 `height`（table 布局中按最小高度生效）与表体对齐。vxe 引擎表头与表体共用 `--vxe-ui-table-row-height-*` 变量，无此问题
* **refactor(ProTable):** 密度档位值（行高 32/48/64、垂直 padding 4/8/12）提取为 Sass map 设计令牌（`$pro-table-density-tokens`）+ `@each` 生成 el 表体/表头、vxe 四尺寸键共 21 处分散硬编码——调档/新增档位单点维护（压缩编译产物 diff 验证零行为变化）
* **test(ProTable):** 集成 spec 补回归用例——selection 列行内渲染 el-table 内置 checkbox（真实 mount 断言 `.el-table__body .el-checkbox`）；切分页请求挂起期间断言 `.el-loading-mask` 出现、数据到达后消失；测试 154 → 156
* **docs(demo):** overview 新增「多选（勾选 / 清除勾选，含跨页记忆）」演示区块（`#demo-selection`）——`getSelectedRows` / `clearSelection` 外部按钮 + reserve-selection 跨页验证入口

### 🐛 Bug Fixes | ProTable v2.2-M1 正确性修复（深度审计驱动）

> 审计与设计：`docs/superpowers/specs/2026-09-08-protable-v2.2-arch-audit-design.md`

* **fix(ProTable):** `element` expose 恒为 null——`useTable.tableRef` 创建后从未接线；`ElementTableBody` 经 defineExpose 转发 ElTable 实例（getter 透传 `$el`，保持 getTbody 行拖拽挂载点可用），编排层 watch 同步进 `table.tableRef`；`clearSelection()` 同步调用 el-table 实例的 `clearSelection()` 清 UI 勾选态（vxe 引擎 tableRef 为 null，可选链兜底）
* **fix(ProTable):** 列设置持久化只恢复列顺序——`persist()` 写入的 `visible`/`fixed` 在加载路径从不读取（隐藏的列、固定的列刷新后复原）；setup 回填 `persisted.visible` → `visibleKeys`、`persisted.fixed` → 列副本 + `fixedKeys`（未收录的列显式取消固定，防 props 初始 fixed 回移）；`resetToDefault` 同步重置 `fixedKeys`；`persist()` 的 visible 口径改为有效可见性（`hidden` 字段与抽屉 `visibleKeys` 取交集），与回填口径一致，round-trip 不漂移
* **fix(ProTable):** 跨页 reset / setSearchParams 双发请求——fetchHook 对齐 `onSortChange` 同场景模式：page≠1 时仅 `setPage(1)` 由 page watch 触发请求，不再紧接手动 `refresh()` 第二次
* **refactor(ProTable):** 移除僵尸配置字段（类型层承诺但运行时零读取点）——`RowEditConfig.trigger/exclusive`、`TreeConfig.showLine`、`CellSpanConfig.judge/spanHeader`、`ProColumn.isFilterEnum/fieldNames`
* **test(ProTable):** 测试 147 → 154（element expose 接线并断言穿透至 ElTable 实例方法 / clearSelection UI 联动 / 持久化回填与 round-trip / fixed 取消固定不回移 / resetToDefault 重置 fixedKeys / 跨页 reset 单请求）

### 🐛 Bug Fixes | ProTable vxe 引擎密度 / 列设置不生效

* **fix(ProTable):** vxe 引擎密度行高对齐机制修正——vxe-table 由 JS 测量 CSS 变量 `--vxe-ui-table-row-height-*`（隐藏尺寸元素 `.vxe-table-var-*`）并以「内联 min-height」写进 `.vxe-cell`，此前对 `.vxe-body--row td` 设 height/padding 会被内联 min-height 顶开（default 档实测行高 64px，与 el 引擎 48px 并排差 ~180px）；密度改为覆盖该组变量（四尺寸键同值，compact 档同步缩 `.vxe-cell` 垂直 padding 防 38px 底），双引擎表格高度差收敛到 ~26px（残余为 vxe 单元格边框 ~1.5px/行 + 表头 ~10px）；测量结果有缓存，动态切密度由 `handleDensityChange` 触发 VxeTableBody 暴露的 `recalculate()` 重算（el 引擎纯 CSS 即时生效无需此步）；列设置抽屉被 `v-if="engineRef === 'element-plus'"` 排除，vxe 引擎点击无反应——ColSetting 操作引擎无关数据层（useColumns），移除引擎限制；列设置拖拽排序后 vxe 表格列序不更新——vxe-table 在 VxeColumn 挂载时按 DOM 序注册 staticColumns，Vue 按 key 移动组件实例不触发重注册，VxeColumn 的 key 由 `col.prop` 改为带序位 `` `${col.prop}:${index}` ``，重排时全量 remount 按新 DOM 序重新注册；窄容器下 vxe 表格 enum 列（ElTag 固有宽度内容）被自动列宽压到 tag 宽度以下，tag 溢出单元格被表格容器裁剪——toVxeColumnProps 对未显式声明 width/minWidth 且无自定义 render 的 enum 列补 minWidth 80px 兜底（el-table 自动布局按内容撑开列，无此问题）
* **test(ProTable):** engine spec 补 2 用例（vxe 引擎下 ColSetting 渲染 + 列设置按钮开抽屉 + 密度按钮桥接 data-density + 密度切换触发 vxe recalculate；列重排后列组件全量 remount + DOM 新序）

### 🐛 Bug Fixes | ProTable 搜索区窄容器宽度塌陷

* **fix(ProTable):** SearchForm 固定 4 列布局在窄容器（如引擎对比 demo 双栏 pane ~630px）下列宽压到 ~150px、输入框 ~80px 不可用。element-protable-overwrite.scss 新增 CSS 容器查询（container-type: inline-size）：搜索区 ≤900px 自动降 2 列、≤560px 降 1 列；element-plus 栅格断点基于视口宽度，对"视口宽但容器窄"场景无效，容器查询按组件自身宽度降级

### 🐛 Bug Fixes | vxe-table 引擎 dev 模式 `@vxe-ui/core` 解析失败

* **fix(deps):** vxe-table@4.21.x 的 es 产物运行时 import `@vxe-ui/core`，但包未声明依赖 → pnpm 严格 node_modules 下依赖缺失，vite dev 预构建产物保留裸导入导致 `Failed to resolve import "@vxe-ui/core"`。经 `pnpm-workspace.yaml` 的 `packageExtensions` 补声明 `@vxe-ui/core ^4.4.0`（连带 xe-utils / dom-zindex 进依赖图）+ `publicHoistPattern` 提升三个包到根 node_modules
* **chore(pnpm):** 修复 `.npmrc` 第 2 行两行粘连的配置损坏（`onlyBuiltDependencies[]=@parcel/watchershamefully-hoist=true`，`shamefully-hoist` 从未生效）；pnpm 11 项目级配置统一迁移至 `pnpm-workspace.yaml`（`pnpm config list` 不再读取项目 .npmrc）

### ✨ Features | ProTable v2.1 —— vxe-table 引擎

> 设计稿：`docs/superpowers/specs/2026-09-08-protable-v2.1-vxe-engine-design.md` | 计划：`docs/superpowers/plans/2026-09-08-protable-v2.1-vxe-engine.md`

* **feat(pro-table):** `table-engine="vxe-table"` 渲染引擎实装——`useVxeTable` 动态加载（JS + CSS 按需注入 + app 安装，chunk 不进首屏），加载失败自动回退 element-plus 并 console.warn
* **feat(pro-table):** ElTable 渲染分支抽离为 `ElementTableBody.vue`（纯移动，行为零变化）；新增 `VxeTableBody.vue` 第二引擎分支
* **feat(pro-table):** vxe 列映射层 `adapters/vxe-column.ts`（prop→field / label→title / selection→checkbox 等）+ `ProColumn.vxeProps` 恢复（补充不覆盖派生值）
* **feat(pro-table):** vxe 事件适配——checkbox-change/checkbox-all 合并为 selection-change（选区按 rowKey 比较，兼容 vxe 内部数据代理）、sort-change 负载 { field, order } → { prop, order }
* **feat(pro-table):** vxe 引擎能力矩阵对齐——行编辑/单元格合并/服务端排序/多选支持；树形/行拖拽启动校验 warn 并忽略
* **test(ProTable):** 新增 `ProTable.engine.spec.ts` 引擎切换 4 用例（vxe 渲染 / fallback 回退 / checkbox 合并选区 / sort 负载适配）
* **docs(ProTable):** README 引擎章节（用法 + 能力矩阵 + vxeProps）；ARCHITECTURE 文件清单同步；CONTRIBUTING 删除 v2.1 接入清单、更新已知限制；新增引擎对比 demo（ProTableEngineCompare）

### ✨ Features | ProTable 下一迭代（M1 泛型化 → M2 服务端排序 → M3 响应适配器）

> 计划文档：`docs/superpowers/plans/2026-09-08-protable-next-iteration.md`

* **feat(pro-table):** ProColumn/ProTableProps 泛型化（render row 精确到 T，默认 `Record<string, unknown>` 向后兼容；方法语法 bivariance 保证下游子组件零改动）
* **feat(pro-table):** 服务端排序（`sortable: 'custom'` 接线 + `sortParamsAdapter` 序列化适配 + `sort-change` 事件 + `getSortState` 暴露；排序状态归 useTable，不混入 searchParams）
* **feat(pro-table):** `responseAdapter` 响应结构适配 + fail-fast 校验（data 非数组 / total 非数字 → console.error + 错误态）
* **test(ProTable):** 测试 96 → 111（新增排序 4 用例 + 集成接线 3 用例 + responseAdapter 2 用例 + 类型层断言 spec）
* **docs(ProTable):** README 新增泛型/服务端排序/响应适配三节；ARCHITECTURE 状态归属/依赖/错误处理同步；新增服务端排序 demo（ProTableServerSort）

### 🐛 Bug Fixes | ProTable 行拖拽取消二次确认后顺序已变（DOM 未还原）

* **fix(ProTable):** `useRowDrag` `onEnd` 先还原 sortablejs 物理移动过的 DOM 行再走确认/取消/跳过分支——取消、onSortChange 抛错、树形映射失败时 DOM 不再残留错位（与 ColSetting 列设置拖拽修复同理：Vue 保持唯一数据源）
* **test(ProTable):** useRowDrag 增 2 用例（取消还原 DOM / 映射失败还原 DOM）

### 🔧 Refactors | ProTable 架构优化（5 步计划，2026-09-08 评估驱动）

> 计划文档：`docs/superpowers/plans/2026-09-08-protable-arch-refactor.md`

* **fix(ProTable):** searchParams 单源化（H1/H2）——唯一真相源收归 `useSearch`，`useTable` 改为 `getSearchParams` 读取回调；修复「程序化 setSearchParams 后请求参数错配」与「输入即搜无防抖」两个缺陷；输入路径（`updateParams` 纯写）与请求路径（按钮门控）分离
* **fix(ProTable):** useRowEdit 硬编码 `r.id`（H5）——注入 `props.rowKey`，自定义行 key 表格保存/错误回调不再失效
* **fix(ProTable):** 树形拖拽索引错位（H6）——DOM 视图行 key 映射回顶层数组索引后 splice，映射失败 console.warn 并跳过（替代静默错位）
* **refactor(ProTable):** 能力编排归位（H4）——`useRowDrag` 自持 DOM 挂载生命周期（onMounted + watch data flush:'post'），删除 ProTable.vue 3 个 setTimeout + 2 个 watch；`useTreeData.flatData` 响应式化 + `dispose()` 资源清理；抽取 `EditCell.vue` / `CellContent.vue` 子组件（ProTable.vue 384 行 ≤400 达标）
* **refactor(ProTable):** props 保护（M2/M5）——`useColumns` 白名单拷贝列对象，外部 columns 常量不再被反向 mutation，多实例共享互不污染；`validateCapabilities` 消除原地改写调用方配置
* **refactor(ProTable):** 行为等价清理——删除 `useVxeTable` 死路径（方案 A：vxe-table 引擎 warn 并回退 element-plus，骨架可从 aaedabf 恢复，v2.1 接入清单见 CONTRIBUTING.md）、删除模板死代码与 useTable 死字段、`colSettingVisible` 单源化、engine 锁定语义统一
* **test(ProTable):** 测试 75 → 96（新增 searchParams 单源化 / 树形拖拽映射 / 列拷贝保护 / vxe 回退 / 自定义 rowKey 等 21 个用例）
* **docs(ProTable):** README / ARCHITECTURE / CONTRIBUTING 同步，旧实现计划文档标注 vxeProps 已移除

### 🐛 Bug Fixes | ProTable 列设置拖拽排序不生效（双根因修复）

* **fix(ProTable):** 列设置抽屉拖拽后表格列顺序不更新
  * 根因 1（`ColSetting.vue`）：sortablejs 拖拽过程中即移动真实 DOM 节点，旧实现取 `children[newIndex]` 作目标列，但该位置恰为被拖元素本身 → `to === from` 被守卫拦截，`reorder` 事件从未发出。改为 `onStart` 捕获旧顺序、`onEnd` 从 DOM 读取完整新顺序 emit（`reorder: [string[]]`）+ 还原 DOM 让 Vue v-for 保持唯一数据源
  * 根因 2（`useColumns.ts`）：`sortedColumns` 按 setup 时的一次性 `persisted.order` 快照排序（非响应式），即使事件到达、allColumns 已重排，表格仍按旧顺序渲染。改为响应式 `columnOrder` ref；`reorderColumns(from, to)` 重构为 `setColumnOrder(order)`
  * `resetToDefault` 同步重置列顺序；持久化 order 由"仅可见列"改为"完整列顺序"（隐藏列重新显示后位置不再漂移）
  * `src/types/sortablejs.d.ts` 补 `onStart` 回调声明
* **test(ProTable):** useColumns 增 4 用例（setColumnOrder 排序 / 持久化 order 存在时回归 / order 缺列容错 / resetToDefault 恢复顺序）；ColSetting 增 onEnd 回归用例（emit 完整顺序 + DOM 还原）

### ✨ Features | ProTable v2.0 —— 4 类核心能力扩展

* **feat(ProTable):** 行内编辑（双击进入 + 多行并行 + 异步校验 + 草稿保留）
  * 新增 `useRowEdit` composable（71 行，9 个单测）
  * `ProColumn.edit?: ColumnEditConfig` 字段（el / props / rules / editable）
  * ProTableExpose 新增 `startEdit` / `cancelEdit` / `saveEdit`
* **feat(ProTable):** 树形数据（懒加载 + 默认展开 + 搜索命中自动展开）
  * 新增 `useTreeData` composable（76 行，8 个单测）
  * 客户端遍历匹配 + 祖先路径自动展开 + 未加载节点 lazy load 触发
* **feat(ProTable):** 单元格合并（element-plus spanMethod 包装 + 自定义 judge + 合并上限）
  * 新增 `useCellSpan` composable（67 行，7 个单测）
  * 同列相邻值自动纵向合并 / 自定义判定 / 跨列合并（_spanTarget 标记）
* **feat(ProTable):** 行拖拽排序（sortablejs 绑定 + 业务拦截 + 跨层拖拽阻止）
  * 新增 `useRowDrag` composable（80 行，8 个单测）
  * 手柄列 / 整行拖拽 / `onSortChange` 异步确认 / `onMove` 跨层拦截
* **feat(ProTable):** 能力冲突矩阵（6 条规则 + 启动校验 + warn 不 throw）
* **refactor(ProTable):** `ProTable.vue` 编排层集成 4 个 composable + 启动校验 + 8 个 v2 expose 方法（303 → 421 行）
* **refactor(useTable):** 新增 `editingKeys` / `treeExpandedKeys` / `isTreeMode` 状态字段（198 → 212 行）
* **chore(types):** 新增 7 个 config interface（`ColumnEditConfig` / `ColumnTreeConfig` / `ColumnSpanConfig` / `RowEditConfig` / `TreeConfig` / `CellSpanConfig` / `RowDragConfig`），`ProColumn` 增 4 字段，`ProTableProps` 增 4 prop
* **chore(types):** `sortablejs.d.ts` ambient module declaration（项目使用 sortablejs ^1.15.7 但无 .d.ts）
* **feat(demo):** 5 个 demo 覆盖 4 类能力（编辑 / 树形 / 合并 / 拖拽 / 总览升级）
* **test(ProTable):** 集成 spec 6 用例（冲突矩阵 + 启动校验 + 能力 prop 形式兼容）

**已知限制**：vxe-table 引擎 v2.0 不适配 4 类能力（v2.1 议题）

测试：v1 共 30 → v2.0 共 **75**（composable 32 + 集成 6 + demo 0 + v1 30 + 类型间接测试）

### ✨ Features | 新增 ProTable 组件（配置驱动 + 双引擎架构）

* **`src/components/ProTable/`**：新增配置驱动的企业级表格组件（Element Plus + vxe-table 双引擎）
  * `columns` 数组同时定义表格列与搜索项（`ProColumn` 类型，~100 行类型契约）
  * 自动生成搜索区（响应式布局 + 展开/收起，搜索按钮在前，附录 A #4）
  * 工具栏：刷新 + 密度切换 + 列设置（复选框切换可见性，附录 A #6 "恢复默认"）
  * 分页区（基于 el-pagination，page / pageSize 自动同步）
  * 插槽系统：tableHeader / toolButton / [prop] / operation / search-[prop] / empty / paginationLeft / paginationRight
  * 多选跨页记忆（el-table reserve-selection + row-key，附录 A #1 保留多选）
  * 双引擎切换：`table-engine="element-plus" | "vxe-table"`，**vxe-table 动态按需加载**（spec 决策 1）
  * `defineExpose`：`refresh` / `reset` / `getSelectedRows` / `clearSelection` / `getSearchParams` / `setSearchParams` / `element` / `engine`
  * 类型安全：`ProTableProps` / `ProColumn` / `ProTableExpose` / `EnumProps` / `SearchElType` / `TableEngine` / `TableDensity`
  * 4 个 composables：`useSearch` / `useTable` / `useColumns` / `useVxeTable`（每个 ≤150 行）
  * 3 个子组件：`SearchForm` / `TableHeader` / `ColSetting`
  * 测试覆盖：7 个 .spec.ts，共 **30 个测试全过**

### ♻️ Refactor | XForm demo 可理解性深度修复（13 项 P0/P1/P2）

基于批量可理解性审查（48 个 demo 评估 + 已读 13 个关键 demo 代码交叉验证）的修复批次：

* **refactor(XFormBuilder):** 重写为真实 builder 链式代码
  - 7 个字段全部用 `xCascader / xUpload / xTransfer / xTimePicker / xTimeSelect / xAutocomplete / xTreeSelect` 真实链式
  - Upload 字段演示 builder + slots 混合写法（builder 不支持 slots 时的扩展模式）
  - 修复前：标题写「builder 链式」但实际全用对象字面量；修复后：类型安全 + IDE 自动补全
* **refactor(XFormAsyncOptionsError):** `immediate: false` 引擎限制独立成折叠面板
  - 删除把限制当 demo 的 `cityLazy` 字段
  - 主要演示 `onError` 回调 + `deps` 触发 source 重跑
  - 新增「⚠️ API 限制说明」`el-collapse` 单独承载限制描述 + 变通方案
* **refactor(XFormLargeSchema):** 加学习目标 + 30/120/300 三档对比 + 性能基准对照表
  - `el-radio-group` 三档切换字段数（shallowRef 重建 schema）
  - perf-panel 高亮展示 mount / build 耗时 + 档位 tag（流畅/可接受/需优化）
  - placeholder 业务化（`sku-${i+1}` 模拟生产 SKU 命名）
* **refactor(XFormSchemaIndex):** 用「4 类业务问题」开篇替换 6 Map 抽象展示
  - 新增 4 类业务问题卡片：① 脏检查基线 ② 跨字段 watch ③ 反向依赖图 ④ 服务错误映射
  - 每个 Map 配 1 个具体业务用例，让数据结构与业务问题一一对应
* **refactor(XFormServerError):** intro 与 mock 对齐 + 移除响应式断点
  - 删除响应式断点（已迁移到 XFormResponsive demo），单一职责专注服务端错误映射
  - intro 文案与 4 类 mock 错误场景逐项对齐
* **refactor(XFormBeforeChange):** source 标注改 XForm.vue + Tab C 加 ASCII 正则匹配示意图
  - source 从 `build-vmodel-bindings.ts` 改 XForm.vue（在 intro 注释拦截逻辑所在文件）
  - Tab C 命名空间新增 ASCII 图示解释 `/^contacts\[\d+\]\.phone$/` 命中规则
* **refactor(XFormCustomFormItem):** inline 实现真实 `FormItemPlus` 组件
  - 修复前：`component: 'FormItemPlus' as never` 未注册导致渲染异常
  - 修复后：defineComponent 真实实现 + 通过 `XForm components` prop 注册
  - schema 字段写法：`formItem.component: 'FormItemPlus'`（字符串名 + 注册，对 DSL 友好）
* **refactor(XFormPersistSchemaVersion):** 加 7 步交互指引 + 弱化「引擎 bug」注释
  - 新增 7 步交互指引 `el-collapse`（参考 XFormOrderCreate 引导模式）
  - 「修正引擎 bug」注释改为中性「综合 hasDraft + lastSavedAt 作为按钮 disabled 依据」
* **fix(XFormOrderCreate):** 能力清单表格第②项描述修正
  - 表格写「onSave 内检查：客户名/电话至少一个」与 intro（`crossValidator`）矛盾
  - 改为「`crossValidator`：客户名/电话至少一个（schema rules 自动触发，无需 onSave 内检查）」
* **fix(XFormExpressionSandbox):** reaction 真正调用白名单函数
  - 修复前：注册了 `toCurrency / upper / concat` 但 4 个 reaction 全用内联函数，白名单形同虚设
  - 修复后：3 个 reaction 改字符串表达式 `{{ toCurrency(...) }}` / `{{ upper(...) }}` / `{{ concat(...) }}` 真正调用白名单
  - 沙箱测试字段保留内联函数写法作为对比
* **fix(XFormInvalidComponent):** 字段 D 命名统一
  - 文件头注释「MyInput」「MyCustomInput」与 schema 实际 `MyUnregisteredComp` 不一致
  - 注释统一为 `MyUnregisteredComp`（与对照组 `MyCustomInput` 区分清晰）
* **feat(XForm / Upload / StyleOverride):** 加「先看这个」引导卡
  - 3 个信息密度高的 demo 顶部加 `el-alert` 引导卡，标注核心场景 vs 进阶场景
  - 减少 48 个 demo 侧边栏对新人造成的压迫感
* **chore(demo):** 全局 placeholder 业务化整顿
  - XFormBuilder：语言「主要编程语言」+ 部门「所属部门（树形多选）」
  - XFormLargeSchema：字段 placeholder 部分用 `sku-${i+1}` 业务化

### ✨ Features | demo 可理解度提升（P0）

* **feat(demo-clarity):** 新增 `useConsoleCapture` composable + 8 个单测
  - 在组件生命周期内捕获 `console.error` / `console.warn` 到 reactive `logs` 数组
  - `onUnmounted` 还原原始 console（强约束避免污染全局）
  - 内存 FIFO 上限 50 条；单条 message 500 字截断（防页面卡顿）
  - 可选 prefix 过滤（XForm demo 统一传 `'[XForm]'`）
* **feat(demo-clarity):** 新增 `ConsoleLogPanel` 公共组件
  - ElCollapse 默认折叠；error 红 / warn 黄
  - 视图层 200 字二次截断；emit `clear` 事件（单一职责）
* **refactor(XFormInvalidComponent):** 字段 label 加预期状态后缀 + 接入 console 面板
  - A / B / E 加「（应通过）」；C / D 加「（应警告）」
  - introduction 文案改为「下方控制台输出面板自动展示」（不再依赖 DevTools）
* **refactor(XFormModelWarn):** 引入 console 面板
  - 下方面板自动展示场景 1 的 [XForm] model 警告
* **refactor(XFormExpressionSandbox):** 引入 console 面板
  - 沙箱拒绝原因（document / fetch 屏蔽）实时展示
* **feat(XFormOrderCreate):** 验证指引面板搬到 UI
  - 顶部 `el-collapse` 默认折叠；展开后看到 7 条编号指引
  - 新人首屏即可看到验证步骤，无须打开源码注释
* **docs(demo-clarity):** 设计文档 `docs/superpowers/specs/2026-09-02-xform-demo-clarity-design.md` + 实现计划 `docs/superpowers/plans/2026-09-02-xform-demo-clarity.md`

### ✨ Features | demo sidebar 模糊搜索

* **feat(demo-search):** `DocLayout.vue` sidebar 顶部新增常驻搜索框
  - 匹配字段：`label`（中文名 + 组件名拼接的完整显示名）+ `name`（组件名），不区分大小写子串匹配
  - 分组行为：未命中分组整组隐藏；命中分组强制展开（搜索激活态）
  - 空状态：sidebar 列表区显示「未匹配到「xxx」」+ 「清空搜索」按钮
  - 折叠快照：搜索期间 toggleGroup 不响应；模板 `v-show` 加 `isSearchActive` 前缀强制展开命中组；清空后 `collapsedGroups` 值不变 → 用户折叠偏好不被污染
  - 路由切换保留输入框内容（避免跳转打断检索）
  - 「返回首页」按钮 + 搜索框包成 `__sidebar-top` sticky 容器 —— sidebar 内容超长滚动时两者始终可见
* **feat(demo-search):** 新增 `composables/useDemoSearch.ts` + 10 条单测
  - 类型导出：`DemoSearchItem` / `DemoSearchGroup` / `UseDemoSearchOptions` / `UseDemoSearchReturn`
  - composable 设计：「不修改 `collapsedGroups` + 模板 `v-show` 加 `isSearchActive` 前缀」即满足折叠快照需求，零额外状态
* **docs(demo-search):** 设计文档 `docs/superpowers/specs/2026-09-02-demo-sidebar-search-design.md` + 实现计划 `docs/superpowers/plans/2026-09-02-demo-sidebar-search.md`

### ✨ Features | beforeChange 3 层升级 + label 字段级颗粒度

* **feat(form-schema):** `beforeChange` 从单一全局拦截升级为 3 层拦截器
  - 第 1 层：XFormProps.beforeChange（横切关注点：埋点 / 全局拦截）
  - 第 2 层：XFormProps.beforeChangeRules（动态命名空间：数组节点统一处理）
  - 第 3 层：SchemaNode.beforeChange（业务内聚性最高）
  - 执行顺序：L1 → L2（多规则按数组顺序串行）→ L3；任一层返回新值透传给下一层；Promise.reject 中断整个 chain；同步 throw 被 warn + 放行原值给下一层
  - 新增 `BeforeChangeCtx` 上下文：`setFieldValue`（联动修改其他字段）/ `setFieldError`（显示红字）/ `abort`（取消写入）/ `name`（当前字段路径）
* **feat(form-schema):** labelPosition / labelWidth 支持字段级颗粒度
  - 顶层 schema 配置作整体默认；SchemaNode.labelPosition / SchemaNode.labelWidth 字段级 override 顶层
  - element-plus ElFormItem 与 ElForm 共享同一套 labelPosition / labelWidth props，字段级配置透传到 ElFormItem
  - 字段级未声明时 ElFormItem 自动继承 ElForm 顶层（element-plus 原生行为）
  - 推翻旧注释"labelPosition 字段级不生效——element-plus 限制"——element-plus 原生支持字段级

### 📝 Docs | 文档同步更新

* **docs(demo):** 新增 `src/modules/demo/docs/如何写好一个 demo.md` —— demo 编写规范
  - 明确 demo 定位、目录职责、新增三步、页面结构规范
  - 提供指导思想（一事一 demo、对照组、验证方法、界面化日志）
  - 给出 DemoFrame / DemoField / ApiTable / DocToc / ModelPreview 使用指南
  - 列出常见反模式与提交前自检清单
  - 附最小可运行示例模板
* **docs(form-schema):** README / ARCHITECTURE 同步更新 —— 3 层 beforeChange 数据流图 + 字段级 label override 颗粒度说明
* **demo(form-schema):** 重写 XFormBeforeChange.vue —— `el-tabs` 三段演示（A 全局 Props / B 字段级 / C 命名空间）
* **demo(form-schema):** 扩展 XFormLabelLayout.vue —— 加备注字段 `labelPosition: 'top'` 字段级 override 演示
* **demo(form-schema):** sidebar XFormBeforeChange 中文名更新为「字段值拦截·3 层」
* **demo(form-schema):** xform-demos-api.ts beforeChangePropsItems / labelLayoutItems 条目扩展

### 📝 Docs | 设计 + 计划文档

### 🐛 Bug Fixes | 问题修复

* **demo(form-schema):** 修复新增 XForm demo 的 `:introductions` attribute 内嵌 ASCII 双引号导致 Vite 编译失败
  - 现象：`Attribute name cannot contain U+0022 ("), U+0027 ('), and U+003C (<)` —— 路由 `/demo/x-form-persist-schema-version` 等首次访问即报
  - 根因：HTML attribute 上下文（`:introductions="..."`）中嵌入裸 `"..."` 双引号被 HTML parser 解析为属性结束符，后续中文字符被识别为新 attribute name 触发非法字符错误
  - 影响范围：4 个新 demo（XFormPersistSchemaVersion / XFormAsyncOptionsError / XFormZod / XFormIgnore）
  - 修复：模板 attribute 字符串中的 `"..."` 改成中文「」括号（如「保存草稿」「加载失败」「传给后端的隐藏字段」）
  - 注意：script 块 JS 单引号字符串内嵌 ASCII 双引号仍合法（HTML parser 不解析），保留原样

### ✨ Demo | 补全 XForm 10 个核心能力演示（覆盖 README 中零示例 props/方法）

* **demo(form-schema):** 新增 10 个 XForm demo —— 覆盖 README §props（10 个）与 §schema 字段速查表（30 个）中此前零独立 demo 的能力点
  - P0 核心：XFormBeforeChange（`XFormProps.beforeChange` 拦截器，值写入 model 前自动格式化 / 超额拦截回弹）、XFormZod（`zodSchema` + `validateWithZod()` 集中式 zod 业务校验）、XFormCustomComponent（`components` prop 注册业务自定义 Component，含 MyTagSelector h() 写法演示）
  - P1 重要：XFormIgnore（`schema.ignore` 字段不渲染 / 不校验 / 不入 `getNames`，可作传给后端的隐藏字段）、XFormCustomFormItem（`schema.formItem` 自定义包装含 `false` 裸渲染 / `slots.label` 自定义 / `component` 换 FormItemPlus / `props.labelWidth` 单字段独立宽度）、XFormLabelLayout（顶层 `labelPosition` / `labelWidth` 响应式布局，含 left/right/top 三档切换，强调节点级无效）
  - P2 实例 API：XFormArrayApi（`addItem` / `removeItem` / `moveItem` 编程式操控数组节点，演示外部按钮与拖拽结果一致 + 批量导入 + 头插尾插）
  - P3 隐含能力挑明：XFormExpressionSandbox（`expressionFunctions` 白名单函数注册 + 沙箱安全 scanForForbidden 演示，含 document/fetch forbidden 触发的 console.error + Debug Banner 红字）、XFormPersistSchemaVersion（`useFormPersist.restoreFilter` schema 升级裁剪旧草稿，含 v1→v2 字段重命名/移除/新增的完整迁移演示）、XFormAsyncOptionsError（`asyncOptions.onError` 错误处理 + `immediate: false` 延迟加载 + 强制失败开关）
  - 路由 + sidebar 完全自动注册（`routes/index.ts` 的 `import.meta.glob` + `sidebar-groups.ts` 的 CN_NAMES 加 10 行），零侵入
  - 每个 demo ≤200 行（展示组件规范），全套符合 BEM 命名空间（`vv-demo-x-form-{name}`）+ `<style lang="scss">` 无 scoped + `createNamespace` 自动注入

### 📝 Docs | XForm README 与 API 数据同步更新

* **docs(form-schema):** README 新增「小白上手路径」section —— 4 阶段阅读清单（5 分钟建体感 → 30 分钟看完整业务形态 → 按需深入单能力 → 查缺补漏）
* **docs(form-schema):** README 新增「按症状定位」对照表 —— 10 种常见现象（反应式不响应 / 校验不触发 / 表单填错很多要展示服务端错误 / 性能问题 / 控制台报错但 UI 没提示 / 草稿数据回填字段对不上 / 自定义组件被识别为原生标签 / 接入 schema 后字段全失效 / 想拦截输入值）→ 直接跳转对应 demo
* **docs(form-schema):** `xform-demos-api.ts` 新增 7 个 XFormApiItem[] export（`beforeChangePropsItems` / `zodItems` / `customComponentItems` / `ignoreItems` / `customFormItemItems` / `labelLayoutItems` / `arrayApiItems`），为对应 demo 提供 ApiTable 数据源

### 🐛 Bug Fixes | 问题修复

* **router:** 路由切换后页面滚动到顶部（修复 demo 切换导航时滚动位置未复位）
  - 根因：`src/router/index.ts` 的 `createRouter` 未配置 `scrollBehavior`，切换路由时浏览器沿用旧滚动位置 —— demo 左侧菜单切换时右侧内容区不会回到顶部
  - 修复：新增 `scrollBehavior` 选项 —— 浏览器前进/后退用 `savedPosition`、带 hash 锚点平滑滚到目标元素、其余情况 `{ top: 0, left: 0 }`
  - 验证：`pnpm type-check` / `pnpm lint src/router/index.ts` 全绿

* **form-schema:** `listType: 'text' | 'picture'` 的 Upload 字段完全不可交互
  - 现象：`/demo/xform-upload` 页的「附件列表」「手动上传」「上传前校验」「已上传文件回显」四个字段看不到任何上传入口，点不动
  - 根因：ElUpload 非 drag 分支的触发区**就是 default slot 本身**（`element-plus/upload-content.vue` 直接 `renderSlot($slots, 'default')`，无内置 UI），而 `buildUploadDefaultSlot` 只为 `picture-card` / `drag` 注入内容，默认 `listType: 'text'` 落到空插槽 → `.el-upload--text` 零高度空元素
  - 修复：`isElUpload` 兜底分支注入 `<el-button type="primary" class="vv-x-form__upload-button">点击上传</el-button>`；`slots.default` / `children` 仍优先，业务自定义不受影响
  - 防回归：render-schema-node.spec +3（text 兜底按钮类名与文案、picture 同样兜底、children 存在时不注入）

* **form-schema:** 配 `slots.trigger` 的 Upload 会多出一个孤立触发按钮
  - 根因：ElUpload 在 `$slots.trigger` 存在时把 `$slots.default` 额外渲染到触发区之外（`element-plus/upload.vue:85`），而 XForm 恒向 ElUpload 传 default 插槽函数 —— 业务只写 trigger、不写 default 时会吃到引擎注入的默认内容
  - 修复：`buildUploadDefaultSlot` 检测到 `slots.trigger` 即跳过默认注入
  - 防回归：render-schema-node.spec +1

* **form-schema:** A 模式（实时）下跨字段校验错误不显示
  - 根因：`XForm.vue` 的 `onValueChange` 先调 `crossFieldTrigger.trigger()` 再调 `clearValidate()`；`delay=0` 时 `crossValidator` 同步写入错误后，`clearValidate()` 立即把刚写入的错误清掉，导致表单不标红、无错误文字
  - 修复：调整顺序为先 `clearValidate([node.name])` 清除旧错误（含服务端错误），再 `crossFieldTrigger.trigger(node.name)` 重新写入新错误；B/C 模式因 debounce 延迟写入，行为保持不变
  - 防回归：XForm.spec.ts +1（A 模式输入确认密码后 `fieldErrors` 保留错误）；浏览器实测 A/B/C 三模式均正常显示跨字段校验错误

* **form-schema:** 跨字段校验 debounce 失效修复（三路径重复执行 crossValidator）
  - 根因：同一次 change 存在三条并行执行路径——`onValueChange` 直调 `triggerCrossFieldValidator('change')`、ElFormItem 透传的原生 `onChange` 冒泡、`useCrossFieldTrigger` debounce 路径；前两者完全绕过 `debounceValidation`，且 debounce 路径内部 `trigger()` 与 deep watch model 对同字段双重同步执行（delay=0 时无去重）——实时模式每键执行 3 次（3 键 9 次）、500ms 模式 3 次，XFormValidationDebounce demo 三模式 counter 全部虚高
  - 修复：change 校验统一收敛到 `useCrossFieldTrigger` 单一入口（享受 debounce）——移除 `onValueChange` 的直调与 form-item 的 `onChange` 监听（blur/focusout 语义保留）；`trigger()` 登记 `triggeredFields`，deep watch 同 tick diff 跳过已处理字段，窗口随每次 watch 回调关闭（不吞下一 tick 真实变化）
  - 防回归：use-cross-field-trigger.spec +3（同 tick 双路径去重 delay=0/delay>0/跨 tick 重触发）；render-schema-node.spec 更新为「只挂 onFocusout 不挂 onChange」契约；浏览器实测 A/B/C 三模式 counter 均符合预期（9→3、3→1、1000ms 延迟生效）

* **form-schema:** `{{ fn }}` 表达式事件参数透传修复（编译模板单参硬编码）
  - 根因：`use-expression.ts` 编译模板 `return (${expr})(model)` 固定单参调用，`node.on` 绑定展开的事件实参在内层被丢弃——`{{ (m, v) => ... }}` 的 `v` 恒为 `undefined`（既有 XFormEvents demo 与 API 文档承诺形态静默失效）
  - 修复：编译模板改为 `(model, ...__rest__)` 多参调用；reaction / permission / readonly 等单参求值路径传空数组，行为完全向后兼容
  - 防回归：use-expression.spec +2（事件参数按位透传 / 单参路径兼容）；由 XFormExpression demo 浏览器实测暴露

### ✨ Features | 新特性

* **demo:** 修复 XFormStyleOverride 场景 5 数组节点：把字段从 array 节点 `children` 挪到 `itemSchema.children`
  - 根因：array 节点的 `children` 是「数组自身字段」（通常不用），行内字段必须写在 `itemSchema.children` 里（render-array-node.ts:4 注释明确）
  - 现象：原 schema 让 itemSchema.children 为空 → 渲染出 2 行「空行 + 上移/下移/删除按钮」，按钮看起来没操作目标
  - 修复后：每行 2 个 input（姓名 + 级别）+ 3 个按钮，初始 model 数据（张三/P5、李四/P6）正确填入
  - **根因**：XForm template 是 ElConfigProvider + 条件 XFormDebugBanner 两个 root，Vue 3 编译为 fragment 时父传的 `:class` 不会自动合并到根 div —— 所有 `<XForm class="xxx">` 的 demo class 实际丢失
  - **修复**：`<script setup>` 加 `useAttrs()` + `defineOptions({ inheritAttrs: false })`，根 div 改 `<div :class="[bem.b(), attrs.class]">` 显式 merge。3 行核心改动
  - **副作用清理**：XFormStyleOverride demo 删掉 6 个 wrapper，回到简洁 `<XForm :class="..." />`；style 从 descendant selector 改回 BEM 嵌套（XForm 根 div 现在能接住 demo class，无需 `.el-form` 锚点）
  - **影响面**：所有使用 XForm 的页面受益，业务页将来用 `<XForm class="xxx">` 锁样式作用域不再踩坑
  - **验证**：`pnpm lint` / `type-check:full` / `test src/components/form-schema`（511 用例）全绿

* **form-schema:** compileRules 自动注入 required 默认 message「必填」
  - 根因：xform-base 等 demo 用 schema 直接写法 `rules: ['required', ...]`，编译降级为 `{required: true}` 后无 message，async-validator 默认 message「orderNo is required」是英文；element-plus zhCn 不含 form.validateMessage.required 翻译，ElConfigProvider locale 改不了这一项
  - 修复：`compileRules` 对 `{required: true && message === undefined}` 自动注入 `message: '必填'`。仅在缺 message 时注入，**用户显式 message 不覆盖**
  - 与 builders.ts:90 `required(message = '必填')` 默认行为对齐
  - 防回归：render-schema-node.spec.ts +6（对象写法注入、用户 message 不覆盖、required:false 不注入、其他字段保留、多条规则混合）
- 增强：label 兜底拼接。compileRules 新增可选参数 `label?: string`，message 注入变成 `${label}必填`（如「订单号必填」），label 缺失时退化为「必填」保持向后兼容。render-form-item.ts 传 `node.label`
  - 影响面：所有 `{required: true}` 无 message 的 rule 自动获得中文「必填」；schema 显式 message 不受影响
  - `<ElConfigProvider v-bind="elConfig as any">` 套用 App.vue 模式：const 中转 + v-bind + as any + eslint-disable-next-line
  - 业务页中文环境零配置（ElForm / ElPagination / ElDatePicker 等都依赖 locale），解决「业务页忘了装 locale」高频踩坑
  - size='default' 写死；业务页若需 large / small 可在外面再包一层 ElConfigProvider 覆盖
  - 类型 as any 原因：element-plus buildProp 类型元组（type/required/validator/__epPropKey）与运行时值类型不直接等价（App.vue 同样模式）
  - 影响面：所有使用 XForm 的页面中文环境自动修复

* **demo:** XFormStyleOverride demo 6 场景 + 钩子清单表
  - 6 个真实业务场景 + 1 张钩子清单表（XForm 自有钩子 + Element Plus 高频类 + CSS 主题变量，按稳定性分高/中/低三档）
  - 路由 / sidebar 完全自动注册（`routes/index.ts` 的 `import.meta.glob` + `sidebar-groups.ts` 的 `CN_NAMES` 加 1 行），零侵入
  - 6 个真实业务场景 + 1 张钩子清单表：紧凑表单 / 品牌化 / 错误提示不抖动 / 只读态 / 数组节点 / 主题色覆盖
  - 每场景独立 XForm 实例 + class 锁作用域，互不污染；通过 `formItem.props.class` 还可锁单字段
  - 钩子清单表覆盖 XForm 自有钩子、Element Plus 高频可覆盖类、CSS 主题变量三类，按稳定性分高/中/低三档
  - 路由 / sidebar 完全自动注册（`routes/index.ts` 的 `import.meta.glob` + `sidebar-groups.ts` 的 `CN_NAMES` 加 1 行），零侵入

* **chore(eslint):** 迁移到 `withVueTs` 并放开 `.vue` 内的 tsx
  - `eslint.config.mjs` 从 `vueTsEslintConfig()`（v14.9 前的 helper）迁到官方推荐的 `withVueTs(options, ...configs)` + `vueTsConfigs.recommended`
  - 首参声明 `{ scriptLangs: ['ts', 'tsx'] }` —— 默认只允许 `lang="ts"`，demo 的 JSX 插槽示例需要 `lang="tsx"`
  - 规则等级保持 `recommended` 不变（未升级 `recommendedTypeChecked`，那会给全项目引入类型感知规则并显著拖慢 lint，属独立议题）
  - 类型感知未受损：本项目 eslint 从未启用 type-aware 规则，故 tsx 文件落入的 `disableTypeChecked` 名单为空集；`.vue` 类型安全由 `vue-tsc` 保证 —— 已反向验证（在 JSX 内插入 `formatFileSize(file.name)` 类型错误，`pnpm type-check:full` 精确报出 `XFormUpload.vue(231,56) TS2345`）

* **demo:** XFormUpload 场景 10 给出 JSX 与 `h()` 两种等价写法
  - 拆为「合同附件（JSX 写法）」+「报价单附件（h() 写法）」两个字段，渲染结果一致，两份均为可运行代码（不注释掉任何一份）
  - `XFormUpload.vue` 的 script 块改为 `lang="tsx"`
  - 选型建议写进注释：分支/循环多时 JSX 更易读；结构扁平时 `h()` 少一层语法转换，且不需要 `lang="tsx"`

* **demo:** XFormUpload 补充自定义样式三方案
  - 新增「自定义样式方案」小节（`/demo/xform-upload#demo-upload-custom`），覆盖产品要求定制上传区外观时的三条路径
  - 方案 8 类名覆盖：schema 不动，靠 `formItem.props.class` 锁作用域 + `vv-x-form__upload-icon--drag` / `__upload-text` 改外观（不污染同页其他 Upload）
  - 方案 9 `slots.default` 接管触发区：`component` 直接传组件对象（无需 `XForm.components` 注册）拼虚线卡片
  - 方案 10 `slots.file` 自定义已上传项：文件图标 + 名称 + 大小 + 自接的移除按钮（内置 ✕ 被该插槽覆盖，需自行实现删除）
  - 该 demo 页因内联 3 套 schema + 样式达 507 行，已与用户确认对本页放开组件行限

* **form-schema:** Upload 默认触发图标按类型区分（picture-card / drag）
  - `drag: true` 且未自定义 default slot 时注入 `<el-icon class="el-icon--upload"><UploadFilled /></el-icon>` + `<div class="el-upload__text">拖拽文件到这里或点击上传</div>`，与 Element Plus 官方拖拽区视觉一致，业务无需在 schema 手写 trigger
  - 两类默认内容统一挂 XForm 命名空间类名（图标 `vv-x-form__upload-icon` + `--picture-card` / `--drag` modifier，文案 `vv-x-form__upload-text`），便于业务样式覆盖时精确命中其中一类
  - picture-card 与 drag 同时开启时取 Plus 小图标（卡片触发区仅 148px，67px 大图标会溢出）
  - 文档补充：`el-form-item__content` 下那层无类名 `<div>` 是 ElUpload 自身模板根节点（收拢 upload-list 与 upload-content），非 XForm 包裹层、无法从 XForm 侧移除，需覆盖样式时用 `.el-form-item__content > div`
  - 防回归：render-schema-node.spec +4（drag 注入类名/图标/文案、优先级、自定义 slot 不覆盖、非 ElUpload 不注入）

* **form-schema:** 扩展常用输入组件与默认配置
  - 新增 `InputPassword`（`ElInput` 语义别名，默认隐藏并可切换）、`InputTextArea`（`ElInput` 语义别名）、`InputTag`、`ColorPicker`、`Mention`、`Rate` 六个内置组件及对应 `xXxx` builder
  - 同步补齐 `Element Plus` 组件导入、快捷名/全名解析、`SchemaNodeFor` 类型推导、props 覆盖与 v-model 写回测试
  - `InputNumber` 纳入内置默认配置，右侧控制器但**不**强制 `min: 0`；ColorPicker/Mention/Rate 不增加业务偏好默认值
  - 回归验证：密码、文本域、标签数组、颜色 `string|null`、提及文本、评分数字均通过 adapter、renderer、XForm 与类型测试

* **form-schema:** 新增 `{{ fn }}` 动态脚本表达式 demo（XFormExpression）
  - 一次覆盖五类挂载位：顶层 `readonly` 表达式（锁定单据整表 view 化）、`node.on.change` 事件表达式、`reaction.hidden` / `reaction.label` 反应式表达式（条件显隐 + 币种联动文案）、`node.permission` 权限三态表达式（admin 编辑 / viewer 只读）
  - 演示 `expressionFunctions` 白名单注入：`pushLog`（沙箱副作用受控出口，日志面板可视化执行）、`toCurrency`（业务格式化不内联进 schema）——并还原 `use-expression.ts` 编译缓存与 `toSafeDto` 净化的真实链路
  - ApiTable 收录「五类挂载位」+「沙箱上下文与安全边界」两张速查表；sidebar 注册「动态脚本表达式」

* **form-schema:** 新增详情数据回填 demo（XFormDetailFill）
  - 模拟订单编辑页标准链路：拉详情 → `Object.assign(model, detail)` 整体写入 → `clearValidate()` 清残留红字 → `resetDirty()` 重拍基线（isDirty 从服务端值起算）
  - 覆盖 6 类联动复杂情况：级联回填时序（区域 options 就绪前显示裸 id，就绪后自动变名称）、hidden 字段回归（隐藏必填不阻塞校验）、只读联动（shipped 即灰）、数组批量回填、dirty 基线管理、AsyncState 三态防御（骨架屏 / Error 重试）
  - 新增 `xform-detail-fill-mock.ts` mock 详情接口（A 已发货 / B 草稿 / FAIL 失败三条路径）；ApiTable 收录「回填要点速查」，sidebar 注册「详情数据回填」


* **form-schema:** 新增 reaction 反应式联动·进阶 demo（XFormReactionAdvanced）
  - XFormReaction 基础 4 场景（debounce / throttle / sync-disabled / sync-hidden）之外补 4 类复杂业务联动
  - ① 计算字段 + `deps` 精确监听：反应式 `_effect` 闭包写 model（qty × price × discount = total），deps 精确监听 3 个字段切断自触发；与现有 XFormReaction 把计数器写到 model 外的 hack 写法形成对比
  - ② 跨字段级联清空：上级 `on.change` 闭包清空下级；下级 `reaction.props` 按上级值查字典动态切 options（省/市/区 + 商品/型号）
  - ③ 反应式 label / props / rules 联动：单个 reaction 节点同时改 label 与 props（注意：use-reaction 是赋值非合并）；`rules` 用 `{{ fn }}` 表达式与 reaction 协同控制动态校验
  - ④ 数组行内嵌 reaction：行内 `deps` 用相对路径（不写 `array.rows.0.qty`），`lodash get` 在行 model 子树自动解析；「含税」切换控制税率字段显隐并参与小计计算
  - 新增 `cascader-data.ts` 静态字典（省/市/区、商品/型号、度量单位、折扣等级），ApiTable 收录「reaction 进阶字段速查」，sidebar 注册「反应式联动·进阶」


* **form-schema:** 新增 reaction.deps 动机 demo（XFormReactionDeps）
  - 与 XFormReactionAdvanced 演示「deps 怎么用」不同，本页专注「deps 为什么用」——三个使用动机对比
  - ① deps 切断无关字段触发：默认 deep watch 整棵 model，distractor.* 任意字段变化都跑 reaction；声明 deps 后仅精确路径触发；观察 runCount 次数差异
  - ② deps 切断循环联动：reaction 函数体写自身依赖字段时，无 deps 会无限循环触发——use-reaction 预算 MAX_CHAIN_PER_FLUSH=50 兜底 console.error；声明 deps 切断自触发
  - ③ deps 路径声明（可读性）：同一段计算逻辑，无 deps 靠函数体内引用追踪（隐式），有 deps 显式列出依赖（推荐：重构安全 + 阅读一目了然）
  - 顶部开关 A/B 模式切换（schema computed 重计算 → XForm 自动 watch 重新注册 reaction，旧 stoppers 清理）
  - ApiTable 收录「reaction.deps 字段速查」，sidebar 注册「反应式联动·deps 动机」


* **form-schema:** 新增跨字段校验 debounce 调度 + 演示 demo
  - 顶层 schema.debounceValidation + 字段级 RuleItem.debounceMs 双层配置：解决密码/确认密码、邮箱/确认邮箱等高频输入场景每键触发校验的视觉干扰
  - use-cross-field-trigger 改造：runner 按 `${target}|${delayMs}` 缓存，0 = 实时同步执行、>0 = lodash.debounce 延迟；async crossValidator（远程查重等）继承本次 debounce
  - 防回归：use-cross-field-trigger.spec.ts +3（字段级 debounceMs / 全局 defaultDebounceMs / 字段覆盖全局）；原 18 个用例全部向后兼容通过
  - 新增 XFormValidationDebounce.vue demo：A 实时模式 / B 全局 500ms / C 字段级覆盖（混合 1000ms+0）三模式对比，counter 可视化连打 6 字符的校验触发次数
  - ApiTable 收录「debounce 字段速查」，sidebar 注册「校验 debounce」


* **form-schema:** 新增全局 disabled / 全局 readonly demo
  - XFormDisabled / XFormFieldPermission 仅演示字段级 disabled / permission；本批补顶层 schema.disabled / 顶层 schema.readonly 的 3 种写法 + 优先级对比
  - XFormGlobalDisabled：顶层 disabled 写法 3 种（字面量 / 函数 / {{ fn }} 表达式）+ RadioGroup 切换模式 + lockAll 开关联动；Card ② 对比字段级 props.disabled 与 permission: hidden 优先级
  - XFormGlobalReadonly：顶层 readonly 写法 3 种（字面量 / 函数 / {{ fn }} 表达式）+ 整表 view 化对比字段级 permission 三态
  - 与 disabled 区别明确写出：disabled 字段仍渲染控件但不可编辑；readonly 字段渲染为纯文本（view 态），跳过校验
  - ApiTable 收录两份速查表，sidebar 注册「全局禁用」「全局只读」


* **form-schema:** P2-3 数组行拖拽排序（array.draggable）
  - `ArrayNodeConfig.draggable: true`：数组行开启 HTML5 拖拽换位——dragstart 记录源行、drop 调 `moveItem(from, to)` 更新 model（默认 false 不改变现有行为；与既有「上移/下移」按钮并存）
  - 复用 H8 的行对象身份 key：拖拽换位后行 DOM 移动而非重挂载
  - `xArray().draggable(flag?)`：builder 补齐 ArrayNodeConfig 字段的链式方法（默认 true 可省参），防回归 builders.spec +4
  - 新增 `XFormArrayDraggable.vue` demo：任务队列拖拽场景、「数据换位身份保持」观察点、model 顺序实时展示；sidebar 注册「数组行拖拽排序」，ApiTable 收录 `array.draggable`
  - 防回归：render-array-node.spec +3（默认无拖拽属性 / drop 调 moveItem / 拖到自身不触发）


* **form-schema:** P2-2 表达式白名单函数表（expressionFunctions）
  - `XFormProps.expressionFunctions`：注册后 `{{ }}` 表达式可直接引用注册名，如 `{ formatDate: fn }` → `{{ (m) => formatDate(m.date) }}`——业务格式化/转换逻辑不必内联进 schema
  - 实现：编译期把注册名注入 `new Function('model', ...names)` 作用域；编译缓存按 `fnsVersion` 失效（函数表变更旧缓存不命中）
  - 与黑名单扫描互补（注册名来自可信应用代码，仍非真正沙箱）；模块级注册多实例共享，scope 销毁自动清空
  - 防回归：use-expression.spec +3（注册可用 / 未注册 ReferenceError / 版本失效重编译）


* **form-schema:** P2-1 整体 readonly 只读模式（顶层 schema 配置）
  - schema 顶层新增 `readonly` 字段（与 disabled/labelPosition 同模式）：true 时所有字段按 view 态纯文本展示（复用 permission: 'view' 渲染链路，不包 formItem、不走校验）
  - 优先级：hidden > readonly(view) > edit；支持字面量 / 函数 / 函数表达式 / reaction 动态求值（computed 追踪 model 自动切换）
  - 字段级只读继续用 `permission: 'view'`（readonly 仅顶层生效，职责不重叠）
  - 防回归：XForm.spec +4（静态只读 / 函数动态切换 / hidden 优先 / 默认不变）


* **form-schema:** el-form 实例级配置统一收敛到顶层 schema（与 labelPosition 同模式）
  - 新增 schema 顶层字段：`labelWidth`（label 宽度）、`scrollToError`（校验失败自动滚动）、`scrollIntoViewOptions`（滚动行为选项）——均仅顶层 schema 生效，数组形式 schema 不生效
  - 调整：`scrollToError` / `scrollIntoViewOptions` 从 XForm props 迁移到 schema 顶层配置（**breaking**：props 写法不再生效，迁移到 schema）；整体 `disabled` 同为顶层 schema 配置
  - `XFormScrollToError` demo 同步改为 schema 顶层配置（schema computed + 开关联动）
  - 防回归：XForm.spec 3 个 scrollToError 用例迁移为 schema 驱动 + 新增 labelWidth 用例
  - 新增 `XFormValidateField.vue` demo：validateField(name) 逐字段校验 + resetFields(names) 部分重置双场景演示（含模拟服务端 422 对比），ApiTable + DocToc 完整结构，sidebar 已注册


* **form-schema:** P1 API 补齐（validateField / 整体 disabled / 部分重置）
  - `XFormExpose.validateField(name)`：透传 el-form 逐字段校验——成功 `true`；校验失败/el-form 未绑定均 `false`（与 `validate()` 风格一致，未绑定时 console.error 不静默通过）
  - 整体禁用：顶层 schema 配置 `disabled`（透传 el-form disabled，与 labelPosition 同模式）——支持字面量/函数/表达式/reaction 动态求值，表单内所有组件一次性置灰
  - `resetFields(names?)`：支持部分重置——透传字段名给 el-form，且只清指定字段的 externalErrors（全量重置行为不变）
  - 防回归：use-form-instance.spec +5、XForm.spec +3（整体禁用生效/默认不变/validateField 集成）


* **form-schema:** 渲染层重构 B-2 —— 字段级组件化（性能核心）
  - 新增 `SchemaField.vue` 字段级渲染容器：`renderToComponent(node)` 从 XForm 模板 render effect 下沉到每个字段自己的 render effect——`get(model)` 追踪收敛到字段粒度，**输入单字段只重渲该字段**（此前任一按键触发全表单 vnode 重建）
  - XForm 模板三分支（column / row / 直排）由 `<component :is>` 改为 `<SchemaField :node :render-fn>`；el-form 的 provide/inject 沿祖先链不受中间组件影响
  - 配套 `optsEpoch` 换代计数器：父级替换 props 引用（model/components/rules 等）时 B4 watch bump，全字段 effect 失效重渲——保住 B-1 的快照同步语义（日常输入不 bump，字段隔离不受影响）
  - 防回归：XForm.spec +1（渲染计数法证明：输入字段 A 时字段 B 渲染计数为 0 增量）


* **XForm 校验失败自动滚动（scrollToError）**
  - 新增 `scrollToError` / `scrollIntoViewOptions` props：透传 element-plus ElForm 原生滚动能力——字段规则失败滚到第一个 `.el-form-item.is-error`；跨字段 crossValidator 失败由 XForm 内部滚动到第一个错误字段（keyPath 末段）
  - 默认 false（与 element-plus 原生一致，不静默改变既有 validate() 行为）
  - 新增 `XFormScrollToError.vue` demo：供应商入库登记长表单（10 字段），必填错误在视口外，开关对比滚动行为
  - 测试：XForm.spec 新增 3 个用例（真实 ElForm 链路 + scrollIntoView polyfill），29/29 通过
* **XForm demo 补充 DocToc 目录导航**（demo 模块）
  - 14 个含 API 表格的 XForm demo 全部接入 DocToc（XFormArray / AsyncOptions / Builder / CrossField / Directives / Dirty / Disabled / Events / Grid / Persist / Reaction / Responsive / SchemaIndex / ServerError + 总览），锚点与 section / ApiTable 一一对应
  - 补齐剩余 10 个 demo 的 ApiTable + DocToc：新增 ruleItems / minimumItems / nestedItems / slotTypeItems / modelWarnItems / largeSchemaItems / invalidComponentItems / reverseCrossItems / asyncValidatorItems 九组 API 数据（XFormFieldPermission 复用 permissionItems）
  - 至此 25 个 XForm demo 全部具备「演示区 + API 表格 + 目录导航」完整结构
* **XForm 栅格布局专项 demo + 原生 HTML 标签支持**
  - 新增 `XFormGrid.vue`：三种栅格配置方式对照（column 统一分配 / row + col.span 自定义列宽 / 布局容器节点分区），同一组字段切换查看布局差异，附栅格配置速查 API 表格
  - `SchemaNode.component` 支持原生 HTML 标签（全小写，如 `'a'` / `'span'` / `'div'`）：渲染层 `resolveComponentFor` 返回字符串标签名直接 h() 渲染，校验层白名单放行，组件名校验仍拦截未知 PascalCase 名（拼写错误）
  - `XFormNested.vue` 改回原生标签演示（链接 / 图标），新增「原生标签」说明
  - 已知布局限制写入 demo 提示：顶层 `column` 与节点级 `col.span` 混用无效（节点被锁进固定 span 的 ElCol），不等宽布局用 `row + col.span`
* **XForm demo 补充与场景贴合改造**（demo 模块）
  - 新增 `XFormEvents.vue`：演示 `beforeChange` 值拦截（同步替换 / Promise reject 跳过更新 / undefined 放行）与 `node.on` 字段事件（函数形式读写 model / `{{ fn }}` 沙箱表达式只读限制），场景为订单录入（订单号自动格式化 + 金额风控拦截 + 备注字数统计）
  - 新增 `XFormDirectives.vue`：演示 `node.directives`（Directive 对象 + value/arg/modifiers）、`componentProps` 全局默认 props（节点级覆盖）、`rules` 命名引用（未命中退化为 required），场景为供应商录入
  - `XFormBase.vue` 场景改为订单查询表单（订单号 / 状态 / 日期区间 / 备注），替换原通用字段
  - `XFormNested.vue` 场景改为用户资料三 Card 分组（基本信息 / 联系方式 / 偏好设置），替换原 field1~field8，样式类名同步 BEM 化
  - `XFormMinimumDemo.vue` 修复 `<style scoped>` + 非 BEM 类名违规（CLAUDE.md §3.3）
  - `XForm.vue` 总览新增「SchemaNode 字段（DSL）」API 表格（补齐 modelProp 等 17 字段简表）
* **form-schema-engine v3**（提升使用体验）
  - **自定义组件类型推导**：`ComponentPropsRegistry` 接口支持 TypeScript module augmentation，消费方扩展后 `SchemaNodeFor<'MyInput'>` 与 builder 可推导自定义组件 props；保留 `PropsByComponent` 别名向后兼容
  - **异步选项数据源**：`SchemaNode.asyncOptions` 支持 Select/Cascader/TreeSelect/Autocomplete 内置远程数据，含 `source/immediate/deps/transform/onError`，deps 变化自动重新请求
  - **dev 模式 UI 错误提示**：`XFormDebugBanner` 组件，右下角悬浮显示 schema 校验错误与安全扫描结果（keyPath + message），可在右下角折叠 / 关闭
  - **`defaultValue` 字段**：schema 节点写 `defaultValue` 自动填充到 model（仅在 model 字段未定义时），无需手动写 `Object.assign(model, defaults)`
  - **fbuilder 链式 API**（`builders.ts`）：`xInput('email').label('邮箱').required().placeholder().defaultValue().build()` 链式构建 schema，降低书写样板代码
  - **最小可运行示例**（`XFormMinimumDemo.vue`）：5 分钟上手 XForm，5 字段表单 + 校验 + 提交反馈
  - **demo 复制 schema 按钮**：3 个复刻 demo（Base/Nested/Reaction）顶部加 "复制 schema" 按钮，一键 `navigator.clipboard.writeText()` 到剪贴板
  - **表单草稿持久化**：`useFormPersist` composable，model 防抖（400ms）自动落盘 + `beforeunload` 同步 flush 刷新兜底；`hasDraft`/`load`/`save`/`clear` 按需恢复与手动补丁；`exclude` 敏感字段剔除（含嵌套路径）；`restoreFilter` 草稿裁剪适配 schema 升级；与 `resetDirty()` 基线衔接 isDirty 从草稿起算
  - **README + 决策指南 + 故障排查**（共 3 个新文档）
    - `src/components/form-schema/README.md`：30 秒上手 + props / 实例方法 / schema 字段 / 链式构建器 / reaction / 决策指南 / 故障排查速查
    - `docs/24-XForm选型决策指南.md`：XForm vs element-plus 原生 vs FormRender 选型决策
    - `docs/25-XForm故障排查表.md`：8 类常见错误速查（输入无反应 / 校验不触发 / 反应式不响应 / directive 不生效 / 栅格不生效 / 样式不对 / 性能问题）
* **docs（XForm 文档重组）**
  - 新增 `docs/24-XForm使用指南.md`：按当前代码逐项核对的完整使用指南（8 个 props / 19 个实例方法 / SchemaNode 25 字段 / 校验双轨（字段规则 + 跨字段 + Zod）/ reaction 调度策略 / 数组节点 / asyncOptions / permission 三态 / 服务端错误映射 / dirty 追踪 / useFormPersist / 22 个链式 builder / SchemaNodeFor 类型推导 / 响应式断点 / 选型决策 / 故障排查 / 22 个 demo 索引）
  - 合并 `docs/26-XForm架构总览.md` + `docs/27-XForm决策记录-ADR.md` → `docs/25-XForm架构与决策记录.md`，修正过时数据：demo 8→22 个、测试 216→371 个；ADR-006（setFieldError 适配 shallowRef）标注已被阶段 3.1 官方 `props.error/validateStatus` 双路径取代
  - 删除旧 `docs/24-XForm选型决策指南.md`、`docs/25-XForm故障排查表.md`（内容并入新的 24 号使用指南；修正过时条目：name 已支持 lodash 路径、`validate()` 返回 `Promise<boolean>` 而非 callback 签名）
* **form-schema-engine v2**（补齐 6 项开源 form-schema 缺失功能 + 重构）
  - `node.beforeChange` 字段粒度拦截（同步返回值替换 / Promise resolve 后更新 / reject 跳过）
  - `node.on` 事件回调（函数 / `{{ (m) => ... }}` 函数表达式）
  - `node.modelProp` 自定义 v-model 属性名
  - `node.col` 子节点 ElCol 栅格
  - `node.hidden` vs `node.ignore` 区分（hidden 创建但 display:none；ignore 完全不创建）
  - `node.directives` 自定义指令（vue withDirectives 包装）
  - `node.formItem` 对象配置（component / props 透传）
  - XForm.vue 重构：从 330 行降至 144 行（-54%），renderToComponentInner 抽到独立 composable `render-schema-node.ts`
* **form-schema-engine**: 新增 `<XForm>` 全局组件，支持动态表单渲染
  - 参考开源 form-schema 渲染核心，用 Element Plus 替换原私有设计系统
  - 用 `new Function` 沙箱替代 `eval`，含 dev 模式关键字黑名单扫描
  - 沿用 element-plus `async-validator` + 可选 zod 顶层校验双轨
  - 支持全量 14 字段 schema DSL（`component/props/on/children/name/label/rules/formItem/modelProp/row/column/col/reaction/directives/slots/ignore/hidden/key`）
  - 实例方法：`getRef` / `getNames` / `validate` / `clearValidate` / `resetFields` / `scrollToField` / `validateWithZod`
  - 命名导出 `validate(schema, opts?)` / `validateWithZod(zodSchema, formData)` / `resolveElComponentName` / `resolveFunctionExpression`
  - 文件清单（9 文件 + 7 spec）：`src/components/form-schema/{types,XForm}.{ts,vue}` + `composables/{use-validate,use-expression,use-reaction,use-schema-renderer}.ts` + `element-plus-adapter.ts` + `index.ts`
  - 测试覆盖：53/55 通过（XForm 在 vitest + jsdom 环境 element-plus 全局注册兼容性有 2 个测试降级；生产环境无影响）
  - **⚠ 安全注意**：`{{ fn }}` 函数表达式经 `toSafeDto` 净化 + dev 模式 `scanForForbidden` 黑名单扫描（覆盖 `window/eval/constructor/__proto__/process/Reflect/Proxy` 等），但**非真正沙箱**——schema 必须来自可信内部配置，禁止 API 动态下发或用户输入

### 🐛 Bug Fixes | 缺陷修复

* **form-schema:** 渲染层重构 B-3 —— identity-preserving clone（渲染层 HIGH 清零，B 阶段收官）
  - `useSchemaRenderer` 的 `cloneDeep` 替换为 `cloneSchema`（基于 `cloneDeepWith`）：不深入 `component` 字段——组件定义对象保持引用身份（此前每次 schema 重建都深克隆组件对象，Vue 视为不同组件导致整字段 remount）
  - 与 B-1 稳定 key 配合：schema 整体替换（如动态增删字段）时同 key 节点走 patch 而非 remount
  - 防回归：use-schema-renderer.spec +2（component/formItem.component 身份保持 + 其余字段仍深克隆）、XForm.spec +1（setProps 加字段后既有字段 setup 计数不变）


* **form-schema:** 渲染层重构 B-1（key 稳定 + props 快照同步）
  - 顶层三处 v-for 由 `:key="i"`（index）改为 `node.key ?? node.name ?? i`——reaction 切换 ignore/hidden 导致节点顺序变化时不再因索引漂移重挂载（焦点丢失）
  - **B4 快照断裂**：`useRenderSchemaNode` 的 opts 提取为 `renderOpts` 变量 + watch 同步 `props.model/components/rules/beforeChange/componentProps` 最新引用——父级替换 model 引用后渲染绑定不再静默失效（render 闭包统一 opts.xxx 惰性读取，无需重建）
  - 防回归：XForm.spec +2（源码断言禁 index key / setProps 替换 model 绑定跟随）


* **form-schema:** HIGH 批次 A' 修复（H2/H3/H10，非渲染层 HIGH 清零）
  - **H2 校验跑旧规则**：`validateForm`/`validateDetail` 的 `runCrossFieldValidation` 由 `props.schema`（原始快照）改为 `reactiveSchema.value`——reaction 动态改写的 crossValidator 规则在表单级校验中真正生效
  - **H3 异步 crossValidator 竞态**：双路径加每字段序号令牌——`triggerCrossFieldValidator`（blur/change 路径）与 `useCrossFieldTrigger.run`（反向兜底路径）；连续触发时旧 Promise 后返回直接丢弃（同步结论也会让在途旧 Promise 失效）
  - **H10 builders 丢命名规则**：`required()` 对字符串规则（命名引用）由整体覆盖改为保留引用并追加 required
  - 防回归：builders.spec +3、use-cross-field-trigger.spec +1、XForm.spec +2（reaction 改写规则生效 / 连续 focusout 竞态丢弃）


* **form-schema:** MEDIUM 批次 A3 状态与生命周期修复（③⑥，MEDIUM 批次收官）
  - **③ persist 草稿污染**：`useFormPersist` 新增 `schemaVersion` 选项——草稿写版本信封 `{ __v, data }`，版本不匹配/无信封的旧草稿 load 时自动丢弃（防 schema 升级后多余 key 污染 model）；`load()` 由 `Object.assign` 浅合并改为深合并——嵌套对象逐层合并保留 schema 新增字段默认值，数组/原始值整体替换（防按索引合并残留旧尾项）
  - **⑥ guardField watcher 泄漏**：`useFormInstance` 路径 B 守护在 watch 回调内创建的 watcher 脱离 setup effect scope（组件卸载后仍存活）——收集 stop 句柄，`onScopeDispose` 统一清理（`getCurrentScope` 守卫裸调用）
  - 防回归：use-form-persist.spec +6（版本匹配/不匹配/无信封/save 信封/深合并保留默认值/数组整体替换）、use-form-instance.spec +1（scope 销毁后不再纠正）
  - 附带修复 demo：`XFormPersist` 的 `onRestore` 忽略 `load()` 返回值（版本不匹配丢弃草稿时用户看到"恢复成功"假象）——恢复失败时明确提示「草稿已失效，已自动清除」；移除验证实验残留的 `schemaVersion: 1` 配置


* **form-schema:** MEDIUM 批次 A2 竞态与覆盖修复（②⑤⑨）
  - **② async-options 竞态**：`useAsyncOptions` 加序号令牌——deps 快变时多个 in-flight 请求乱序返回，旧响应不再覆盖新数据；`stop()` 同步使在途响应失效
  - **⑨ 字符串规则 crossValidator 漏执行**：`runCrossFieldValidation` 新增 `namedRules` 参数并下穿整个 traverse 链——命名规则里的 crossValidator 在表单级校验中不再被跳过；XForm 4 处调用点透传 `props.rules`
  - **⑤ dependsOnMap 覆盖**：同一 target 挂多条 cross rule 时 deps 合并去重（此前后者 `set` 整条覆盖前者）
  - 防回归：use-async-options.spec +2（乱序丢弃 / stop 失效）、use-validate.spec +2（命名规则执行 / 向后兼容）、use-schema-index.spec +1（deps 合并）


* **form-schema:** MEDIUM 批次 A1 健壮性修复（①④⑦⑧）
  - 附带修复 demo：`XFormFieldPermission` 的「检查 DOM」按钮误报——检查范围从 `document.body` 收窄到 XForm 容器（页面介绍/API 表格/源码展示均含字段名文本，旧实现恒真误报 hidden 失败）
  - **① 权限求值崩溃**：`use-field-permission` 的函数/表达式/resolver 求值全程 try/catch——此前权限函数抛错会在渲染期炸掉整表单；现降级为 edit + console.error
  - **④ 未知规则静默降级**：`compileRules` 对未注册的命名字符串规则 console.error 告警（此前拼写错误静默变 `{ required: true }`，排障困难）；`rules: 'required'` 简写为文档化行为，特判静默不告警
  - **⑦ resize 无节流**：`useCurrentBreakpoint` 的 resize 监听改 throttle 100ms（挂载首次仍同步），卸载时 `cancel()` 清 trailing
  - **⑧ trigger 类型笔误**：`RuleItem.trigger` 由 `(string|string[])[]`（允许嵌套数组）更正为 `string | string[]`；`matchTrigger` 用 `flat()` 兼容存量嵌套写法
  - 防回归：use-field-permission.spec 翻转 1 + 新增 1、render-schema-node.spec +2、use-current-breakpoint.spec 重写 +2、match-trigger.spec +2


* **form-schema:** 文档与 API 表面补齐（收官）
  - README 修正：`validate` 误写为回调签名（实为 `Promise<boolean>`）；props 表补齐 `zodSchema/scrollToError/scrollIntoViewOptions/componentProps`；实例方法清单补齐 18 个（新增 validateDetail/setFieldError/setFieldValidating/validateFromServer/addItem/removeItem/moveItem/isDirty 系）
  - README schema 字段表：标题「14 个」更正为 25 个，补齐 asyncOptions/kind/array/disabled/permission/labelPosition 六行；内置组件数「18 个」更正为 20 个；示例路由 `/demo/x-form-*` 更正为实际的 `/demo/xform-*`
  - README reaction 章节补充 `deps` 精确监听与循环预算说明
  - `index.ts` 补齐导出：具名 `XForm` 组件、`builders` 全部 21 个工厂函数、`useFormDirty`、`useSchemaIndex`/`buildIndex` 及相关类型
  - 注释勘误：types.ts「全量 17 字段」→ 25；builders.ts「18 个 builder 类」→ 19
  - 防回归：index.spec 新增导出完备性断言
* **form-schema:** 状态正确性专项修复（H4 / H8 / H9 / M1 / M2）
  - **H4 dirty 漏检**：`useFormDirty` 快照改 `cloneDeep`——此前存嵌套对象的活 reactive 引用，原位修改（`model.addr.city = x`）时快照同步变化，`isDirty` 恒漏检
  - **M2 validate 静默通过**：`elFormRef` 未绑定时 `validateForm` 由静默 `resolve(true)` 改为 `resolve(false)` + console.error（配置/时序错误不再伪装成校验通过）
  - **M1 clearValidate 误伤**：数组操作由无参 `clearValidate()`（清全表单）改为按行精确清理——`addItem` 末尾追加无索引位移，不再清理任何校验态（既有红字保留）；`removeItem`/`moveItem` 只清索引发生位移的行（被删/移动区间及之后），区间前行红字保留；找不到匹配字段时守卫不调用（element-plus `filterFields` 对空数组的语义是清全部）；走包装方法同步清理 externalErrors；新增 `extractFieldName` 辅助函数
  - **H9 hidden 校验语义**：hidden 字段的 ElFormItem 剥离 rules（保留 prop 注册）——隐藏必填项不再阻塞 validate，scrollToError 不再滚到 display:none 元素；hidden ≠ ignore 语义不变（值仍保留在 model 中提交）
  - **H8 数组行 key**：行容器 key 与行内 form-item key 均由位置索引改为按行对象身份派生——`renderArrayNode` 用模块级 WeakMap 给行对象分配稳定 ID；`rewriteNamePath` 新增 `keyPrefix` 参数把行身份注入 itemSchema 子树的 `node.key`；form-item 的 vnode key 优先级翻转为 `node.key ?? node.name`（name 保留作校验路径）。删除/移动行后剩余行 DOM 元素实例保持不变（不再重挂载、焦点/内部状态不丢失）；原始值行退回 index
  - 防回归：use-form-dirty.spec +1（嵌套原位修改）、use-form-instance.spec 翻转 1 + 新增 3（子树清理范围 / 区间外保留 / 空匹配守卫）、render-array-node.spec +4（删行/移行 key 稳定 + keyPrefix 注入 + 显式 key 优先）、render-schema-node.spec +2（form-item key 优先级）、XForm.spec +3（hidden 必填不阻塞 / 值保留 / 可见字段不受影响）
  - demo 场景补齐：XFormDirty 新增 2 个嵌套字段（address.city / address.street，H4 手动回归）；XFormReaction 新增「需要发票 → 发票抬头 hidden + 必填」场景（H9 手动回归）
* **form-schema:** 安全扫描 `scanForForbidden` 覆盖补全（H1）
  - 根因：仅扫描 `on`/`reaction` 第一层字符串值——`disabled`/`permission`（同为函数表达式字段）不扫、`array.itemSchema` 子树不递归、`reaction.props.x` 嵌套字符串逃逸，三条绕过路径
  - 修复：扫描字段补齐 `disabled`/`permission`；值扫描改为任意深度递归（含数组/嵌套对象，WeakSet 防循环引用）；`traverse` 递归 `array.itemSchema`
  - 黑名单扩充：`self/top/parent/frames/localStorage/sessionStorage/indexedDB/import/require/alert/prompt/confirm`；有意不收录 `open/location/navigator`（与常见表单字段同名，dev 诊断误报噪声大于收益）
  - 防回归：use-scan-forbidden.spec 新增 6 个用例（permission/disabled/嵌套 reaction/itemSchema/新关键字/字段名不误报）
* **form-schema:** reaction 联动性能与死循环治理（H5）
  - 新增 `reaction.deps: string[]`（可选，向后兼容）：声明后仅精确 watch 依赖路径，不再 deep watch 整棵 model——大表单 N 字段 × M 联动时消除全量监听开销；未声明保持旧行为
  - 新增循环联动执行预算：单 flush 内 reaction 最多执行 50 次（刻意低于 Vue 调度器递归上限 100，抢先拦截避免 "Maximum recursive updates exceeded" 未处理异常），超限 console.error 告警并跳过，把"页面卡死"降级为"可诊断错误"
  - 表达式编译缓存：`resolveFunctionExpression` 按字符串缓存 `new Function` 结果（上限 500，含失败结果），消除渲染/联动期的重复编译
  - `applyReactionFields` 值未变化时跳过写入（isEqual 比较），消除多余响应式通知
  - 防回归：use-reaction.spec +3（deps 精确监听 / 未声明保持旧行为 / 循环预算兜底）、use-expression.spec +2（缓存命中同实例 / 非法表达式只报错一次）、apply-reaction-fields.spec +3（deps 元字段不写入 / 同值跳过 / 同值保留引用）
* **form-schema:** 修复 `defaultValue` 生产环境静默失效（C1）
  - 根因：`applyDefaults` 与 schema 校验、安全扫描同处 `showDebugBanner`（`import.meta.env.DEV`）门控的 watch 内——prod 构建下整个 watch 不注册，`defaultValue` 永不填充
  - 修复：`applyDefaults` 拆出为独立 watcher（全环境生效）；schema 校验 + `scanForForbidden` 安全扫描保留在 dev 调试分支（纯诊断，无生产副作用）
  - 防回归：XForm.spec 新增 3 个用例（defaultValue 填充 / 已有值不覆盖 / 源码级断言 applyDefaults 不在调试分支内）
* **form-schema:** 修复 `trigger:'blur'` 的 crossValidator 永不触发（C2）
  - 根因：失焦触发器以 `onBlur` 挂在 ElFormItem 根 div 上，而原生 `blur` 事件不冒泡——监听器从未被触发，属死代码
  - 修复：改用可冒泡的 `focusout` 承载 blur 语义（`onFocusout`），schema 侧的 `trigger` 名称仍按 `'blur'` 上报，用户配置无感
  - 防回归：XForm.spec 新增真实 ElForm 链路集成用例（原生冒泡 FocusEvent 触发 crossValidator）；render-schema-node.spec 5 个监听器断言同步改为 `onFocusout`
* **form-schema:** 修复 `applyDirectives` 指令完全失效的问题
  - 根因：`withDirectives(vnode, {...})` 第二参数误传单个对象——Vue 内部按 `.length` 遍历 + 数组元组解构 `[dir, value, arg, modifiers]`，对象无 `length` 被静默跳过（不抛错不 warn），指令 `mounted` 等钩子从未执行
  - 修复：改为按元组数组 `[[dir, value, arg, modifiers]]` 传参；字符串指令名因 `XFormProps.directives` 注册表未接线，暂时跳过（仅支持直接传 Directive 对象）
  - 防回归：`apply-directives.spec.ts` 新增真实渲染测试（mounted 钩子真实执行 + binding 的 value/arg/modifiers 透传），8/8 通过
  - 附带修复 demo：`XFormDirectives.vue` 的 audit 指令改用内联 box-shadow 标橙——CSS 变量方案会被 element-plus `.el-input` 组件根变量定义重置

### ⚠ BREAKING CHANGES

* **auth:** 认证体系改为 httpOnly cookie 模式（2026-08-12 架构改造）
  - 凭证 token 由后端 `Set-Cookie: HttpOnly` 下发，前端 JS 不再读取/存储 token；
    登录态改为 sessionStorage 登录标记（`auth`）供守卫同步判断
  - `http.ts` 删除 Bearer header 注入，axios 实例启用 `withCredentials`；
    跨域后端 CORS 需配 `Access-Control-Allow-Credentials`
  - `token-refresh.ts` 契约变更：`getValidToken(): Promise<string>` →
    `refreshSession(): Promise<void>`；`extractToken`/`fetchToken` 配置项移除，
    改为 `refresh` 自定义函数
  - `api/modules/auth.ts`：`LoginResult` 不再包含 `token` 字段
  - `store/modules/user.ts`：`token` 字段改为 `authenticated`（boolean）；
    `logout()` 改乐观退出（先清本地再 fire-and-forget 通知后端，后端失败不再抛错）；
    新增 `resetLocalState()`；跳转职责上移至 `useLogout`/守卫（斩断 store→router 循环依赖）
  - `utils/storage.ts`：删除 `clearCookies` 导出与 token cookie 特殊通路
    （HttpOnly cookie 前端不可删，由后端 `Max-Age=0` 清除）
* **styles:** Element Plus 样式改按需加载（`ElementPlusResolver({ importStyle: 'css' })`），
  `main.ts` 不再全量引入 `element-plus/dist/index.css`（gzip 省 ~15KB）；
  `ElMessage`/`ElMessageBox` 等 API 禁止显式 import，由 unplugin-auto-import 注入并自动带样式

### ✨ Features | 新特性

* **test:** 新增 guards/{login,visibility,permission,composable,remote-menu} 与
  plugins/{errorHandler,webVitals} 共 7 个 spec；覆盖率 45%→52%，
  门槛从 40/35/40/40 提升至 50/45/48/50
* **types:** 环境变量类型声明归并至 `src/types/env.d.ts` 单一事实源（补全 VITE_BEM_PREFIX）
* **http:** 401 重试流程新增测试覆盖（refresh 成功重发/失败登出/refresh 端点防循环）

### 🐛 Bug Fixes | 缺陷修复

* **auth:** Login.vue 从 548 行降至 137 行（样式抽离 `modules/auth/styles/login.scss`
  与 `login-bg.scss`，符合单文件行数铁律）
* **http:** `performLogout` 硬编码 `window.location.href='/login'` 改为动态 import router
  跳转，修复子路径部署（VITE_BASE）下 404 的问题
* **router:** 修复 remote 菜单模式下首页仅渲染布局、内容组件空白的问题：
  `ensureRemoteMenuLoaded` 注入远程路由时，vue-router addRoute 的同名替换规则会
  把本地"布局+children"嵌套结构中的子路由从 matcher 移除，导致 layout 内层
  RouterView 无匹配。改为同名路由不替换（本地 routes/index.ts 是结构单一事实源），
  仅合并远程 meta（后端 hidden → visible:false 控制保留），远程独有路由才注入
* **home:** 修复数据总览卡片图标裂图：`OverviewSection` 的 `cardIconPath` 返回
  运行时相对路径字符串（`'../../images/x.png'`），动态 :src 不走 vite 资源管线，
  浏览器按页面 URL 解析在子路径部署下必 404。改为静态 import 图片资源
  （构建期生成带 hash 的 URL，base 自动适配）
* **app:** 修复登录页点击登录时闪屏：App.vue 的 AsyncState 在远程菜单加载期间
  无差别把整个 RouterView 替换成骨架屏，页面间跳转时当前页（登录页）被瞬间
  替换造成闪白。改为仅当当前导航无任何路由匹配（route.matched 为空，即首次
  进入等待远程路由注入的场景）时才显示骨架屏，跳转中保持当前页面
* **login:** 修复 hard refresh 后守卫直接放行导致 profile 为空的问题
  （改为有标记且 profile 缺失时先 fetchProfile 校验凭证）
* **html:** index.html 默认标题改为「企业中后台管理」并补 `lang="zh-CN"`
* **docs:** 修复 storage.ts 与实际代码不符的腐烂注释；
  模块骨架文档对齐现实（CLAUDE.md/docs/08 改为"按需包含"；docs/16 升级 v2.0）
* **chore:** 删除 lint-staged 验证遗留文件 `src/__test_lint_staged.ts`
* **ci:** 修复 CI 五道门禁（Lint/TypeCheck/Test/CheckRoutes/Build）永不触发：
  workflow 分支过滤 `main` → `[master, develop]`，与仓库实际默认分支一致
  （2026-08-12 架构审查发现，仓库无 main 分支）
* **docs:** README 技术选型表 js-cookie 定位修正——httpOnly 改造后 src 已无引用，
  重新定位为「仅非敏感 cookie 偏好场景预留，严禁存凭证」并标注安全边界；
  `remote-menu.ts` 远程 meta 合并处补充 vue-router 升级回归验证 + 非响应式警告注释

### ♻ Refactor | 重构

* **layouts:** 落实「layout 自包含」架构原则（2026-08-19）
  - `Header.vue` / `Sidebar.vue` 从 `src/components/layout/` 迁移到
    `src/layouts/default/components/`（layout 私有）
  - 删除整个 `src/components/layout/` 目录（避免被 unplugin-vue-components
    注册为全局组件污染命名空间；`components.d.ts` 自动移除 Header/Sidebar 声明）
  - `src/layouts/default/index.vue` import 路径改为相对路径 `./components/*`
  - CLAUDE.md §1.2 模块边界铁律新增 `layouts/<m>/` 行（自包含白名单 +
    禁止跨目录到 `@/components/`）；§2.1 现状快照同步收紧 components/ 职责

### ✨ Features | 新特性

* **components:** 全量 BEM 命名空间改造（CLAUDE.md §3 新增规范）

  - 41 个 `.vue` 文件统一为 sass 插值写法：根选择器
    `.#{$BEM_PREFIX}-<kebab-case>` + `&__elem` / `&--mod` 嵌套；模板 class 全部走
    `bem.b()` / `bem.e()` / `bem.em()` / `bem.is()` 拼装；`createNamespace`
    由 `unplugin-auto-import` 自动注入，禁止 `import` 任何来源
  - 配套 CLAUDE.md §3 新增「组件 BEM 编写规范（强约束）」4 小节
    （§3.1 完整模板、§3.2 强制约定 8 条、§3.3 反模式 6 条、§3.4 验证机制）

### 🐛 Bug Fixes | 缺陷修复

* **styles:** 删除全部 22 处 `:deep()` 伪类（依赖 BEM 命名空间隔离穿透 element-plus）
  - `login.scss` 12 处、`PortalNav.vue` 8 处、`PortalHeader.vue` 1 处、`Header.vue` 1 处
  - 根因：`:deep()` 是 Vue scoped 专用穿透伪类，按 §3 去掉 `scoped` 后失效，
    浏览器忽略导致 element-plus 表单/导航样式整片丢失
* **components:** `createNamespace` 大小写统一——21 个文件由 PascalCase
  (`'OrdersList'`、`'HomeFooter'` 等) 改为 kebab-case (`'orders-list'`、`'home-footer'`)
  - 根因：HTML class 大小写敏感，`vv-OrdersList` 与 sass 编译产物 `.vv-orders-list`
    不匹配 → 整片样式失效
  - 转换规则：PascalCase 每个大写字母前加 `-` 后全小写
* **app:** 恢复 `App.vue` 防御性三态（`ErrorBoundary` + `AsyncState` +
  `Transition` + `showRemoteMenuLoading` 计算属性）—— BEM 改造时被简化
  过度删除，违反 §1.4 防御性 UI 约束
* **home:** 修复 `OverviewSection` 2+3 卡片网格布局被破坏
  - 根因：`bem.m('first')` 生成 block modifier `vv-overview-section--first`，
    与 sass 嵌套 `&__row { &--first { ... } }` 展开的 element modifier
    `.vv-overview-section__row--first` 不匹配 → grid-template-columns 未生效
  - 修复：`bem.m()` → `bem.em('row', 'xxx')`（4 处）
* **docs:** CLAUDE.md §3 新增反模式 #6（PascalCase createNamespace）
  + §3.2 第 2 条强调"kebab-case 与 sass 根选择器严格对齐"

### 🐛 Bug Fixes | 缺陷修复（历史）

* **commitlint:** 补全常见规则错误详情的中文翻译，避免提交校验失败时混杂英文信息

## 1.0.0 (2026-07-27)

### ⚠ BREAKING CHANGES

* **auth:** 401处理不再自动跳转登录页和清除token，
  改由request<T>决定是刷新还是登出。

  feat(http): 实现token自动刷新重试机制

  - 添加token-refresh模块，支持并发去重的token刷新
  - request<T>自动检测401错误并尝试刷新token后重试
  - 支持配置化refresh端点和响应解析逻辑
  - 保留原有缓存和分页适配功能

  test(token-refresh): 添加完整的刷新功能测试

  包含基础刷新、失败处理、并发去重和自定义配置的测试用例
* **webVitals:** 开发环境下的 Web Vitals 输出格式已更改
* **styles:** element-overwrite.scss已重命名为theme-vars.scss并移至子目录

### ✨ Features | 新特性

* 集成 web-vitals 性能采集 + 注释预留上报端点 ([9509c98](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/9509c98bc2a55905ab1554c5ed11f3f634522dc5))
* 添加流式请求和数据验证功能 ([5c9d0f6](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5c9d0f637a61fa9112bc5703bd910e2e7f72c51c))
* 添加项目仓库配置 ([52fe04e](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/52fe04e2db48380f7c7858de9ab5a116c2e7f495))
* 添加CI工作流配置和API文档规范 ([dd7233c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/dd7233caeffae0902fb42b1f7f57b1ed90949b05))
* 添加demo模块和代码高亮功能 ([3a570df](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/3a570df6389d55d372db195618b08d01b3e48749))
* 新增多页签功能和字典系统 ([c01671f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/c01671fa668e27a7c1ace197f7e626592d33132a))
* 新增模块脚手架和新手指引文档 ([f0c5c48](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/f0c5c4830b9595ca40de052604b805f97f156ea7))
* **api:** 请求层重构增加取消、重试、去重功能 ([9c297f1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/9c297f15fb7a5a5747eec5f4c5183737a709beaf))
* **api:** 数据总览 API 抽象层 ([577135c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/577135c767851b3dffe921c5271324658de136c8))
* **api:** 添加分页适配器功能支持 ([e5db6fe](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e5db6fe3693ffb65fd33754bf455d7bd9a86235f))
* **api:** 添加GET请求内存缓存和请求ID追踪功能 ([056e8f7](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/056e8f7e039f4179253e9eb13a4bca05a2e8d671))
* **api:** 添加HTTP状态码错误消息处理功能 ([5ba3bf6](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5ba3bf6f649a5ece329a368e1fee38bbb56876f3))
* **api:** 统一业务码为200并完善分页适配器 ([89e1194](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/89e1194e9e2b5131189519c34541e15fbcf585af))
* **api:** page-adapter 支持自定义字段映射配置 ([a267ad4](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a267ad49e849b536b4b590c39dfabd2c997772eb))
* **auth:** 添加token刷新接口模拟 ([415bc61](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/415bc61aa492a047bd800ee20df038a2db920679))
* **auth:** 重构退出登录流程支持全局请求取消和悲观语义 ([cba82bf](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/cba82bf0aa702064b08ba8327002ef296325caa8))
* **auto-changelog:** 新增 .auto-changelog.json 配置 ([255efa3](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/255efa354cfe7b3c0e116a085087eb612ab88f96))
* **bem:** 新增BEM样式规范及相关工具链 ([4fd7ca7](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/4fd7ca79c0518c7bd786b6ab54fbe452c5c913c1))
* **build:** 添加 TypeScript 路径别名配置 ([913ae55](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/913ae552df448448577fe6e2e1b17264afb689aa))
* **build:** 添加一站式提交推送命令 pnpm push ([15a7ca8](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/15a7ca8f801a8f28460d809b8a14756f5ec35360))
* **build:** 引入 rollup-plugin-visualizer 分析打包体积 ([f093a9f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/f093a9f5b5063f033b99057a2d3bbaebe9803fb3))
* **components:** 实现 isExcluded / resolveComponentName 纯函数 ([27b1fae](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/27b1fae1bd0837d384b1c0b08948f76d39014326))
* **components:** 实现 Vue 插件扫描并注册 common 下的所有组件 ([d874bd1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d874bd1b8ddf2a5ff29fc13b06822d66a50ddb27))
* **components:** 添加组件注册统计和跳过详情日志 ([3a072ad](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/3a072ad5b74dcf1e0cd244d5ae48819d6c850734))
* **config:** 添加存储命名空间配置 ([47c41fc](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/47c41fce405f208945fada752e62c9ae3b7ed2c6))
* **core:** 修改应用标题并支持动态API基础URL ([e89f832](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e89f83230c3f873e2a8bebc71981d19eaa68e6d3))
* **deps:** 引入 normalize.css 与 dayjs，统一浏览器基线 ([70440cb](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/70440cb5ac89322fada487a85d8fcc064c8b59a5))
* **deps:** 注入 release-it@21 + auto-changelog@2 ([7f090bb](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/7f090bbe3ba84e6353bcbd89bb5392bd02695693))
* **directives:** 添加防抖工具函数测试并增强inputDebounce兼容性 ([47f82d7](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/47f82d7acfc2c4b077fd3107af3499cefb68b87c))
* **errorHandler:** 支持 safeAsync 工具集成统一错误上报 ([dd2c9ee](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/dd2c9eeccdddbae113431b155a5b1eba8e99de86))
* **eslint:** 业务目录强制使用 useAppRouter 与 useRequest 封装 ([5d0c170](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5d0c1709417e4df4a227c79def5db32239a2a5ed))
* **husky:** 添加路由一致性检查到 pre-commit 钩子 ([5dedaff](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5dedaff33afa01c6dfff08a0c0a5adc5cef5a258))
* **main:** 接入 GlobalComponents 插件，自动注册 common 下的组件 ([02b3648](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/02b3648ca4f15bdc77ab0b98d9bbbef61270d711))
* **mock:** 数据总览 mock 接口 ([5044488](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5044488bf30276ed1da169afd8859e6d3d0aaad0))
* **plugins:** 新增 src/plugins/ 模块 + errorHandler 插件 ([d61892c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d61892c99806305eea7f2d87ff732ac216e815e9))
* **portal-config:** 定义 portal 配置项类型 ([10ce7a8](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/10ce7a8ce96fb1895385adbd37fc0b3f86f8c018))
* **portal-config:** 配置 footer 数据 ([433e869](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/433e8693286d0a8b7f3b22028b61eb816a85c04f))
* **portal-config:** 配置 hero 区数据 ([d02d2a3](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d02d2a396f201be77327443974a57a4e9bac9add))
* **portal-config:** 配置顶部横向导航 ([04336c9](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/04336c92abf95731b7d37b200ec4f2e04c39738c))
* **portal-home:** date-greeting 问候语 + 日期 ([b6530ee](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/b6530ee22850729b38d44e26d8b100b1e85b8d9f))
* **portal-home:** hero-section 大标题+标语+搜索 ([a81f93b](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a81f93bd92a78537d865926cda1e240cc1d9bfe3))
* **portal-home:** home/Index.vue 组合页面 ([71d4403](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/71d4403548f1779e430dd75bc5b9025b615d6129))
* **portal-home:** hot-search-tags 热门搜索标签 ([057569b](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/057569bf6f75b3b5cb6498f41496ef1bf40b5fa4))
* **portal-home:** overview-card 单张数据卡片 ([487d9a6](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/487d9a6bc000b2b0f75bcb8afb8c412779f0cf53))
* **portal-home:** overview-card-skeleton 加载骨架 ([fcc44a2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/fcc44a2b0524a934b40ccd4d3163364f77d5cc8c))
* **portal-home:** overview-empty-state 空态 ([91d7561](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/91d7561e9e12c32d2c92465e83d05a9954fe4449))
* **portal-home:** overview-error-state 错误态 ([7dd6286](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/7dd62869de99566c5135de45c7e0cdf73b8ad2d2))
* **portal-home:** overview-metric-row 单行指标 ([2c63560](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/2c6356072acd5f6498c7c68ee9ec770f4ab19096))
* **portal-home:** overview-section 数据总览容器（含 4 项三态测试） ([1180925](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/11809258c047102d5acf7f591a1365b3890e67f7))
* **portal-home:** search-bar 搜索栏（含 4 项测试） ([188d1ee](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/188d1eeb97079c5fb5af679374211c8fab0393a4))
* **portal-layout:** portal-ai-widget 占位浮窗 ([d6e3917](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d6e391700369ff6212ccac9c6ae9d028fd1e4821))
* **portal-layout:** portal-footer 系统链接 + 版权 ([0780227](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/07802273f89fbf8ae03173018f7744a33f96fa18))
* **portal-layout:** portal-header-nav 横向导航 + 用户信息卡 ([ec45ae2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/ec45ae2bf836039b6ae1e10a74909e998c5403cd))
* **portal-layout:** portal-layout 壳（顶部+nav+slot+footer+ai 浮窗） ([f17ff72](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/f17ff7253c47fb16ee68384f1cc637f74e94c06b))
* **portal-layout:** portal-top-bar 顶部蓝 banner ([19b14b9](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/19b14b9ea06b6f039be89cc3cce81475d041b3e0))
* **portal-store:** 数据总览 Pinia store（含 5 项状态机测试） ([28a2422](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/28a24225a1049909f21a63a2d21349aa824e9eaa))
* **portal-styles:** 定义 portal 视觉 token ([de40ead](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/de40eadb0dbfeecd4bb08d78ebed0f90a1c72039))
* **portal-types:** 定义数据总览 DTO 类型 ([53295dc](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/53295dcd7a3281015ce59738af995b9a5fab3345))
* **release-it:** 替换 auto-changelog 为 conventional-changelog 插件 ([239808f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/239808fcff4e1aefae27db3fca8e5e2e369797a9))
* **release-it:** 新增 .release-it.json 配置 ([7ac44da](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/7ac44daa028270f1419dd2443bc0b52a1bdbcdb6))
* **router:** 路由模块重构支持自动注册和远程菜单加载 ([db1c05b](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/db1c05b7d776dca12ed7f1046cdb08617fcd00f0))
* **router:** 实现多级菜单父子路由结构 ([70bce7c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/70bce7cdc72898af885010de99543d9fdd473923))
* **router:** 添加根路径重定向至仪表盘 ([a2034ce](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a2034cea352e5ee577583f8f0786e12804647fe6))
* **router:** 添加路由配置一致性校验工具和改进错误处理 ([2df3db5](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/2df3db5936e19010c089c1a06b4fde0546208c20))
* **router:** 完成路由模块13项优化改进 ([272e413](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/272e413736366caf1284583289b09e84d905c350))
* **scripts:** 添加 pnpm release / pnpm release:dry 脚本 ([3939021](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/3939021a1648da80c84c253490d56ca9b8e0f575))
* **styles:** 新增主题系统并重构样式文件结构 ([e208180](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e2081805ba15e0f0ba2a44c707e0a7659cdcfe06))
* **styles:** 新增Element Plus样式覆盖目录结构 ([a06f8c6](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a06f8c6fcd8d83e8b940156861beef815a0d2507))
* **theme:** 添加主题切换功能和CSS变量体系 ([97ce7b6](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/97ce7b674da93944ef0a057fa743347e2460cfab))
* **useRequest:** 支持 watch 选项和请求取消功能 ([443a865](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/443a8655d7d0ad66281e0c6043de97db18f1b9ef))
* **utils:** 添加控制台badge徽章工具函数 ([45d0258](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/45d025849ceb81103565ff600610fe41075b0d35))
* **utils:** 重写 storage.ts 为 Local/Session/clearCookies 三件套 ([f30e1e7](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/f30e1e7f4f03261d3f99bd19c0ddf52831d86cb7))
* **utils:** dayjs 通用封装，基础格式化 + 12 个单测 ([caf4ed3](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/caf4ed3dcaf0330a81942049c79383e338dc53a6))
* **vite:** 配置手动代码分割优化打包策略 ([0187403](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/0187403d555e73e9096ba856eafd792d888ba45e))
* **webVitals:** 使用控制台徽章优化开发环境性能指标展示 ([8295cbc](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/8295cbc7faf1bd819087395377f75f8642b9e5eb))

### 🐛 Bug Fixes | Bug 修复

* **api:** 统一 url 前缀由 baseURL 管理，修复 /api/api 重复 ([c4eeadf](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/c4eeadf17a7ec0853e3f723e77fe0983b9ce3dcf))
* **directives:** 修复指令加载时因.spec.ts文件导致的运行时崩溃 ([61f166c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/61f166cacb0a385519a5aed8010eea86c475edec))
* **layout:** 修复布局组件样式问题并更新类型定义 ([e7a6cca](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e7a6cca0d16ff4b978af07084f55b58bd384e3ad))
* **mock:** 远程菜单 mock 中 Dashboard 同步改为 Home ([dd45ed2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/dd45ed2902aef3cce2ebf870b936ea9edf09da7b))
* **mock:** mock response 改同步函数，修复全部返回 {} ([599b5a1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/599b5a1777ead0912038ee557da09f4510b01197))
* **release-it:** requireBranch 改回 wildcard-match 数组 ([4463ab2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/4463ab2539c3e3e4e8ca52b2479ea12337fb6717))
* **release-it:** requireBranch 改用 wildcard-match 兼容字符串 ([f778838](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/f778838bde5d6d60ef66e7065901be6695894f0d))
* **scss:** 修 Dart Sass 1.78+ new-global deprecation 警告 ([964446c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/964446c034b5bcbf2a5b40408b1350af561f9277))
* **utils:** 修 storage 6 项缺陷（命名空间隔离 + 安全 + 健壮性） ([2e44389](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/2e4438971814e04eade4f7faf751a7835008cc09))
* **web-vitals:** 徽章 value 补全评级文字（修复仅靠颜色反馈） ([a276446](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a2764468b8141341c357eabfff3964321a2e5ac4))

### 📦 Chores | 其余更新

* 初始化 Vue 3 + Vite 8 + TS 6 脚手架 v1.0.0 ([db06d2b](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/db06d2bc129d481b4a4c8fe28c4e10edfcdc2383))
* 集成 commitlint + commitizen 严格 Angular 规范校验 ([5086ff1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5086ff199482325b7d6d4c8e970ef15d82729cc2))
* 集成 ESLint 10 + Prettier 3.9 统一代码规范 ([a50d3b0](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a50d3b0ecc95d6a33dff7f168df207120ce62ff9))
* 集成 husky 9 (pre-commit type-check + pre-push test) ([29ca805](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/29ca8050746288f91ee39ae6667b667ad629b45f))
* 加 [@plugins](https://gitlab.dg.com/plugins) alias 配套同步 tsconfig/vite/main ([417c9b6](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/417c9b6a018aaaddfe109aad36fca92a9e4b64bd))
* 配置 commitlint 中文输出格式并启用 engine-strict ([c5d4b16](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/c5d4b1662aebee908a2c3a1ef067ce18f5cf984f))
* 配置代码提交规范工具链 ([73498c1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/73498c189fc400da0a1b35ddd332d97654a336c4))
* 添加 lint-staged 配置文件并迁移配置到独立文件 ([84ac7a2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/84ac7a2ec51a2e6bc1e4c296c052559c7ec1a40e))
* 移除 unplugin 自动生成的 components.d.ts 与 .gitignore 规则 ([ec336b2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/ec336b205daebdd83ddba130c7df3ed30b28f2d4))
* **build:** 添加.omc到.gitignore文件 ([e93c8e1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e93c8e14d7fe266d8993e7029e1f8bff51595433))
* **commitlint:** 添加 merge 提交忽略规则并完善中文 formatter 文档 ([14125cd](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/14125cd487a611727faa396008ce270fd208429f))
* **config:** 更新 commitizen 配置并添加工具链文档 ([b8d6a63](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/b8d6a63145fd4f52d0be3ef0c1b681f41867229b))
* **config:** 更新 Prettier 配置以改进代码格式化 ([934649d](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/934649def56fa9f2e90d47f1c503c2e655177280))
* **config:** 迁移 commitizen 配置并完善 pre-commit 钩子 ([caaf37f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/caaf37f6b7337d32e633ee47e4ae2ff501de3a66))
* **counter:** 删除无用目录 ([02495b1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/02495b1f825fef116e6967e523577d4620f682ea))
* **hooks:** 验证 lint-staged + commitlint + commitizen 完整工作流 ([a4f2b36](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a4f2b36aa3e59f6ba6410bec0fc1280ddf30dd37))

### 📝 Documentation | 文档修改

* **03-git:** 工具链配置详解新增 release 流程章节 ([d184064](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d184064dd4ec8912860f2b0ed4d7f530bd505042))
* **08:** 新增模块化架构总览文档 ([017939f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/017939f52e1eeaabd6a43353d7b104273971fa70))
* 更新文档 ([aa27815](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/aa278150da42202663e3b1a6bb15e34c78602a96))
* 更新文档中的构建配置和工具链说明 ([6d23321](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/6d23321b2d717077314b8f16d0ea66c882023c33))
* 添加 .editorconfig 配置说明 ([468e923](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/468e923ba14b929f934c0da8111068945d120f9e))
* 新增工具兼容性问题踩坑记录文档 ([ea83be1](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/ea83be175e45aae1d75ad4288fd009c8e89b0f52))
* 仪表盘 → 首页 文档与配置同步 ([0b0d7c5](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/0b0d7c5ac6040268a7747215930ef14ae0a15cba))
* **api:** menu.ts 注释更新，指向 auto-register 派生 ([d0d8b20](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d0d8b20a013064d622a85a717f0c806cdc7d1159))
* **changelog:** 更新 web-vitals 使用规范文档路径 ([d821420](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d8214209c4a4ea907651e20622c959897a706c69))
* **changelog:** 记录 common 组件全局注册功能 ([0d1f0a2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/0d1f0a2ab0dd80bcc45c78d96e487ffdca7ed873))
* **changelog:** 记录 component-registry 合并到 auto-register 的重构 ([bcf8bbc](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/bcf8bbc792d1ce153334c756fd602062662317c6))
* **changelog:** 记录 ESLint 强制封装规则与 6 文件重构 ([e83d3ee](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e83d3ee902eb498eac94166d72716d32f3011b8e))
* **changelog:** 记录 portal 首页 layout 重构 ([5a86bd4](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/5a86bd45dca2a2700bc54f0d4d07691b1909fdd1))
* **CLAUDE.md:** 更新文档生效分支为master ([9bfe7f0](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/9bfe7f0b188abce373d856be0e3a208262b5c5bc))
* **CLAUDE:** 更新项目级Claude工作流文档 ([3e5ba52](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/3e5ba52c1d3d0b6977898c4d7c1de2b2461e32b4))
* **CLAUDE:** commands 表新增 pnpm release / pnpm release:dry ([aa46415](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/aa46415ab861aae61884b7c5771540d2c153c3de))
* **decision-table:** 补充业务代码必须用封装的决策项 ([a32b398](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a32b3989ebb0c2d45f54bb156bff43a3d99bd1e3))
* **demo:** 添加组件示例站点开发指引文档 ([a397dd3](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a397dd32f25a272fdca72770cbdf33f686907bc8))
* **guide:** 新手指引补充强制使用封装的 ESLint 规则说明 ([c15af96](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/c15af96b7559135934c2a73d0cd2a749ad28842d))
* **plans:** 添加 components/common 全局注册的实施计划 ([42d63ca](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/42d63cae42906fdc2343070d687c02414c411872))
* **plans:** 添加路由 component-registry 合并到 auto-register 的实施计划 ([62678a4](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/62678a43f5eb946daaebb28b21f68dd106d38d7e))
* **plans:** 新增 release-it + auto-changelog 实施计划 ([18b799b](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/18b799b9c1932a7a2498d77a0b94d954832d6894))
* **portal-plan:** 新增门户首页 Layout 重构实施计划（30 任务） ([ed09b87](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/ed09b8788eef8c79384db09d366d7c830a8ac320))
* **portal:** 新增门户首页 Layout 重构设计文档 ([11f69c2](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/11f69c2fd31e56dc5bca4b703e86d363a6e8f630))
* **prettier:** 更新代码格式化配置文档 ([3421f00](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/3421f004c6e7239db3e1e5a13da65aaa9c519e03))
* **project:** 添加项目级 Claude Code 工作流规范 ([6a3ede5](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/6a3ede50333ddc167db2d53e28dc71e82268c63d))
* readme 全面更新同步本轮重构状态 ([395ab15](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/395ab15444baff167f70997fe4c5df17a57154f7))
* **README:** 常用脚本表新增 pnpm release / pnpm release:dry ([df75b74](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/df75b741cb883181ced25ceef7fe91220968b35b))
* **readme:** 更新项目文档为企业中后台管理 ([fbe8e16](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/fbe8e16ac11fe595192367ad0bb61b72237a0ee3))
* **readme:** 同步更新文档与当前代码状态 ([d1a5d91](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d1a5d91e6132c848c342bd8b1d2ac6bd5179a06c))
* **README:** 移除License部分 ([4a14190](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/4a14190434f92b07c1860987df701e66fced7f46))
* **router:** 完善路由文档和新增标准流程指南 ([d6a2412](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d6a2412a92ef8933a5ce0f2a1e393b8ecc294965))
* **router:** docs/07 新增路由流程从 3 步改为 1 步 ([7031038](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/703103817e52be4c50b685b8d1ac398518f145a0))
* **router:** types.ts 注释更新，移除 component-registry 引用 ([6118111](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/61181116356eddfaf4947dc941f823b3ff36e783))
* **specs:** 添加 components/common 全局组件自动注册的设计文档 ([209ce32](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/209ce32c4e36089470fb33e9df4c44660f2b26af))
* **specs:** 添加路由 component-registry 合并到 auto-register 的设计文档 ([3bbdc2d](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/3bbdc2dd6f2e9076833a17dcd93cf74430eb25e5))
* **specs:** 新增 release-it + auto-changelog 集成设计文档 ([1a537a5](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/1a537a5b333c8a14f9b607f911b718deded9cac3))
* **superspec:** 添加 ESLint 强制封装规则设计文档 ([c036e17](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/c036e173bc4650b8aea0578f0d1030aac0f41a23))
* **superspec:** 移除 useRoute 拦截，澄清业务约束范围 ([59af208](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/59af2084169a1a4b961d87a2947661834ad7da20))
* **theme:** 新增主题管理规范文档并完善BEM工具 ([74b8b1f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/74b8b1fa6b2ca30bcdebf2228f89752336ab4e8c))
* **utils:** 添加utils模块统一导出说明 ([127e047](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/127e04756e0d71710bdf320925e162305953f97f))

### 💄 Styles | 代码格式调整

* **styles:** 更新全局样式重置文件并添加过渡动画支持 ([49861ba](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/49861badbfce045ad7221225901483d761d0f5fb))

### ♻ Code Refactoring | 代码重构

* **arch:** 按照消费方重新拆分布局配置和样式token ([0329a5f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/0329a5f41bc0f1c9c809864608c2b790118ee224))
* **build:** 提取 SRC_DIR_ALIASES + 补全所有裸 alias ([22a3aab](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/22a3aab65bb204a67cdbe7760af1b13b6ae0b4d5))
* **components|directives|router:** 使用 autoImport 工具函数重构自动化注册逻辑 ([fde8d2c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/fde8d2ce6b2a1316dd16724613aef61a9f00ee29))
* **composables:** 重命名useRouter为useAppRouter并优化类型定义 ([8bd4a19](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/8bd4a193dbbfa0c8ad5538a70bd67e5c83c2b714))
* **console:** 远程菜单注入结果用 consoleBadge 徽章化 ([d021a9c](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/d021a9c0f61a01dd483a7f75f29c39796ac8c875))
* **demo-frame:** 改用 useAppRouter 替代 useRouter ([994afb8](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/994afb89ecc14c6efdf8686a0a19ebd6a387d17b))
* **directives:** 改 install 注册模式，新增 inputDebounce/buttonDebounce ([6528cea](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/6528ceacce44d78aa8d0ad6f23b738dc6b4fdd13))
* **directives:** 指令按范式重构（debounce 工具 + .d.ts 类型分离） ([039a11a](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/039a11a00a4a642d409e824e98d75dfad1131f2b))
* **directives:** permission 改 install 模式 + 类型文件分离 ([50f2392](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/50f23926aa21c1c93420fb8bd038132631dc62d2))
* **doc-layout:** 改用 useAppRouter 替代 useRouter ([e552510](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e552510f4ac79fdb0cddcd2854154c3ab8dba6b6))
* **login:** 改用 useAppRouter 替代 useRouter ([85dbff9](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/85dbff9b51e0c2f110840cc00df80be379685627))
* **main:** 更新导入路径别名 ([b88abcf](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/b88abcfbfe45133f4abec17645992602522104ad))
* **mock:** 删除 dashboard 死代码 mock ([a1d2842](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/a1d2842b8d5920af6176642e12e073cbc2586025))
* **modules:** dashboard 模块重命名为 home，views 去嵌套 ([25d9b47](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/25d9b4798f8de41eca2af963781a1748d7942330))
* **overview-card:** 改用 useAppRouter 替代 useRouter ([f68bf52](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/f68bf527e6b1cd22dd11d4fb2b3b02a084bc2c53))
* **router:** 合并 component-registry 到 auto-register 派生 ([67eecff](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/67eecff004db5cb9d75ca715a044f0bfdc60f13b))
* **routes:** /dashboard 切换至 PortalLayout ([947dbe0](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/947dbe012000ff9c4c165dbf459b75041c79efe3))
* **routes:** 仪表盘路由从 /dashboard 改名为 /home ([4a04bd8](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/4a04bd87c7833b2184ea4c501dc3a9f900cee327))
* **scripts:** check-routes 移除 component-registry 校验项 ([1db51c4](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/1db51c4ffe00275233e2244d1bfe250b412a80b3))
* **sidebar:** 改用 useAppRouter 替代 useRouter ([67a2195](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/67a2195c5295db046f793ac2980261ade7c67181))
* **styles:** 重构全局样式管理和BEM工具 ([e45ec94](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/e45ec940bdf17a2ca53f0b89d975ebac92980591))
* **tags-view:** 改用 useAppRouter 替代 useRouter ([b8c6f55](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/b8c6f55dccd3053c7e055cd41db36fec7a276db5))
* **utils:** storage 命名空间改用 VITE_STORAGE_NAMESPACE ([2214048](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/2214048b551a05a0ceed812d938e71c8ead33b52))

### ✅ Tests | 测试用例

* **components:** 添加 GlobalComponents 插件集成测 ([ed21634](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/ed2163440a6260447109a90af9cf8638ddcbdb16))
* verify lint-staged auto-format ([8c15d79](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/8c15d792feb8b2a84ffca5f5013de00ecb81f036))

### 👷‍ Build System | 构建

* **vite:** 配置 tree-shaking 优化和副作用处理 ([6043c6f](https://gitlab.dg.com/10086/hyywsybb/hyyfb/commit/6043c6fe6558d901abf01c3780a75b7b0bb49395))

## Unreleased

### Added

- **新手指引 + 模块脚手架（提升新人上手效率）**：
  - 新增 `scripts/new-module.ts` + `pnpm new-module <kebab-name>` 命令：一键生成 6 个骨架文件（`views/Index.vue` + `routes/index.ts` + `store/index.ts` + `apis/index.ts` + `index.ts` + `components/.gitkeep`），自动追加 RouteName 到 `src/router/types.ts` 联合类型（消除过去"加新模块需手动改 3 处"的负担）。幂等保证（重复执行不会重复追加）
  - 骨架 `apis/index.ts` 与现有 `src/api/modules/*.ts` 互斥（脚手架默认放 `apis/`，按需迁移）；脚手架提供 `PascalItem` 类型 + `<name>Api.getList` 占位方法，注释引导按业务补全
  - writeSkeleton 拆为 6 个 build 函数（每个 ≤ 50 行），符合 §一.4 函数 ≤ 80 行约束
  - 新增 `docs/10-新手指引.md`（351 行，30 分钟 5 任务）：clone + dev:local → 加静态页（用 new-module）→ 加完整业务页（权限 + 异步三态 + i18n + 表单）→ 加 API + mock → 调 5 类常见问题（401/主题/远程菜单/数据格式/build 404）。任务 3.2 同步指向 `apis/index.ts` 而非 `src/api/modules/`
  - `README.md` 加新同事入口链接 + 常用脚本表加 `pnpm new-module` + 相关文档表加 `docs/09-10` 索引
  - 跑通手动验证：3 轮回归（`nop-test` 触发 bug 修复 + `nop-demo` 验证功能 + `nop-v2` 验证 apis 骨架 + 重构回归）→ 6 文件就位 + types.ts 同步 'NopXxx' → `pnpm check:routes` 双向一致通过 → 测试目录清理 + types.ts 备份还原，git diff 干净
- **多页签 tags-view（中后台体验提升）**：
  - 新增 `src/store/modules/tags-view.ts` Setup Store：`visitedViews / cachedViews + addView/removeView/closeOthers/closeAll`；`meta.affix=true` 的路由（如 Dashboard）固定不可关。`addRouteView(to)` 给 `router.afterEach` 调用
  - 新增 `src/components/common/TagsView/index.vue`：横排可滚动 + 单击切换 + 中键/右键菜单关闭 + affix 隐藏关闭按钮；BEM 命名空间 `vv-tags-view`
  - 改 `src/router/types.ts`：RouteMeta 加 `affix?: boolean` 字段
  - 改 `src/layouts/default/index.vue`：在 Header 与 RouterView 之间插 `<TagsView />` + 给 RouterView 包 `<keep-alive :include="cachedViews">`
  - 改 `src/router/index.ts`：`router.afterEach` 调 `addRouteView(to)`（必须在 `setupAuthGuard` 之后，避免未登录 redirect 污染 visitedViews）
  - 改 `src/modules/dashboard/routes/index.ts`：`meta.affix=true`（Dashboard 固定）
  - 新增 `src/store/modules/tags-view.spec.ts`：9 用例覆盖 addView 去重/同 name path 更新、removeView affix 拒绝、closeOthers 保留 current+affix、closeAll 仅保留 affix
  - **不**持久化 visitedViews（避免换账号看到旧 tab）；5/30 TTL 缓存由各层独立管
- **字典系统（中后台常见需求基建）**：
  - 新增 `src/api/modules/dict.ts`：`getByType(type)` 接口 + `DictEntry` 类型（`value/label/[key:string]: unknown` 索引签名支持 `color/disabled` 扩展字段）；HTTP 层 30s TTL 缓存
  - 新增 `src/store/modules/dict.ts` Setup Store：业务层 5min TTL（`STORE_TTL_MS` 常量） + 并发去重（同一字典同时 fetch 复用同一 promise） + `getLabel(type, value)` 未命中兜底 `String(value)` + `clear()`
  - 新增 `src/composables/useDict.ts`：`useDict(type)` 返回 `{ options, loading, getLabel, refresh }`（options 是 reactive computed）；setup 阶段 lazy fetch + onMounted 兜底 SSR 场景
  - 改 `src/store/modules/user.ts`：登录成功后 await `preloadDict()`（失败静默），常用字典（`user_status / role`）首屏即用
  - 新增 `mock/dict.ts`：user_status / role / order_status 3 条典型数据，dev 立即可用
  - `PRELOAD_DICT_KEYS` 常量暴露，登录后守卫 / 用户 store 引用
  - 新增 `src/store/modules/dict.spec.ts`（13 用例）+ `src/composables/useDict.spec.ts`（5 用例）：覆盖首次/缓存命中/force/并发去重/失败清理/getLabel 兜底/clear
  - 新增 `docs/11-字典使用规范.md`（217 行）：三层架构速查 + 业务侧用法（el-select / el-table / refresh）+ 缓存策略表 + 预加载 vs 按需懒加载 + 后端协议 + 7 条常见坑
  - **设计取舍**：业务层缓存 vs 网络层缓存并存 —— 网络层防 429 / 雪崩（30s），业务层防重复 await（5min）；两者改 TTL 各自调对应常量
- **Web Vitals 性能采集（采集与上报解耦）**：
  - 新增 `web-vitals@6.0.0` 依赖（Google 官方库，已用 `npm view` 验证版本）
  - 新增 `src/plugins/webVitals.ts` + `webVitals.d.ts`：4 项核心指标（LCP / INP / CLS / TTFB）+ `install` 模式聚合到 `src/plugins/index.ts`
  - 设计：dev 模式 `console.info` 输出便于即时观察；prod 模式默认 **noop（不上报任何端点）**
  - **上报 endpoint 待接入**——业务方后续在 `main.ts` 传 `options.webVitals.report` 自定义（4 种接入示例见 `docs/12-web-vitals性能监控使用规范.md` § 3：Sentry / Ga4 / 自有 APM sendBeacon / 仅本地）
  - 上报协议选型、关闭方式、自测指引全部文档化；本次不实现端点上报代码（"采集 vs 上报"解耦，前端不预设 URL/协议，由运维与可观测性团队约定）
  - `PluginsOptions.webVitals?: WebVitalsOptions | false` 类型扩展，与 `errorHandler` 同构（默认启用 / 传 false 关闭）
- **基础设施清理：unplugin 自动生成的 .d.ts 不再触发 diff**：
  - `src/types/auto-imports.d.ts`（unplugin-auto-import 生成）：之前没加入 .gitignore，每次新增 composable/store 触发大量 diff → 加入 `.gitignore` + `git rm --cached` 从仓库移除（本地文件保留；dev/build 时 unplugin 重新生成）
  - `src/types/components.d.ts`（unplugin-vue-components 生成）：已在 `.gitignore` 但仍被追踪，新增组件时同样触发 diff → `git rm --cached` 从仓库移除（与上面闭环同理）
  - 工作流闭环：团队 clone → 首次 `pnpm dev` / `pnpm build` 时 unplugin 自动按需生成各自的 .d.ts 文件；不再有"加 1 个组件 = 改 .d.ts"的人工维护
- **路由优化（13 项改进全部实施）**：
  - 扩展 `AppRouteMeta` 类型：在 `src/router/types.ts` 加 `declare module 'vue-router'` 块，`RouteMeta` 获得 `title / titleKey / icon / requiresAuth / permissions / visible / keepAlive / breadcrumb` 字段的自动补全 + 索引签名
  - 新增业务模块 orders + reports（含 4 个新路由：`OrdersList` / `OrdersDetail` / `Reports` + `OrdersList` 嵌套子页），演示多级菜单 + 权限码 + `meta.visible: false` 隐藏菜单场景
  - `scripts/check-routes.ts` 扩展为 5 个校验（A/B/C/D/E），覆盖白名单 ⊆ 声明、双向路由 name 一致、系统白名单必在、最终汇总
  - 新增 `src/router/error-boundary.ts`：抽离 `router.onError` 回调，统一跳 `/500` 与防递归入口（`SERVER_ERROR_PATH` 常量）
  - 新增 `src/router/guards/{visibility,login,permission,remote-menu,composable}.ts`：把 5 段守卫拆为独立可测纯函数 + `composeGuards` 编排器，`auth.ts` 简化为统一调度入口
  - 新增 `src/composables/useAuth.ts` + `useAuth.spec.ts`：组合式权限 API（`hasPerm` AND 语义 / `hasAnyPerm` ANY 语义）
  - 新增 `src/directives/auth.ts` + `auth.d.ts`：v-auth 指令（支持 `:any.disabled` / `:any.remove` 修饰符），自动响应权限变化
  - 新增 `src/router/helpers.ts`：`resolveRouteTitle`（titleKey → i18n → title → name fallback 链）+ `extractRoutePermissions` + `extractRouteIcon`
  - 新增 `src/composables/useRouter.ts`：业务侧路由高层 API（`pushByName<RouteName>` / `pushWithTitle` / `back` / `addDynamicRoute` / `withErrorToast`）
  - `src/router/remote.ts` 加 retry + timeout 包装：`fetchRemoteRoutes({ retries=2, timeoutMs=5000, baseDelay=300 })`，调用 `withRetry`
  - `src/router/permission.ts` 实现真逻辑（之前是占位 `console.info`）：用 `useAuth()` 替换占位实现，支持 `v-permission:any` 修饰符
  - `src/router/config.ts` 加 `historyMode` (`web|hash`) + `base` 子路径配置，支持 `.env.production` 的 `VITE_HISTORY_MODE` / `VITE_BASE` 覆盖
  - 新增 `docs/research/2026-07-22-unplugin-vue-router-survey.md`：file-based 路由方案调研，结论当前不建议迁移（远程菜单动态注入丢失是核心反对理由）

### Changed

- **ESLint 强制使用项目封装（业务代码拦截）**：
  - `eslint.config.mjs` 追加 `app/business-wrap-rule` 块：`no-restricted-imports` 拦截业务目录（`src/modules/**` + `src/components/**` + `src/views/**`）的 `useRouter` from `vue-router` 与 `axios` 包，warning 级别（不阻塞构建）
  - 拦截提示文案引导到 `@composables/useAppRouter` / `@composables/useRequest` / `@api/_http` 三个推荐替代
  - 白名单天然生效：`src/composables/**` / `src/router/**` / `src/plugins/**` / `src/main.ts` / `*.spec.ts` 不受限
  - 6 个业务文件同步重构：`Sidebar.vue` + `TagsView/index.vue` + `OverviewCard.vue` + `Login.vue` + `DocLayout.vue` + `DemoFrame.vue`，改用 `useAppRouter` 的 `router` 实例（vue-router 原生 API 兼容）。`useRoute` 保留（读取当前路由状态不在拦截范围）
  - 文档同步：docs/10-新手指引.md 新增 3.7 强制使用封装小节、docs/18-代码组织决策表.md 加决策行
  - 完整设计见 `docs/superpowers/specs/2026-07-24-eslint-wrap-rule-design.md` + 实施计划 `docs/superpowers/plans/2026-07-24-eslint-wrap-rule-plan.md`

### feat(portal) — 2026-07-23

新增政府门户首页 Layout：`/dashboard` 切换至 PortalLayout（顶部蓝 banner + 横向导航 + Hero 搜索 + 数据总览 5 卡 + 系统链接 footer + AI 占位浮窗）。与现有 admin layout 双 layout 并存，业务子页零影响。

新增 26 个文件，修改 2 个文件，删除 1 个文件。

### refactor(home) — 2026-07-23

仪表盘路由 + 模块重命名为"首页"，对齐 `src/portal/config/nav.ts` 首页项 key='home' 的语义。

#### 路由重命名（commit `4a04bd8`）

- `src/modules/dashboard/routes/index.ts`：`path: '/dashboard'` → `path: '/home'`，`name: 'Dashboard'` → `name: 'Home'`
- `src/router/index.ts` 根路径 `redirect: '/dashboard'` → `redirect: '/home'`
- `src/modules/auth/views/Login.vue` 登录 fallback → `'/home'`
- `src/portal/config/nav.ts` 顶部 nav 首页项路径 → `'/home'`
- `src/router/types.ts` `RouteName` 联合 `'Dashboard'` → `'Home'`
- 注释同步：`src/store/modules/tags-view.ts`（2 处）/ `TagsView/index.vue` / `useLogout.ts` / `router/index.ts`
- 测试 fixture 同步：`auto-register.spec.ts` + `tags-view.spec.ts` 共 10 处

#### 模块目录重命名 + views 去嵌套（commit `25d9b47`）

- 整个 `src/modules/dashboard/` 迁移至 `src/modules/home/`
- `store/index.ts`：`useDashboardStore` → `useHomeStore`，pinia id `'module-dashboard'` → `'module-home'`
- `views/` 平铺：原 `views/home/Index.vue` → `views/Index.vue`，原 `views/home/components/*` → `views/components/*`（与 orders / reports / user / error / auth 模块平铺结构对齐）
- import 路径（9 处）：`@/modules/dashboard` → `@/modules/home`
- 路由 lazy import：`'../views/home/Index.vue'` → `'../views/Index.vue'`
- git 自动识别 19 个 rename + 1 个 import 路径改动 = 21 files / 13 insertions / 13 deletions

#### mock 远程菜单同步（commit `dd45ed2`）

- `mock/menu.ts` `name: 'Dashboard'` → `name: 'Home'`，`path: '/dashboard'` → `path: '/home'`
- 修复 `fetchRemoteRoutes()` 触发的 `remote.ts:85` "未注册的路由 name" 警告（mock 与 `RouteName='Home'` 联合类型对齐）

#### 文档 + 配置同步

- `README.md`：模块结构树 / 模块列表 / mock 模块列表 / 远程菜单 mock 描述 / Layout 表格 5 处同步
- `docs/07-路由模块设计.md`：目录树 / `RouteName` 联合示例 / 远程菜单 JSON 示例 / 典型搭配 / `back()` fallback 6 处同步
- `docs/research/2026-07-22-unplugin-vue-router-survey.md`：模块列表 dashboard → home
- `.cz-config.json`：commitizen scope `dashboard` → `home`
- 删除 `mock/dashboard.ts`（提供 `/api/dashboard/stats` 死代码接口，全项目无引用）

#### 验证

- `pnpm type-check` 无错误
- `pnpm test --run`：36 files / 343 tests 100% PASS
- `pnpm check:routes`：路由一致性通过

### 文档

- **README 与当前代码同步**：更新首页模块与 `/api/portal/overview` Mock 说明，移除失效的 `VITE_USE_MOCK` 切换指引，补充 `VITE_HISTORY_MODE` / `VITE_BASE` 环境变量；同步修正 commit scope、状态管理目录和新手指引中的旧 `dashboard` / `VITE_USE_MOCK` 内容。
- **Mock 路径修复**：`mock/portal-overview.ts` 的首页类型 import 从已删除的 `@/modules/dashboard` 同步为 `@/modules/home`；Mock 接口 URL 从 `/portal/overview` 同步为 `/api/portal/overview`（与 `VITE_API_BASE_URL=/api` 一致）。
- **i18n 文案同步**：`src/locales/{zh-CN,en-US}.ts` 的 `menu.dashboard` 重命名为 `menu.home`（与 `RouteName='Home'` / 导航 key='home' 一致），并更新中文文案 `'仪表盘' → '首页'`。
- **历史设计/计划归档**：`docs/superpowers/{specs,plans,research}/` 下 13 份历史文档（2026-07-17~24）迁移到 `docs/archive/2026-07/`，新增归档索引 `docs/archive/2026-07/README.md`；`docs/superpowers/` 空目录删除；README 设计/计划表更新为归档索引。
- **架构一致性回拨**：`src/portal/{config,styles}/` 迁入 `src/modules/home/{config,styles}/`（`nav.ts` / `hero.ts` / `footer.ts` / `types.ts` / `portal-tokens.scss`），5 处 import 同步更新（`PortalHeaderNav.vue` / `PortalFooter.vue` / `HeroSection.vue` / `SearchBar.vue` / `src/assets/styles/index.scss`），`src/portal/` 空目录删除。`PortalLayout` 仍保留在 `src/layouts/portal/`（路由层是 layout 职责，不属于业务模块）。
- **按消费方拆分布局**：
  - 公共 `nav.ts` / `footer.ts` / `PortalNavItem` / `FooterLinkGroup` 迁回 `src/layouts/portal/config/`（PortalLayout 的公共配置）
  - home 特有 `hero.ts` / `SearchTypeOption` 保留在 `src/modules/home/config/`，`HeroConfig` 内联到 `hero.ts`（仅自身消费）
  - 视觉 token 拆分：`src/layouts/portal/styles/portal-tokens.scss`（banner 渐变 + 布局常量 + portal-bg）只给 PortalLayout 容器用；`src/modules/home/styles/portal-tokens.scss`（5 张卡片底色 + 趋势色）只给 home 的 Overview 组件用；`src/assets/styles/index.scss` 按依赖顺序两文件都 `@use`
- `README.md` § 路由架构（自动注册）扩充：新增「Layout 速选」对照表 + blank layout 页面模板示例 + 「自检」步骤指路到 docs/07
- `docs/07-路由模块设计.md` § 新增路由的标准流程 大幅扩充：
  - 新增 §0️⃣ **Layout 选择速查**：default vs blank 视觉特征 + 适用场景 + 是否需要白名单
  - 新增 §3️⃣ 五个模板：default 业务页 / blank 登录页 / 动态路由参数 / 多级菜单 / i18n titleKey
  - 新增 §5️⃣ 路由 + v-auth 双层权限防护示例
  - 新增 §6️⃣ keepAlive / breadcrumb 等可选 meta 字段用法
  - 新增 §✅ 完成度自检段：自动跑 `pnpm check:routes` 验证 5 个一致性校验

### Changed

- `resetRouterState` 重命名为 `resetAuthGuardState`（更准确的语义）；同步更新 `src/store/modules/user.ts` 调用方 + `user.spec.ts` mock
- `src/api/modules/menu.ts` 接口签名支持配置项：`menuApi.getMenu({ timeout: 5000 })`
- `src/modules/auth/route/` 演示 mock 升级：`mock/auth.ts` profile permissions 加 `orders:view` + `reports:view`；`mock/menu.ts` 改为 4 种典型场景：单级菜单 / 多级菜单（Orders 嵌套 OrdersDetail）/ 隐藏菜单（hidden → visible:false）
- **多级菜单真正可用**：`src/router/types.ts` 加 `'Orders'` RouteName；`src/modules/orders/routes/index.ts` 加 `name: 'Orders'` 父级路由（layout + children 结构），让 sidebar 能正确渲染「订单管理」一级菜单 + 「订单列表」二级菜单；`mock/menu.ts` 改为以 `Orders` 为父级菜单项携带 `OrdersList` / `OrdersDetail` children。`pnpm check:routes` 10 个 RouteName 双向一致通过
- **修复 directives 控制台噪音警告**：`src/directives/index.ts` 的 `import.meta.glob` 模式从 `['./*.ts', '!./**/*.spec.ts']` 扩展为 `['./*.ts', '!./**/*.spec.ts', '!./**/*.d.ts']`，避免 `.d.ts` 类型声明文件被当作指令模块加载，触发 `[directives] 跳过非标准模块：./auth.d.ts` 等 4 条 console.warn

### 文档

- 文档清扫（docs cleanup）：
  - **README.md**：(1) Prettier 风格表 `trailingComma` 由 `"all"` 改为实际值 `"es5"`；(2) Mock 数据表加 `menu` 模块（`/api/menu`，remote 模式守卫依赖项）；(3) 目录树中 `src/utils/` 补全 `format / validate / safeAsync / consoleBadge / autoImport` 五个工具模块；(4) 移除错误归属 `src/utils/_internal/naming.ts`（实际位于 `src/components/common/_internal/naming.ts`，是 components 内部工具），改为跨模块位置说明
  - **docs/04-构建与测试工具.md**：(1) `vite.config.ts` 配置示例重写为当前真实版本——`alias` 改用 `SRC_DIR_ALIASES` 常量 + `resolveSrcDirAliases()` 函数抽象；`manualChunks` 从 if 链重构为顶部 `vendorChunks` 配置数组 + 遍历模式（与 CHANGELOG 早期重构对齐）；同时含 `treeshake: true` / `silenceDeprecations: ['new-global']` / `visualizer` 实际启用分支；(2) `tsconfig.app.json` 路径展示从单条 `"@/*"` 扩展为 14 对双映射（含裸 alias + glob）；(3) `uno.config.ts` 移除已删除的 `flex-center` / `flex-between` shortcuts（已迁移到 `custom.scss`）；(4) Vitest 版本 `^4.1.10` 修正为 `^4.1.9`；(5) 测试清单从"6 个文件"扩展为"25+ 文件 / 87 用例"清单（含 14 个新 api spec 等）
  - **docs/05-BEM样式规范.md**：文件组织段重写为当前真实目录树（`variables.css` → `variables.scss`，补 `theme.scss` / `transition.scss` / `element-overwrite.scss` / `custom.scss` / `mixins/{bem,transitions,responsive}.scss`）；`UserCard.vue` 示例路径从虚构的 `src/components/user/` 改为实际可用的 `src/modules/user/components/` 或 `src/components/common/`
  - **docs/07-路由模块设计.md**：(1) 架构图删除已删除的 `src/router/component-registry.ts` 行，明确 `auto-register.ts` 同时承担"自动注册 + COMPONENT_REGISTRY 派生"两个职责；(2) "📦 组件注册表"整段重写——把"`component-registry.ts` 文件 + Record<RouteName,...>"示例替换为"`auto-register.ts` 从 `autoRegisteredRoutes` 递归派生 `Record<string,...>`"实际实现，并给出旧版已删除的说明；(3) 底部源码清单同步删除 `component-registry.ts` 引用
  - **docs/08-模块化架构总览.md**：目录树 `src/utils/` 描述补全（加 `format / validate / safeAsync / consoleBadge / autoImport`）；新增 `src/components/common/_internal/` 内部目录说明（修正确认 `_internal/naming.ts` 的归属）
  - **docs/02-代码质量工具链.md**：`eslint.config.mjs` ignores 列表补全实际生效的 `'**/scripts/**/*.cjs'` 项

### Added

- 新增 `src/api/global-abort.ts`：`GlobalAbortController` 单例 + `chainSignals(...signals)` 合并工具（无信号返回占位 / 单个透传 / 多个 `AbortSignal.any()`），用于 logout 时统一取消所有在途请求
- 新增 `src/composables/useLogout.ts`：封装 ElMessageBox.confirm 二次确认 + `loggingOut` ref + `userStore.logout()` 调用，Header 与 Dashboard 复用
- 新增 `src/api/global-abort.spec.ts`：12 个用例覆盖 chainSignals（7 边界）+ globalAbort 单例（5 行为）
- 新增 `src/composables/useLogout.spec.ts`：4 个用例覆盖确认取消 / 成功路径 / store 抛错 / 初始 loading
- 新增 `src/store/modules/user.spec.ts`：2 个用例覆盖 logout 成功路径（全栈清理 + 跳转）与失败路径（不执行任何清理）

### Changed

- 改造 `src/store/modules/user.ts`：logout() 改 async 悲观语义（先 await 后端 /auth/logout，失败由 http.ts 拦截器 toast + 抛 ApiError 中断；成功才清本地状态）。清理顺序：Session.remove('token') → clearCookies() → 清 ref → globalAbort.abort('logout') → resetRouterState() → useRouterStore().$reset() → router.push('/login')
- 改造 `src/api/http.ts` 请求拦截器：合并 per-request signal 与 `globalAbort.signal`，logout 时统一取消所有在途请求（axios GenericAbortSignal 与标准 AbortSignal 的结构差异通过 `as unknown as` 处理，运行时完全兼容）
- 改造 `src/components/layout/Header.vue`：复用 `useLogout()` composable，绑定 `confirmLogout` + `loggingOut` loading
- 改造 `src/modules/dashboard/views/Index.vue`：顶部右上加 `退出登录` 按钮（type=warning plain），同样绑定 useLogout
- 改造 `mock/auth.ts`：新增 `/api/auth/logout` mock 条目（之前缺失，导致真实 dev 调用 404）
- 新增 `mock/menu.ts` + 改造 `mock/index.ts`：新增 `/api/menu` mock 条目（之前缺失，remote 模式下守卫拉菜单请求落到 vite-plugin-mock SPA fallback 返回 HTML index.html，路由守卫捕获 console.warn + 保持 local 菜单，但首次登录体验断裂）；返回 Dashboard + UserList 两条
- 改造 `src/locales/{zh-CN,en-US}.ts`：在 `auth` 段加 `logoutConfirm` / `logoutConfirmButton` / `logoutCancelButton` / `logoutTitle` 翻译键

- 新增 `src/api/types/error.ts`：`ApiError` 类与 `isApiError` 类型守卫，统一承载 `code / status / message / url / cause`，调用方 `err instanceof ApiError` 即可 narrowing
- 新增 `src/api/cancel.ts`：`createAbort()` / `withAbort()` / `linkAbort()` 三件套，基于原生 `AbortController`；`linkAbort` 支持外部信号与本地信号联动（路由切换 + 组件卸载双触发取消）
- 新增 `src/api/retry.ts`：`withRetry(fn, opts)` 指数退避重试（默认 retries=2, baseDelay=300ms, backoff=2）+ `isIdempotent()` 判定。仅对 GET/HEAD/OPTIONS 或显式 `idempotent: true` 启用，避免写操作被无脑重试
- 新增 `src/api/deduper.ts`：`withDedup(fn, opts)` 时间窗口同参请求合并。**默认仅 GET/HEAD 合并**（写请求白名单），调用方可通过 `dedup: 'never' | 'auto' | number` 覆盖窗口时长或关闭
- 新增 4 个 `*.spec.ts`：`cancel.spec.ts`（8 用例）/ `retry.spec.ts`（10 用例）/ `deduper.spec.ts`（11 用例）/ `http.spec.ts`（11 用例，含 axios mock + ApiError 单元 + 拦截器契约）
- 新增 `docs/superpowers/specs/2026-07-22-request-layer-eval-design.md` 与 `plans/2026-07-22-request-layer-eval.md`：本次重构的设计说明 + 实施计划

### Changed

- 改造 `src/api/http.ts`：(1) token 来源从 `localStorage.getItem('token')` 切换为 `Session.get<string>('token')`，对齐 `utils/storage.ts` 的命名空间约定（生产环境自动 secure + sameSite=lax）；(2) 响应拦截器不再用 `as never` 逃类型——拆为 `onResponseFulfilled(response) => response`（副作用：toast + 401 跳转 + 抛 ApiError），数据解包 `body.data` 下沉到 `request<T>()` 的 `.then`，axios 拦截器签名天然满足；(3) 所有抛出错误归一为 `ApiError`，HTTP 401 业务码也调用 `Session.remove('token')` + `clearCookies()` 清理遗留凭证；(4) `request<T>` 业务侧 API 保持不变，`modules/*.ts` **零迁移**

- 新增 `docs/01-工具兼容性问题踩坑记录.md`：项目级工具兼容性知识库，记录 npm vs pnpm 符号链接不兼容等问题的根因、复现步骤与解决方案
- 新增 `src/assets/styles/mixins/bem.scss`：BEM 编程式 mixin 工具（`b`/`e`/`m`/`is`/`when`/`reset-block`），编译产物与手写 BEM 字符串完全等价，支持嵌套作用域自动拼接 Block 前缀
- 新增 `docs/05-BEM样式规范.md`：BEM 命名约定、样式隔离三层防线（`scoped` + SCSS `@use` + BEM 命名空间）、文件组织、评审 Checklist、FAQ
- 改造 `src/components/layout/Header.vue` 作为 BEM 示范组件：演示 Block + Element + State + `:deep()` 穿透 Element Plus 四种用法的组合
- 再次改造 `src/components/layout/Header.vue`：切换为运行时 BEM 工具（`createNamespace('header-bar')`）生成 `:class` 类名，模板与 `<style>` 统一使用 `vv-header-bar` 命名空间，演示 SCSS mixin（编译期）与 JS 工具（运行时）协同工作的完整链路
- 全局前缀 `c-` 改为 `vv-`：运行时 BEM 工具的 `createNamespace` 输出前缀从 `c-{name}` 变更为 `vv-{name}`，对齐项目目录前缀命名（vue3-vite-project）。涉及文件：`src/utils/bem.ts`（核心代码 + 注释 + JSDoc 示例）、`src/utils/bem.spec.ts`（20 个测试断言）、`src/components/layout/Header.vue`（注释 + SCSS mixin 调用 + CSS 选择器）
- 重构 `src/utils/bem.ts`：`createBEM` 内部从"内联箭头函数 + const"重构为"对象字面量方法 + 显式返回类型"，让每个方法都带 JSDoc（含 `@example`）。IDE hover `bem.b()` / `bem.e()` 等方法时即可看到使用示例，无需跳转到定义。行为零变化（20 个 bem 单测断言全过）
- 规划全局样式文件管理：新建 `src/assets/styles/element-plus.scss`（Element Plus 5 个主色覆盖）、`src/assets/styles/custom.scss`（复合场景工具类）；填充 `src/assets/styles/transition.scss`（5 个 `@keyframes` + 3 个过渡工具类 + `prefers-reduced-motion` 适配）；新建 `src/assets/styles/mixins/transitions.scss`（3 个过渡 mixin）和 `src/assets/styles/mixins/responsive.scss`（`vv-responsive`/`vv-responsive-down` 响应式断点 mixin）；重构 `src/assets/styles/index.scss` 为纯入口，按 `reset → variables → transition → element-plus → custom` 顺序 `@use`，顶部说明加载顺序约定。`main.ts` 引用方式不变（仍只导入 `index.scss`）
- `variables.css` 重命名为 `variables.scss`：CSS 自定义属性本身不变，文件后缀改为 `.scss` 是为后续用 SCSS 函数派生变量预留扩展点。`index.scss` 的 `@use` 引用同步更新
- 全局滚动条样式（webkit 内核）从 `.vv-scrollbar-thin` 工具类（`custom.scss`）升级为项目级全局规则（追加到 `reset.css` 末尾）：`::-webkit-scrollbar-track-piece` / `::-webkit-scrollbar` / `::-webkit-scrollbar-thumb` / `::-webkit-scrollbar-thumb:hover` 四组伪元素选择器，全站滚动条统一风格。`custom.scss` 中冗余的 `.vv-scrollbar-thin` 工具类删除
- `src/assets/styles/element-plus.scss` 重命名为 `element-overwrite.scss`：`git mv` 保留文件历史，新文件名更准确表达"覆盖第三方组件库样式" 的职责（不限于 Element Plus）。`index.scss` 的 `@use` 引用同步更新
- 新增 `src/assets/styles/theme.scss`：预留白天（light，默认）+ 黑夜（dark）双主题基础样式。设计要点：(1) 用 SCSS `@mixin theme-light` / `@mixin theme-dark` 集中定义变量，避免 light/dark 块重复；(2) 选择器分离：`:root, [data-theme='light']` 应用 light，`[data-theme='dark']` 应用 dark，`@media (prefers-color-scheme: dark) :root:not([data-theme])` 跟随系统；(3) 变量命名 `--bg-* / --text-* / --border-*` 与 Element Plus / Vant 对齐；(4) 末尾预留扩展示例（sepia / high-contrast 等），未来加新主题只需新加 mixin + 选择器块；(5) 主题只覆盖"主题感知"变量（背景/文字/边框），品牌色仍由 `variables.scss` 管理。`index.scss` 加载位置：variables 之后，transition 之前
- `variables.scss` 补充 6 大类 CSS 变量：字号（`--font-size-*` × 7）/ 字重（`--font-weight-*` × 4）/ 行高（`--line-height-*` × 3）/ 字体族（`--font-family-base/mono`）/ 阴影（`--shadow-sm/md/lg`）/ z-index（`--z-index-dropdown..toast` × 8）/ 动画时长（`--duration-fast/normal/slow`）/ 缓动函数（`--ease-out/in/in-out`）。同时新增 5 个 SCSS `$color-*` 编译期常量，供 `element-overwrite.scss` 在编译期计算灯色阶
- 新增主题运行时切换能力：依赖 `pinia-plugin-persistedstate@^4.7.1`（pinia 官方推荐持久化插件，成熟开源）；新增 `src/store/modules/theme.ts`（Pinia setup store，含 `mode`/`isDark`/`setMode`/`toggleMode`，`mode` 字段通过 `persist: { pick: ['mode'] }` 自动写入 localStorage，key 为 `theme-mode`）；新增 `src/composables/useTheme.ts`（对 store 的便捷封装，组件用 `const { mode, isDark, setMode, toggleMode } = useTheme()`）；`src/store/index.ts` 注册 `pinia.use(piniaPluginPersistedstate)`，并 export theme store
- `element-overwrite.scss` 加 Element Plus 灯色阶覆盖：新增 `el-light-variants($name, $color)` mixin，用 SCSS `color.mix($color, white, N%)` 计算 5 个主色 × 5 个灯色阶（light-3/5/7/8/9）= 25 个 CSS 变量。Element Plus 按钮/标签等组件的 hover/active/淡化背景自动跟随项目品牌色，不再出现"突兀的默认蓝"
- `uno.config.ts` 删除 `flex-center` / `flex-between` shortcuts，统一使用 `custom.scss` 的 `.vv-flex-center` / `.vv-flex-between`（见 docs/05-BEM样式规范.md），消除两套并行的命名空间混淆
- 新增 `docs/06-主题管理规范.md`：双主题架构总览（CSS 变量 + Pinia store + composable 三层职责分离）、CSS 变量速查表（主题感知 + 主题无关）、`useTheme()` API 详解、4 种组件写法（主题感知 / 主题专属 / JS 动态控制 / 跨主题共享）、扩展指南（如何新增主题如 sepia，含 5 步操作）、评审 Checklist、FAQ。与 docs/05-BEM样式规范.md 编号连续
- 路由模块重构：(1) 新增 `src/router/types.ts`（`RouteName` 联合类型 + `RemoteMenuItem` 协议）；(2) 新增 `src/router/config.ts`（菜单模式配置，默认 dev=local / prod=remote，可通过 `VITE_MENU_SOURCE` 环境变量覆盖）；(3) 新增 `src/router/whitelist.ts`（按路由 name 匹配的白名单，含 `Login/Forbidden/NotFound/ServerError`）；(4) 新增 `src/router/component-registry.ts`（name → 视图组件映射，供 remote 模式按业务路由名查找组件）；(5) 新增 `src/router/remote.ts`（`fetchRemoteRoutes()` 调用 `/api/menu` 接口 + JSON → `RouteRecordRaw` 转换 + 失败回退空数组 + console.warn）；(6) 新增 `src/api/modules/menu.ts`（菜单 API）；(7) 改造 `src/router/guards/auth.ts`：用 `isWhiteListed` 按 name 判定白名单，remote 模式下首次登录时拉取远程菜单并 `router.addRoute` 注入，按 token 变化重置 `dynamicLoaded` 避免重复拉取；导出 `resetRouterState()` 供测试强制刷新
- 新增 `docs/07-路由模块设计.md`：架构总览（Mermaid 流程图）、菜单加载模式对比（local vs remote）、白名单设计决策（按 name 而非 path 的理由）、组件注册表必要性、远程菜单 JSON 格式协议、新增路由标准流程（5 步骤）、评审 Checklist、FAQ
- 路由模块重构（关注点分离 + 自动注册）：(1) 新增 `src/router/auto-register.ts`，用 Vite `import.meta.glob('/src/modules/**/routes/index.ts', { eager: true })` 自动扫描业务模块路由，业务模块新增路由**无需修改 `src/router/` 任何文件**；(2) `src/router/index.ts` 改用 `autoRegisteredRoutes` + `errorRoutes`（错误页单独手动注册，保证 catch-all 404 在最后）；(3) 把 3 个模块路由从 `src/router/modules/` 迁到对应 `src/modules/{auth,dashboard,user}/routes/index.ts`，`router/modules/auth.ts` / `dashboard.ts` / `user.ts` 三个文件 `git rm` 删除；(4) 视图组件 import 路径从 `@/modules/.../views/...` 改为相对路径 `../views/...`，保持目录内自包含
- 默认菜单模式改为 `remote`：`src/router/config.ts` 的 `resolveMenuSource()` 移除 `import.meta.env.DEV` 分支，未设环境变量时默认返回 `'remote'`（贴近生产）。`package.json` 新增 `dev:local` script（`cross-env VITE_MENU_SOURCE=local vite`），开发者本地启动可用 `pnpm dev:local` 切到 local 模式（无需接口）
- `docs/07-路由模块设计.md` 同步更新：架构图改为业务模块（`src/modules/<feature>/routes/index.ts`）+ 全局 `router/` 两层结构、新增路由标准流程改为 5 步骤（无需改 router 目录）、FAQ Q1 改为"dev 模式切 local"用法（`pnpm dev:local`）
- error 模块也采用自动注册机制：(1) 新增 `src/modules/error/routes/index.ts`（具名错误页 `/403` `/404` `/500` 自动注册）；(2) 新增 `src/router/fallback.ts`（catch-all `/:pathMatch(.*)*` 单独导出，避免 import.meta.glob 字典序导致 `/user/*` 被错误拦截）；(3) `src/router/index.ts` 改用 `autoRegisteredRoutes + fallbackRoute`；(4) `git rm src/router/modules/error.ts`。`src/router/` 目录再无 `modules/` 子目录，全模块统一自动注册（除 catch-all 兜底单独注册）
- `README.md` 同步更新：技术栈表加 `pinia-plugin-persistedstate`；目录结构补全 `src/router/` 全部新文件（auto-register / fallback / config / whitelist / types / component-registry / remote / guards）+ `src/modules/<feature>/routes/` 说明；常用脚本表加 `pnpm dev:local` / `pnpm analyze` / `pnpm lint` / `pnpm lint:fix` / `pnpm format`；Mock 数据表加 `menu` 模块（`/api/menu` 远程菜单接口）；新增"路由架构（自动注册）"小节（含 5 步新增业务模块流程）+ "样式管理（BEM + 双主题）"小节（含 `useTheme` composable 示例）；相关文档表格重构为 3 个分类（项目规范 / 设计计划 / 变更日志），新增 docs/04-07 引用
- 新增 `src/components/index.ts` Vue 插件：运行时扫描 `src/components/common/**` 下的所有 `.vue`，通过 `app.component()` 自动注册为全局组件；模板里可直接 `<AsyncState>` / `<ErrorBoundary>` 使用，无需 import。`_` / `.` 开头的文件视为内部组件自动跳过（如 `_internal/naming.ts` 自身）。同时 `src/main.ts` 增加 `app.use(GlobalComponents)` 接入。类型声明由 `unplugin-vue-components` 自动维护（`src/types/components.d.ts` 已含 `AsyncState` / `ErrorBoundary` 条目）
- 新增 `src/utils/bem.ts`：运行时 BEM 类名拼接工具（TypeScript 版本），提供 `createNamespace(name)` 生成 `b / e / m / be / bm / em / bem / is` 八个拼接函数。命名规则 `vv-{name}` 前缀对齐 Element Plus / Vant 主流约定，与 SCSS mixin 互补（运行时拼接 vs 编译期拼接）
- 新增 `src/utils/bem.spec.ts`：运行时 BEM 工具的 Vitest 单测，覆盖 8 个拼接函数 + 前缀规则 + 边界情况（空字符串、null、undefined），共 23 个用例
- 重构路由 component-registry：删除独立的 `src/router/component-registry.ts`，改为在 `src/router/auto-register.ts` 中从 `autoRegisteredRoutes` 派生 `COMPONENT_REGISTRY`（`Record<string, () => Promise<unknown>>`）。消除"路由配置 + 组件映射"双重维护，新增业务路由从 3 处改动降为 1 处。`scripts/check-routes.ts` 同步删除 component-registry 校验项，保留 RouteName + whitelist 校验
- 修复登录 API 路径重复：根因是 `src/api/http.ts` 的 `baseURL` 依赖 `.env` 的 `VITE_API_BASE_URL`（已含 `/api`），加上各 API 调用 url 各自带 `/api` 前缀，拼接成 `/api/api/auth/login` 与 mock 注册不匹配。修复：`baseURL` 改在 `http.ts` 显式定义常量 `'/api'`，所有 `src/api/modules/*.ts` 的 url 去掉 `/api` 前缀（共 9 处：auth × 3、menu × 1、user × 5）。baseURL 是请求前缀的唯一来源，url 只描述资源路径，避免双重拼接误配
- 修复 mock 接口全部返回 `{}`：根因是 `vite-plugin-mock` 中间件用 `JSON.stringify(...)` 序列化 mock response，原写法用 `async` 函数 + `await delay()`，调用返回 Promise，`JSON.stringify(Promise)` = `'{}'`。修复：`mock/{auth,user,dashboard}.ts` 全部 response 改为**同步函数**，`await delay()` 改为配置项 `timeout: ms`。vite-plugin-mock 源码不支持 async response（mockjs 的 `Mock.mock` 对 Promise 无处理）
- 安装依赖：`normalize.css@^8.0.1`（浏览器基线统一，CSS reset 替代）和 `dayjs@^1.11.21`（轻量日期库，Moment.js 替代）。`src/main.ts` 在 css 导入区顶部加 `import 'normalize.css'`（必须在所有自定义样式之前，确保浏览器基线最先 reset）。`dayjs` 仅安装，待业务场景明确后再接入 composable 或 store
- 新增 `src/utils/dayjs.ts` dayjs 通用封装 + `src/utils/dayjs.spec.ts` 12 个单测覆盖基础通用功能：`formatDate`（默认/自定义格式 + locale）/ `formatRelative`（"2 小时前" / "in 2 hours"）/ `daysFromNow`（date 距 now 的天数，未来正数过去负数）/ `isToday` / `parseDate`。`AppLocale = 'zh-CN' | 'en-US'` 与 dayjs locale 双向映射（`toDayjsLocale` 内部桥接）；注册常用 plugin：relativeTime + customParseFormat。后续业务场景明确后再扩展（utc / timezone / 跟随 appStore.locale 自动切换）
- 重构 `src/utils/storage.ts`：按参考模式重写为 `Local`（localStorage 包装）/ `Session`（sessionStorage 包装，token 走 cookie）/ `clearCookies` 三个 API + `APP_NAMESPACE` 命名空间（从独立的 `VITE_STORAGE_NAMESPACE` 读取，fallback 'vue3-vite-project'，**与展示用的 VITE_APP_TITLE 解耦**）。新增依赖 `js-cookie@^3.0.8` + `@types/js-cookie@^3.0.6`（devDependencies）。`src/types/env.d.ts` 加 `VITE_STORAGE_NAMESPACE: string` 字段。`src/utils/storage.spec.ts` 15 个单测覆盖 set/get/remove/clear + 命名空间隔离 + token cookie 特殊路径。原 storage 单 API（带 TTL 机制）整体替换，**业务代码无 import 依赖故无破坏性影响**（grep 确认只在 spec 自身用了旧 storage）。后续如需 TTL 能力可作为增强项加回
- 修复 `src/utils/storage.ts` 6 项缺陷（code review）：
  1. **🔴 `Local.clear()` 清空整个 localStorage**（与命名空间语义矛盾）→ 改为只清 `APP_NAMESPACE:` 前缀的 key
  2. **🔴 `Session.clear()` 同理** + 调用 `clearCookies()` 清空所有 cookie（破坏其他应用）→ 改为只清 sessionStorage 命名空间，不再调用 clearCookies
  3. **🔴 `clearCookies()` 用 `path=/` 硬编码**（无法清 path=/admin 等其他路径 cookie）→ 改用 js-cookie API，对每条 cookie 尝试 4 个常见 path 兜底（`/`、`/api`、空串、无参）
  4. **🔴 token cookie 缺乏 `secure` / `sameSite`**（生产环境有 CSRF/中间人攻击风险）→ 生产环境（`import.meta.env.PROD=true`）自动加 `secure: true, sameSite: 'lax'`
  5. **🟡 `JSON.parse` 失败抛 `SyntaxError`**（脏数据污染 ErrorBoundary）→ 加 `safeParse` 包装：catch 时 console.warn + 自动 removeItem 脏数据 + 返回 null（Local/Session 行为一致）
  6. **🟡 `Session.get` 返回类型 `T | string | null`** 联合（token 是 string，普通是 T）→ 用 `'token' === key` 条件分支让类型推导更准确

测试加到 20 个 case 覆盖：脏数据自愈、命名空间隔离（不破坏其他应用）、token cookie 安全属性、clearCookies 多 path 兜底。`pnpm test` 10 文件 / 87 测试全 PASS

### Changed

- 重构 `vite.config.ts` 的 `manualChunks`：将 3 个 vendor 分组的硬编码 if 链抽成顶部 `vendorChunks` 配置数组，新增分组只需追加配置项，函数体简化为遍历 + 默认 `vendor-utils` 兜底。行为零变化：3 个 vendor chunk 体积（gzip: 2.82 / 167.31 / 43.51 kB）与重构前完全一致
- 路由模块改进（按上次评估的 5 项 ROI 排序）：
  - **(高 1)** 新增 `scripts/check-routes.ts`（`pnpm check:routes`）：用 regex 提取 `types.ts` 的 `RouteName` 联合类型、`component-registry.ts` 的 `COMPONENT_REGISTRY` 键、`whitelist.ts` 的 `ROUTE_WHITE_LIST` 元素，校验三处一致性。失败退出码 1 可接入 CI 阻断。注意：regex 跨平台兼容性（CRLF → LF 归一化 + 用 `\n\n` 而非 `;` 作块边界，兼容 Prettier 不给单行 type 别名加分号）
  - **(高 2)** `src/router/index.ts` 加 `router.onError` 全局钩子：捕获动态 import 失败 / 路由解析异常，自动 `router.push('/500')`，避免用户看到空白屏；同时检测 `currentRoute` 防止 500 页面自身加载失败导致无限递归
  - **(中 1)** 新增 `src/store/modules/router.ts`（Pinia store）：`isLoadingRemoteMenu` + `lastRouteError` 状态 + `$reset`。`src/router/guards/auth.ts` 集成：`routerStore.setLoadingRemoteMenu(true)` 包裹 `fetchRemoteRoutes()`（含 finally 确保重置）。`src/App.vue` 用 `AsyncState` 包裹 `RouterView`，配合 `<Transition name="fade">` 实现路由过渡；remote 模式首次进入时显示 Loading 骨架屏
  - **(中 2)** `src/router/auto-register.ts` 顶部抽 `ROUTE_MODULES_PATTERN = '/src/modules/**/routes/index.ts'` 常量 + 详细 JSDoc 说明路径约定（命名 / 位置 / 导出格式），修改前需同步更新 docs/07
  - **(修正)** Vite `import.meta.glob` 必须用字面量字符串（编译期静态分析），不能用变量。改回字面量 `'/src/modules/**/routes/index.ts'` + JSDoc 注释说明命名约束（ROUTE_MODULES_PATTERN 常量撤回，但约束文档保留）
  - **(低 1)** 收紧"菜单不可见 ≠ 路由不可访问"双轨漏洞：`src/router/types.ts` 的 `RemoteMenuItem.meta` 加 `hidden?: boolean` 字段；`src/router/remote.ts` 的 `convertItem` 把后端 `hidden: true` 转换为前端约定的 `meta.visible: false`；`src/router/guards/auth.ts` 加步骤 2：`if (to.meta.visible === false) return { path: '/404' }`。远端后端隐藏的菜单即使用户输 URL 也无法访问，本地路由可通过手动设置 `meta: { visible: false }` 实现同样效果
- `package.json` 新增 script：`"check:routes": "node --experimental-strip-types scripts/check-routes.ts"`（需 Node 22.6+；老环境可用 `npx tsx scripts/check-routes.ts` 替代）
- 修复 scripts/check-routes.ts 在 IDE / vue-tsc 下的 TS 错误：(1) `tsconfig.node.json` 的 `include` 追加 `scripts/**/*.ts`（让 IDE + vue-tsc 把 scripts/ 当 Node 环境检查，可识别 `node:fs`/`node:path` 类型）；(2) `[...declaredNames].map((name) => [...])` 元组类型推断失败，显式标注返回类型 `(name): [string, () => boolean] => [...]` 修复 TS2322
- `package.json` scripts 改造：保留日常增量 `type-check`（husky pre-commit 用），新增强制重建 `type-check:full`（`vue-tsc --build --force`，删除 .tsbuildinfo 强制全量检查）。`build` 从 `run-p`（并行）改为 `run-s`（串行）：先跑 `type-check:full`，失败则中断 build 不执行。防 .tsbuildinfo 缓存陈旧导致的漏检，避免发布带类型错误的产物
- 改 Directives 注册方式为 install 模式：
  - 新增 `src/directives/inputDebounce.ts`（v-inputDebounce:300="onInput" 输入防抖指令）+ `src/directives/buttonDebounce.ts`（v-buttonDebounce:500="onClick" 按钮点击节流防重）
  - `src/directives/index.ts` 改为 `export default install(app)` 模式：内部 `app.use(inputDebounce)` + `app.use(buttonDebounce)` + `app.directive('permission', permission)` 注册
  - `src/main.ts` 改用 `app.use(Directives)`（原 `setupDirectives(app)` 函数式调用删除）
  - 设计要点：inputDebounce 用 WeakMap 存 timer 引用（避免污染 DOM 属性 + GC 自动回收）；buttonDebounce 简化只用 mounted 钩子；unmounted 时清理 timer 防内存泄漏
- 指令按范式重构（消除直接 addEventListener + setTimeout 散落模式）：
  - 新增 `src/directives/_utils.ts`：通用 `debounce(click, timeout)` 工具 + `isFunction(param)` 类型守卫
  - 新增 `src/directives/inputDebounce.d.ts` + `src/directives/buttonDebounce.d.ts`：分离类型到 .d.ts（每个指令独立 .d.ts，ElHTMLElement 与 binding 类型定义）
  - `inputDebounce.ts` / `buttonDebounce.ts` 重写：使用 `_utils.debounce()` 工厂 + `isFunction()` 守卫，行为统一 trailing edge 防抖
  - 行为变化：原 `buttonDebounce` 用 leading edge 节流（首次立即执行）；新版本改 trailing edge 防抖（与 inputDebounce 一致）。如需 leading edge 行为，单独写 throttle 工厂即可
  - 修 lint：`debounce` 返回类型从 `any` 改为具体 `EventHandler = (this: HTMLElement, event: Event) => void`
- 改 permission 为 install 模式（统一项目内指令注册风格）：
  - 新增 `src/directives/permission.d.ts`：ElHTMLElement + PermissionBinding interface
  - `permission.ts` 重写为 `export default { install(app) { app.directive(...) } }` 模式（与 inputDebounce/buttonDebounce 一致）
  - `index.ts` 改 `app.directive('permission', ...)` → `app.use(permission)`，3 个指令全部统一 install 模式
  - 即使只有 1 个 directive 也用 install 模式，保持项目内指令注册风格统一
- 新增 `src/plugins/` 模块（参考 directives 范式）：
  - `src/plugins/errorHandler.d.ts`：ErrorSource / ErrorReporter / ErrorHandlerOptions / PluginsOptions 类型
  - `src/plugins/errorHandler.ts`：全局错误处理插件，install 模式接管 3 类错误（Vue 组件 + window 全局 JS + 未捕获 Promise 拒绝）；预留 `report` 回调（生产环境对接 Sentry/自建日志服务）；`logToConsole` 选项（dev 默认 true / prod 默认 false）
  - `src/plugins/index.ts`：插件统一注册入口（export default install），与 directives/index.ts 同范式
  - `src/main.ts` 改用 `app.use(Plugins)`，删去散落的 `app.config.errorHandler` + `unhandledrejection` 监听代码（8 行 → 0 行）
  - 插件化后 main.ts 更整洁；错误处理逻辑集中化；为未来 Sentry/analytics 等扩展点提供清晰接入点
- 加 `@plugins` alias（与 `@directives` 同范式）：
  - `vite.config.ts` resolve.alias 加 `'@plugins': fileURLToPath(new URL('./src/plugins', ...))`，按字母序插在 `@modules` 之后
  - `tsconfig.app.json` paths 同时加 `"@plugins/*": ["./src/plugins/*"]` 和 `"@plugins": ["./src/plugins/index.ts"]`（裸 alias 与 vite 一致）
  - `src/main.ts` 改 `import Plugins from '@/plugins'` → `import Plugins from '@plugins'`，实际使用新 alias
  - 顺带补全 `@directives` 裸 alias（之前只有 `@directives/*`），保持项目内 alias 一致性
- 优化 alias 重复代码 + 补全所有裸 alias：
  - **vite.config.ts 提取 SRC_DIR_ALIASES 常量 + resolveSrcDirAliases 函数**：
    消除 `fileURLToPath(new URL('./src/...', import.meta.url))` 重复 14 次；单一 SRC_DIR_ALIASES 配置 + 函数生成 vite 期望的 Record 格式
  - **tsconfig.app.json 补全 14 个裸 alias**（`@api`、`@components`、`@composables`、`@directives`、`@enums`、`@layouts`、`@locales`、`@modules`、`@plugins`、`@router`、`@store`、`@types`、`@utils` + `@`）：每个 alias 都有 `XXX` 裸 + `XXX/*` glob 两种映射，与 vite alias 一致
  - 解决 `import GlobalComponents from '@components'` 报 ts(2307) 找不到模块的问题
  - 维护说明：新增 src 子目录时同时更新 SRC_DIR_ALIASES（vite）+ tsconfig.app.json paths（TypeScript）

### refactor(home) — 2026-07-28

HomeFooter 系统链接改为平铺一行 5 个布局，去掉分组容器。

- `src/modules/home/config/types.ts`：`FooterLinkGroup` 重构为 `FooterLink`（单个链接 `{ label; href }`），去除 `title + links` 分组结构
- `src/modules/home/config/footer.ts`：`FOOTER_GROUPS` 数组替换为 `FOOTER_LINKS` 平铺数组，合并原两组 10 条链接保持原顺序与重复项（确保 5×2 网格无空缺）
- `src/modules/home/views/components/HomeFooter.vue`：模板从嵌套两层 `v-for`（group → column → link）改为单层 `v-for`；CSS `__column` 容器样式移除，链接样式合并到 `__item`；`__list` grid 保持 `repeat(5, 1fr)` 不变，10 个链接自动排成两行

无上下游影响：`FOOTER_GROUPS` / `FooterLinkGroup` 仅在 `HomeFooter.vue` 内部使用（已 Grep 确认），`Index.vue` 仅引用组件本身。

## v1.0.0 - 2026-07-17

### Added
- 初始化 Vue 3 + Vite 8 + TS 6 脚手架（基于 create-vue 改造）
- Feature-Sliced 风格目录结构
- Element Plus 2.14 + UnoCSS 66 + Vue I18n 11
- Pinia 3 全局状态（仅跨模块共享）+ 模块私有 store
- Vue Router 5 + 路由守卫 + 模块懒加载
- Axios 实例 + 拦截器 + 错误归一化
- vite-plugin-mock + auth/user/dashboard 模块
- Vitest 4 + 单测（utils/useRequest/AsyncState 共 6 文件）
- 三态异步组件 AsyncState
- ErrorBoundary 全局错误兜底
- 模块边界铁律（spec §5）

### Tech
- Node.js >= 22.18 或 >= 24.12
- pnpm >= 11.x
- TypeScript strict 模式
