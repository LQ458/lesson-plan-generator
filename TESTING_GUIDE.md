# 📋 TeachAI 测试指南

本指南将帮助您了解如何在 TeachAI 项目中运行和编写测试。

## 🎯 测试概述

TeachAI 项目包含以下类型的测试：

1. **单元测试** - 测试单个函数和组件
2. **集成测试** - 测试多个模块之间的交互
3. **E2E测试** - 测试完整的用户流程
4. **性能测试** - 测试系统性能和响应时间

## 📁 项目结构

```
lesson-plan-generator/
├── web/                          # 前端项目
│   ├── src/
│   │   └── components/
│   │       └── __tests__/        # 前端单元测试
│   ├── jest.config.js            # Jest配置
│   └── package.json
├── server/                       # 后端项目
│   ├── __tests__/               # 后端测试
│   │   ├── api.test.js          # API测试
│   │   ├── ai-service.test.js   # AI服务测试
│   │   └── integration/         # 集成测试
│   ├── jest.config.js           # Jest配置
│   ├── jest.setup.js            # Jest设置
│   └── package.json
├── e2e/                         # E2E测试
│   ├── tests/
│   │   ├── lesson-plan.spec.js  # 教案生成测试
│   │   └── rag-system.spec.js   # RAG系统测试
│   ├── playwright.config.js     # Playwright配置
│   └── package.json
├── scripts/
│   └── run-tests.js             # 测试运行脚本
├── jest.setup.js                # 全局Jest设置
└── TESTING_GUIDE.md             # 本文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装所有项目依赖
pnpm install

# 或分别安装
cd web && pnpm install
cd server && pnpm install
cd e2e && pnpm install
```

### 2. 运行所有测试

```bash
# 使用测试脚本（推荐）
node scripts/run-tests.js

# 或者运行特定类型的测试
node scripts/run-tests.js unit        # 单元测试
node scripts/run-tests.js integration # 集成测试
node scripts/run-tests.js e2e         # E2E测试
```

### 3. 分别运行测试

```bash
# 前端测试
cd web
npm test

# 后端测试
cd server
npm test

# E2E测试
cd e2e
npm test
```

## 📝 测试命令详解

### 前端测试命令

```bash
cd web

# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监视模式（文件变化时自动运行）
npm test -- --watch

# 运行特定测试文件
npm test -- StreamingMarkdown.test.tsx

# 运行匹配特定模式的测试
npm test -- --testNamePattern="renders static content"
```

### 后端测试命令

```bash
cd server

# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式
npm run test:watch

# 运行特定测试文件
npm test -- ai-service.test.js

# 运行集成测试
npm test -- --testPathPattern=integration
```

### E2E测试命令

```bash
cd e2e

# 运行所有E2E测试
npm test

# 运行特定浏览器的测试
npx playwright test --project=chromium

# 运行测试并显示浏览器界面
npx playwright test --headed

# 运行测试并生成报告
npx playwright test --reporter=html
```

## 🧪 编写测试

### 前端组件测试示例

```typescript
// web/src/components/__tests__/MyComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent title="测试标题" />);
    expect(screen.getByText('测试标题')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 后端API测试示例

```javascript
// server/__tests__/my-api.test.js
const request = require("supertest");
const app = require("../server");

describe("API Tests", () => {
  test("GET /api/status returns 200", async () => {
    const response = await request(app).get("/api/status").expect(200);

    expect(response.body.status).toBe("ok");
  });

  test("POST /api/data creates new data", async () => {
    const testData = { name: "测试数据" };

    const response = await request(app)
      .post("/api/data")
      .send(testData)
      .expect(201);

    expect(response.body.data.name).toBe("测试数据");
  });
});
```

### E2E测试示例

```javascript
// e2e/tests/user-flow.spec.js
import { test, expect } from "@playwright/test";

test("用户可以生成教案", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // 填写教案表单
  await page.fill('[data-testid="subject-input"]', "数学");
  await page.fill('[data-testid="grade-input"]', "三年级");
  await page.fill('[data-testid="topic-input"]', "小数加法");

  // 点击生成按钮
  await page.click('[data-testid="generate-button"]');

  // 验证结果
  await expect(
    page.locator('[data-testid="lesson-plan-content"]'),
  ).toBeVisible();
  await expect(page.locator("text=小数加法")).toBeVisible();
});
```

## 🎛️ 测试配置

### Jest 配置 (jest.config.js)

```javascript
module.exports = {
  testEnvironment: "jsdom", // 前端使用jsdom，后端使用node
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  coverageReporters: ["text", "lcov", "html"],
  testMatch: [
    "**/__tests__/**/*.(js|jsx|ts|tsx)",
    "**/*.(test|spec).(js|jsx|ts|tsx)",
  ],
};
```

### Playwright 配置 (playwright.config.js)

```javascript
module.exports = {
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
};
```

## 📊 覆盖率报告

### 查看覆盖率

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看HTML报告
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

### 覆盖率目标

- **语句覆盖率**: > 80%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 85%
- **行覆盖率**: > 80%

## 🔧 调试测试

### 调试前端测试

```bash
# 使用Chrome DevTools调试
npm test -- --inspect-brk

