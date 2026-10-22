# 43 - Monorepo 结构与开发指引

> 本文档是 Monorepo 迁移（P0-P5）的落地说明与日常开发入口。
> 设计稿：`docs/superpowers/specs/2026-10-21-monorepo-migration-design.md`；
> 前期评估：`docs/42-Monorepo多应用改造评估.md`；治理硬约束：`CLAUDE.md` §2。

## 1. 总览

单应用 `src/` 已升级为 **pnpm workspace + turbo@2** 的 Monorepo：**6 个独立应用（apps/）+ 4 个共享包（packages/）**。每个 app 是完整可独立 dev/build/test 的 Vue 3 工程，共享代码全部经 `@vv/*` workspace 包消费（源码直链，不建 dist）。

```text
vue3-vite-project（pnpm workspace + turbo@2）
├── apps/
│   ├── admin   @vv-app/admin   端口 5174  中后台管理（主干业务：user/reports/workbench/error）
│   ├── auth    @vv-app/auth    端口 5179  统一登录（登录页 + 登出 + 跨应用重定向协议）
│   ├── portal  @vv-app/portal  端口 5176  门户企业官网（home + portal layout）
│   ├── h5      @vv-app/h5      端口 5177  H5 移动端（h5-demo + rem 适配）
│   ├── big     @vv-app/big     端口 5178  数据大屏（big-demo + scale 适配）
│   └── docs    @vv-app/docs    端口 5175  组件示例文档（demo 模块 + DemoDocs 布局）
├── packages/
│   ├── config  @vv/config      vite 工厂 createViteConfig（插件/别名/css/分包单点）
│   ├── mock    @vv/mock        vite-plugin-mock 数据源（原根 mock/ 职责）
│   ├── shared  @vv/shared      网络层基建 + 全局 store + useAppRouter/useRequest/useAuth/useDict
│   └── ui      @vv/ui          全局组件三目录 + 弹窗族（useDialog/useConfirm/useLogout）+ 图标/样式
├── scripts/                    工程脚本（check-routes / build-pages / dev-gateway / new-module …）
├── docker/ + docker-compose.yml  本地同域网关（见 §6）
└── .github/workflows/          ci.yml（turbo affected）+ deploy.yml（六应用聚合 Pages）
```

**依赖方向铁律**（CLAUDE.md §2.1）：`apps/* → packages/*`；包间 `config → mock → shared → ui` 单向；apps 互不依赖（跨 app 走整页跳转协议）；运行时依赖（vue/element-plus 等）一律 `peerDependencies` + `pnpm-workspace.yaml` catalog 单版本源。

## 2. 应用与包速查

| app    | dev 端口 | 依赖的 @vv 包               | 说明                                             |
| ------ | -------- | --------------------------- | ------------------------------------------------ |
| admin  | 5174     | shared / ui（+ config dev） | 默认 remote 菜单模式；`dev:local` 切本地         |
| docs   | 5175     | mock / shared / ui          | 组件示例站，白名单含全部 Demo 前缀               |
| portal | 5176     | mock / shared / ui          | `/home` 公开访问                                 |
| h5     | 5177     | mock / shared / ui          | rem 适配仅转换本 app h5 前缀目录                 |
| big    | 5178     | mock / shared / ui          | scale 适配，路由 `meta.bigScreen` 声明设计稿尺寸 |
| auth   | 5179     | mock / shared / ui          | 登录接口 mock 必需（4 端点）                     |

端口 = `@vv/config` 的 `SERVER_DEFAULTS.port(5174) + portOffset`（各 app `vite.config.ts` 声明），`strictPort: true`——端口占用直接报错不漂移（docker 网关 location 与端口强绑定，漂移即 404 隐患）。

## 3. 常用命令

| 场景                                 | 命令                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| 安装全 workspace 依赖                | `pnpm install`                                                 |
| 全量 dev（turbo 并行 6 app）         | `pnpm dev`                                                     |
| 单 app dev                           | `pnpm -C apps/<a> dev`（`dev:local` = 本地菜单模式）           |
| 同域网关 dev（6 app 带 base，见 §6） | `pnpm dev:gateway`                                             |
| 全量构建（turbo 拓扑序 + 类型门禁）  | `pnpm build`                                                   |
| 全量单测（turbo，test 依赖 ^build）  | `pnpm test`                                                    |
| 单 app 测试 / 覆盖率 / UI            | `pnpm -C apps/admin test[:coverage                             | :ui]`；根 `pnpm test:coverage` 收容 |
| 类型检查                             | `pnpm type-check`（turbo）/ `pnpm -C apps/<a> type-check:full` |
| gh-pages 六应用聚合构建              | `pnpm build:pages`（产物根 `dist/<app>/` + 落地页）            |
| 路由一致性（6 app 逐个校验）         | `pnpm check:routes`                                            |
| alias 与 tsconfig paths 同步         | `pnpm generate:tsconfig-paths` / `pnpm check:aliases`          |

新增业务模块仍在 **app 内**执行：`pnpm new-module <kebab-name>`（在 app 目录上下文运行生成器，生成 `apps/<a>/src/modules/<name>/` 骨架）。

## 4. 新增应用流程

> 属 CLAUDE.md §2.2 列管操作，**须先走 §2.4 修改申请获批**后按以下步骤执行：

