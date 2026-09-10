# Changelog

## 未发布

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