# 或者在测试中添加断点
test('debug test', () => {
  debugger; // 在浏览器中会停在这里
  // 测试代码
});
```

### 调试后端测试

```bash
# 使用Node.js调试器
node --inspect-brk node_modules/.bin/jest --runInBand

# 或者在测试中添加断点
test('debug test', () => {
  debugger; // 在调试器中会停在这里
  // 测试代码
});
```

### 调试E2E测试

```bash
# 显示浏览器界面
npx playwright test --headed

# 启用调试模式
npx playwright test --debug

# 慢速执行
npx playwright test --slow-mo=1000
```

## 🎯 测试最佳实践

### 1. 测试命名

```javascript
// ✅ 好的测试名称
describe("用户登录功能", () => {
  test("输入正确的用户名和密码应该成功登录", () => {
    // 测试代码
  });

  test("输入错误的密码应该显示错误信息", () => {
    // 测试代码
  });
});

// ❌ 不好的测试名称
describe("Login", () => {
  test("test1", () => {
    // 测试代码
  });
});
```

### 2. 测试结构 (AAA模式)

```javascript
test("应该正确计算总价", () => {
  // Arrange - 准备测试数据
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];

  // Act - 执行被测试的功能
  const total = calculateTotal(items);

  // Assert - 验证结果
  expect(total).toBe(35);
});
```

### 3. Mock和Stub

```javascript
// Mock外部依赖
jest.mock("../services/api", () => ({
  fetchUserData: jest.fn().mockResolvedValue({
    id: 1,
    name: "测试用户",
  }),
}));

// 使用mock
test("应该显示用户信息", async () => {
  const { fetchUserData } = require("../services/api");

  render(<UserProfile userId={1} />);

  await waitFor(() => {
    expect(screen.getByText("测试用户")).toBeInTheDocument();
  });

  expect(fetchUserData).toHaveBeenCalledWith(1);
});
```

### 4. 异步测试

```javascript
// 使用async/await
test("应该加载数据", async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// 使用waitFor
test("应该显示加载状态", async () => {
  render(<DataComponent />);

  expect(screen.getByText("加载中...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("数据加载完成")).toBeInTheDocument();
  });
});
```

## 🚨 常见问题

### 1. 测试环境问题

**问题**: 测试运行时找不到模块

```bash
Cannot find module '@/components/Button'
```

**解决方案**: 检查Jest配置中的模块映射

```javascript
// jest.config.js
module.exports = {
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

### 2. 异步测试超时

**问题**: 测试超时失败

```bash
Timeout - Async callback was not invoked within the 5000ms timeout
```

**解决方案**: 增加测试超时时间

```javascript
test("长时间运行的测试", async () => {
  // 测试代码
}, 10000); // 10秒超时
```

### 3. DOM测试问题

**问题**: 在Node.js环境中无法访问DOM

```bash
ReferenceError: document is not defined
```

**解决方案**: 使用jsdom测试环境

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
};
```

## 📈 持续集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: 测试

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: 设置Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: 安装依赖
        run: |
          npm install -g pnpm
          pnpm install

      - name: 运行测试
        run: node scripts/run-tests.js

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v1
```

## 🔍 测试工具

### 推荐的测试工具

1. **Jest** - JavaScript测试框架
2. **React Testing Library** - React组件测试
3. **Playwright** - E2E测试
4. **Supertest** - API测试
5. **MSW** - API Mock

### 有用的测试扩展

1. **Jest Runner** (VS Code) - 在编辑器中运行测试
2. **Test Explorer** (VS Code) - 测试资源管理器
3. **Coverage Gutters** (VS Code) - 显示覆盖率

## 📚 参考资源

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [React Testing Library文档](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright文档](https://playwright.dev/docs/intro)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 🎉 总结

通过本指南，您应该能够：

1. ✅ 理解项目的测试结构
2. ✅ 运行各种类型的测试
3. ✅ 编写高质量的测试代码
4. ✅ 调试和修复测试问题
5. ✅ 生成和分析覆盖率报告

记住，好的测试不仅能发现bug，还能作为代码的文档，帮助团队更好地理解和维护代码。

如果您在测试过程中遇到问题，请参考本指南的常见问题部分，或者查看相关工具的官方文档。
