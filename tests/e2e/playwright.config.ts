/**
 * Playwright E2E 配置（v3.5 PR1-A）
 *
 * 覆盖范围：
 * - Chromium only（减小 CI 体积）
 * - baseURL 指向本地 vite dev server（pnpm dev:local 默认 5173 端口；5174 是远程菜单模式）
 * - spec.ts 位于 tests/e2e/** （项目惯例：tests 不在 src 下，避免 vitest 单元测试扫描到）
 *
 * 启动方式：
 *   pnpm test:e2e
 *   等价 pnpm exec playwright test
 *
 * CI 阶段需先执行：
 *   pnpm exec playwright install --with-deps chromium
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
  // 启动 dev server（CI 场景下）
  webServer: process.env.CI
    ? {
        command: 'pnpm dev',
        url: 'http://localhost:5174',
        reuseExistingServer: !process.env.CI,
        timeout: 60 * 1000,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
