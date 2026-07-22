# 工贸统一登录门户 (gm-portal-fe)

基于 Vue 3 + Vite 8 + TypeScript 6 的中后台脚手架，Feature-Sliced 风格，支持模块独立开发、不依赖后端即可联调。

---

## 📋 项目简介

工贸统一登录方向的中后台门户前端基线，支持多业务模块（认证、用户管理、仪表盘）、中后台交互模式（表格、表单、权限控制）、不依赖后端即可独立跑通业务流程。

**设计原则**：

- **模块独立**：每个业务模块可独立开发、独立测试、独立部署
- **状态清晰**：全局 vs 模块状态边界明确，无交叉依赖
- **防御性 UI**：每个异步组件显式处理 Loading / Error / Empty
- **可 Mock**：不启动后端即可完整跑通业务流程
- **可扩展**：CSS / 状态 / UI 库都不锁定单一方案

---

## 🛠️ 技术栈

| 维度         | 选型                        | 版本                                |
| ------------ | --------------------------- | ----------------------------------- |
| 核心框架     | Vue                         | ^3.5.38                             |
| 构建工具     | Vite                        | ^8.0.16                             |
| 语言         | TypeScript                  | ~6.0.0（strict 模式）               |
| 包管理器     | pnpm                        | >=11.x                              |
| Node 要求    | -                           | >=22.18 或 >=24.12                  |
| UI 组件库    | Element Plus                | ^2.14.3                             |
| 原子化 CSS   | UnoCSS                      | ^66.7.5（兼容 SCSS/LESS/原生 CSS）  |
| 状态管理     | Pinia                       | ^3.0.4                              |
| 路由         | Vue Router                  | ^5.1.0                              |
| 国际化       | Vue I18n                    | ^11.4.6                             |
| 网络层       | Axios                       | ^1.18.1                             |
| 浏览器基线   | normalize.css               | ^8.0.1                              |
| 日期工具     | dayjs                       | ^1.11.21                            |
| API Mock     | vite-plugin-mock            | ^3.0.2                              |
| Storage 工具 | js-cookie                   | ^3.0.8                              |
| 测试框架     | Vitest                      | ^4.1.9 + @vue/test-utils + jsdom    |
| Pinia 持久化 | pinia-plugin-persistedstate | ^4.7.1（仅 store 字段 pick 持久化） |

---

## 🏗️ 架构设计

### 1. Feature-Sliced 风格 + 模块化范式

```
全局层（跨模块共享）         业务模块层（独立自治）
├── components/common/      ├── modules/auth/
│   ├── AsyncState          │   ├── views/Login.vue
│   ├── ErrorBoundary       │   ├── components/
│   └── ...                 │   ├── store/
├── directives/             │   └── routes/index.ts（自动注册）
│   ├── _utils.ts            │
│   ├── inputDebounce.*     └── modules/user/
│   ├── buttonDebounce.*    └── modules/dashboard/
│   ├── permission.*
├── plugins/
│   ├── errorHandler.*      ← Vue 插件（install 模式）
│   └── index.ts            ← 统一注册入口
├── utils/
│   ├── storage.ts / dayjs.ts / bem.ts / _utils.ts
│   └── ...
├── store/modules/          ← 跨模块共享 Pinia
│   ├── app.ts              ← 侧边栏/语言/全局 loading
│   ├── user.ts             ← token/profile/权限
│   ├── theme.ts            ← 主题模式（持久化）
│   └── router.ts           ← 路由 UI 状态
└── layouts/                ← 路由级布局（blank/default）
```

> **模块化范式（v1.0.0+）**：`directives/` 与 `plugins/` 均采用 `export default { install(app) {...} }` 模式，每个模块独立 `.d.ts` 类型文件，`index.ts` 统一注册入口。main.ts 集中 `app.use()` 接入。详见 [`docs/08-模块化架构总览.md`](docs/08-模块化架构总览.md)。

