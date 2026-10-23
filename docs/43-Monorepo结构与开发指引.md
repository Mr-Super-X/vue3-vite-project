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

| app    | dev 端口 | 依赖的 @vv 包                      | 说明                                             |
| ------ | -------- | ---------------------------------- | ------------------------------------------------ |
| admin  | 5174     | mock / shared / ui（+ config dev） | 默认 remote 菜单模式；`dev:local` 切本地         |
| docs   | 5175     | mock / shared / ui                 | 组件示例站，白名单含全部 Demo 前缀               |
| portal | 5176     | mock / shared / ui                 | `/home` 公开访问                                 |
| h5     | 5177     | mock / shared / ui                 | rem 适配仅转换本 app h5 前缀目录                 |
| big    | 5178     | mock / shared / ui                 | scale 适配，路由 `meta.bigScreen` 声明设计稿尺寸 |
| auth   | 5179     | mock / shared / ui                 | 登录接口 mock 必需（4 端点）                     |

端口 = `@vv/config` 的 `SERVER_DEFAULTS.port(5174) + portOffset`（各 app `vite.config.ts` 声明），`strictPort: true`——端口占用直接报错不漂移（docker 网关 location 与端口强绑定，漂移即 404 隐患）。

## 3. 常用命令

| 场景                                 | 命令                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 安装全 workspace 依赖                | `pnpm install`                                                                                                |
| 全量 dev（turbo 并行 6 app）         | `pnpm dev`                                                                                                    |
| 单 app dev                           | `pnpm -C apps/<a> dev`（`dev:local` = 本地菜单模式）                                                          |
| 同域网关 dev（6 app 带 base，见 §6） | `pnpm dev:gateway`                                                                                            |
| 全量构建（turbo 拓扑序 + 类型门禁）  | `pnpm build`                                                                                                  |
| 全量单测（turbo，test 依赖 ^build）  | `pnpm test`                                                                                                   |
| 单 app 测试 / 覆盖率 / UI            | `pnpm -C apps/admin test`、`test:coverage`、`test:ui`；根 `pnpm test:coverage` / `test:ui` 收容（admin 口径） |
| 类型检查                             | `pnpm type-check`（turbo）/ `pnpm -C apps/<a> type-check:full`                                                |
| gh-pages 六应用聚合构建              | `pnpm build:pages`（产物根 `dist/<app>/` + 落地页）                                                           |
| 路由一致性（6 app 逐个校验）         | `pnpm check:routes`                                                                                           |
| alias 与 tsconfig paths 同步         | `pnpm generate:tsconfig-paths` / `pnpm check:aliases`                                                         |

新增业务模块：`pnpm new-module <kebab-name>`（默认生成到 `apps/admin/src/modules/<name>/`，`--app <a>` 指定其他 app，`--with-mock` 等选项见脚本头注）。脚本以 `import.meta.dirname` 定位仓库根，**在任意目录执行均可**，无须先 `cd` 进 app 目录。

## 4. 新增应用流程

> 属 CLAUDE.md §2.2 列管操作，**须先走 §2.4 修改申请获批**后按以下步骤执行：

1. `mkdir apps/<name>` + 新建 `package.json`（name `@vv-app/<name>`，仿现有 6 app；dependencies 按需声明 `@vv/*` workspace 包）
2. 新建 `vite.config.ts`：调 `createViteConfig({ appRoot, appName: '<name>', portOffset: <下一个空闲偏移>, ... })`（`base` / `mockPath` 走工厂缺省，6 app 同构已收敛进工厂；无 mock 依赖才显式传 `mockPath: ''`）
3. `apps/<name>/src/` 最小骨架：`main.ts` / `App.vue` / `router/`（whitelist + fallback）/ `modules/<首模块>/`（views + routes）
4. env 接线：`.env` 注入 `VITE_AUTH_ORIGIN=/auth`（统一登录回跳基址，缺省即 `/auth`）
5. 端口登记两处同改：`portOffset` 与 `scripts/apps-registry.mjs` 的 `port` 字段（注册表是 dev-gateway / check-routes / eslint 边界规则三消费的单源；`check:gateway-conf` 的端口双写锁死会校验 `5174 + portOffset === port`，漏改即红）+ `docker/nginx.dev.conf` 的 location 块（check-gateway-conf 双向校验兜底）
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
- dev 下**统一登录全链路必须走 §6 网关（:8080）**——单 app 起服务（如只起 admin）时 `VITE_AUTH_ORIGIN` 指向的 `/auth` 无路由可达，未登录跳 `/auth/login` **404 属预期**。注意全量 `pnpm dev` 也不可用：各 app 独立端口（5174-5179），`/auth` 是相对路径，在 5174 上跳 `/auth/login` 仍是 5174 的 404，不会跨端口到达 auth（5179）。

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
- **vue beta 警示（复用隐性地雷）**：`pnpm-workspace.yaml` 的 `overrides` 把 vue 及全部 `@vue/*` 子包钉在 `beta` tag（catalog 的 `^3.5.38` 被覆盖）——4 个包的全部开发 / 测试都跑在 Vue **beta** 上；包被其它 Vue3 工程复用（宿主用稳定版 vue）时兼容性**未经验证**，且包源码的宿主装配契约（auto-import / scss 注入 / dirs 扫描，见各包 README）也须一并复刻

