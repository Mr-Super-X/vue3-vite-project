# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 本文档是 `~/.claude/CLAUDE.md` 的项目级补充。所有全局规则（§一～§十一）自动适用，遇到冲突以**本文档为准**。
>
> **文档版本**：v1.0.0 | **生成日期**：2026-07-27 | **生效分支**：`master`

---

## Commands

| 任务                                      | 命令                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| 安装依赖                                  | `pnpm install`                                               |
| 启动 dev（远程菜单模式，默认）            | `pnpm dev`                                                   |
| 启动 dev（本地菜单模式，无需后端联调）    | `pnpm dev:local`                                             |
| 启动 dev（启用浏览器 DevTools）           | `vite`（含 vite-plugin-vue-devtools）                        |
| 跑全部单测                                | `pnpm test`                                                  |
| 跑单测（watch 模式）                      | `pnpm test:watch`                                            |
| 跑单个测试文件                            | `pnpm test <path>`（如 `pnpm test src/utils/dayjs.spec.ts`） |
| 单测覆盖率（含 UI 报告）                  | `pnpm test:coverage` / `pnpm test:ui`                        |
| 类型校验（增量）                          | `pnpm type-check`                                            |
| 类型校验（强制全量，build 前必跑）        | `pnpm type-check:full`                                       |
| 构建生产包                                | `pnpm build`                                                 |
| 预览生产包                                | `pnpm preview`                                               |
| 包体积分析（输出 dist/stats.html）        | `pnpm analyze`                                               |
| Lint 检查                                 | `pnpm lint`                                                  |
| Lint 自动修复                             | `pnpm lint:fix`                                              |
| Prettier 格式化                           | `pnpm format` / `pnpm format:check`                          |
| 路由一致性校验（CI 阶段强制）             | `pnpm check:routes`                                          |
| 新建业务模块（自动生成 6 个骨架文件）     | `pnpm new-module <kebab-name>`                               |
| 提交并推送（add + cz + push 一站式）      | `pnpm push`                                                  |
| 发布版本（bump + CHANGELOG + tag + push） | `pnpm release`                                               |
| 发布预览（dry-run，0 副作用）             | `pnpm release:dry`                                           |

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
├── plugins/                          每模块：views/ + routes/ + store/
├── router/                                      + apis/ + components/
├── store/modules/                                + index.ts
├── types/
└── utils/（与框架解耦）
```

### 1.2 模块边界铁律（强制）

| 层级                       | 允许引用                                      | 不允许引用           |
| -------------------------- | --------------------------------------------- | -------------------- |
| `modules/<m>/views`        | 本模块 components / composables / utils / api | 其他模块内部         |
| `modules/<m>/components`   | 本模块 views / composables / utils            | 其他模块             |
| `modules/<m>/store`        | 本模块 api / types                            | 其他模块 store       |
| `components/common`        | utils / enums / types / store/modules         | 任何 `modules/` 内容 |
| `store/modules`（全局）    | api / utils / enums                           | `modules/` 内容      |
| `directives/` / `plugins/` | utils / enums / types / store/modules         | `modules/` 内容      |

模块间通信通过 `modules/<m>/index.ts` 对外接口暴露，**禁止直接 import 其他模块内部文件**。

### 1.3 状态管理分层

- **全局 `store/modules/`**：仅跨模块共享（`app` 侧边栏/语言、`user` token/profile/权限、`theme` 主题持久化、`router` UI 状态）
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

### 1.5 业务代码强制封装（ESLint `no-restricted-imports` 自动 warning）

业务代码**禁止**直接 `import { useRouter } from 'vue-router'` 或 `import axios from 'axios'`，**必须**用项目封装：

| 场景                        | 必须用                                             |
| --------------------------- | -------------------------------------------------- |
| 路由（跳转/参数/back）      | `@composables/useAppRouter`                        |
| 网络请求（三态 + 错误处理） | `@composables/useRequest`                          |
| 权限（AND / ANY 语义）      | `@composables/useAuth`（`hasPerm` / `hasAnyPerm`） |

---

## §2 ⚠️ src/ Architecture Lockdown（最高优先级）

### 2.1 当前基线快照（2026-07-27）

`src/` 下 15 个一级目录的职责如下。任何变更都会破坏现有约定，**未经用户明确批准，禁止任何形式的增、删、改、移动、重命名**：

| #   | 目录           | 职责                                                                                                                                      |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `api/`         | 跨模块网络请求基建（`http`/`cache`/`retry`/`token-refresh` 等）+ `api/modules/` 跨模块共享接口                                            |
| 2   | `components/`  | 全局通用组件（`common/`）+ 布局相关组件（`layout/`）                                                                                      |
| 3   | `composables/` | 业务侧组合式函数封装（`useAppRouter`/`useRequest`/`useAuth` 等）                                                                          |
| 4   | `directives/`  | 自定义指令（`v-inputDebounce`/`v-buttonDebounce`/`v-permission` 等）                                                                      |
| 5   | `enums/`       | 枚举常量（`httpEnum`/`roleEnum` 等）                                                                                                      |
| 6   | `layouts/`     | 布局组件（`default`/`blank`/`portal`）                                                                                                    |
| 7   | `locales/`     | 国际化文案（`zh-CN`/`en-US`）                                                                                                             |
| 8   | `modules/`     | 业务模块（`auth`/`home`/`orders`/`reports`/`user`/`demo`/`error`），每模块含 `views/`+`routes/`+`store/`+`apis/`+`components/`+`index.ts` |
| 9   | `plugins/`     | Vue 插件（`errorHandler`/`webVitals` 等）                                                                                                 |
| 10  | `router/`      | 路由配置 + 守卫 + 自动注册 + 白名单 + 远程菜单                                                                                            |
| 11  | `store/`       | Pinia 根配置 + `modules/` 全局 Store                                                                                                      |
| 12  | `types/`       | TS 全局类型 + `.d.ts`                                                                                                                     |
| 13  | `utils/`       | 纯函数工具（`dayjs`/`format`/`bem`/`storage` 等，与框架解耦）                                                                             |
| 14  | `App.vue`      | 根组件                                                                                                                                    |
| 15  | `main.ts`      | 应用入口                                                                                                                                  |

### 2.2 禁止行为（最严格）

未经用户在每次具体任务中**明确批准**，**严禁**对 `src/` 下任何路径实施以下任何操作：

- ❌ **新增**一级目录 / 子目录 / 任何文件
- ❌ **删除**任何文件 / 目录
- ❌ **重命名**任何文件 / 目录
- ❌ **移动**文件到其他目录
- ❌ 改变任何目录的**职责定位**（例如把 `utils/` 改成依赖 Vue）
- ❌ 修改 `src/` 的 `package.json`、`vite.config.ts`、`tsconfig.*`、`eslint.config.mjs` 中任何与 src/ 解析相关的配置

### 2.3 例外条款

用户在当前轮对话中**明确指定**目标文件路径（格式如：「在 `src/xxx/yyy.ts` 加 xxx」「新增 `src/modules/foo/views/Bar.vue`」「改 `src/utils/dayjs.ts` 的 format 函数」），视为已对**该单次操作**预先批准——无需再次询问。

> 例外只覆盖**该次明确提及的文件**，不延伸到其他文件。即便在同一段回复里提到多个文件，每个文件路径也需清晰可识别。

### 2.4 修改申请模板

如需对 `src/` 做 §2.2 所列任一操作（且不属于 §2.3 例外），必须先输出**修改申请**（≤10 行）并等用户**单独批准**后才能动手：

```markdown
【src 修改申请】<方案名>

