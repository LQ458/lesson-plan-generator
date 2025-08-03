const { test, expect } = require('@playwright/test');

test.describe('TeachAI 基本功能测试', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TeachAI/);
  });

  test('教案生成功能', async ({ page }) => {
    await page.goto('/');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查主要功能区域是否存在
    await expect(page.locator('text=教案生成')).toBeVisible();
  });
}); 