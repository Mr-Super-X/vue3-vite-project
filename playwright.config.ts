/**
 * Playwright E2E 配置。
 *
 * 修复记录（2026-10-15，/autoplan TODOS #3）：
 *   - 原配置放在 tests/e2e/playwright.config.ts——playwright 只从项目根发现配置文件，
 *     旧文件从未生效。现迁至根目录。
 *   - baseURL 端口以 `build/server.ts` 的 SERVER_DEFAULTS（port: 5174 + strictPort）为
 *     唯一事实源——dev server 固定 5174（strictPort 保证确定性，不会自动漂移 +1）。
 *   - webServer 本地与 CI 均启用（本地复用已运行的 server，跑 e2e 前无需手动起 dev）。
 *
 * 启动：pnpm test:e2e（首次需 pnpm test:e2e:install 下载 Chromium）
 *
 * @group E2E 配置
 */
import { defineConfig, devices } from '@playwright/test'

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
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm -C apps/admin dev:local',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
