# Default 布局复刻 vue-element-plus-admin 实施计划

> **日期**：2026-09-09 | **分支**：feature/engine-optimization | **状态**：实施中
> **参考**：https://github.com/kailong321200875/vue-element-plus-admin/tree/master/apps/admin/src
> **组织约定**：对齐 `layouts/portal` 自包含结构（components / config / styles），不引用 `@/components/` 下任何组件

## 一、参考结构梳理

参考仓 `apps/admin/src/layout/`：

| 参考文件 | 职责 | 本项目落点 |
|---------|------|-----------|
| `Layout.vue` | 四模式外壳（sidebar/top/mixed/dual）+ 移动端遮罩 + Backtop | `layouts/default/index.vue` |
| `components/ToolHeader.vue` | 折叠 + 面包屑 ｜ 布局切换 + 主题 + 语言 + 用户 | `components/ToolHeader.vue` |
| `components/AppView.vue` | RouterView + keep-alive + Footer | `components/AppView.vue` |
| `components/PrimaryNav.vue` | 主导航（top 横排 / rail 竖排） | `components/PrimaryNav.vue` |
| `components/LayoutSwitcher.vue` | 四布局预览切换面板 | `components/LayoutSwitcher.vue` |
| `components/Menu/`（tsx） | el-menu 递归菜单 + hasOneShowingChild | `components/AppMenu.vue`（SFC 递归） |
| `components/TagsView/` | 多页签 + 右键菜单（刷新/关闭/左/右/其他/全部） | `components/TagsView.vue` + `components/ContextMenu.vue` |
| `components/{Logo,Collapse,Breadcrumb,UserInfo,LocaleDropdown,Footer,ContextMenu}` | 头部原子组件 | 同名组件 |

## 二、关键决策（已与用户确认）

1. **四模式全做**：sidebar / top / mixed / dual + LayoutSwitcher
2. **验收模块**：`modules/workbench`（`pnpm new-module workbench` 生成）
3. **技术映射差异**：
   - iconify 图标 → `@element-plus/icons-vue`（名称解析器，参考旧 Sidebar `resolveIcon`）
   - 路由源：参考 `permissionStore.routers` → 本项目 `router.getRoutes()` 派生
   - 主题：参考自带 isDark → 复用项目 `useTheme`（`data-theme` 属性 + `default-tokens.scss` 暗色变体）
   - 页签刷新：参考 `/redirect` 路由 → 本项目 AppView 内部 key 重建（provide/inject，不新增路由）
   - i18n：参考 `t(meta.title)` → 项目 `resolveRouteTitle`（titleKey → title → name）
   - 隐藏菜单语义：参考 `meta.hidden` → 项目 `meta.visible === false || meta.menuVisible === false`

## 三、文件清单

### 编辑现有文件
- [x] `src/store/modules/app.ts` — + `layout: LayoutMode`、+ `mobile`（matchMedia ≤767px）、persist 仅 pick `layout`
- [x] `src/store/modules/tags-view.ts` — + `closeLeft` / `closeRight` / `removeCachedView`

### 删除（旧 default 组件被重写版替换）
- [x] `src/layouts/default/components/Header.vue`
- [x] `src/layouts/default/components/Sidebar.vue`
- 保留不动：`src/components/common/TagsView/`（default 改用内部自包含版，common 版变死代码待后续清理）

### 新建 layouts/default
- [x] `config/types.ts` — `LayoutMode`（re-export app store）、`MenuNode` 菜单树节点
- [x] `config/app.ts` — ui 功能开关（breadcrumb/hamburger/theme/locale/footer/tagsViewIcon/uniqueOpened/title）
- [x] `config/menu.ts` — `isUrl` / `pathResolve` / `resolveSingleChild` / `filterAffixRoutes` / `buildMenuTree`（router.getRoutes → MenuNode）
- [x] `styles/default-tokens.scss` — `--left-menu-*` / `--top-header-*` / `--app-content-*` 等 CSS 变量，亮/暗（`[data-theme='dark']`）双套
- [x] `components/MenuIcon.vue` — Element Plus 图标名 → 组件解析
- [x] `components/Logo.vue` — 品牌区（svg logo + 标题，折叠/compact 隐藏标题）
- [x] `components/Collapse.vue` — 折叠按钮
- [x] `components/Breadcrumb.vue` — 面包屑（route.matched 派生，icon 可选）
- [x] `components/AppMenu.vue` — el-menu 递归（vertical/horizontal、collapse、单子项提升、外链新开、popper 样式）
- [x] `components/PrimaryNav.vue` — 主导航 top/rail 两模式
- [x] `components/LayoutSwitcher.vue` — 四布局预览切换
- [x] `components/LocaleDropdown.vue` — zh-CN/en-US（appStore.locale）
- [x] `components/UserInfo.vue` — 字母头像 + 下拉退出（useLogout）
- [x] `components/ToolHeader.vue` — 组合以上（showCollapse/showBreadcrumb props）
- [x] `components/ContextMenu.vue` — el-dropdown 封装（右键/点击触发）
- [x] `components/TagsView.vue` — 页签滚动 + 右键菜单 + 工具按钮（左右滚动/刷新/更多）
- [x] `components/AppView.vue` — keep-alive RouterView + refresh key 机制 + Footer
- [x] `index.vue` — 四模式外壳 + 移动端抽屉遮罩 + Backtop