### 2. 模块边界铁律（强制）

| 层级                       | 允许引用                                      | 不允许引用         |
| -------------------------- | --------------------------------------------- | ------------------ |
| `modules/<m>/views`        | 本模块 components / composables / utils / api | 其他模块内部       |
| `modules/<m>/components`   | 本模块 views / composables / utils            | 其他模块           |
| `modules/<m>/store`        | 本模块 api / types                            | 其他模块 store     |
| `components/common`        | utils / enums / types / store/modules         | 任何 modules/ 内容 |
| `store/modules`（全局）    | api / utils / enums                           | modules/ 内容      |
| `directives/` / `plugins/` | utils / enums / types / store/modules         | modules/ 内容      |

> 模块间通信通过 `modules/<m>/index.ts` 暴露的对外接口，**禁止直接 import 内部文件**。

### 3. 状态管理分层

- **全局 store/modules/**：仅跨模块共享（app 侧边栏/语言、user token/profile/权限、theme 主题、router 路由状态）
- **模块私有 store**：归 `modules/<m>/store/`，业务状态不污染全局
- **Pinia Setup Store 风格**：更接近 composables 心智，便于复用
- **持久化**：`pinia-plugin-persistedstate` 仅对 store 字段 `pick` 持久化（避免整体写 localStorage）

### 4. 防御性 UI 三态

每个异步组件必须显式处理：

```vue
<AsyncState :loading="loading" :error="error" :is-empty="isEmpty" @retry="execute">
  <UserTable :rows="data ?? []" />
</AsyncState>
```

`useRequest` composable 自动提供 `{ data, loading, error, isEmpty, execute }` 三态封装。

### 5. 错误处理全局兜底（plugins/errorHandler 插件）

- **统一接管 3 类错误**：Vue 组件错误 / window 全局 JS 错误 / 未捕获 Promise 拒绝
- **dev/prod 智能**：`logToConsole` 默认 dev=true / prod=false
- **Sentry 扩展点**：`report(error, { source, extra })` 回调，生产环境对接日志服务
- **API 错误**（HTTP 状态码）：HTTP 拦截器仍负责（401 跳登录、403/404/500 错误页、500+ Toast）

```ts
// main.ts
import Plugins from '@plugins'
app.use(Plugins, {
  errorHandler: {
    report: (error, ctx) => Sentry.captureException(error, { tags: ctx }),
  },
})
```

---

## 🎯 目录设计原则

### 为什么按 Feature-Sliced 组织？

传统前端按技术层切分（`components/` `views/` `stores/` `api/`），导致**一个功能模块的代码散落在 4-5 个目录**——找东西要跳转多次、改动要跨目录、删除模块要清理多个文件夹。

Feature-Sliced 按**业务模块**切分，每个模块的页面、组件、状态、接口都在**同一个目录**里：

```
传统切分（按技术）            Feature-Sliced（按业务）
components/  ← Button.vue     modules/auth/
views/      ← Login.vue        ├── views/Login.vue
stores/     ← user.ts          ├── components/LoginForm.vue
api/        ← auth.ts          ├── store/index.ts
utils/      ← validate.ts      └── routes/index.ts（自动注册）
           ↑
         散落 4 处              ↑ 集中 1 处
```

### 这样组织带来什么好处？

#### 1. 模块高度内聚

- **改一个模块的所有改动集中在一个目录** → Code Review 看一个目录就懂全貌
- **删除模块 = 删除一个目录**（无残留）
- **新人接手** = 看 `modules/<m>/` 就能理解该业务的完整结构

#### 2. 依赖方向严格单向

```
       ┌─────────────────────────┐
       │      modules/            │  ← 业务模块（最高层）
       └──────────┬──────────────┘
                  ↓ 只能本模块向下
       ┌─────────────────────────┐
       │  components/common/      │  ← 通用组件
       │  api/  utils/  enums/    │
       │  directives/  plugins/   │  ← 模块化基础设施
       └──────────┬──────────────┘
                  ↓
       ┌─────────────────────────┐
       │  composables/  types/   │  ← 框架无关基础设施
       └─────────────────────────┘
```

**禁止规则**：

- `components/common/` / `directives/` / `plugins/` **不引用**任何 `modules/` 内容
- `modules/<m>/` **不直接 import** 其他 `modules/<m>/` 内部
- 模块间通信**只能**通过 `modules/<m>/index.ts` 暴露的对外接口

#### 3. 全局/模块双层状态管理

| 层       | 路径                 | 放什么                                                                                                        | 不放什么       |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------- |
| 全局     | `store/modules/`     | 跨模块共享：`app`（侧边栏/语言）、`user`（token/profile/权限）、`theme`（主题模式）、`router`（路由 UI 状态） | 任何业务状态   |
| 模块私有 | `modules/<m>/store/` | 业务状态：列表筛选、表单临时态、详情缓存                                                                      | 跨模块共享数据 |

#### 4. 技术栈替换零侵入

目录边界限定了每个技术决策的影响范围：

| 想做的事                      | 改的位置                         | 业务模块影响                                |
| ----------------------------- | -------------------------------- | ------------------------------------------- |
| Pinia → Redux                 | `store/`                         | 零（业务模块不直接 import 全局 store 内部） |
| Element Plus → Ant Design Vue | `components/common/` + `main.ts` | 零（业务模块只用 `common/` 封装）           |
| Axios → Fetch                 | `api/http.ts`                    | 零（业务模块只调 `api/modules/*.ts`）       |
| UnoCSS → Tailwind             | `uno.config.ts` + 全局样式       | 零                                          |
| v-inputDebounce 自定义实现    | `directives/_utils.ts`           | 零（业务模块只通过 v-inputDebounce 用）     |

#### 5. 并行开发友好

- 不同成员负责不同模块，几乎无 merge conflict
- 模块 owner 边界清晰（PR 审查范围一目了然）
- 离职交接 = 移交一个目录

#### 6. 测试边界清晰（与目录一一对应）

- **工具级单测**：`utils/dayjs.spec.ts`、`utils/storage.spec.ts`
- **Hook 测试**：`composables/useRequest.spec.ts`
- **组件级单测**：`components/common/AsyncState.spec.ts`
- **集成测测**：`components/global-plugin.spec.ts`、`router/auto-register.spec.ts`

---

## 📂 目录结构

```
gm-portal-fe/
├── src/
│   ├── api/             # 网络层（http.ts + modules/）
│   ├── assets/          # 静态资源（styles/、icons/）
│   │   └── styles/      # 全局样式：reset / variables / theme / transition / element-overwrite / custom + mixins/
│   ├── components/      # common/（通用无业务）+ layout/（布局）
│   │   ├── common/      # AsyncState / ErrorBoundary
│   │   ├── layout/      # Header / Sidebar
│   │   └── index.ts     # install 模式自动注册 common/ 下的 .vue
│   ├── composables/     # useRequest、useTheme
│   ├── directives/      # 自定义指令（install 模式 + .d.ts 分离）
│   │   ├── _utils.ts      # 通用 debounce + isFunction
│   │   ├── inputDebounce.{ts,d.ts}    # v-inputDebounce 输入防抖
│   │   ├── buttonDebounce.{ts,d.ts}   # v-buttonDebounce 点击防抖
│   │   ├── permission.{ts,d.ts}       # v-permission 权限
│   │   └── index.ts      # install 模式统一注册
│   ├── enums/           # httpEnum、roleEnum
│   ├── layouts/         # default/ + blank/
│   ├── locales/         # zh-CN、en-US
│   ├── modules/         # auth、user、dashboard、error
│   │                    # 每个模块含 views/ + store/ + components/ + routes/index.ts（自动注册）
│   ├── plugins/         # Vue 插件（install 模式 + .d.ts 分离）
│   │   ├── errorHandler.{ts,d.ts}    # 全局错误处理
│   │   └── index.ts      # 统一注册入口（PluginsOptions 聚合）
│   ├── router/          # 自动注册 + 白名单 + 远程菜单 + 守卫
│   │   ├── index.ts                  # 入口：autoRegisteredRoutes + fallbackRoute
│   │   ├── auto-register.ts          # import.meta.glob 扫描 + COMPONENT_REGISTRY 派生
│   │   ├── fallback.ts               # catch-all 404（单独注册保证最后）
│   │   ├── config.ts                 # 菜单模式（local/remote，默认 remote）
│   │   ├── whitelist.ts              # 路由 name 白名单
│   │   ├── types.ts                  # RouteName 联合类型 + RemoteMenuItem 协议
│   │   ├── remote.ts                 # 远程菜单加载 + JSON → RouteRecordRaw 转换
│   │   └── guards/auth.ts            # 白名单 + 登录态 + 远程加载 + 权限校验
│   ├── store/           # 全局：app、user、theme（含持久化）、router
│   ├── types/           # global、env、auto-imports、components
│   ├── utils/           # 通用工具（纯函数 + Vitest 单测）
│   │   ├── storage.{ts,spec.ts}      # Local/Session/clearCookies（命名空间隔离）
│   │   ├── dayjs.{ts,spec.ts}        # 5 个工具函数（formatDate/formatRelative/...）
│   │   ├── bem.ts                    # createNamespace 运行时 BEM 工具
│   │   ├── format.ts / validate.ts / safeAsync.ts / consoleBadge.ts / autoImport.ts
│   │   └── _utils/*                   # （内部工具，按需放）
│   │       └── （注意：`src/components/common/_internal/naming.ts` 是组件命名工具，仅 components 模块内部使用）
│   └── App.vue / main.ts
├── mock/                # vite-plugin-mock 数据
│   ├── auth.ts / user.ts / dashboard.ts / menu.ts  # 接口 mock
│   └── index.ts          # 聚合导出（vite-plugin-mock 自动扫描）
├── docs/                # 项目规范文档
└── 配置文件             # vite.config.ts / tsconfig*.json / uno.config.ts / vitest.config.ts
```

---

## 🚀 开发指南

### 环境要求

| 工具    | 版本要求           |
| ------- | ------------------ |
| Node.js | >=22.18 或 >=24.12 |
| pnpm    | >=11.x             |

### 快速开始

```bash
# 1. 克隆项目
git clone <your-repo-url> gm-portal-fe
cd gm-portal-fe

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器（默认 http://localhost:5173/，remote 菜单模式）
pnpm dev
# 或切到 local 模式（无需接口）
pnpm dev:local
```

启动后访问 `http://localhost:5173/login`，输入默认账号 **admin / 123456** 登录。

### 常用脚本

| 命令                   | 用途                                               |
| ---------------------- | -------------------------------------------------- |
| `pnpm dev`             | 启动开发服务器（默认 remote 菜单模式）             |
| `pnpm dev:local`       | 启动开发服务器（切到 local 菜单模式，无接口可用）  |
| `pnpm build`           | 生产构建（含 type-check:full）                     |
| `pnpm preview`         | 预览构建产物                                       |
| `pnpm analyze`         | 生产构建 + 生成包体积分析报告（dist/stats.html）   |
| `pnpm test`            | 运行单元测试（一次性）                             |
| `pnpm test:watch`      | 单元测试 watch 模式                                |
| `pnpm test:coverage`   | 测试覆盖率报告                                     |
| `pnpm test:ui`         | 单元测试 UI 模式                                   |
| `pnpm type-check`      | TypeScript 类型检查（增量，husky pre-commit 用）   |
| `pnpm type-check:full` | TypeScript 类型检查（强制重建 .tsbuildinfo 缓存）  |
| `pnpm check:routes`    | 校验 RouteName/component-registry/whitelist 一致性 |
| `pnpm lint`            | ESLint 检查全项目                                  |
| `pnpm lint:fix`        | ESLint 自动修复                                    |
| `pnpm format`          | Prettier 格式化全项目                              |

### Mock 数据

开发模式默认启用 vite-plugin-mock（`VITE_USE_MOCK=true`），内置 mock 模块：

| 模块      | 接口                                                       | 默认账号       |
| --------- | ---------------------------------------------------------- | -------------- |
| auth      | `/api/auth/login`、`/api/auth/profile`、`/api/auth/logout` | admin / 123456 |
| user      | `/api/user/list`、`/api/user/:id`                          | -              |
| dashboard | `/api/dashboard/stats`                                     | -              |
| menu      | `/api/menu`（返回 Dashboard + UserList 两条）              | -              |

> `/api/menu`（远程菜单）在 remote 模式下由守卫调用。已内置 mock（Dashboard + UserList），无需额外配置即可跑通端到端流程。

切换真实后端：修改 `.env.development` 中 `VITE_USE_MOCK=false` 并配置 `VITE_API_BASE_URL`。

### 路由架构（自动注册）

业务模块的路由**无需在 `src/router/` 任何文件中手动 import**——在 `src/modules/<feature>/routes/index.ts` 声明后，`auto-register.ts` 通过 Vite `import.meta.glob` 自动扫描并注册。

新增业务模块的标准流程（**3 步，无需改 router 目录**）：

```ts
// 1. 写视图组件 src/modules/order/views/List.vue
// 2. 声明路由 src/modules/order/routes/index.ts
const routes: RouteRecordRaw[] = [
  {
    path: '/order',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: 'list',
        name: 'OrderList',
        component: () => import('../views/List.vue'),
        meta: { title: '订单管理', requiresAuth: true, permissions: ['order:view'] },
      },
    ],
  },
]
// 3. 在 router/types.ts 追加 RouteName 联合类型条目
// 完成 —— 路由自动可用，remote 模式自动可用（component 由 auto-register 派生）
```

> **默认菜单模式**：dev = `remote`（贴近生产，需 mock 接口），`pnpm dev:local` 切到 `local`（无需接口）。
> **白名单**：跳过登录 + 权限校验，按**路由 name** 匹配（`router/whitelist.ts`）。
> **COMPONENT_REGISTRY**：从 `autoRegisteredRoutes` 递归提取 `(name, component)` 派生，remote 模式按 name 查找组件 loader。新增路由无需在多处同步。
>
> 详见 `docs/07-路由模块设计.md`。

### 样式管理（BEM + 双主题）

- **BEM 命名规范**：Block = `gm-block`（或 `c-{name}`），Element = `__element`，Modifier = `--modifier`，State = `is-{state}`（运行时由 `is()` 生成）
- **运行时工具**：`createNamespace('xxx')` 返回 `{ b, e, m, be, bm, em, bem, is }`，组件用 `const bem = createNamespace('header-bar')` + `:class="[bem.b(), bem.e('user')]"`
- **编译期 mixin**：`@use '@/assets/styles/mixins/bem' as *` 在 SFC `<style lang="scss">` 中用 `@include b / e / m / is` 拼接
- **双主题**：浅色 + 深色 + 跟随系统，切换 API `useTheme().toggleMode()`（Pinia store + localStorage 持久化）

```vue
<script setup lang="ts">
import { useTheme } from '@composables/useTheme'
const { isDark, toggleMode } = useTheme()
</script>

<template>
  <button @click="toggleMode">{{ isDark ? '☀️' : '🌙' }}</button>
</template>
```

> 详见 `docs/05-BEM样式规范.md` 与 `docs/06-主题管理规范.md`。

### 国际化

当前支持 `zh-CN`（默认）和 `en-US`，切换通过 `useAppStore().setLocale()`。

### 模块化范式（directives / plugins）

新增自定义指令：

```ts
// src/directives/xxx.d.ts
export type ElHTMLElement = HTMLElement
export interface XxxBinding { value: (...args: unknown[]) => void; arg?: string }

// src/directives/xxx.ts
export default {
  install(app: App) {
    app.directive<ElHTMLElement, XxxBinding['value']>('xxx', {
      mounted(el, binding) { ... }
    })
  }
}

// src/directives/index.ts
import xxx from './xxx'
const install = (app: App) => app.use(xxx)
export default install
```

新增全局插件同形（参考 `src/plugins/errorHandler.ts`）。

main.ts 集中接入：

```ts
import Directives from '@directives'
import Plugins from '@plugins'
app.use(Directives)
app.use(Plugins, { errorHandler: { report: ... } })
```

> 详见 [`docs/08-模块化架构总览.md`](docs/08-模块化架构总览.md)。

---

## 📐 代码规范

### 工具栈

- **ESLint 10** + flat config（`eslint.config.mjs`）+ Vue 官方推荐配置
- **Prettier 3.9** 统一格式
- 规则组合：`pluginVue['flat/essential']` + `@vue/eslint-config-typescript` + `@vue/eslint-config-prettier/skip-formatting`

### 常用脚本

| 命令                | 用途                   |
| ------------------- | ---------------------- |
| `pnpm lint`         | ESLint 检查（不修改）  |
| `pnpm lint:fix`     | ESLint 自动修复        |
| `pnpm format`       | Prettier 自动格式化    |
| `pnpm format:check` | Prettier 检查（CI 用） |

### 配置文件

| 文件                | 说明                                                        |
| ------------------- | ----------------------------------------------------------- |
| `eslint.config.mjs` | ESLint flat config（Vue/TS/Prettier 三层组合）              |
| `.prettierrc.json`  | Prettier 主配置（semi/singleQuote/printWidth 等）           |
| `.prettierignore`   | Prettier 忽略文件（dist、node_modules、coverage、文档目录） |

### 项目级规则覆盖

| 规则                                | 配置                      | 原因                                 |
| ----------------------------------- | ------------------------- | ------------------------------------ |
| `vue/multi-word-component-names`    | `off`                     | 保留 Header/Sidebar/Login 等简洁命名 |
| `@typescript-eslint/no-unused-vars` | `varsIgnorePattern: '^_'` | 允许 `_p` 等有意忽略的解构模式       |

### Prettier 风格

- `semi: false`（无分号）
- `singleQuote: true`（单引号）
- `trailingComma: "es5"`（兼容 ES5 的位置加尾逗号）
- `printWidth: 100`（每行最多 100 字符）
- `vueIndentScriptAndStyle: false`（Vue 的 `<script>` 和 `<style>` 不缩进）

### 与 Husky 集成

| Hook       | 命令                   | 作用                       |
| ---------- | ---------------------- | -------------------------- |
| pre-commit | `pnpm type-check`      | 防止 TS 类型错误入库       |
| pre-commit | `pnpm type-check:full` | （build 时）强制重建缓存   |
| pre-commit | lint-staged            | prettier + eslint 自动修复 |
| pre-push   | `pnpm test`            | 防止测试不通过的代码推送   |

> 注：lint 未集成到 pre-commit 的**全量检查**（避免每次 commit 等待），开发期手动 `pnpm lint:fix`，CI 阶段跑 `pnpm lint`。

---

## 📦 部署

### 生产构建

```bash
pnpm build
```

输出到 `dist/` 目录（包含 index.html + assets/），可托管到任何静态文件服务器。

### 环境变量

| 变量                     | 说明                                                  | 默认值           |
| ------------------------ | ----------------------------------------------------- | ---------------- |
| `VITE_APP_TITLE`         | 应用标题（浏览器 tab / login 欢迎语）                 | 工贸统一登录门户 |
| `VITE_API_BASE_URL`      | API 基础 URL（baseURL，前缀统一管理）                 | `/api`           |
| `VITE_USE_MOCK`          | 是否启用 Mock（dev 默认 true）                        | `false`          |
| `VITE_MENU_SOURCE`       | 菜单加载模式（`local` / `remote`，dev 默认 `remote`） | `remote`         |
| `VITE_STORAGE_NAMESPACE` | storage 命名空间（隔离多项目共用 localStorage）       | `gm-portal-fe`   |

> 环境变量读取：项目内显式通过 `import.meta.env.VITE_XXX` 访问。`baseURL` / `storage namespace` 单一来源在 `src/api/http.ts` 和 `src/utils/storage.ts`，不在各业务模块分散。

### Nginx 配置示例

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/gm-portal-fe/dist;
  index index.html;

  # SPA fallback（Vue Router history 模式）
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API 反向代理（生产关闭 Mock 时使用）
  location /api/ {
    proxy_pass http://backend-service:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # 静态资源缓存
  location ~* \.(js|css|png|jpg|svg|ico|woff2?)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
  }

  # Gzip 压缩
  gzip on;
  gzip_types text/plain text/css application/javascript application/json;
}
```

### Docker 部署

```dockerfile
# Dockerfile（多阶段构建示例）
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# 构建并运行
docker build -t gm-portal-fe:1.0.0 .
docker run -d --name gm-portal-fe -p 8080:80 gm-portal-fe:1.0.0
```

### CI/CD（GitHub Actions 示例）

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 11 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }
```

---

## 🧪 测试

```bash
pnpm test              # 单次运行（CI 用）
pnpm test:watch        # 开发用 watch
pnpm test:coverage     # 覆盖率报告（输出到 coverage/）
```

测试文件与源码同级（`foo.ts` 对应 `foo.spec.ts`），覆盖：

- `utils/` — dayjs、storage、bem
- `composables/` — useRequest
- `components/common/` — AsyncState
- `components/`（自动注册） — global-plugin

覆盖率阈值：lines/functions 70%，branches 60%（脚手架阶段宽松，业务阶段建议提到 80%）。

---

## 📚 相关文档

### 项目规范

| 文档               | 路径                                | 说明                                                          |
| ------------------ | ----------------------------------- | ------------------------------------------------------------- |
| 工具兼容性踩坑     | `docs/01-工具兼容性问题踩坑记录.md` | npm/pnpm/Node 兼容性问题 + 解决方案                           |
| 代码质量工具链     | `docs/02-代码质量工具链.md`         | ESLint 10 + Prettier 3.9 + lint-staged 17                     |
| Git 工作流工具链   | `docs/03-Git工作流工具链.md`        | Husky + commitlint + cz-customizable                          |
| 构建与测试工具     | `docs/04-构建与测试工具.md`         | Vite 8 + Vitest 4 + UnoCSS 66 + alias 系统                    |
| BEM 样式规范       | `docs/05-BEM样式规范.md`            | 命名约定 + 样式隔离三层防线 + mixin + 运行时工具              |
| 主题管理规范       | `docs/06-主题管理规范.md`           | 双主题架构 + CSS 变量速查 + useTheme API                      |
| 路由模块设计       | `docs/07-路由模块设计.md`           | 自动注册 + 白名单 + 远程菜单 + 3 步新增流程                   |
| **模块化架构总览** | `docs/08-模块化架构总览.md`         | 4 块公共范式（directives/plugins/components/utils）+ 扩展流程 |

### 设计 / 计划

| 文档     | 路径                                                                |
| -------- | ------------------------------------------------------------------- |
| 设计文档 | `docs/superpowers/specs/2026-07-17-vue3-vite-ts-scaffold-design.md` |
| 实施计划 | `docs/superpowers/plans/2026-07-17-vue3-vite-ts-scaffold.md`        |

### 变更日志

| 文档           | 路径       |
| -------------- | ---------- |
| `CHANGELOG.md` | 项目根目录 |

---

## 📝 License

MIT
