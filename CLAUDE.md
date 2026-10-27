# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 本文档是 `~/.claude/CLAUDE.md` 的项目级补充。所有全局规则（§一～§十一）自动适用，遇到冲突以**本文档为准**。
>
> **文档版本**：v3.0.2 | **生成日期**：2026-10-26 | **生效分支**：`feature/monorepo`
>
> **最近更新**（2026-10-26）：本地同域网关 node 化——`docker-compose.yml` / `docker/nginx.dev.conf` / `check-gateway-conf` 整体移除
>
> - **v3.0.2 变更**（2026-10-26）：`scripts/node-gateway.ts`（零依赖 node:http 反向代理，路由表自 `apps-registry` 单源代码派生）+ `pnpm dev:gateway` 一体化单命令（网关 :8080 + 6 dev server 同起同退，替代原 docker compose 第二终端）；`validatePortWiring`（端口双写锁死）迁入 `check-routes`，CI 覆盖不变；新增 `pnpm test:gateway`（node:test，HTTP/WS/302/502 smoke 8 用例）；docs/43 §6 重写
>
> **v3.0.1 变更**（2026-10-23）：架构审查「别名→包名迁移立场」——新增 §1.6.2 包消费约定
>
> - **v3.0.0 变更**（2026-10-22）：单应用 `src/` 正式升级为 pnpm workspace + turbo Monorepo（设计稿 `docs/superpowers/specs/2026-10-21-monorepo-migration-design.md`，评估 `docs/42`）——
>   - **结构**：6 应用（`apps/admin` 中后台 / `apps/auth` 统一登录 / `apps/portal` 门户 / `apps/h5` 移动端 / `apps/big` 数据大屏 / `apps/docs` 组件示例文档）+ 4 包（`packages/config` vite 工厂 / `packages/mock` mock 数据 / `packages/shared` 网络层·store·composables / `packages/ui` 全局组件·弹窗族），详见 docs/43
>   - **§2 全面改写**：src/ Architecture Lockdown → apps/packages workspace 治理版（依赖方向铁律 + 例外/申请/验证机制保留）
>   - **CI/CD**：ci.yml 改 turbo affected（PR `--filter=[origin/master]...`，master 全量，`.turbo` 缓存接 actions/cache）；deploy.yml 改 `pnpm build:pages` 六应用聚合（base 由脚本内 `REPO_PREFIX` 按 app 注入）
>   - **本地同域网关**：`docker-compose.yml` + `docker/nginx.dev.conf`（:8080 反代 5174-5179，保留前缀）+ `pnpm dev:gateway`（6 app 带 base 并行 dev，scripts/dev-gateway.ts）
>   - **统一登录协议**：未登录守卫整页跳 `${VITE_AUTH_ORIGIN}/login?redirect=...`（缺省 `/auth`，env 注入），cookie 同域漫游
>
> **v3.0.1 变更**（2026-10-23）：架构审查「别名→包名迁移立场」落地——新增 §1.6.2「包消费约定」：立场定为「别名为 app 内部快捷方式（`@/` 永久保留），跨包消费走 `@vv/shared` / `@vv/ui` 包名 barrel；别名深层路径（`@utils/@store/@api` 等直达包内部）定性为 D4 平滑迁移的过渡态遗留，新代码禁止新增、存量渐进收敛」；配套 codemod 收敛 3 个深层热点（`@utils/safeAsync`×15 / `@store/modules/app`×10 / `@store/modules/user`×7 + vi.mock 说明符×4，31 文件 36 处，`scripts/codemod-alias-hotspots.mjs` 一次性执行后删除）；别名定义（`packages/config/src/app-aliases.ts`）原样保留以兼容存量
>
> **v2.2.1 及更早版本历史**（单应用 src/ 时期，治理条款已由 v3.0.0 §2 取代）：
>
> - **v2.2.1 变更**（2026-10-21）：gh-pages 演示站恢复 demo 路由——`src/modules/demo/routes/index.ts` 的 DEV 门控放宽为 `isDemoRoutesEnabled`（dev 或 `VITE_DEMO_NO_AUTH=true` 演示构建均注册 demo 路由 + glob 组件，常规 prod 仍整体 tree-shake 剔除，实测 36 chunk/4.0M vs 演示构建 182 chunk/11M）；`src/router/whitelist.ts` 提取 `demoWhitelistNames` 模块级常量同条件吸收（内联 `[]` 会截断 check-routes 的正则提取，实测踩坑）；CHANGELOG「未发布」区新增 fix 节；docs/07/09/23/39 + README 文档表同步
> - **v2.2 变更**：① home 模块重构为「星澜科技」黑白极简企业官网（portal 布局 64px 极简顶栏 + 锚点导航 scroll-spy；`SiteHero` / `SiteFeatures` / `SiteStats` / `SiteAbout` / `SiteFooter` 5 个静态展示组件 + `config/site.ts` 文案单源；`/home` 走白名单公开访问）② gh-pages 自动化部署（`.github/workflows/deploy.yml`，push master 发布线上 demo；构建四开关 `VITE_BASE` / `VITE_HISTORY_MODE=hash` / `VITE_MENU_SOURCE=local` / `VITE_USE_MOCK=true`）③ mock 生产接线（`mock/mockProdServer.ts` client 侧 `createProdMockServer`，vite-plugin-mock@3.0.2 无 prodEnabled；`main.ts` PROD 守卫防 dev 双重劫持 + `use(router)` 前阻塞 await 根治拦截窗口穿透）④ 团队级图标体系（unplugin-icons 编译期内联 + `<i-ep-* />` 静态语法 / `<AppDynamicIcon>` 动态语法 + `src/assets/icons/` 本地 app 集合，见 docs/39）⑤ `VITE_DEMO_NO_AUTH` 演示模式（守卫跳过登录/权限校验，gh-pages 全站可演示）
> - 同步修订 `README.md`：顶部最近更新、§1/§3 user store 口径（httpOnly cookie，无 token 落 localStorage）、§目录结构（modules 去 orders / common 组件清单补全 / store 补 tags-view+dict / plugins 补 remAdaptation+webVitals / directives 补 auth+copy+draggable / mock 补 dict+pro-table+mockProdServer）、§常用脚本补 test:e2e(e2e:install)、§环境变量补 VITE_DEMO_NO_AUTH、§测试节实测阈值 50/48/45/50 + e2e、§相关文档表补 docs/30-39、§CI/CD 指向真实 ci.yml/deploy.yml、§技术栈补 unplugin-icons
>
> **v2.1 变更**（2026-10-15）：新增 big layout + scale 适配（数据大屏/拼接屏面板能力）
>
> - **v2.1 变更**：`src/layouts/big/`（纯壳布局 + config/scale.ts 运行时，transform: scale 等比缩放 + 居中留白，只缩放自有容器不碰 html/body）+ `src/modules/big-demo` 示例模块（`/big-demo` 1920 标准屏 + `/big-demo/wide` 9000×1080 超宽拼接屏，均免登录白名单）；设计稿尺寸经路由 `meta.bigScreen = { width, height }` 声明（缺省 1920×1080）；适配 1920/2560/4K/9000px 拼接屏；使用指南见 `docs/35-大屏布局与scale适配.md`
>
> **v2.0 变更**（2026-10-14）：新增 h5 layout + rem 适配（H5 移动端面板能力）
>
> - **v2.0 变更**：`src/layouts/h5/`（布局壳 + config/rem.ts 运行时）+ `src/plugins/remAdaptation.ts`（viewport 幂等）+ `build/postcss.ts`（postcss-pxtorem 编译时 px→rem，仅转换 `src/layouts/h5/` 与 `src/modules/h5-*/` 前缀约定目录）+ `src/modules/h5-demo` 示例模块（`/h5-demo` 免登录白名单）；使用指南见 `docs/34-H5布局与rem适配.md`
>
> - **v1.9 变更**：3 专项审计（8 composable + 5 组件 + 单测/CHANGELOG）共发现 18 项差异，**全部已修复**：
>   - **组件契约**（docs/29 + docs/24）：ProTable 新增 §1.4 Events 表（sort-change/filter-change/engine-fallback）+ §1.5 Slots 表 + §7.5 SummaryAggregate 枚举；新增 `filterParamsAdapter` prop + `getFilterState()` expose；XForm 新增 Slots 段（footer/toastContainer）
>   - **Composable 契约**（docs/07 + docs/23 + docs/27）：useAppRouter 新增 `pushByNameStrict` + `name: string` 类型放宽说明；useLogout 切 `useConfirm` 路径同步 + `loggingOut` 字段补全；useAuth 空数组语义；useConfirm 默认值表
>   - **单测/CHANGELOG**（docs/04 + CHANGELOG）：line 596 deduper/request-coalescer 笔误修复；line 595 useTheme 幽灵 spec 修正；§常用命令补 `test:e2e` + `test:e2e:install`；§测试清单补 4 行（ProDialogForm/form-schema 子目录/layouts/default/demo）；CHANGELOG 顶部新增 v3.5 PR2（filterParamsAdapter / 事件完整披露）+ PR3（ProColumn\<T\> 泛型 9 commit）+ A11y 改造（10 commit）三条独立章节
> - **v1.8 变更**（同日，前一轮全代码库审计）：§1.3 状态管理分层修订——明确 barrel `src/store/index.ts` 实际导出 5 个全局 store（app/user/theme/tags-view/dict），`tags-view` 多页签刻意不持久化、`dict` 5min TTL；`useRouterStore`（`src/store/modules/router.ts`）**不在 barrel**，由 `router/guards/remote-menu.ts` 内部消费，不属于跨模块共享
> - 同步修订 `README.md`：§1.2 架构图、`§3 状态管理分层`、`§4 Layout 速选`（新增 portal）、`§6 BEM`（新增 bem.em() 语义）、`§目录结构`（composables 列表补全）、`§Mock 数据` 表格式、`§环境变量`（VITE_API_BASE_URL 默认值修正）
> - 同步修订 `docs/04-构建与测试工具.md` §测试文件清单：补 caseConvert/theme/plugins/ProTable/form-schema/demo/portal/auth/build 等遗漏条目
> - 同步修订 `docs/07-路由模块设计.md` §Layout 选择速查：新增 portal layout（顶部水平导航）
>
> **v1.7 变更**（2026-09-18）：§1.7 / §1.6 / §4 #15 三处修订——`unplugin-vue-components` 实际 dirs 为 `['src/components/common', 'src/components/ProTable', 'src/components/form-schema']` + `deep: true`（vite.config.ts:74-82），三目录下所有 .vue（含深层子目录，如 `ProDialog/` / `XForm` / `ProTable`）均自动注册，**都不要显式 import**。旧版「只扫 components/common 一级 / 子目录组件（form-schema/ProDialog/ 等）需显式 import」描述与 vite.config 实际配置矛盾（Wave4-4 AskUserQuestion 决策选 B 修订 CLAUDE.md，保留 vite.config 现状）
>
> - 同步删除「unplugin 默认 dirs 只扫一级」错误机制说明（实际 deep: true 深扫）
> - 检测方法从「删除 `import Xxx from '@/components/common/...'`」泛化为「删除 `import Xxx from '...'`」
>
> **v1.6 更新**（2026-09-17）：同步文档与最新代码对齐
>
> - `docs/11-字典使用规范.md` v2 重写：useDict 由单 key 形态（`{options, getLabel, refresh, loading}`）升级为多 code 契约形态（`{ gender, user_status, refreshDict }`）
> - `docs/27-ProDialog使用指南.md` 新增 §8.5 `useConfirm` 命令式二次确认章节；测试覆盖表加 `useConfirm.spec.ts` 4 例
> - `docs/10-新手指引.md` 新增 §3.7 `useConfirm` / `useDialog` 命令式弹窗示例
> - `docs/26-项目推荐说明.md` 新增"组件级杀手锏"小节（ProTable v3.4 / ProDialog v1.1 / ProDialogForm / XForm / RichTextEditor 等）+ 完整文档索引
> - `docs/32-常用交互指令.md` §3 修正 `docs/34-权限设计.md` 错位路径 → `docs/23-权限设计.md`；§7 相关文档补 v-copy 自身引用
> - `docs/04-构建与测试工具.md` 测试覆盖表补 `useDialog` / `useConfirm` / `useTheme` 三个 composable spec
> - `README.md` 顶部"最近更新"对齐本次同步范围
>
> **v1.5 变更**：新增 §1.7「组件全局注册与 IDE 智能提示（强约束）」—— 明确 `components/common/**` 下的全局组件**不要显式 import**，依赖 `unplugin-vue-components` 自动注册；显式 import 会让 Volar 在 ESM 路径下丢失 `DefineComponent` 完整类型展开，hover 只显示 `import Xxx`。同步修正 §1.6 表格中"项目内业务模块"行（原措辞会让消费方误写 import），§4 Project Constraints 新增 #15。
>
> **v1.4 变更**：新增 `useConfirm` composable —— 二次确认 Hook（取消 resolve false）；§1.5 必用 composable 列表补 `useConfirm`；AutoImport 标识符表（§1.6 + §1.6.1）补 `useConfirm`；§2.1 composables 描述补 `useConfirm`。
>
> **v1.3 变更**：Commands 表补全 6 个脚本（`bench` / `bench:check` / `remove-module` / `check:aliases` / `check:doc-currency` / `generate:tsconfig-paths`）；AutoImport 标识符表补 `useDict` / `useTheme`；§2.1 业务模块清单补 `workbench`；Directives 描述补 `v-auth` / `v-draggable`；composables 描述补 `useDialog` / `useDict` / `useTheme`；§1.5 必用 composable 列表补 `useDialog`。

