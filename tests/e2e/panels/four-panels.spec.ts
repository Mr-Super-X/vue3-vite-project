/**
 * 四栖面板 + 五态示范 E2E（/autoplan TODOS #3 四栖 e2e 矩阵首批）。
 *
 * 覆盖（素材来自 /autoplan Phase 3 工程审查的测试计划工件 Critical Paths）：
 *   1. workbench「能力演示导航」卡可见，四栖 + 五态链接齐全
 *   2. H5 演示页：html font-size 被 rem 激活（非空），返回后台后零残留
 *   3. 大屏演示页：stage 带 transform: scale 缩放
 *   4. 超宽拼接页：stage 按 meta.bigScreen 声明为 9000px
 *   5. 五态示范页：状态切换可用（点「加载中」出骨架块）
 *   6. 演示页不污染 TagsView（页签内容守恒）
 *
 * 前置：pnpm test:e2e:install（首次下载 Chromium）；dev server 由 playwright.config.ts
 * 的 webServer 自动启动（pnpm dev:local，mock 数据）。
 *
 * @group E2E 测试
 */
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[placeholder="请输入账号"]').fill('admin')
  await page.locator('input[placeholder="请输入密码"]').fill('123456')
  await page.getByRole('button', { name: /登/ }).click()
  // 等待登录完成（守卫写入登录态并跳转落地页）——立刻 goto 会中断进行中的登录请求
  await expect(page).not.toHaveURL(/\/login/)
  // 落地页（/ 或 /home）与用例无关，显式去工作台
  await page.goto('/workbench')
  await expect(page.locator('.vv-workbench-home')).toBeVisible()
})

test('能力演示导航卡：四栖 + 五态链接齐全', async ({ page }) => {
  const card = page.locator('.vv-workbench-home__card', { hasText: '能力演示导航' })
  // 断言 workbench panelLinks 五行的完整链接文本
  for (const label of [
    '门户首页演示',
    'H5 移动端演示',
    '数据大屏演示（1920）',
    '超宽拼接屏演示（9000×1080）',
    '大屏五态示范',
  ]) {
    // el-link 无 href 时渲染为无隐式 role 的 <a>，用文本定位而非 getByRole('link')
    await expect(card.getByText(label, { exact: true })).toBeVisible()
  }
})

test('H5 演示页：rem 激活且返回后台零残留', async ({ page }) => {
  const rootFontSize = () => page.evaluate(() => document.documentElement.style.fontSize)
  expect(await rootFontSize()).toBe('') // 后台页无 rem 激活

  await page.goto('/h5-demo')
  await expect.poll(async () => await rootFontSize()).not.toBe('')

  await page.goto('/workbench')
  await expect.poll(async () => await rootFontSize()).toBe('')
})

test('大屏演示页：stage 等比缩放', async ({ page }) => {
  await page.goto('/big-demo')
  const stage = page.locator('.vv-big-layout__stage')
  await expect(stage).toBeVisible()
  const style = await stage.getAttribute('style')
  expect(style).toContain('scale(')
})

test('超宽拼接页：stage 按 meta.bigScreen 为 9000px', async ({ page }) => {
  await page.goto('/big-demo/wide')
  const stage = page.locator('.vv-big-layout__stage')
  await expect(stage).toBeVisible()
  await expect(stage).toHaveCSS('width', '9000px')
})

test('五态示范页：切换加载中态出现骨架块', async ({ page }) => {
  await page.goto('/big-demo/state-demo')
  await expect(page.getByRole('tab', { name: '成功' })).toBeVisible()
  await page.getByRole('tab', { name: '加载中' }).click()
  await expect(page.locator('.vv-big-demo-state__skeleton').first()).toBeVisible()
})

test('演示页不污染 TagsView 页签（meta.noTags）', async ({ page }) => {
  const tagBar = page.locator('.vv-default-tags-view')
  await expect(tagBar).toBeVisible()
  const before = await tagBar.innerText()

  await page.goto('/h5-demo')
  await page.goto('/big-demo')
  await page.goto('/big-demo/state-demo')
  await page.goto('/workbench')

  const after = await tagBar.innerText()
  expect(after).toBe(before)
  expect(after).not.toContain('H5')
  expect(after).not.toContain('数据大屏')
  expect(after).not.toContain('五态')
})
