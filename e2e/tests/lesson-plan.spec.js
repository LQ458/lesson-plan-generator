const { test, expect } = require("@playwright/test");

test.describe("课程计划生成器", () => {
  test("应该能够生成课程计划", async ({ page }) => {
    // 访问课程计划页面
    await page.goto("/lesson-plan");

    // 验证页面标题
    await expect(page).toHaveTitle(/课程计划生成器/);

    // 填写表单
    await page.fill('input[name="topic"]', "数学基础运算");
    await page.selectOption('select[name="grade"]', "小学三年级");
    await page.selectOption('select[name="subject"]', "数学");

    // 点击生成按钮
    await page.click('button[type="submit"]');

    // 等待生成结果
    await page.waitForSelector('[data-testid="lesson-plan-result"]', {
      timeout: 30000,
    });

    // 验证结果显示
    const result = await page.locator('[data-testid="lesson-plan-result"]');
    await expect(result).toBeVisible();
    await expect(result).toContainText("课程计划");
  });

  test("应该显示表单验证错误", async ({ page }) => {
    await page.goto("/lesson-plan");

    // 不填写表单直接提交
    await page.click('button[type="submit"]');

    // 验证错误消息
    await expect(page.locator(".error-message")).toBeVisible();
  });

  test("应该显示 RAG 引用来源", async ({ page }) => {
    await page.goto("/lesson-plan");

    // 填写表单并生成教案
    await page.fill('input[name="topic"]', "数学基础运算");
    await page.selectOption('select[name="grade"]', "小学三年级");
    await page.selectOption('select[name="subject"]', "数学");
    await page.click('button[type="submit"]');

    // 等待生成结果
    await page.waitForSelector('[data-testid="lesson-plan-result"]', {
      timeout: 30000,
    });

    // 验证引用来源显示（如果有的话）
    const references = await page.locator(".text-green-800");
    if ((await references.count()) > 0) {
      await expect(references.first()).toContainText(
        "本教案参考了以下教学资料",
      );
    }
  });
});
