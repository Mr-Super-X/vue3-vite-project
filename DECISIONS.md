# DECISIONS — 审查决策台账

> 机制来源：/autoplan Round 3 **R3-G1**（2026-10-29）。Round 2 实证「审查决策静默遗漏」——
> 10 项 DX 决策 3 项未落地 + 1 项部分落地，且全部未被 TODOS 捕获（对账靠人工必漂移）。
> 本台账是**仓内唯一决策事实源**，配套机检 `pnpm check:decisions`（CI 阻断级）。
>
> ## 台账纪律（机检强制）
>
> 1. 状态机：`已落地` / `待实施` / `登记` / `关闭`（其余写法直接红）
> 2. `待实施` 行**必须在 TODOS.md 出现同 ID**（防「既未落地也未登记」的静默遗漏——R2 事故形态）
> 3. `已落地` 行必须带**验证锚点**（仓内相对路径），且锚点文件存在——防「状态谎报已落地」
> 4. 新决策入表：/autoplan 各轮产出开工时同步登记；状态变更（落地/关闭）与实现同 PR 更新
> 5. `登记`（演进议题）不受 2/3 约束，但重评估后必须改状态（配合 CLAUDE.md §2.6 退役准则）

## 决策表

| 决策 ID   | 内容                                                                  | 来源                   | 状态   | 验证锚点                                    |
| --------- | --------------------------------------------------------------------- | ---------------------- | ------ | ------------------------------------------- |
| R3-E1     | test:gateway 8 用例入 CI                                              | /autoplan R3 P2        | 已落地 | .github/workflows/ci.yml                    |
| R3-E2     | nginx 生产模板 app 名单对账检查                                       | /autoplan R3 P2        | 已落地 | scripts/check-routes.ts                     |
| R3-E3     | versionCheck 拆分启用（chunk-error 兜底无条件装配）                   | /autoplan R3 P2        | 已落地 | packages/shared/src/plugins/versionCheck.ts |
| R3-E4     | 生产安全 headers（nginx add_header 组 + gh-pages _headers 含 CSP）    | /autoplan R3 P3        | 已落地 | deploy/nginx.prod.conf.template             |
| R3-E5     | build-prod 注入 VITE_BUILD_ID（git sha + 构建时间）                   | /autoplan R3 P3        | 已落地 | scripts/build-prod.ts                       |
| R3-E6     | new-module 骨架 requiresAuth 教学注释 + golden 断言                   | /autoplan R3 P3        | 已落地 | scripts/new-module.ts                       |
| R3-E7     | 叙事裂缝家族根治（catalog 精确钉版 + CLAUDE.md/README 口径）          | /autoplan R3 P3        | 已落地 | pnpm-workspace.yaml                         |
| R3-E8     | .env.development 死键删除（合并 R2-人工-3，env 文件在权限拦截区）     | /autoplan R3 P3        | 待实施 | —                                           |
| R3-E9     | Dockerfile node:22-alpine → node:24-alpine                            | /autoplan R3 P3        | 已落地 | Dockerfile                                  |
| R3-D1     | docs/10 补「任务 5：提交首个 PR」+ README 措辞核对                    | /autoplan R3 P2        | 已落地 | docs/10-新手指引.md                         |
| R3-D2     | 新建 docs/46-CI门禁速查.md（预算 45→46 已同批说明）                   | /autoplan R3 P2        | 已落地 | docs/46-CI门禁速查.md                       |
| R3-D3     | postinstall 补起始提示行 + mtime 新鲜跳过（补齐 R2-DX-5 残余）        | /autoplan R3 P3        | 已落地 | scripts/generate-declarations.ts            |
| R3-D4     | vv-dev-welcome 补 rootRedirect 规范入口打印                           | /autoplan R3 P3        | 已落地 | packages/config/src/create-vite-config.ts   |
| R3-D5     | package-contract / check-mock-wiring 报错补 fix 指引                  | /autoplan R3 P3        | 已落地 | scripts/eslint-rules/package-contract.mjs   |
| R3-G1     | 决策台账机检（本文件 + check-decisions，根治审查决策静默遗漏）        | /autoplan R3 P2        | 已落地 | scripts/check-decisions.ts                  |
| R3-演进-1 | F5 量化退役触发线（首数据点：CI PR ≈6-8min / master 15-20min）        | /autoplan R3 CEO       | 登记   | —                                           |
| R3-演进-2 | showroom 降 examples/ 重评估（keep/kill 之下中间态）                  | /autoplan R3 CEO       | 登记   | —                                           |
| R3-演进-3 | degit 模板化对比评估（npm 包化否决后的替代通道）                      | /autoplan R3 CEO       | 登记   | —                                           |
| R3-演进-4 | 组件层 2027 兼容矩阵（EP 2.14 / Vapor / vite-plugin-mock / rolldown） | /autoplan R3 CEO       | 登记   | —                                           |
| R3-演进-5 | 6 app env 合并（第 7 app 触发）+ gh-pages 演示凭证披露句              | /autoplan R3 Eng       | 登记   | —                                           |
| R2-DX-1   | new-module 成功 banner 端口自 apps-registry 派生                      | /autoplan R2           | 已落地 | scripts/new-module.ts                       |
| R2-DX-4   | check-routes 失败输出补修复映射（A/B/C/D/Nginx 对号入座）             | /autoplan R2           | 已落地 | scripts/check-routes.ts                     |
| R2-E2     | redirect 对抗用例 ×3（反斜杠/前导空格//、tab-scheme）                 | /autoplan R2           | 已落地 | packages/shared/src/auth/redirect.spec.ts   |
| P5-修正   | 未来每轮 /autoplan 审查须显式重验 ≥1 项已关闭议题（防疲劳性关闭）     | /autoplan R3 前提门 D2 | 登记   | —                                           |