- 操作类型：[新增 / 删除 / 重命名 / 移动 / 改职责]
- 目标路径：src/xxx/yyy（可多行）
- 原因：[业务原因，≤2 句]
- 影响面：[影响哪些模块/组件/调用方/路由/类型]
- 备选：[是否考虑过其他目录归属，引用 docs/18 §2 决策矩阵]
- 回退：[如何恢复，是否需要备份]
```

### 2.5 验证机制

每次任务完成后，**必须**在合规简报中单独列出「本次对 src/ 的所有写操作清单」，由用户复核。无清单 = 未完成。

---

## §4 Project Constraints

| #   | 约束                                                              | 落地方式                                              |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 包管理强制 pnpm                                                   | `package.json:scripts.preinstall` → `only-allow pnpm` |
| 2   | 新增业务模块**必须**用 `pnpm new-module <kebab-name>`             | `scripts/new-module.ts`（自动追加 RouteName）         |
| 3   | 业务代码**必须**用 `useAppRouter` / `useRequest` / `useAuth` 封装 | ESLint `no-restricted-imports`                        |
| 4   | 模块间通信走 `modules/<m>/index.ts`                               | 见 §1.2 模块边界铁律                                  |
| 5   | `common` 组件不得 `import` 自 `modules/`                          | 保护 tree-shake                                       |
| 6   | `utils/` 不得依赖 Vue/Pinia                                       | 与框架解耦                                            |
| 7   | `store/` 不存网络请求中间态                                       | loading 放组件 / composable                           |
| 8   | 路由一致性校验：`pnpm check:routes`                               | CI 阶段强制                                           |
| 9   | 类型校验：`pnpm type-check:full`（build 前必过）                  | `package.json:scripts`                                |
| 10  | 第三方 npm 包引用前必先 `npm view <pkg>` 验证                     | 全局规则                                              |
| 11  | 新增 composable / store / 类型必须带 `.spec.ts`（覆盖率 ≥ 80%）   | Vitest                                                |
| 12  | 功能性变更同步 `CHANGELOG.md`（仅 typo 免记）                     | 项目约定                                              |

---

## §5 Workflow Quick-Reference

| 场景                                                                  | 入口                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 新人首次接触项目                                                      | `docs/10-新手指引.md`（30 分钟 5 任务）                                                              |
| 判断代码归属（utils / composable / store / api / plugin / directive） | `docs/18-代码组织决策表.md` §2 决策矩阵 + §4 Mermaid 决策树                                          |
| 加新业务模块                                                          | `pnpm new-module <kebab-name>` → 跑 `pnpm check:routes`                                              |
| 改 ESLint 规则 / 架构级约定                                           | 先在 `docs/superpowers/specs/` 写设计稿 + plan，等用户批准后再实施                                   |
| 改 docs 之外的设计文档                                                | 命名 `[序号]-中文主题.md`；复杂内容画 Mermaid 流程图                                                 |
| 提交变更                                                              | 中文 commit msg（`feat:`/`fix:`/`refactor:`/`docs:`/`test:`/`chore:`/`perf:`） + 同步 `CHANGELOG.md` |

---

---

**承诺**：所有对 `src/` 的写操作按 §2 src/ Architecture Lockdown 执行——§2.3 例外条款（用户明确指定文件路径）直接实施；其他必须先输出 §2.4 修改申请并等用户单独批准。每次任务完成的合规简报需附「src/ 写操作清单」（§2.5）。
