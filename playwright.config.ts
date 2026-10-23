/**
 * Playwright E2E 配置（monorepo 版，projects 按 app 分组）。
 *
 * 变更记录（2026-10-23，monorepo e2e 重建）：
 *   - 单应用时期的单 project（chromium @5174）升级为按 app 分组的 projects——
 *     monorepo 拆分后布局/demo 路由已物理分布到各 app，单个 baseURL 无法覆盖：
 *     admin 5174 / docs 5175 / h5 5177 / big 5178（各 project 独立 webServer 自启 dev）。
 *   - docs（ProTable demo）/ h5 / big 全站白名单公开，spec 免登录直达；
 *     admin 无自有登录页（未登录整页跳 auth app），spec 走 API 登录 + 登录标记注入。
 *   - gateway project（:8080 同域网关，docker compose + dev:gateway）只承载真正
 *     跨应用漫游用例；无 docker 环境时用例自跳过（e2e 不硬依赖 docker）。
 *
 * 端口事实源：各 app 的 vite.config.ts 注释（admin 5174 / docs 5175 / portal 5176 /
 * h5 5177 / big 5178 / auth 5179，strictPort）。
 *
 * 启动：pnpm test:e2e（首次需 pnpm test:e2e:install 下载 Chromium）
 * 单 project：pnpm test:e2e --project=docs
 *
 * @group E2E 配置
 */
import { defineConfig, devices } from '@playwright/test'

/** 项目 dev server 启动超时（vite 冷启动 + mock 打包，本地给足余量） */
const DEV_SERVER_TIMEOUT = 120 * 1000

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  // 默认 30s 超时（vben-style 表格首屏可能略久）
  timeout: 30 * 1000,
  expect: { timeout: 5 * 1000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // 单 worker 保证 dev server 单一访问；CI 上放宽到 2
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'admin',
      testMatch: 'tests/e2e/admin/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' },
      webServer: {
        command: 'pnpm -C apps/admin dev:local',
        url: 'http://localhost:5174',
        reuseExistingServer: !process.env.CI,
        timeout: DEV_SERVER_TIMEOUT,
      },
    },
    {
      name: 'docs',
      testMatch: 'tests/e2e/docs/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5175' },
      webServer: {
        command: 'pnpm -C apps/docs dev:local',
        url: 'http://localhost:5175',
        reuseExistingServer: !process.env.CI,
        timeout: DEV_SERVER_TIMEOUT,
      },
    },
    {
      name: 'h5',
      testMatch: 'tests/e2e/h5/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5177' },
      webServer: {
        command: 'pnpm -C apps/h5 dev:local',
        url: 'http://localhost:5177',
        reuseExistingServer: !process.env.CI,
        timeout: DEV_SERVER_TIMEOUT,
      },
    },
    {
      name: 'big',
      testMatch: 'tests/e2e/big/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5178' },
      webServer: {
        command: 'pnpm -C apps/big dev:local',
        url: 'http://localhost:5178',
        reuseExistingServer: !process.env.CI,
        timeout: DEV_SERVER_TIMEOUT,
      },
    },
    {
      // 跨应用漫游用例（统一登录 + TagsView 守恒）——依赖 :8080 同域网关
      // （docker compose up + pnpm dev:gateway），e2e 不自动拉起 6 个 app，
      // 由 spec 内探测网关可达性后自跳过
      name: 'gateway',
      testMatch: 'tests/e2e/gateway/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:8080' },
    },
  ],
})
