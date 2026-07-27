# gm-portal-fe 项目级 Claude Code 工作流

> 本文档是 `~/.claude/CLAUDE.md` 的项目级补充。所有全局规则（§一～§十一）自动适用，遇到冲突以**本文档为准**。
>
> **文档版本**：v1.0.0 | **生成日期**：2026-07-27 | **生效分支**：`feature/engine-optimization`

---

## §1 项目概述

| 属性         | 值                                                                           |
| ------------ | ---------------------------------------------------------------------------- |
| 项目名       | `gm-portal-fe`（工贸统一登录门户前端基线）                                   |
| 技术栈       | Vue 3.5 + TypeScript 6 + Vite 8 + Pinia 3 + Element Plus 2.14 + Vue Router 5 |
| 包管理       | **pnpm ≥ 11**（`preinstall` 已硬强制 `only-allow pnpm`）                     |
| Node 版本    | `≥ 22.18` 或 `≥ 24.12`（见 `package.json:engines`）                          |
| 新人入门     | `docs/10-新手指引.md`（30 分钟 5 任务）                                      |
| 代码归属判断 | `docs/18-代码组织决策表.md`                                                  |
| 变更记录     | `CHANGELOG.md`（功能性变更必同步，仅 typo 免记）                             |

---

## §2 ⚠️ src/ 架构保护条款（最高优先级）

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

## §3 项目特有约束

| #   | 约束                                                                            | 落地方式                                                  |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | 包管理强制 pnpm，禁止 npm/yarn                                                  | `package.json:scripts.preinstall` → `only-allow pnpm`     |
| 2   | 新增业务模块**必须**用 `pnpm new-module <kebab-name>`                           | `scripts/new-module.ts`（自动追加 RouteName 联合类型）    |
| 3   | 业务代码**必须**用 `@composables/useAppRouter` + `@composables/useRequest` 封装 | `eslint.config.mjs:no-restricted-imports`（自动 warning） |
| 4   | 模块间通信必须走 `modules/<m>/index.ts` 对外接口                                | `docs/18` §3 边界                                         |
| 5   | `common` 组件不得 `import` 自 `modules/`（保护 tree-shake）                     | `docs/18` §3 边界                                         |
| 6   | `utils/` 不得依赖 Vue/Pinia（与框架解耦）                                       | `docs/18` §3 边界                                         |
| 7   | `store/` 不存网络请求中间态（loading 放组件 / composable）                      | `docs/18` §3 边界                                         |
| 8   | 一致性校验：`pnpm check:routes`（路由双向一致）                                 | CI 阶段强制                                               |
| 9   | 类型校验：`pnpm type-check`（必过 build 前）                                    | `package.json:scripts.type-check:full`                    |
| 10  | 任何第三方 npm 包引用前必先 `npm view <pkg>` 验证                               | 全局规则 §七                                              |
| 11  | 新增 composable / store / 类型，**必须**带 `.spec.ts` 单测（覆盖率 ≥ 80%）      | 全局规则 §六 + §七                                        |

---

## §4 工作流锚点

| 场景                                                                  | 入口                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 新人首次接触项目                                                      | `docs/10-新手指引.md`（30 分钟 5 任务）                                                              |
| 判断代码归属（utils / composable / store / api / plugin / directive） | `docs/18-代码组织决策表.md` §2 决策矩阵 + §4 Mermaid 决策树                                          |
| 加新业务模块                                                          | `pnpm new-module <kebab-name>` → 跑 `pnpm check:routes`                                              |
| 改 ESLint 规则 / 架构级约定                                           | 先在 `docs/superpowers/specs/` 写设计稿 + plan，等用户批准后再实施                                   |
| 改 docs 之外的设计文档                                                | 命名 `[序号]-中文主题.md`；复杂内容画 Mermaid 流程图                                                 |
| 提交变更                                                              | 中文 commit msg（`feat:`/`fix:`/`refactor:`/`docs:`/`test:`/`chore:`/`perf:`） + 同步 `CHANGELOG.md` |

---

## §5 与全局 CLAUDE.md 的关系

| 章节                                        | 来源                                                | 适用                                                         |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| §一 输出前自检（17 项 + 合规简报）          | `~/.claude/CLAUDE.md` §一                           | 自动适用                                                     |
| §二 禁止行为（12 条）                       | `~/.claude/CLAUDE.md` §二                           | 自动适用                                                     |
| §三 分级工作流                              | `~/.claude/CLAUDE.md` §三                           | 自动适用                                                     |
| §四～§九 前端/注释/Agent/工程纪律/调试/文档 | `~/.claude/CLAUDE.md` §四～§九 + `@rules/zh/*`      | 自动适用                                                     |
| §十～§十一 OMC + Superpowers/gstack         | `~/.claude/CLAUDE.md` §十～§十一 + `@CLAUDE-omc.md` | 自动适用                                                     |
| **本文档 §1～§5**                           | 项目级补充                                          | 仅本项目                                                     |
| **本文档 §2（src/ 架构保护）**              | 项目级补充                                          | **最高优先级**，覆盖全局 §三"先探索后动手"中"自由修改"的部分 |

---

**承诺**：本文档生效后，所有对 `src/` 的写操作按 §2 流程执行——§2.3 例外（用户明确指定文件路径）直接实施；其他必须先输出 §2.4 修改申请并等用户单独批准。每次任务完成时，合规简报需附加「src/ 写操作清单」（§2.5）。
