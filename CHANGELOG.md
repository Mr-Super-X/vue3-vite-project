# Changelog

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
  - 新增 `src/components/common/TagsView/index.vue`：横排可滚动 + 单击切换 + 中键/右键菜单关闭 + affix 隐藏关闭按钮；BEM 命名空间 `gm-tags-view`
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