---

## Commands

| 任务                                                   | 命令                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 安装依赖                                               | `pnpm install`                                                                         |
| 启动 dev（turbo 并行全部 app，remote 菜单模式）        | `pnpm dev`                                                                             |
| 启动单 app dev（如只起 admin）                         | `pnpm -C apps/<a> dev`（或 `dev:local` 本地菜单模式）                                  |
| 同域网关 dev（node 网关 :8080 + 6 app 带 base 单命令） | `pnpm dev:gateway`（唯一命令 → http://localhost:8080）                                 |
| 跑全部单测（turbo 拓扑序 6 app + 4 包）                | `pnpm test`                                                                            |
| 跑单 app / 单文件单测                                  | `pnpm -C apps/<a> test [path]`（如 `pnpm -C apps/admin test src/utils/dayjs.spec.ts`） |
| 单测覆盖率 / UI 模式（admin 口径）                     | `pnpm test:coverage` / `pnpm test:ui`                                                  |
| 跑基准测试（vitest bench，admin）                      | `pnpm bench`                                                                           |
| 类型校验（turbo，各 app vue-tsc --build）              | `pnpm type-check`（单 app 增量）/ `pnpm -C apps/<a> type-check:full`（全量）           |
| 构建生产包（turbo 拓扑序；含 type-check:full 门禁）    | `pnpm build`                                                                           |
| 单 app 仅构建（不门禁类型）                            | `pnpm -C apps/<a> build-only`                                                          |
| 预览单 app 生产包                                      | `pnpm -C apps/<a> preview`                                                             |
| gh-pages 六应用聚合构建（自动发现 apps/*）             | `pnpm build:pages`（产物根 `dist/<app>/` + 落地页）                                    |
| 包体积分析（输出 dist/stats.html，admin）              | `pnpm analyze`                                                                         |
| Lint 检查                                              | `pnpm lint`                                                                            |
| Lint 自动修复                                          | `pnpm lint:fix`                                                                        |
| Prettier 格式化                                        | `pnpm format` / `pnpm format:check`                                                    |
| 路由一致性校验（CI 阶段强制）                          | `pnpm check:routes`（内含端口双写锁死 + 注册表反向校验）                               |
| alias 单一来源一致性校验（CI 阻断）                    | `pnpm check:aliases`                                                                   |
| mock 双接线一致性校验（CI 阻断）                       | `pnpm check:mock-wiring`                                                               |
| 文档与代码硬数据一致性校验（CI 阻断）                  | `pnpm check:doc-currency`                                                              |
| 从 app-aliases.ts 同步 tsconfig paths                  | `pnpm generate:tsconfig-paths`（源：`packages/config/src/app-aliases.ts`）             |
| 新建业务模块（自动生成 6 个骨架文件）                  | `pnpm new-module <kebab-name>`                                                         |
| 移除业务模块（默认 dry-run + 确认）                    | `pnpm remove-module <kebab-name>`                                                      |
| 提交并推送（add + cz + push 一站式）                   | `pnpm push`                                                                            |
| 发布版本（bump + CHANGELOG + tag + push）              | `pnpm release`                                                                         |
| 发布预览（dry-run，0 副作用）                          | `pnpm release:dry`                                                                     |

**环境要求**：Node `>=22.18` 或 `>=24.12`，pnpm `>=11.x`（`package.json:engines` + `preinstall` 硬强制 `only-allow pnpm`）。

---

## §1 Architecture

Feature-Sliced 风格的中后台门户前端（`vue3-vite-project`，企业中后台管理）：Vue 3.5 + TypeScript 6 + Vite 8 + Pinia 3 + Element Plus 2.14 + Vue Router 5。

### 1.1 分层视角

```text
全局层（跨模块共享）                业务模块层（独立自治）
├── api/                            ├── modules/auth/
├── components/common/              ├── modules/home/
├── composables/                    ├── modules/orders/
├── directives/                     ├── modules/reports/
├── enums/                          ├── modules/user/
├── layouts/                        ├── modules/demo/
├── locales/                        └── modules/error/
├── plugins/                          模块按需要包含：views/ + routes/
├── router/                                      + store/ + apis/ + components/
├── store/modules/                               + config/ + styles/ + index.ts
├── types/                                       （非 6 件套强制，见 docs/08）
├── types/
└── utils/（与框架解耦）
```

### 1.2 模块边界铁律（强制）

| 层级                       | 允许引用                                                                                                                              | 不允许引用                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `modules/<m>/views`        | 本模块 components / composables / utils / api；`layouts/<m>/config` 暴露的类型契约（inject/provide 跨层所需，如 BIG_SCALE_STATE_KEY） | 其他模块内部                                     |
| `modules/<m>/components`   | 本模块 views / composables / utils                                                                                                    | 其他模块                                         |
| `modules/<m>/store`        | 本模块 api / types                                                                                                                    | 其他模块 store                                   |
| `components/common`        | utils / enums / types / store/modules                                                                                                 | 任何 `modules/` 内容                             |
| `layouts/<m>/`             | 本布局内 `components/` / `config/` / `images/` / `styles/` + utils / enums / types / store/modules / composables                      | `@/components/` 下任何内容、其他 `layouts/` 内容 |
| `store/modules`（全局）    | api / utils / enums                                                                                                                   | `modules/` 内容                                  |
| `directives/` / `plugins/` | utils / enums / types / store/modules                                                                                                 | `modules/` 内容                                  |

模块间通信通过 `modules/<m>/index.ts` 对外接口暴露，**禁止直接 import 其他模块内部文件**。

### 1.3 状态管理分层

- **全局 `store/modules/`**（经 `src/store/index.ts` barrel 导出）：仅跨模块共享
  - `app`（侧边栏/语言/布局模式/移动端断点/globalLoading，`pick: ['layout', 'locale']` 持久化）
  - `user`（authenticated 标记 / profile / 权限码。2026-08-12 起 httpOnly cookie 模式：凭证由后端 Set-Cookie 管理、前端不可读，`Session.get('auth')`（sessionStorage）仅为守卫同步判断的登录标记；**无 token 落 localStorage**，profile/permissions 内存态不持久化）
  - `theme`（主题模式 + 品牌色，`pick: ['mode', 'primaryColor']` 持久化）
  - `tags-view`（已访问路由 + keep-alive 缓存名单，**刻意不持久化**避免换账号看到老 tab）
  - `dict`（字典项业务层缓存，5min TTL + Promise 防抖池）
  - 注：`src/store/modules/router.ts` 内的 `useRouterStore`（远程菜单加载态/路由错误）**不在 barrel**，由 `router/guards/remote-menu.ts` 直接消费，不属于跨模块共享
- **模块私有 store**：归 `modules/<m>/store/`，业务状态不污染全局
- **风格**：Pinia Setup Store（接近 composables 心智，便于复用）
- **持久化**：`pinia-plugin-persistedstate` 仅对 store 字段 `pick` 持久化（避免整体写 localStorage）

### 1.4 防御性 UI（每个异步组件强制三态）

`useRequest` composable 自动提供 `{ data, loading, error, isEmpty, execute }`，包装到 `<AsyncState>` 组件：

```vue
<AsyncState :loading="loading" :error="error" :is-empty="isEmpty" @retry="execute">
  <UserTable :rows="data ?? []" />
</AsyncState>
```

### 1.5 业务代码强制封装（ESLint 规则 + 规范双轨制）

业务代码**禁止**直接 `import { useRouter } from 'vue-router'` 或 `import axios from 'axios'`，**必须**用项目封装：

| 场景                            | 必须用                                                                  | ESLint 规则约束                                         |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| 路由（跳转/参数/back）          | `@composables/useAppRouter`                                             | ✅ `no-restricted-imports` warn（vue-router/useRouter） |
| 网络请求（三态 + 错误处理）     | `@composables/useRequest`                                               | ✅ `no-restricted-imports` warn（axios / axios/*）      |
| 权限（AND / ANY 语义）          | `@composables/useAuth`（`hasPerm` / `hasAnyPerm`）                      | ⚠️ 规范 + code review 兜底（暂无 ESLint 规则）          |
| 命令式弹窗（确认/取消 Promise） | `@composables/useDialog`（取消 reject `DialogCancelledError`）          | ⚠️ 规范 + code review 兜底（暂无 ESLint 规则）          |
| 二次确认（取消 resolve false）  | `@composables/useConfirm`（取消 resolve `false`，调用方无须 try/catch） | ⚠️ 规范 + code review 兜底（暂无 ESLint 规则）          |

> **DS-8 修订说明**：原措辞"ESLint `no-restricted-imports` 自动 warning"对全部 5 条均成立，但实测 ESLint **仅约束前 2 条**（`useAppRouter` / `useRequest`）；后 3 条（`useAuth` / `useDialog` / `useConfirm`）暂无 ESLint 规则，靠项目规范 + code review 兜底。详见 [`docs/02-代码质量工具链.md`](docs/02-代码质量工具链.md) §"项目自定义 ESLint 规则"。

### 1.6 AutoImport 自动导入（无须显式 `import`）

> `packages/config/src/create-vite-config.ts` 通过 `unplugin-auto-import` 配置了**5 类**自动注入到 `<script setup>` 全局作用域（详见各 app 的 `apps/<a>/src/types/auto-imports.d.ts`，dev/build 时生成）。
> **写代码时这些内容无须再写 `import` 语句**——会自动可用。

| 类别                 | 来源                                      | 自动注入的标识符（示例）                                                                                                                      |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vue 核心**         | `'vue'`                                   | `ref`、`reactive`、`computed`、`watch`、`watchEffect`、`onMounted`、`onUnmounted`、`nextTick`、`defineProps`、`defineEmits`、`defineModel` 等 |
| **Vue Router**       | `'vue-router'`                            | `useRoute`、`useRouter`、`useLink`、`RouterLink`、`RouterView` 等                                                                             |
| **Pinia**            | `'pinia'`                                 | `defineStore`、`storeToRefs`、`acceptHMRUpdate` 等                                                                                            |
| **业务 composables** | `'@vv/shared'` + `'@vv/ui/composables/*'` | `useAppRouter`、`useRequest`、`useAuth`、`useDict`（`@vv/shared`）；`useDialog`、`useConfirm`、`useLogout`（`@vv/ui` 包路径注入）             |
| **业务 utils**       | `'@vv/shared'`                            | `createNamespace`（BEM 运行时工具）                                                                                                           |

#### 正确示例

```ts
// ✅ script setup 块无须 import，直接使用
const bem = createNamespace('user-card')
const router = useAppRouter()
const route = useRoute()
const count = ref(0)
const { data } = storeToRefs(useUserStore())
```

```ts 错误示例（禁止）
// ❌ 冗余 import：与 AutoImport 冲突，导致重复声明警告
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { createNamespace } from '@vv/shared'
import { useAppRouter } from '@vv/shared'
```

#### 仍需显式 import 的内容

AutoImport **未覆盖**以下内容，仍必须写 import：

> **路径约定**：app 内跨目录引用优先用 alias（`@/` 等，由 `packages/config/src/app-aliases.ts` 的 `createAppAliases(appRoot)` 统一生成）；同目录兄弟文件用 `./` 相对路径即可。新增子目录需同步 app-aliases.ts 与 tsconfig paths（`pnpm generate:tsconfig-paths` 自动收敛）。

| 类型                                                       | 示例                                                                     | 原因                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 第三方 UI 库组件                                           | `import { User, Lock } from '@element-plus/icons-vue'`                   | element-plus 用 `unplugin-vue-components` 按需注入，与 AutoImport 是两套机制                                                                                                                         |
| 第三方工具库                                               | `import dayjs from 'dayjs'`                                              | 不在 AutoImport 配置列表中                                                                                                                                                                           |
| 全局组件（`@vv/ui` 包三目录 + app 私有 `src/components/`） | **不要 import**，模板直接 `<BaseChart />` / `<ProTable />` / `<XForm />` | `unplugin-vue-components` 自动注入到 `vue.GlobalComponents`（dirs 含 @vv/ui 包源码三目录 + appRoot/src/components，deep: true）；显式 import 会让 IDE hover 丢失 `DefineComponent` 展开（详见 §1.7） |
| app 内其他子目录组件（非自动注册）                         | `import Xxx from '@/components/sub/Xxx.vue'`                             | 仅当组件不在自动注册 dirs 内时才需显式 import                                                                                                                                                        |
| 未注入的 shared composable（`useTheme`）                   | `import { useTheme } from '@vv/shared'`                                  | 工厂 `VV_SOURCE_MODULES` 未注入 `useTheme`（全仓仅 admin ToolHeader 消费，低频 API 不污染 setup 全局作用域）                                                                                         |
| 类型导入                                                   | `import type { UserProfile } from '@/api/modules/auth'`                  | 类型 import 不参与运行时，但 TS 编译器需要                                                                                                                                                           |
| SCSS / 资源文件                                            | `import './styles/login.scss'`（在 `<style>` 中用 `@use`）               | CSS 走 vite 资源管线，与 JS AutoImport 解耦                                                                                                                                                          |

> **新增可自动注入的标识符**：改 `packages/config/src/create-vite-config.ts` 的 `AutoImport.imports` 数组 + 重启 dev server，**无须**为每个组件手动加 import（工厂单点，全 app 生效）。

### 1.6.1 不常见 API 必须加来源注释

> AutoImport 让标识符"凭空可用"，但读者看到 `useAppRouter()` / `storeToRefs()` 这类**不常见的标识符**时，会下意识去找 `import` 语句——找不到就困惑：这是哪里来的？是不是漏了 import？
>
> **约定**：当使用的 AutoImport 标识符不属于日常一眼能认出的"高频 API"时，必须在第一次出现处加一行注释说明来源包，让读者无需跳到 `auto-imports.d.ts` 也能理解。

#### 高频 API（无须注释）

| 来源         | 高频标识符（看一眼能认出）                                         |
| ------------ | ------------------------------------------------------------------ |
| `vue`        | `ref`、`reactive`、`computed`、`watch`、`onMounted`、`defineProps` |
| `vue-router` | `useRoute`、`useRouter`（路由组件模板里常见）                      |
| `pinia`      | `defineStore`（每个 store 文件第一行）                             |

#### 不常见 API（必须加注释）

| 标识符（举例）                                             | 来源包提示（注释怎么写）                         |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `RouterLink`、`RouterView`、`useLink`                      | `// vue-router 组件`                             |
| `storeToRefs`、`acceptHMRUpdate`                           | `// pinia 工具`                                  |
| `useAppRouter`、`useRequest`、`useAuth`、`useDict`         | `// 项目 composable @vv/shared（vite 自动注入）` |
| `useDialog`、`useConfirm`、`useLogout`                     | `// 项目 composable @vv/ui（vite 自动注入）`     |
| `createNamespace`                                          | `// 项目 BEM 工具 @vv/shared（vite 自动注入）`   |
| `watchEffect`、`nextTick`、`onErrorCaptured`、`shallowRef` | `// vue（生命周期/底层 API）`                    |

#### 注释格式与位置

- **位置**：在 `.vue` 的 `<script setup>` 第一行（`createNamespace` 之后）或该标识符第一次出现处的上方 1 行
- **格式**：1 行简短注释（**不超过 40 字**），说明"来自哪个包"即可

#### 示例：正确写法

```ts
const bem = createNamespace('user-card')
// 以下均为 unplugin-auto-import 全局注入（详见 CLAUDE.md §1.6）
const router = useAppRouter() // 项目 composable @vv/shared（vite 自动注入）
const route = useRoute() // vue-router
const count = ref(0)
const { data } = storeToRefs(useUserStore()) // pinia 工具
```

#### 错误示例

```ts
// ❌ 不加注释——读者看到 storeToRefs 不认识会困惑
const { data } = storeToRefs(useUserStore())

// ❌ 注释过长——失去意义，应当保持简短
// pinia 的 storeToRefs 用于把 store state 转成响应式引用，是把 store 的 state/getter 解构出来的标准工具
const { data } = storeToRefs(useUserStore())
```

> **例外**：业务模块的 `import { useUserStore } from '@/store/modules/user'` 本身就有路径注释（IDE hover 显示），无需额外标注。

---

### 1.6.2 包消费约定（别名 vs 包名，治理立场 2026-10-23）

架构审查对「别名深层路径」给出明确立场（设计稿 D4 平滑迁移策略的收尾裁决）：

| 消费场景                                                                                                            | 约定引用方式                                                 | 定性                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| app 引用**自身 src** 文件                                                                                           | `@/` 别名（或同目录 `./` 相对路径）                          | 合法、**永久保留**（`@/` 恒指本 app）                                                                                                                                                                                                                                                                  |
| app 消费 `@vv/shared` 公共能力（utils / enums / store / composables / 登录协议 / router-guards）                    | `import { ... } from '@vv/shared'`（根 barrel）              | **首选**——包边界可见，barrel 收敛公共 API                                                                                                                                                                                                                                                              |
| app 消费 `@vv/ui`（useDialog / useConfirm / useLogout 等）                                                          | 包名路径（`@vv/ui/composables/useDialog`）或 AutoImport 注入 | 组件本体按 §1.7 走自动注册，不 import                                                                                                                                                                                                                                                                  |
| `@api` / `@locales` / `@directives` / `@mock`                                                                       | 别名                                                         | **既定例外**（barrel 刻意不聚合，见下）                                                                                                                                                                                                                                                                |
| `@components/*`（组件目录 barrel / 无扩展 .ts 路径，如 `@components/ProTable`、`@components/form-schema/builders`） | 别名                                                         | **既定例外**——@vv/ui 根 barrel 刻意不聚合 `components/**`（自动注册机制配套，见 ui barrel 头注）；目录索引/无扩展路径经 package.json exports 通配无法解析（TS 不做目录/扩展名探测，2026-10-26 codemod 批次 2 实证 125 处回退），`.vue` 文件级（含 `?raw` / vi.mock）可收敛为 `@vv/ui/components/*.vue` |
| `@utils/*` / `@store/*` / `@enums/*` / `@composables/*` 等别名深层路径                                              | ——                                                           | **过渡态遗留**：新代码禁止新增，存量渐进收敛至包名 barrel                                                                                                                                                                                                                                              |

规则要点：

1. **别名机制本身保留**：`packages/config/src/app-aliases.ts` 别名定义原样保留（vite/tsconfig/check-aliases 三处消费），收敛只改消费侧 import，不动别名定义。
2. **为什么收敛**：别名深层路径让包边界在消费代码中不可见（看不到 `@vv/shared` 字样），且绕过 barrel 的公共 API 收敛——包内部文件路径变化会直接炸消费方；barrel 单点才能承载「公共 API 演进」。
3. **既有例外不要误伤**：`packages/shared/src/index.ts` 头注刻意不聚合 `./api`（模块加载即建 axios 实例）、`./directives`（import.meta.glob 注册插件）、`./locales`（createI18n 副作用）——这三类消费经别名是 **sanctioned 既定路径**，不属于待收敛债务；`@enums` 已零消费（其两枚举早入 barrel）。**`@components/*` 同属既定例外**（ui barrel 不聚合 components/** 是自动注册机制的配套设计，且目录/无扩展路径在 exports 通拍下 TS 不可解析）。
4. **测试 mock 同步**：`vi.mock()` 说明符是语义 import 路径——SUT 改从 `@vv/shared` import 后，mock 必须指向同一说明符，否则失去拦截；若被测模块从 barrel 同时消费多个导出，用单点 mock + `importOriginal` 展开覆盖（同模块声明两个 `vi.mock('@vv/shared')` 后者覆盖前者，2026-10-23 收敛时 2 个 spec 因此现形）。
5. **收敛节奏**：不做大爆炸全量替换，按「热点优先」批次走——每批 = 只改带引号 import 说明符 + 三门禁（`pnpm type-check` / `pnpm check:aliases` / `pnpm test`）。首批已完成（2026-10-23）：`@utils/safeAsync`×15 / `@store/modules/app`×10 / `@store/modules/user`×7 + vi.mock 说明符×4，31 文件 36 处，一次性 codemod 脚本执行后即删。**批次 2 已完成（2026-10-26）**：`@utils/{autoImport,consoleBadge,dayjs,storage}` + `@composables/{useTheme,useAppRouter,useDict}` → `@vv/shared` 根 barrel（13 处 + 5 处 vi.mock 补 importOriginal），另 `@components/**/*.vue` 文件级（含 `?raw`）6 处 → `@vv/ui/components/*.vue`；**`@components` 目录/无扩展路径 125 处经实证回退为既定例外**（见表格行）。
6. **与 §1.6 的优先级（2026-10-27 导入审计裁决）**：AutoImport 注入清单内的标识符（useAppRouter / useRequest / useAuth / useDict / useDialog / useConfirm / useLogout 等）**一律不显式 import**——§1.6 优先；§1.6.2「首选 barrel」裁决的是**确需显式 import** 的场景（未注入标识符如 `useTheme`、mock 说明符、非注入的工具/类型）的来源选择。两节无冲突：先判「要不要 import」（§1.6 清单），再判「从哪 import」（§1.6.2）。

---

### 1.6.3 包源码自包含约定（packages/* 生产源码不使用 AutoImport）

> 2026-10-27 P0 起：AutoImport 隐式注入只停留在**最终宿主（apps/\*）**，不穿过包边界。

- `apps/*`：维持 §1.6 全部 AutoImport 规则不变（业务 DX 优先）
- `packages/*` 生产源码：**一律显式 import**（含 vue/pinia/vue-router 高频 API 与 ElMessage 等），不依赖宿主转换才能运行；ElMessage 等组件的显式 import 须同时携带样式副作用（`element-plus/es/components/message/style/css`）
- 依赖可见性：packages/* 消费的每个 npm 包必须声明在自身 package.json——本地规则 `local/package-contract`（error 级，`pnpm lint` + CI 机械检查）兜底，含 @vv/* 方向铁律（mock → shared、ui → shared；构建装配配置豁免方向检查）
- `packages/ui` 存量注入式源码与其 `src/types/auto-globals.d.ts` 暂保留，收敛为独立批次（本约定对 ui 为新代码约束先行）

---

### 1.7 组件全局注册与 IDE 智能提示（强约束）

`unplugin-vue-components`（`packages/config/src/create-vite-config.ts` 的 `Components` 段）按 `dirs` 自动扫描**目录下所有 .vue 文件**（`deep: true`，含任意深度子目录）——`@vv/ui` 包源码三目录（`components/common` + `components/ProTable` + `components/form-schema`）+ 各 app 的 `src/components/`（若存在）——按文件名（PascalCase）注册到 `vue.GlobalComponents` 接口，输出 `apps/<a>/src/types/components.d.ts`。该文件由 `.gitignore` 屏蔽，**仅在 `pnpm dev` / `pnpm build` 时由 unplugin 重新生成**。

**消费方规则（强约束）：**

- ✅ 模板中**直接**使用 `<BaseChart />` / `<ProTable />` / `<XForm />` / `<ProDialog />` 等，无须显式 import；IDE 通过 `GlobalComponents` 路径解析，hover 时展示完整 `DefineComponent<BaseChartProps, ...>` 类型签名（含 props / defineExpose / slots）
- ❌ **不要**写 `import BaseChart from '@/components/common/BaseChart.vue'`——Volar 在 setup scope 的 ESM 路径下不会把 `typeof import('...vue')['default']` 展开为完整 `DefineComponent`，hover 时只显示 `import BaseChart` 字样（丢失 props / expose / slots 智能提示）

**根因（机制说明）：** Volar 对组件引用有两条推导路径：

| 路径                                                  | 推导机制                                           | hover 效果                                      |
| ----------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| `GlobalComponents.BaseChart`（来自 components.d.ts）  | `vue.GlobalComponents` 接口合并 + 完整模板类型检查 | 完整 `DefineComponent<Props, Expose, ...>` 展开 |
| `import BaseChart from '...vue'`（消费方 ESM import） | 模块加载类型推导 + `<script setup>` 宏简化         | 仅显示 import 来源，丢失展开                    |

**范围**：自动注册 dirs = `@vv/ui` 包源码三目录（`components/common/` + `components/ProTable/` + `components/form-schema/`）+ 各 app 私有 `src/components/`（若存在），均含深层子目录（`deep: true`）——`BaseChart` / `AsyncState` / `ProTable` / `SearchForm` / `XForm` / `ProDialog` / `ProDialogForm` 等全局可用。app 内 `src/components/` 以外自建子目录**不**在 dirs 内，需显式 import。

**对照 Vant 第三方库：** vant 不需要显式 import，hover 时显示 `WithInstall<DefineComponent<ExtractPropTypes<{...}>, ...>>`——本项目走 GlobalComponents 路径时行为完全一致。

**检测 / 自检方法：** 若 IDE hover 模板中的 `<XxxComponent>` 只显示 `import XxxComponent`，按本节规则删除对应 `import XxxComponent from '...'` 即可。

**例外：** `<script setup>` 中若需要 `InstanceType<typeof Xxx>` 作为 ref 类型声明（如 `ref<InstanceType<typeof ProTable>>()` 用于取 `defineExpose` 暴露的方法），仍需显式 `import ProTable from '@vv/ui/components/ProTable/ProTable.vue'`。模板自动注册只解决 hover 智能提示，不解决 `<script>` 中的构造类型引用——这是 demo 模块普遍显式 import 自动注册组件的**唯一合法场景**（如 `apps/docs/src/modules/demo/examples/ProTable/ProTableAutoHeight.vue`）。

---

## §2 ⚠️ apps/packages Architecture Lockdown（最高优先级）

> v3.0.0 起由单应用 `src/` Lockdown 升级而来：锁定对象从「`src/` 16 个一级目录」扩展为
> 「workspace 两级拓扑（`apps/*` 6 应用 × `packages/*` 4 包）+ 各 app 内部 src 结构」。
> 治理精神不变：**结构即契约，未经明确批准不得变更**。

### 2.1 当前基线快照（2026-10-22，P5-B 定稿）

**workspace 拓扑**（pnpm workspace + turbo@2，`pnpm-workspace.yaml` 声明 `apps/*` + `packages/*`）：

| #   | 路径                      | 职责                                                                                                                              |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/admin`              | 中后台管理（`@vv-app/admin`，端口 5174）：user/reports/workbench/error 归位后的主干业务 app                                       |
| 2   | `apps/auth`               | 统一登录（`@vv-app/auth`，端口 5179）：登录页 + 登出落地 + 跨应用重定向协议实现方                                                 |
| 3   | `apps/portal`             | 门户企业官网（`@vv-app/portal`，端口 5176）：home 模块 + portal layout                                                            |
| 4   | `apps/h5`                 | H5 移动端（`@vv-app/h5`，端口 5177）：h5-demo + h5 layout + rem 适配                                                              |
| 5   | `apps/big`                | 数据大屏（`@vv-app/big`，端口 5178）：big-demo + big layout + scale 适配                                                          |
| 6   | `apps/docs`               | 组件示例文档（`@vv-app/docs`，端口 5175）：demo 模块 + DemoDocs 布局 + 全部组件示例                                               |
| 7   | `packages/config`         | `@vv/config`：vite 工厂 `createViteConfig`（插件装配/别名/css 预处理/分包单点）+ server/postcss/proxy 等构建配置                  |
| 8   | `packages/mock`           | `@vv/mock`：vite-plugin-mock 数据源（原 `mock/` 目录职责），admin/auth/h5/big/portal/docs 按需接线                                |
| 9   | `packages/shared`         | `@vv/shared`：网络层基建（http/cache/retry/token-refresh）+ 全局 store + `useAppRouter`/`useRequest`/`useAuth`/`useDict` 等       |
| 10  | `packages/ui`             | `@vv/ui`：全局组件（common/ProTable/form-schema 三目录）+ 弹窗族 composables（useDialog/useConfirm/useLogout）+ 图标/样式资产     |
| 11  | `scripts/`                | 工程脚本（check-routes/check-aliases/build-pages/dev-gateway/new-module 等，`node --experimental-strip-types` 直跑）              |
| 12  | `scripts/node-gateway.ts` | 本地同域网关 node 实现（零依赖反向代理，:8080 反代 5174-5179，路由表自 apps-registry 代码派生，见 docs/43 §6）                    |
| 13  | `.github/workflows/`      | ci.yml（turbo affected）+ deploy.yml（build:pages 六应用聚合）                                                                    |
| 14  | 根配置文件                | `package.json`（turbo scripts）/ `turbo.json` / `pnpm-workspace.yaml`（catalog 单版本源）/ `eslint.config.mjs` / `tsconfig*.json` |

**依赖方向铁律（比目录锁更优先）：**

```text
apps/*  ──可依赖──▶  packages/*
apps/*  ──✗ 互相依赖──  apps/*（跨 app 通信走整页跳转协议，见 docs/43 §统一登录协议）
packages/*  ──单向──▶  config ∥ shared（并列上游）→ mock → ui（下游可引用上游；上游禁止反向依赖下游）
// 注：mock 自 2026-10-23 起消费 @vv/shared 契约类型（import type 编译期擦除，无运行时
// 依赖）——真实拓扑非旧文档的 config→mock→shared→ui 四段链（2026-10-27 导入审计修正）
packages/*  ──✗ 依赖──  apps/*；运行时依赖（vue/element-plus 等）一律 peerDependencies + catalog
```

> 边界机械强制手段（P5-A 已落地，error 级）：`eslint.config.mjs` 的 `app/boundary-packages`
> （packages/** 禁依赖 apps/**）+ `app/boundary-apps-<a>`（逐 app 禁相对逃逸/绝对路径引用其他 app）+
> `app/business-wrap-rule`（files 已改 `apps/*/src/...`，拦截裸用 vue-router useRouter / axios）；
> 覆盖不到的语义（如包间反向依赖的深层形式）以 code review 兜底。
> 单 app 时期「模块边界铁律」平移进各 app 内部：`src/modules/<m>` 模块间禁止互 import，
> 模块间通信走 `modules/<m>/index.ts` 对外接口。

### 2.2 禁止行为（最严格）

未经用户在每次具体任务中**明确批准**，**严禁**对 workspace 内任何路径实施以下任何操作：

- ❌ **新增 / 删除 / 重命名 / 移动**任何 app（`apps/<a>`）、包（`packages/<p>`）或根一级目录
- ❌ 违反 §2.1 依赖方向铁律（如 `@vv/shared` 反向 import `@vv/ui`、`apps/*` 互相 import）
- ❌ 改变任何 app / 包内部一级目录的**职责定位**（如把 `packages/shared` 改成依赖 Element Plus）
- ❌ 修改 `pnpm-workspace.yaml`、`turbo.json`、根 `package.json` scripts、各 app `vite.config.ts`、`packages/config` 工厂、根 `tsconfig.*`、`eslint.config.mjs` 中任何与 workspace 解析相关的配置
- ❌ app 内部 `src/` 目录沿用单应用时期 Lockdown：一级目录（api/assets/components/composables/directives/enums/layouts/locales/modules/plugins/router/store/types/utils）不得增删改移动重命名

### 2.3 例外条款

用户在当前轮对话中**明确指定**目标文件路径（格式如：「在 `packages/shared/src/api/http.ts` 加 xxx」「新增 `apps/admin/src/modules/foo/views/Bar.vue`」「改 `scripts/build-pages.ts` 的 REPO_PREFIX」），视为已对**该单次操作**预先批准——无需再次询问。

> 例外只覆盖**该次明确提及的文件**，不延伸到其他文件。即便在同一段回复里提到多个文件，每个文件路径也需清晰可识别。

### 2.4 修改申请模板

如需做 §2.2 所列任一操作（且不属于 §2.3 例外），必须先输出**修改申请**（≤10 行）并等用户**单独批准**后才能动手：

```markdown
【workspace 修改申请】<方案名>

- 操作类型：[新增 app / 新增包 / 删除 / 重命名 / 移动 / 改职责 / 改依赖方向]
- 目标路径：apps|packages|scripts/xxx（可多行）
- 原因：[业务原因，≤2 句]
- 影响面：[影响哪些 app/包/调用方/路由/类型/turbo 拓扑]
- 备选：[是否考虑过其他归属，引用 docs/43 / docs/18 §2 决策矩阵]
- 回退：[如何恢复，是否需要备份]
```

### 2.5 验证机制

每次任务完成后，**必须**在合规简报中单独列出「本次对 workspace 的所有写操作清单」（含 apps/* / packages/* / scripts/ / 根配置），由用户复核。无清单 = 未完成。
---

## §3 组件 BEM 编写规范（强约束）

> 所有 `.vue` 单文件组件必须按本节编写，与 §2 同为不可妥协硬规则。

### 3.1 完整模板

```vue
<script setup lang="ts">
// BEM 工具（createNamespace / bem / $BEM_PREFIX）由 unplugin-auto-import 自动注入，
// 在 <script setup> 与 <style lang="scss"> 中全局可用，无须显式 import
const bem = createNamespace('form-engine') // kebab-case，必须与 sass 根选择器 .#{$BEM_PREFIX}-form-engine 严格对齐
</script>

<template>
  <div :class="bem.b()">
    <!-- 类名必须通过 bem.b() / bem.e() / bem.m() / bem.is() / bem.has() 拼装，
         禁止硬编码 'vv-form-engine' 等前缀字符串 -->
    <header :class="bem.e('header')">...</header>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-form-engine {
  /* 不写 scoped —— 命名空间隔离由 BEM 完成 */
  &__header {
    /* element */
  }
  &--primary {
    /* modifier */
  }
}
</style>
```

### 3.2 强制约定

| #   | 项                             | 约束                                                                                                                                                                                                                                                                    |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `createNamespace` / `bem` 来源 | 由 `unplugin-auto-import` 自动注入到 `<script setup>` 全局作用域，**禁止** `import { createNamespace } from '...'`                                                                                                                                                      |
| 2   | `bem` 实例声明                 | `const bem = createNamespace('<kebab-case>')`，组件名必须是 **kebab-case**（如 `form-engine`、`async-state`），与 sass 根选择器 `.#{$BEM_PREFIX}-<kebab-case>` **严格对齐**——HTML class 与 CSS 选择器大小写敏感，不一致将导致整片样式失效                               |
| 3   | 模板 class 拼装                | 必须通过 `bem.b()` / `bem.e()` / `bem.m()` / `bem.is()` / `bem.has()` 拼装，**禁止**硬编码前缀字符串                                                                                                                                                                    |
| 4   | `<style>` 块 `lang` 属性       | 必填 `lang="scss"`，用于解析 `$BEM_PREFIX` Sass 变量                                                                                                                                                                                                                    |
| 5   | `<style>` 块 `scoped` 属性     | **禁止添加**——命名空间隔离由 BEM 接管，scoped 是冗余；连锁约束：非 scoped 样式下 `:deep()` 不会被编译（见第 10 条）                                                                                                                                                     |
| 6   | 根选择器写法                   | 必须 `.#{$BEM_PREFIX}-组件名-kebab-case`（如 `.#{$BEM_PREFIX}-form-engine`），与 `bem` 实例一一对应                                                                                                                                                                     |
| 7   | 嵌套占位符                     | element 用 `&__xxx`、modifier 用 `&--yyy`、状态用 `&.is-xxx` / `&.has-xxx`，禁止重复拼接前缀                                                                                                                                                                            |
| 8   | BEM 默认前缀                   | `vv`（即 `$BEM_PREFIX` 默认值），由 `unplugin-auto-import` 注入                                                                                                                                                                                                         |
| 9   | `bem.m()` vs `bem.em()` 选择   | **block modifier** 用 `bem.m('xxx')` → `vv-<block>--xxx`（作用于整个组件，如卡片整体 `'shimmer'`）；**element modifier** 用 `bem.em('elem', 'xxx')` → `vv-<block>__elem--xxx`（作用于某个元素，如 `__row--first`）。误用会导致 class 与 sass 嵌套选择器不匹配，样式失效 |
| 10  | 穿透写法                       | 非 scoped 样式下 `:deep()` / `::v-deep` / `:v-deep` **均不会被编译**，会以伪类原样输出到浏览器并被整条规则丢弃——**必须直接写后代选择器**（如 `.#{$BEM_PREFIX}-form-engine .el-input__inner { ... }`）                                                                   |

