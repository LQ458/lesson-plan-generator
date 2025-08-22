const { test, expect } = require("@playwright/test");

test.describe("RAG系统测试", () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面并登录
    await page.goto("http://localhost:3002/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("教案生成 - 历史课题RAG匹配测试", async ({ page }) => {
    // 导航到教案生成页面
    await page.goto("http://localhost:3002/lesson-plan");

    // 填写表单
    await page.selectOption('select[name="subject"]', "历史");
    await page.selectOption('select[name="grade"]', "七年级");
    await page.fill('input[name="topic"]', "我国境内的早期人类");
    await page.fill(
      'textarea[name="requirements"]',
      "重点讲解考古发现和历史意义",
    );

    // 点击生成按钮
    await page.click('button:has-text("生成教案")');

    // 等待生成完成
    await page.waitForSelector(".lesson-plan-content", { timeout: 30000 });

    // 检查是否有RAG提示
    const ragIndicator = page
      .locator(".bg-green-50, .bg-blue-50")
      .filter({ hasText: "RAG" });
    await expect(ragIndicator).toBeVisible();

    // 检查生成的内容
    const content = await page.locator(".lesson-plan-content").textContent();
    expect(content).toContain("早期人类");
    expect(content.length).toBeGreaterThan(100);
  });

  test("练习题生成 - 数学课题RAG匹配测试", async ({ page }) => {
    // 导航到练习题生成页面
    await page.goto("http://localhost:3002/exercises");

    // 填写表单
    await page.selectOption('select[name="subject"]', "数学");
    await page.selectOption('select[name="grade"]', "五年级");
    await page.fill('input[name="topic"]', "小数乘法");
    await page.selectOption('select[name="difficulty"]', "medium");
    await page.selectOption('select[name="questionType"]', "选择题");
    await page.fill('input[name="count"]', "5");

    // 点击生成按钮
    await page.click('button:has-text("生成练习题")');

    // 等待生成完成
    await page.waitForSelector(".prose", { timeout: 30000 });

    // 检查是否有RAG提示
    const ragIndicator = page
      .locator(".bg-green-50")
      .filter({ hasText: "RAG" });
    await expect(ragIndicator).toBeVisible();

    // 检查生成的内容
    const content = await page.locator(".prose").textContent();
    expect(content).toContain("小数");
    expect(content).toContain("乘法");
    expect(content.length).toBeGreaterThan(100);
  });

  test("RAG系统回退机制测试", async ({ page }) => {
    // 测试不存在的学科组合
    await page.goto("http://localhost:3002/lesson-plan");

    // 填写一个可能没有直接匹配的组合
    await page.selectOption('select[name="subject"]', "历史");
    await page.selectOption('select[name="grade"]', "一年级");
    await page.fill('input[name="topic"]', "古代文明");

    // 点击生成按钮
    await page.click('button:has-text("生成教案")');

    // 等待生成完成
    await page.waitForSelector(".lesson-plan-content", { timeout: 30000 });

    // 检查是否仍然生成了内容（回退机制生效）
    const content = await page.locator(".lesson-plan-content").textContent();
    expect(content.length).toBeGreaterThan(50);

    // 检查是否有RAG提示
    const ragIndicator = page
      .locator(".bg-green-50, .bg-blue-50")
      .filter({ hasText: "RAG" });
    await expect(ragIndicator).toBeVisible();
  });
});
