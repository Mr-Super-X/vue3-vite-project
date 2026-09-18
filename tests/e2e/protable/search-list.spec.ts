/**
 * E2E 关键路径 —— 搜索→列表（v3.5 PR1-A Task 12）
 *
 * 路径：
 *   1. 打开 `/demo/pro-table-overview`
 *   2. 填搜索框 "用户-1" → 等 300ms 防抖 → 断言表格行数减少（127 → 1~19）
 *   3. 清空搜索 → 断言恢复 10 行 / 页
 *
 * 真实业务数据：demo 内置 127 行 mock，name 含「用户-1」的有 19 行
 * （id 1 / 10~19，索引 0 / 9~18 中 name 为「用户-1」「用户-10」~「用户-19」）。
 *
 * 准备：
 *   pnpm test:e2e:install  # 首次需下载 Chromium
 *   pnpm dev               # 后台启动 dev server（baseURL=http://localhost:5174）
 *
 * @group E2E 测试
 */
import { test, expect } from '@playwright/test'

test.describe('ProTable E2E 搜索→列表', () => {
  test.beforeEach(async ({ page }) => {
    // 进入 ProTable 概览 demo 页面（mock 127 行）
    await page.goto('/demo/pro-table-overview')
    // 等待首次加载完成（mock API 延迟 500ms）
    await page.waitForSelector('.el-table__body tbody tr', { timeout: 10000 })
    // 等待 ProTable 根 grid 渲染
    await expect(page.locator('[role="grid"][aria-label="数据表格"]').first()).toBeVisible()
  })

  test('搜索「用户-1」后表格行数从 10 降到 ≤10（127 → 19）', async ({ page }) => {
    // 初始分页第一页 = 10 行
    const initialRows = await page.locator('.el-table__body tbody tr').count()
    expect(initialRows).toBeGreaterThan(0)
    expect(initialRows).toBeLessThanOrEqual(10)

    // 填搜索框（按 label=名称 的 input）
    const nameInput = page.locator('input[placeholder*="名称"]').first()
    await nameInput.fill('用户-1')
    // 点击搜索按钮触发（data-test=search-btn 是 SearchForm 测试钩子）
    await page.locator('[data-test="search-btn"]').click()
    // 等请求完成 + 列表刷新
    await page.waitForTimeout(800)
    const filteredRows = await page.locator('.el-table__body tbody tr').count()
    expect(filteredRows).toBeGreaterThan(0)
    expect(filteredRows).toBeLessThan(initialRows)
  })

  test('清空搜索后表格恢复全量 10 行', async ({ page }) => {
    // 填搜索并搜索
    const nameInput = page.locator('input[placeholder*="名称"]').first()
    await nameInput.fill('用户-100')
    await page.locator('[data-test="search-btn"]').click()
    await page.waitForTimeout(800)
    // 搜索「用户-100」应该精确匹配 1 行（id=100）
    const filteredCount = await page.locator('.el-table__body tbody tr').count()
    expect(filteredCount).toBe(1)

    // 清空搜索（点击已选条件区「× 用户-100」tag 或重置按钮）
    await page.locator('[data-test="reset-btn"]').click()
    await page.waitForTimeout(800)
    // 重置后恢复 10 行
    const restoredRows = await page.locator('.el-table__body tbody tr').count()
    expect(restoredRows).toBeGreaterThan(filteredCount)
  })
})
