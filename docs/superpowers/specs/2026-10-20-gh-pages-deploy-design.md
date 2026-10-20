# gh-pages 自动化部署设计

> 日期：2026-10-20 | 状态：已批准（用户确认 3 项决策 + 方案 A）
> 分支预期合入：master（触发部署）

## 1. 背景与目标

将本项目通过 GitHub Actions 自动化部署到 GitHub Pages，使 `https://Mr-Super-X.github.io/vue3-vite-project/` 可在线访问完整 demo。

关键约束（探索结论）：

- 仓库为 GitHub **项目站点**（非用户站点 `username.github.io`），站点 URL 自带 `/vue3-vite-project/` 子路径 → vite `base` 与 vue-router `base` 都必须适配
- gh-pages 为**纯静态托管**，无后端 API；项目 demo 数据全靠 `mock/`（auth/dict/menu/pro-table/user）
- 项目已内置相关开关：`VITE_BASE`（router basename，见 `src/router/config.ts`）、`VITE_HISTORY_MODE`（web/hash）、`VITE_MENU_SOURCE`（local/remote）、`VITE_USE_MOCK`（viteMockServe 开关）——基础设施完备，**零 src/ 改动**

## 2. 决策记录（用户确认）

| 决策点 | 选择 | 理由 |
|--------|------|------|
| gh-pages 上的数据方案 | **启用 mock 生产模式** | `viteMockServe.prodEnabled` 把 mock 拦截注入生产产物，gh-pages 上所有 demo 功能（ProTable/表单/图表）完整可演示 |
| 路由模式 | **hash 模式** | gh-pages 无 SPA fallback，history 模式刷新深层路由必 404；hash 零配置支持，`src/router/config.ts` 注释亦推荐子路径部署用 hash |
| 触发条件 | **push 到 `master`** | 与 `ci.yml` 触发分支一致；feature 分支不触发，合入即发布 |

## 3. 方案对比

| 方案 | 机制 | 取舍 | 结论 |
|------|------|------|------|
| A. 官方 Pages artifact | `actions/upload-pages-artifact` + `actions/deploy-pages` | 官方推荐；无需管理部署分支；权限收敛 workflow 内；需一次性 Settings 设置 | **选中** |
| B. gh-pages 分支 | `peaceiris/actions-gh-pages` 推送 `gh-pages` 分支 | Source 设置略简单；多一个长期部署分支；需 `contents: write` | 淘汰 |
| C. 手动 npm 脚本 | `gh-pages` 包本地手动跑 | 不符合"自动化"需求 | 淘汰 |

## 4. 详细设计

### 4.1 新增 `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch: # 手动兜底

permissions:
  pages: write
  id-token: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  VITE_BASE: /vue3-vite-project/   # vue-router basename（ROUTER_CONFIG 已消费）
  VITE_HISTORY_MODE: hash
  VITE_MENU_SOURCE: local
  VITE_USE_MOCK: 'true'            # node 侧：viteMockServe enable + prodEnabled 均消费

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 12
      - uses: actions/setup-node@v4
        with:
          node-version: '24.12.0'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check:full
      - run: pnpm build-only --base=/vue3-vite-project/   # vite 静态资源 base 走 CLI，不动 vite.config base 逻辑
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/
      - id: deployment
        uses: actions/deploy-pages@v4
```

设计要点：

- Node `24.12.0` / pnpm `12` / `--frozen-lockfile` 与 `ci.yml` 完全对齐
- **不重复 lint/test**：`ci.yml` 在同次 push 已做完整门禁，deploy 职责单一（构建 + 发布）
- vite `base` 通过 CLI `--base` 传入；vue-router `base` 通过 `VITE_BASE` 环境变量（`import.meta.env` 客户端侧）——同名变量双端语义在环境变量表（§4.3）中说明
- `pnpm build`（=`build-only` + `type-check:full`）拆为两步显式执行，避免 npm-run-all 参数透传 `{@}` 链条的不确定性

### 4.2 修改 `vite.config.ts`（唯一代码改动，1 行新增）

```ts
viteMockServe({
  mockPath: 'mock',
  enable: process.env.VITE_USE_MOCK !== 'false',
  // gh-pages 纯静态托管无后端：CI 构建时 VITE_USE_MOCK=true 让 mock 拦截注入生产产物
  // 本地/常规生产构建不含 mock，产物体积与现状一致
  prodEnabled: process.env.VITE_USE_MOCK === 'true',
  watchFiles: true,
}),
```

兼容性核对矩阵（`process.env.VITE_USE_MOCK` 为 node 侧读取）：

| 场景 | 变量值 | `enable` | `prodEnabled` | 行为 |
|------|--------|----------|---------------|------|
| 本地 dev 默认（无 .env） | `undefined` | `true` | `false` | dev mock 开；生产构建不注入——**与现状一致** |
| `.env.development` | `false` | `false` | `false` | 全关（联调真实后端场景） |
| `.env.production` | `false` | `false` | `false` | 常规生产构建不含 mock——**与现状一致** |
| CI deploy 构建 | `true` | `true` | `true` | mock 注入 gh-pages 产物（本次新增行为） |

### 4.3 构建环境变量语义表

| 变量 | 消费方 | 侧 | 作用 |
|------|--------|----|------|
| `--base=/vue3-vite-project/` | vite 构建配置 | node | HTML 中 script/link 静态资源前缀 |
| `VITE_BASE` | `src/router/config.ts` ROUTER_CONFIG.base | 客户端（import.meta.env） | vue-router basename |
| `VITE_HISTORY_MODE=hash` | `src/router/config.ts` | 客户端 | `createWebHashHistory` |
| `VITE_MENU_SOURCE=local` | `src/router/config.ts` | 客户端 | 菜单走本地静态路由，不请求后端 |
| `VITE_USE_MOCK=true` | `vite.config.ts` viteMockServe | node | enable + prodEnabled，mock 注入生产产物 |

### 4.4 同步更新

- `CHANGELOG.md`：新增 `feat(ci)` 条目（项目约定 §4-12，功能性变更必记）

### 4.5 用户一次性手动操作

仓库 **Settings → Pages → Source** 选择 **"GitHub Actions"**（首次部署前置条件，workflow 无法代设）。

## 5. 验证方式

1. 本地模拟 CI 构建：`cross-env VITE_USE_MOCK=true VITE_BASE=/vue3-vite-project/ VITE_HISTORY_MODE=hash VITE_MENU_SOURCE=local pnpm build-only --base=/vue3-vite-project/` → `pnpm preview` 检查资源加载路径均带 `/vue3-vite-project/` 前缀
2. push 到 master 后 Actions `Deploy to GitHub Pages` run 绿
3. 访问 `https://Mr-Super-X.github.io/vue3-vite-project/`：首页正常、菜单完整（local）、demo 页面有 mock 数据、刷新任意页面不 404

## 6. 影响面与回滚

| 项 | 内容 |
|----|------|
| src/ 改动 | **零**（vite.config.ts 位于根目录，且改动已获用户明确批准） |
| 常规生产构建产物 | 体积/内容不变（prodEnabled 默认 false） |
| 回滚 | 删除 `deploy.yml` + revert `vite.config.ts` 一行即可；Pages 站点可在 Settings 中随时下线 |
| 新增依赖 | 无 |