### 3.3 反模式（禁止出现）

| #   | 反模式                                                                           | 禁止原因                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `<script setup>` 中 `import { createNamespace } from '@/utils/bem'`              | 与自动注入冲突，会重复声明                                                                                                                                                                                       |
| 2   | `<style scoped>` / `<style scoped lang="scss">`                                  | BEM 已接管隔离，scoped 是冗余且会破坏 `&` 编译                                                                                                                                                                   |
| 3   | `<style>` 不写 `lang="scss"`                                                     | 无法解析 `$BEM_PREFIX` Sass 变量，根选择器失效                                                                                                                                                                   |
| 4   | 模板或样式中硬编码 `vv-xxx` / `.vv-form-engine__header` 等字符串                 | 与 `bem.b()` / `bem.e()` 拼出的 class 不一致 → 样式漂移                                                                                                                                                          |
| 5   | 同一组件出现两份 `bem` 实例声明                                                  | 命名空间分裂，会造成样式不生效                                                                                                                                                                                   |
| 6   | `createNamespace('PascalCase')`（如 `'OrdersList'`、`'HomeFooter'`）             | HTML class 大小写敏感，`vv-OrdersList` 与 sass 编译产物 `.vv-orders-list` 不匹配 → 整片样式失效。**必须用 kebab-case**（`'orders-list'`、`'home-footer'`），转换规则：`PascalCase` 每个大写字母前加 `-` 后全小写 |
| 7   | `bem.m('xxx')` 误用于 element 修饰（如 `bem.m('first')` 当 m 用于 `__row` 元素） | `bem.m()` 生成 `vv-<block>--xxx`（block modifier），与 sass 嵌套 `&__row { &--first { ... } }` 展开的 `vv-<block>__row--first`（element modifier）不匹配 → grid 等布局失效。**应当用 `bem.em('row', 'first')`**  |
| 8   | 非 scoped `<style>` 中使用 `:deep()` / `::v-deep` / `:v-deep`                    | 非 scoped 样式无编译器接管，`:deep()` 会作为伪类**原样输出到浏览器**，整条规则被浏览器直接丢弃（而非仅该选择器失效）——覆盖第三方库组件样式时**必须直接写后代选择器**                                             |