### 新建 workbench 验收模块
- [x] `pnpm new-module workbench`（生成骨架）
- [x] `views/Index.vue` — 工作台首页（index 子路由 + keep-alive 输入验证）
- [x] `views/Analysis.vue` + `views/Monitor.vue` — 嵌套菜单 + 页签缓存验证页
- [x] `routes/index.ts` — 父分组 meta + 3 children，挂 `@/layouts/default/index.vue`
- [x] `config/menu.spec.ts` — 15 用例锁定菜单树派生（createRouter 真实实例）

### 验证清单执行
- [x] `pnpm type-check:full` 通过
- [x] `pnpm lint` 通过（0 error）
- [x] `pnpm test` 通过（130 文件 / 1679 用例全绿，含新增 menu.spec.ts 15 用例）
- [x] `pnpm check:routes` 通过（16 routes，Workbench 三路由在列）
- [ ] `pnpm dev` 手动验收：`/workbench` 页面四模式切换、折叠、页签右键、主题/语言切换、移动端抽屉（用户侧执行，步骤见合规简报）
- [x] CHANGELOG.md 同步
- [x] 合规简报：src/ 写操作清单 + BEM 核查清单

## 四、四模式渲染矩阵（index.vue）

| 模式 | 顶栏 | 一级导航 | 二级侧栏 | ToolHeader 位置 |
|------|------|---------|---------|----------------|
| sidebar | 无 | 左侧栏（Logo+AppMenu） | 无（AppMenu 全量） | workspace 顶部 |
| top | Logo + AppMenu(horizontal) | 无 | 无 | topbar 右侧 |
| mixed | Logo + PrimaryNav(top) | 无 | AppMenu(secondaryRoutes) | topbar 右侧（含折叠） |
| dual | rail(Logo compact + PrimaryNav rail) | rail | AppMenu(secondaryRoutes) | workspace 顶部 |

移动端（≤767px）：一律 drawer 侧栏 + 遮罩，点遮罩收起。

## 五、验证清单（全部完成才收尾）

- [ ] `pnpm type-check:full` 通过
- [ ] `pnpm lint` 通过（0 error）
- [x] `pnpm test` 通过（130 文件 / 1679 用例全绿，含新增 menu.spec.ts 15 用例）
- [ ] `pnpm check:routes` 通过
- [ ] `pnpm dev` 手动验收：`/workbench` 页面四模式切换、折叠、页签右键、主题/语言切换、移动端抽屉
- [ ] CHANGELOG.md 同步
- [ ] 合规简报：src/ 写操作清单 + BEM 核查清单

## 六、进度日志

