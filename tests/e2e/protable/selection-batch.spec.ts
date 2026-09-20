/**
 * E2E 关键路径 —— 选中→批量操作（v3.5 PR1-A Task 13）
 *
 * 路径：
 *   1. 打开 `/demo/pro-table-overview`
 *   2. 勾选 3 行 → 断言 SelectionBar 出现 + 显示「已选 3 项」
 *   3. 验证 SelectionBar 的 role=status + aria-live=polite
 *   4. 点 SelectionBar 清除按钮 → 断言勾选清空 + SelectionBar 消失
 *
 * 准备：
 *   pnpm test:e2e:install  # 首次需下载 Chromium
 *   pnpm dev               # 后台启动 dev server（baseURL=http://localhost:5174）
 *
 * @group E2E 测试
 */
import { test, expect } from '@playwright/test'

test.describe('ProTable E2E 选中→批量操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/pro-table-overview')
    await page.waitForSelector('.el-table__body tbody tr', { timeout: 10000 })
  })

  test('勾选 3 行 → SelectionBar 出现 + 「已选 3 项」+ aria-live=polite', async ({ page }) => {
    // 勾选前 3 行（element-plus 内置 checkbox 在 .el-table__body tbody 第一列）
    const checkboxes = page.locator('.el-table__body tbody tr .el-checkbox__input')
    const count = Math.min(3, await checkboxes.count())
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click()
    }

    // SelectionBar 应出现（role=status）
    const selectionBar = page.locator('[role="status"][aria-live="polite"]').first()
    await expect(selectionBar).toBeVisible()
    await expect(selectionBar).toContainText('已选')
    await expect(selectionBar).toContainText('3')
    await expect(selectionBar).toContainText('项')

    // 验证 aria-live 播报区也更新
    const liveRegion = page.locator('span.sr-only[aria-live="polite"]').first()
    await expect(liveRegion).toContainText('已选 3 项')
  })

  test('点 SelectionBar 清除按钮 → 勾选清空 + SelectionBar 消失', async ({ page }) => {
    // 勾选 2 行
    const checkboxes = page.locator('.el-table__body tbody tr .el-checkbox__input')
    await checkboxes.nth(0).click()
    await checkboxes.nth(1).click()

    // 出现 SelectionBar
    await expect(page.locator('[role="status"][aria-live="polite"]').first()).toBeVisible()

    // 点击清除按钮（data-test=selection-clear）
    await page.locator('[data-test="selection-clear"]').click()

    // SelectionBar 消失（v-if 卸载）
    await expect(page.locator('[role="status"][aria-live="polite"]').first()).toHaveCount(0)

    // 验证所有 checkbox 已取消勾选（is-checked class 被移除）
    const checkedCount = await page
      .locator('.el-table__body tbody tr .el-checkbox__input.is-checked')
      .count()
    expect(checkedCount).toBe(0)
  })

  test('SelectionBar 清除按钮 aria-label="清除选择"', async ({ page }) => {
    const checkboxes = page.locator('.el-table__body tbody tr .el-checkbox__input')
    await checkboxes.nth(0).click()

    const clearBtn = page.locator('[data-test="selection-clear"]')
    await expect(clearBtn).toHaveAttribute('aria-label', '清除选择')
  })
})