### 3.4 验证机制

- 每次新增 / 修改 `.vue` 文件前，**逐条**比对 §3.2、§3.3
- 合规简报必须附「本次 BEM 规范核查清单」：本次涉及的 `.vue` 文件路径 + §3.2 每条判定结果
- `pnpm lint` / `pnpm type-check:full` 已无法自动检测此类违规时，以人工核查清单为准

---

## §4 Project Constraints

| #   | 约束                                                                                                                                                                                                                                                                                      | 落地方式                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | 包管理强制 pnpm                                                                                                                                                                                                                                                                           | `package.json:scripts.preinstall` → `only-allow pnpm`                              |
| 2   | 新增业务模块**必须**用 `pnpm new-module <kebab-name>`                                                                                                                                                                                                                                     | `scripts/new-module.ts`（自动追加 RouteName）                                      |
| 3   | 业务代码**必须**用项目封装：`useAppRouter` / `useRequest` / `useAuth` / `useDict`（`@vv/shared`）+ `useDialog` / `useConfirm` / `useLogout`（`@vv/ui`）                                                                                                                                   | ESLint `no-restricted-imports`（P5-A 已落地 error 级）                             |
| 4   | app 内模块间通信走 `modules/<m>/index.ts`；跨 app 通信走整页跳转协议（docs/43）                                                                                                                                                                                                           | 见 §1.2 / §2.1                                                                     |
| 5   | `@vv/ui` 组件不得 `import` 自任何 `apps/*`                                                                                                                                                                                                                                                | 保护 tree-shake                                                                    |
| 6   | workspace 依赖方向铁律（§2.1）：`apps/* → packages/*`，包间 config ∥ shared → mock → ui 单向，运行时依赖 peerDependencies + catalog                                                                                                                                                       | turbo 拓扑 + code review                                                           |
| 7   | `store/` 不存网络请求中间态                                                                                                                                                                                                                                                               | loading 放组件 / composable                                                        |
| 8   | 路由一致性校验：`pnpm check:routes`（monorepo 版，6 app 逐个校验）                                                                                                                                                                                                                        | CI 阶段强制                                                                        |
| 9   | 类型校验：各 app `type-check:full`（`pnpm build` = turbo 拓扑序，内部 build-only 先生成声明再全量门禁）                                                                                                                                                                                   | `package.json:scripts`                                                             |
| 10  | 第三方 npm 包引用前必先 `npm view <pkg>` 验证                                                                                                                                                                                                                                             | 全局规则                                                                           |
| 11  | 新增 composable / store / 类型必须带 `.spec.ts`（覆盖率 ≥ 80%）                                                                                                                                                                                                                           | Vitest                                                                             |
| 12  | 功能性变更同步 `CHANGELOG.md`（仅 typo 免记）                                                                                                                                                                                                                                             | 项目约定                                                                           |
| 13  | 编写 CSS 禁止使用 `!important` 解决问题                                                                                                                                                                                                                                                   | 仅当用户主动要求时才可使用；优先级应通过选择器特异性 / BEM 命名空间 / 源码顺序解决 |
| 14  | app 内跨目录引用**优先 alias 路径**（`@/` 等，由 `packages/config/src/app-aliases.ts` 统一生成），禁止 `../../` 深层相对路径——**豁免**：docs demo 模块（`apps/docs/src/modules/demo/`）经模块指南《如何写好一个 demo.md》明文背书用兄弟相对路径（demo 强调可移植自包含），不加 alias 约束 | 项目约定                                                                           |
| 15  | `@vv/ui` 三目录 + app 私有 `src/components/` 下所有 .vue 全局组件**不要显式 import**，依赖 `unplugin-vue-components` 自动注册获得 IDE hover 智能提示（详见 §1.7）                                                                                                                         | IDE 体验                                                                           |