- 2026-09-09：方案确认（用户回复：四模式全做 / workbench / 确认）。store 扩展完成。
- 2026-09-09：layouts/default 全部组件 + index.vue 完成；旧 Header/Sidebar 已删；第三轮 type-check 清零（EP 2.14 prop 类型 bug 用 `as any` 绕过，同 PortalNav.vue 先例；MenuIcon name 放宽 `string | undefined`；vertical/horizontal 分支颜色改为固定值消除收窄后比较报错）。
- 2026-09-09：菜单树派生修两处边界（空 path 子路由 → 父路径去尾斜杠；子项全排除的父记录不再成幽灵分组）+ index 子路由标题继承父节点；新增 menu.spec.ts 15 用例全绿。workbench 验收模块完成（父分组 + 3 children + 双语 locale）。
- 2026-09-09：验证闭环——type-check:full ✓ / lint ✓ / test 1679 全绿 ✓ / check:routes 16 routes ✓ / vite transform 冒烟 7 模块 200 ✓（5174 已有用户 dev server，未新开）。剩用户手动验收。
- 2026-09-09（Phase 2 样式高保真对齐）：用户反馈「样式差距太大」。根因：参考仓 master 已重设计为现代亮色系（白侧栏 + 紫主色 #5b5bd6 + 毛玻璃顶栏），Phase 1 按旧版深色经典风实现。已从 GitHub API 拉取参考仓 var.css / Layout.vue / Menu / TagsView / Logo 等 16 个文件逐项对照修正：
  1. default-tokens.scss 整体重写为 var.css 精确值（亮/暗两套）；EP 变量覆盖（--el-color-primary 紫系 + slate 文字/边框色）以 mixin 导出、由 index.vue 施加在 .vv-default-layout 容器作用域——避免污染项目全局主题（theme-vars.scss 管理的 portal 布局主色不受影响）；布局专用变量仍全局定义（菜单弹层 teleport body 需取到）。
  2. index.vue：topbar/toolbar/tags 毛玻璃（color-mix 94%/96% + backdrop-filter blur(16px) + --layout-shadow）；secondary-title 颜色改 --logo-title-text-color 并保留紫色圆点；二级侧栏 AppMenu 背景透明化；模板挂 toolbar/tags BEM 类。
  3. Logo：mark 28→38px，标题色按 top/mixed（--top-header-text-color）与 sidebar/dual（--logo-title-text-color）分模式。
  4. AppMenu：补 .el-sub-menu__icon-arrow 1em、.el-menu--inline flex 列间隙布局、折叠态图标 22px、vertical gap 10px；水平弹层 teleport 取不到容器紫色主色 → 在 default 专属 popper 类局部定义 EP 变量（含 dark 覆盖）。
  5. AppView 内容区 min-height calc(100vh - 顶栏 - 页签)；ToolHeader padding 改 --top-tool-p-x；TagsView 背景移交布局壳（统一毛玻璃）；Breadcrumb :to 改显式 v-if 分支（EP 2.14 + TS6 exactOptionalPropertyTypes 不接收 :to="undefined"，消除 TS2379）。
  6. 尺寸对齐：224/72 侧栏宽、60px 顶栏、38px 页签、24px 内容 padding、50px 页脚。
  验证：type-check ✓ / eslint(default) ✓ / menu.spec 15 ✓ / check:routes ✓ / 官网截图对比：亮色（白侧栏紫主色）+ 暗色（#111827/#0b1120/#818cf8）均与 element-plus-admin.cn 一致；mixed 模式主导航 pill + 圆点二级标题正常；sass `&&` 复合选择器不被 dart-sass 1.101 支持，已改用单 &（背景职责移交布局壳）。
- 2026-09-09（Phase 3 EP 弹层变量映射）：用户反馈「下拉菜单 hover 样式与官网不同」。根因：teleport 到 body 的 EP 弹层（el-dropdown-menu 等）取不到 .vv-default-layout 容器内的紫色变量，回落项目全局主题（#409eff 蓝系）。评估过逐弹层类名补变量（dropdown/select/dialog 类名与 portal 全局共享，无法限定作用域，放弃）。最终方案（用户已确认 §2.4 修改申请）：
  1. 新增 `styles/element-overwrite.scss`——在 `[data-layout='default']` / `[data-theme='dark'][data-layout='default']` / auto media 选择器上施加与容器相同的 EP mixin（复用 default-tokens.scss 导出）。
  2. `index.vue` 生命周期：onMounted 写 `document.documentElement data-layout="default"`，onUnmounted 仅当值仍为 default 时清除（不误伤其他布局标记）。
  3. 属性随路由切换——portal 布局页面无此属性，弹层回落项目全局主题，无泄漏。
  验证：type-check ✓ / eslint ✓ / vite transform 200 ✓；浏览器实测（chrome-devtools，5174）：html 级变量亮 #5b5bd6/#eeeeff/#f5f6fa/#526077 全紫；用户下拉弹层项色 #526077、hover fill #eeeeff、hover 文字 #5b5bd6；auto 暗色模拟 html 级 #818cf8/#252c49/#151e30/#cbd5e1，弹层底色 #1b2538、hover #252c49/#818cf8 全部命中。CHANGELOG 已补 element-overwrite 条目。