## 9. 本地开发排障（高频 4 场景）

> **前置（网关相关场景）**：需 Docker Desktop 已启动。Win/Mac 内置 `host.docker.internal` 映射；Linux 靠 `docker-compose.yml` 的 `extra_hosts: host-gateway`，无需额外配置。

### 9.1 dev 启动报 `Port 517X is already in use`

`@vv/config` 的 `SERVER_DEFAULTS.strictPort: true`（`packages/config/src/server.ts`）——端口被占用**直接报错退出，不会自动漂移**（漂移会让 docker 网关 location 反代落空，排查困难）。端口表：

| 端口 | 归属       | 端口 | 归属 |
| ---- | ---------- | ---- | ---- |
| 5174 | admin      | 5177 | h5   |
| 5175 | docs       | 5178 | big  |
| 5176 | portal     | 5179 | auth |
| 8080 | nginx 网关 |      |      |

处置：先找到占用进程释放（Windows `netstat -ano | findstr 5174`，macOS/Linux `lsof -i:5174`）。确需换端口时**两处同改**：目标 app `vite.config.ts` 的 `portOffset` 与 `scripts/apps-registry.mjs` 的 `port` 字段（`check:gateway-conf` 端口双写锁死校验，漂移即红）+ `docker/nginx.dev.conf` 的 location。

### 9.2 网关 502：`http://localhost:8080/admin/` 返回 Bad Gateway

宿主 IP 漂移：Docker Desktop 的 host-gateway IP（默认 `192.168.65.254`，WSL 网段网关）在重启 / 换网卡后可能变化，nginx 容器内直连旧 IP 即 502。改法：查当前宿主 IP（`ipconfig` 找 `vEthernet (WSL)` 网段的网关地址，或 Docker Desktop → Settings → Resources → Network），替换 `docker/nginx.dev.conf` 中 **6 组** `proxy_pass http://192.168.65.254:51XX` 的宿主 IP（`/admin` 与 `/api` 同为 5174，文件头注释有背景说明），然后 `docker compose restart`。

### 9.3 mock 接口 404：`/api/auth/login` 等返回 404

按序排查：

1. **网关模式**：确认请求地址是 `:8080` 而非具体 app 端口——`/api/*` 由 `nginx.dev.conf` 的 `location /api/` 统一反代到 admin（5174，其 mock 最全：auth/user/menu 三模块）；不经网关直连单 app 端口时，由各 app 自己的 vite-plugin-mock 处理（同一 `@vv/mock` 数据源，响应一致）
2. **mock 文件位置**：mock 已迁 `packages/mock/src/`（**不是**根 `mock/`）；新建 mock 文件要放进该目录（或被 viteMockServe 扫描到的约定目录）才会生效
3. **new-module 未带 `--with-mock`**：该选项可选，未传时只生成业务骨架、不生成 mock——接口自然 404，补一个 mock 文件即可
4. **并行 dev 的 mock 竞态（`pnpm dev` 偶发全部 mock 404）**：6 app 共享同一 `@vv/mock` 源码目录，turbo 并行起 dev 时 vite-plugin-mock 的 bundle-require 会对 `_*.bundled_*.mjs` 临时文件无容错 unlink，并发编译下互相抢删会让某 app 的 mockData 静默清空（接口返回 index.html / 404）。**已内置修复**：`@vv/config` 的 `cleanMockBundled` 插件带 5 秒 mtime 门槛（只删创建超 5s 的陈旧临时文件，在飞文件不碰）；若老分支复现，重启该 app dev 即可，升级 `packages/config` 后根治

### 9.4 HMR 失效：console 报 `[vite] failed to connect to websocket ... client:865`

经网关 dev 时，vite client 若把 ws 指向网关端口会握手失败（页面不热更）。**已内置修复**：`@vv/config` 工厂 `server.hmr` 段将 `port` / `clientPort` 固定为 app 自身端口（5174-5179），client 直连 vite 原生 ws 端点（与 `VITE_BASE=/<app>/` 的 hmrBase 匹配）。若仍报错，按序确认：

1. app 由 `pnpm dev:gateway` 启动（带 `VITE_BASE=/<app>/`）——直连单 app dev 时同样生效，可用它区分是网关问题还是 vite 自身问题
2. `docker/nginx.dev.conf` 的 `Upgrade` / `Connection` 头透传未被改动（server 级，丢失则 ws 经网关握手失败）
3. 浏览器代理 / 安全软件未拦截 5174-5179 的 websocket 连接