---

## §5 Workflow Quick-Reference

| 场景                                                                  | 入口                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 新人首次接触项目                                                      | `docs/10-新手指引.md`（30 分钟 5 任务）                                                              |
| 判断代码归属（utils / composable / store / api / plugin / directive） | `docs/18-代码组织决策表.md` §2 决策矩阵 + §4 Mermaid 决策树                                          |
| 加新业务模块                                                          | `pnpm new-module <kebab-name>` → 跑 `pnpm check:routes`                                              |
| 用图标（静态 `<i-ep-* />` / 动态 `<AppDynamicIcon>` / 新增本地图标）  | `docs/39-图标体系与使用规范.md`（去哪找图标 + 双语法 + registry 查表法）                             |
| 改 ESLint 规则 / 架构级约定                                           | 先在 `docs/superpowers/specs/` 写设计稿 + plan，等用户批准后再实施                                   |
| 改 docs 之外的设计文档                                                | 命名 `[序号]-中文主题.md`；复杂内容画 Mermaid 流程图                                                 |
| 提交变更                                                              | 中文 commit msg（`feat:`/`fix:`/`refactor:`/`docs:`/`test:`/`chore:`/`perf:`） + 同步 `CHANGELOG.md` |

---

---

**承诺**：所有对 workspace 的写操作按 §2 apps/packages Architecture Lockdown 执行——§2.3 例外条款（用户明确指定文件路径）直接实施；其他必须先输出 §2.4 修改申请并等用户单独批准。每次任务完成的合规简报需附「workspace 写操作清单」（§2.5）。

---

## Skill routing（gstack）

当用户请求匹配到可用 gstack skill 时，通过 Skill 工具调用；不确定时优先调用。

关键路由规则：

- 产品想法/头脑风暴 → `/office-hours`
- 战略/范围 → `/plan-ceo-review`
- 架构 → `/plan-eng-review`
- 设计体系/计划审查 → `/design-consultation` 或 `/plan-design-review`
- 完整多视角审查管道 → `/autoplan`
- Bug/报错 → `/investigate`
- QA/站点行为验证 → `/qa` 或 `/qa-only`
- 代码审查/diff 检查 → `/review`
- 视觉打磨 → `/design-review`
- 发布/部署/PR → `/ship` 或 `/land-and-deploy`
- 保存进度 → `/context-save`
- 恢复上下文 → `/context-restore`
- 编写 backlog 就绪的 spec/issue → `/spec`
