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
- 新增 `docs/06-主题管理规范.md`：双主题架构总览（CSS 变量 + Pinia store + composable 三层职责分离）、CSS 变量速查表（主题感知 + 主题无关）、`useTheme()` API 详解、4 种组件写法（主题感知 / 主题专属 / JS 动态控制 / 跨主题共享）、扩展指南（如何新增主题如 sepia，含 5 步操作）、评审 Checklist、FAQ。与 docs/05-BEM样式规范.md 编号连续
- 路由模块重构：(1) 新增 `src/router/types.ts`（`RouteName` 联合类型 + `RemoteMenuItem` 协议）；(2) 新增 `src/router/config.ts`（菜单模式配置，默认 dev=local / prod=remote，可通过 `VITE_MENU_SOURCE` 环境变量覆盖）；(3) 新增 `src/router/whitelist.ts`（按路由 name 匹配的白名单，含 `Login/Forbidden/NotFound/ServerError`）；(4) 新增 `src/router/component-registry.ts`（name → 视图组件映射，供 remote 模式按业务路由名查找组件）；(5) 新增 `src/router/remote.ts`（`fetchRemoteRoutes()` 调用 `/api/menu` 接口 + JSON → `RouteRecordRaw` 转换 + 失败回退空数组 + console.warn）；(6) 新增 `src/api/modules/menu.ts`（菜单 API）；(7) 改造 `src/router/guards/auth.ts`：用 `isWhiteListed` 按 name 判定白名单，remote 模式下首次登录时拉取远程菜单并 `router.addRoute` 注入，按 token 变化重置 `dynamicLoaded` 避免重复拉取；导出 `resetRouterState()` 供测试强制刷新
- 新增 `docs/07-路由模块设计.md`：架构总览（Mermaid 流程图）、菜单加载模式对比（local vs remote）、白名单设计决策（按 name 而非 path 的理由）、组件注册表必要性、远程菜单 JSON 格式协议、新增路由标准流程（5 步骤）、评审 Checklist、FAQ
- 路由模块重构（关注点分离 + 自动注册）：(1) 新增 `src/router/auto-register.ts`，用 Vite `import.meta.glob('/src/modules/**/routes/index.ts', { eager: true })` 自动扫描业务模块路由，业务模块新增路由**无需修改 `src/router/` 任何文件**；(2) `src/router/index.ts` 改用 `autoRegisteredRoutes` + `errorRoutes`（错误页单独手动注册，保证 catch-all 404 在最后）；(3) 把 3 个模块路由从 `src/router/modules/` 迁到对应 `src/modules/{auth,dashboard,user}/routes/index.ts`，`router/modules/auth.ts` / `dashboard.ts` / `user.ts` 三个文件 `git rm` 删除；(4) 视图组件 import 路径从 `@/modules/.../views/...` 改为相对路径 `../views/...`，保持目录内自包含
- 默认菜单模式改为 `remote`：`src/router/config.ts` 的 `resolveMenuSource()` 移除 `import.meta.env.DEV` 分支，未设环境变量时默认返回 `'remote'`（贴近生产）。`package.json` 新增 `dev:local` script（`cross-env VITE_MENU_SOURCE=local vite`），开发者本地启动可用 `pnpm dev:local` 切到 local 模式（无需接口）
- `docs/07-路由模块设计.md` 同步更新：架构图改为业务模块（`src/modules/<feature>/routes/index.ts`）+ 全局 `router/` 两层结构、新增路由标准流程改为 5 步骤（无需改 router 目录）、FAQ Q1 改为"dev 模式切 local"用法（`pnpm dev:local`）
- error 模块也采用自动注册机制：(1) 新增 `src/modules/error/routes/index.ts`（具名错误页 `/403` `/404` `/500` 自动注册）；(2) 新增 `src/router/fallback.ts`（catch-all `/:pathMatch(.*)*` 单独导出，避免 import.meta.glob 字典序导致 `/user/*` 被错误拦截）；(3) `src/router/index.ts` 改用 `autoRegisteredRoutes + fallbackRoute`；(4) `git rm src/router/modules/error.ts`。`src/router/` 目录再无 `modules/` 子目录，全模块统一自动注册（除 catch-all 兜底单独注册）
- `README.md` 同步更新：技术栈表加 `pinia-plugin-persistedstate`；目录结构补全 `src/router/` 全部新文件（auto-register / fallback / config / whitelist / types / component-registry / remote / guards）+ `src/modules/<feature>/routes/` 说明；常用脚本表加 `pnpm dev:local` / `pnpm analyze` / `pnpm lint` / `pnpm lint:fix` / `pnpm format`；Mock 数据表加 `menu` 模块（`/api/menu` 远程菜单接口）；新增"路由架构（自动注册）"小节（含 5 步新增业务模块流程）+ "样式管理（BEM + 双主题）"小节（含 `useTheme` composable 示例）；相关文档表格重构为 3 个分类（项目规范 / 设计计划 / 变更日志），新增 docs/04-07 引用
- 新增 `src/components/index.ts` Vue 插件：运行时扫描 `src/components/common/**` 下的所有 `.vue`，通过 `app.component()` 自动注册为全局组件；模板里可直接 `<AsyncState>` / `<ErrorBoundary>` 使用，无需 import。`_` / `.` 开头的文件视为内部组件自动跳过（如 `_internal/naming.ts` 自身）。同时 `src/main.ts` 增加 `app.use(GlobalComponents)` 接入。类型声明由 `unplugin-vue-components` 自动维护（`src/types/components.d.ts` 已含 `AsyncState` / `ErrorBoundary` 条目）
- 新增 `src/utils/bem.ts`：运行时 BEM 类名拼接工具（TypeScript 版本），提供 `createNamespace(name)` 生成 `b / e / m / be / bm / em / bem / is` 八个拼接函数。命名规则 `gm-{name}` 前缀对齐 Element Plus / Vant 主流约定，与 SCSS mixin 互补（运行时拼接 vs 编译期拼接）
- 新增 `src/utils/bem.spec.ts`：运行时 BEM 工具的 Vitest 单测，覆盖 8 个拼接函数 + 前缀规则 + 边界情况（空字符串、null、undefined），共 23 个用例
- 重构路由 component-registry：删除独立的 `src/router/component-registry.ts`，改为在 `src/router/auto-register.ts` 中从 `autoRegisteredRoutes` 派生 `COMPONENT_REGISTRY`（`Record<string, () => Promise<unknown>>`）。消除"路由配置 + 组件映射"双重维护，新增业务路由从 3 处改动降为 1 处。`scripts/check-routes.ts` 同步删除 component-registry 校验项，保留 RouteName + whitelist 校验
- 修复登录 API 路径重复：根因是 `src/api/http.ts` 的 `baseURL` 依赖 `.env` 的 `VITE_API_BASE_URL`（已含 `/api`），加上各 API 调用 url 各自带 `/api` 前缀，拼接成 `/api/api/auth/login` 与 mock 注册不匹配。修复：`baseURL` 改在 `http.ts` 显式定义常量 `'/api'`，所有 `src/api/modules/*.ts` 的 url 去掉 `/api` 前缀（共 9 处：auth × 3、menu × 1、user × 5）。baseURL 是请求前缀的唯一来源，url 只描述资源路径，避免双重拼接误配
- 修复 mock 接口全部返回 `{}`：根因是 `vite-plugin-mock` 中间件用 `JSON.stringify(...)` 序列化 mock response，原写法用 `async` 函数 + `await delay()`，调用返回 Promise，`JSON.stringify(Promise)` = `'{}'`。修复：`mock/{auth,user,dashboard}.ts` 全部 response 改为**同步函数**，`await delay()` 改为配置项 `timeout: ms`。vite-plugin-mock 源码不支持 async response（mockjs 的 `Mock.mock` 对 Promise 无处理）
- 安装依赖：`normalize.css@^8.0.1`（浏览器基线统一，CSS reset 替代）和 `dayjs@^1.11.21`（轻量日期库，Moment.js 替代）。`src/main.ts` 在 css 导入区顶部加 `import 'normalize.css'`（必须在所有自定义样式之前，确保浏览器基线最先 reset）。`dayjs` 仅安装，待业务场景明确后再接入 composable 或 store
- 新增 `src/utils/dayjs.ts` dayjs 通用封装 + `src/utils/dayjs.spec.ts` 12 个单测覆盖基础通用功能：`formatDate`（默认/自定义格式 + locale）/ `formatRelative`（"2 小时前" / "in 2 hours"）/ `daysFromNow`（date 距 now 的天数，未来正数过去负数）/ `isToday` / `parseDate`。`AppLocale = 'zh-CN' | 'en-US'` 与 dayjs locale 双向映射（`toDayjsLocale` 内部桥接）；注册常用 plugin：relativeTime + customParseFormat。后续业务场景明确后再扩展（utc / timezone / 跟随 appStore.locale 自动切换）
- 重构 `src/utils/storage.ts`：按参考模式重写为 `Local`（localStorage 包装）/ `Session`（sessionStorage 包装，token 走 cookie）/ `clearCookies` 三个 API + `APP_NAMESPACE` 命名空间（从独立的 `VITE_STORAGE_NAMESPACE` 读取，fallback 'gm-portal-fe'，**与展示用的 VITE_APP_TITLE 解耦**）。新增依赖 `js-cookie@^3.0.8` + `@types/js-cookie@^3.0.6`（devDependencies）。`src/types/env.d.ts` 加 `VITE_STORAGE_NAMESPACE: string` 字段。`src/utils/storage.spec.ts` 15 个单测覆盖 set/get/remove/clear + 命名空间隔离 + token cookie 特殊路径。原 storage 单 API（带 TTL 机制）整体替换，**业务代码无 import 依赖故无破坏性影响**（grep 确认只在 spec 自身用了旧 storage）。后续如需 TTL 能力可作为增强项加回
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