# Changelog

## Unreleased

### Added

- 新增 `docs/01-工具兼容性问题踩坑记录.md`：项目级工具兼容性知识库，记录 npm vs pnpm 符号链接不兼容等问题的根因、复现步骤与解决方案
- 新增 `src/assets/styles/mixins/bem.scss`：BEM 编程式 mixin 工具（`b`/`e`/`m`/`is`/`when`/`reset-block`），编译产物与手写 BEM 字符串完全等价，支持嵌套作用域自动拼接 Block 前缀
- 新增 `docs/05-BEM样式规范.md`：BEM 命名约定、样式隔离三层防线（`scoped` + SCSS `@use` + BEM 命名空间）、文件组织、评审 Checklist、FAQ
- 改造 `src/components/layout/Header.vue` 作为 BEM 示范组件：演示 Block + Element + State + `:deep()` 穿透 Element Plus 四种用法的组合
- 再次改造 `src/components/layout/Header.vue`：切换为运行时 BEM 工具（`createNamespace('header-bar')`）生成 `:class` 类名，模板与 `<style>` 统一使用 `gm-header-bar` 命名空间，演示 SCSS mixin（编译期）与 JS 工具（运行时）协同工作的完整链路
- 全局前缀 `c-` 改为 `gm-`：运行时 BEM 工具的 `createNamespace` 输出前缀从 `c-{name}` 变更为 `gm-{name}`，对齐项目目录前缀命名（gm-portal-fe）。涉及文件：`src/utils/bem.ts`（核心代码 + 注释 + JSDoc 示例）、`src/utils/bem.spec.ts`（20 个测试断言）、`src/components/layout/Header.vue`（注释 + SCSS mixin 调用 + CSS 选择器）
- 重构 `src/utils/bem.ts`：`createBEM` 内部从"内联箭头函数 + const"重构为"对象字面量方法 + 显式返回类型"，让每个方法都带 JSDoc（含 `@example`）。IDE hover `bem.b()` / `bem.e()` 等方法时即可看到使用示例，无需跳转到定义。行为零变化（20 个 bem 单测断言全过）
- 规划全局样式文件管理：新建 `src/assets/styles/element-plus.scss`（Element Plus 5 个主色覆盖）、`src/assets/styles/custom.scss`（复合场景工具类）；填充 `src/assets/styles/transition.scss`（5 个 `@keyframes` + 3 个过渡工具类 + `prefers-reduced-motion` 适配）；新建 `src/assets/styles/mixins/transitions.scss`（3 个过渡 mixin）和 `src/assets/styles/mixins/responsive.scss`（`gm-responsive`/`gm-responsive-down` 响应式断点 mixin）；重构 `src/assets/styles/index.scss` 为纯入口，按 `reset → variables → transition → element-plus → custom` 顺序 `@use`，顶部说明加载顺序约定。`main.ts` 引用方式不变（仍只导入 `index.scss`）
- `variables.css` 重命名为 `variables.scss`：CSS 自定义属性本身不变，文件后缀改为 `.scss` 是为后续用 SCSS 函数派生变量预留扩展点。`index.scss` 的 `@use` 引用同步更新
- 全局滚动条样式（webkit 内核）从 `.gm-scrollbar-thin` 工具类（`custom.scss`）升级为项目级全局规则（追加到 `reset.css` 末尾）：`::-webkit-scrollbar-track-piece` / `::-webkit-scrollbar` / `::-webkit-scrollbar-thumb` / `::-webkit-scrollbar-thumb:hover` 四组伪元素选择器，全站滚动条统一风格。`custom.scss` 中冗余的 `.gm-scrollbar-thin` 工具类删除
- `src/assets/styles/element-plus.scss` 重命名为 `element-overwrite.scss`：`git mv` 保留文件历史，新文件名更准确表达"覆盖第三方组件库样式" 的职责（不限于 Element Plus）。`index.scss` 的 `@use` 引用同步更新
- 新增 `src/assets/styles/theme.scss`：预留白天（light，默认）+ 黑夜（dark）双主题基础样式。设计要点：(1) 用 SCSS `@mixin theme-light` / `@mixin theme-dark` 集中定义变量，避免 light/dark 块重复；(2) 选择器分离：`:root, [data-theme='light']` 应用 light，`[data-theme='dark']` 应用 dark，`@media (prefers-color-scheme: dark) :root:not([data-theme])` 跟随系统；(3) 变量命名 `--bg-* / --text-* / --border-*` 与 Element Plus / Vant 对齐；(4) 末尾预留扩展示例（sepia / high-contrast 等），未来加新主题只需新加 mixin + 选择器块；(5) 主题只覆盖"主题感知"变量（背景/文字/边框），品牌色仍由 `variables.scss` 管理。`index.scss` 加载位置：variables 之后，transition 之前
- `variables.scss` 补充 6 大类 CSS 变量：字号（`--font-size-*` × 7）/ 字重（`--font-weight-*` × 4）/ 行高（`--line-height-*` × 3）/ 字体族（`--font-family-base/mono`）/ 阴影（`--shadow-sm/md/lg`）/ z-index（`--z-index-dropdown..toast` × 8）/ 动画时长（`--duration-fast/normal/slow`）/ 缓动函数（`--ease-out/in/in-out`）。同时新增 5 个 SCSS `$color-*` 编译期常量，供 `element-overwrite.scss` 在编译期计算灯色阶
- 新增主题运行时切换能力：依赖 `pinia-plugin-persistedstate@^4.7.1`（pinia 官方推荐持久化插件，成熟开源）；新增 `src/store/modules/theme.ts`（Pinia setup store，含 `mode`/`isDark`/`setMode`/`toggleMode`，`mode` 字段通过 `persist: { pick: ['mode'] }` 自动写入 localStorage，key 为 `theme-mode`）；新增 `src/composables/useTheme.ts`（对 store 的便捷封装，组件用 `const { mode, isDark, setMode, toggleMode } = useTheme()`）；`src/store/index.ts` 注册 `pinia.use(piniaPluginPersistedstate)`，并 export theme store
- `element-overwrite.scss` 加 Element Plus 灯色阶覆盖：新增 `el-light-variants($name, $color)` mixin，用 SCSS `color.mix($color, white, N%)` 计算 5 个主色 × 5 个灯色阶（light-3/5/7/8/9）= 25 个 CSS 变量。Element Plus 按钮/标签等组件的 hover/active/淡化背景自动跟随项目品牌色，不再出现"突兀的默认蓝"
- `uno.config.ts` 删除 `flex-center` / `flex-between` shortcuts，统一使用 `custom.scss` 的 `.gm-flex-center` / `.gm-flex-between`（见 docs/05-BEM样式规范.md），消除两套并行的命名空间混淆
- 新增 `src/utils/bem.ts`：运行时 BEM 类名拼接工具（TypeScript 版本），提供 `createNamespace(name)` 生成 `b / e / m / be / bm / em / bem / is` 八个拼接函数。命名规则 `gm-{name}` 前缀对齐 Element Plus / Vant 主流约定，与 SCSS mixin 互补（运行时拼接 vs 编译期拼接）
- 新增 `src/utils/bem.spec.ts`：运行时 BEM 工具的 Vitest 单测，覆盖 8 个拼接函数 + 前缀规则 + 边界情况（空字符串、null、undefined），共 23 个用例

### Changed

- 重构 `vite.config.ts` 的 `manualChunks`：将 3 个 vendor 分组的硬编码 if 链抽成顶部 `vendorChunks` 配置数组，新增分组只需追加配置项，函数体简化为遍历 + 默认 `vendor-utils` 兜底。行为零变化：3 个 vendor chunk 体积（gzip: 2.82 / 167.31 / 43.51 kB）与重构前完全一致

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