1. `mkdir apps/<name>` + 新建 `package.json`（name `@vv-app/<name>`，仿现有 6 app；dependencies 按需声明 `@vv/*` workspace 包）
2. 新建 `vite.config.ts`：调 `createViteConfig({ appRoot, appName: '<name>', base: process.env.VITE_BASE ?? '/', portOffset: <下一个空闲偏移>, ... })`
3. `apps/<name>/src/` 最小骨架：`main.ts` / `App.vue` / `router/`（whitelist + fallback）/ `modules/<首模块>/`（views + routes）
4. env 接线：`.env` 注入 `VITE_AUTH_ORIGIN=/auth`（统一登录回跳基址，缺省即 `/auth`）
5. 端口登记三处同改：`portOffset`、`scripts/dev-gateway.ts` 的 `APPS` 表、`docker/nginx.dev.conf` 的 location
6. `pnpm install` 锁 workspace 链接 → `pnpm -C apps/<name> dev` 起服务 → `pnpm check:routes`（脚本自动发现新 app）
7. gh-pages 无需改脚本：`scripts/build-pages.ts` 自动发现含 `vite.config.ts` 的 app 目录并聚合部署

## 5. 统一登录协议

**目标**：6 个 app 各自独立部署，但登录态（httpOnly cookie，见 README §3 user store 口径）在同一 origin 下漫游——生产形态为同域 path 部署（`/admin/`、`/auth/` …），dev 由 §6 网关复现。

**协议**（实现：`@vv/shared` 的 `redirect.ts` + 各 app 路由守卫）：

```text
1. 任一 app 守卫发现无会话（Session.get('auth') 缺失 / profile 401）
   → window.location.href = ${VITE_AUTH_ORIGIN}/login?redirect=<encodeURIComponent(当前完整 URL)>
   （跨 app 用整页跳转而非 router.push：各 app 无共享 router 实例）
2. auth 登录成功 → 校验 redirect 必须同域同源前缀（防开放重定向）→ location.href = redirect
   无 redirect 时按角色落 /admin 或 /portal
3. 登出（@vv/ui useLogout）→ 清会话 → ${VITE_AUTH_ORIGIN} 整页回跳
```

- `VITE_AUTH_ORIGIN` 由各 app `.env` 注入（生产缺省 `/auth`；子路径部署时按实际前缀改）；包内不硬编码 app 名。
- dev 下单 app 起服务（如只起 admin）时 `VITE_AUTH_ORIGIN` 指向的 `/auth` 无网关可路由——这是预期行为，统一登录全链路须走 §6 网关或全量 `pnpm dev`。

## 6. 本地同域网关（docker compose）

复现生产「同域 path 部署」：nginx `:8080` 反代宿主机 6 个 vite dev server，浏览器只访问 `localhost:8080`（同 origin），cookie 漫游与重定向协议和生产一致。

```bash
# 终端 1：6 个 app 以 base=/<app>/ 并行起 dev（注入 VITE_BASE；turbo 不支持 per-app env，故用 node 脚本）
pnpm dev:gateway

# 终端 2：起 nginx 网关
docker compose up
```

| 网关路径                        | 反代目标（宿主机）          |
| ------------------------------- | --------------------------- |
| `http://localhost:8080/admin/`  | `host.docker.internal:5174` |
| `http://localhost:8080/docs/`   | `host.docker.internal:5175` |
| `http://localhost:8080/portal/` | `host.docker.internal:5176` |
| `http://localhost:8080/h5/`     | `host.docker.internal:5177` |
| `http://localhost:8080/big/`    | `host.docker.internal:5178` |
| `http://localhost:8080/auth/`   | `host.docker.internal:5179` |
| `http://localhost:8080/`        | 302 → `/portal/`            |

**两个关键语义**（`docker/nginx.dev.conf` 注释同步）：

1. `proxy_pass` 不带 URI 部分 → 保留原始路径前缀（`/admin/xxx` → 5174 的 `/admin/xxx`），与各 app dev 的 `VITE_BASE=/<app>/` 严格对齐；改写前缀 vite dev 404。
2. `Upgrade`/`Connection` 头透传 → vite HMR websocket 经网关可用。

`extra_hosts: host.docker.internal:host-gateway` 为 Linux 兼容；Docker Desktop（Win/Mac）内置该映射，本行 no-op。

**验证**：`curl -I http://localhost:8080/admin/` 与 `http://localhost:8080/auth/login` 均 200（dev 起好后）。

## 7. CI/CD 与发布

- **ci.yml**：lint 根全仓一次；Build/Test 走 turbo——master push 全量（`turbo run build test`），PR / develop push 走 affected（`--filter=[origin/master]...`，未变更 app 命中缓存或跳过）；turbo 本地缓存统一 `--cache-dir=.turbo` 并接 `actions/cache`；`check:routes` 保留。
- **deploy.yml**（push master 自动）：`pnpm build:pages` 自动发现 6 app，逐个 spawn 注入演示五开关（`VITE_BASE` 由脚本内 `REPO_PREFIX` 按 `/vue3-vite-project/<app>/` 注入；自定义域改脚本常量），产物聚合根 `dist/<app>/` + 落地导航页，整目录发 GitHub Pages。
- 顺序约束：turbo `build` 内含 `build-only`（unplugin 生成声明）→ `type-check:full`，CI 干净 checkout 下类型检查依赖 build 先生成声明，故不单独拆 type-check step。

## 8. 治理约束速查

- workspace 结构 / 依赖方向 / 修改申请 / 写操作清单：**CLAUDE.md §2**（apps/packages Architecture Lockdown）
- 全局组件不要显式 import（@vv/ui 三目录自动注册）：CLAUDE.md §1.7
- AutoImport 标识符来源注释约定：CLAUDE.md §1.6.1
- 单 app 使用场景（模板受众只取一个 app）：取 `apps/admin` + `packages/*` 即可，包与 app 间仅 workspace 链接耦合
