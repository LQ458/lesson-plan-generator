# TeachAI 测试指南

## 测试环境配置

### 1. 安装依赖

```bash
# 安装所有依赖
pnpm install:all

# 或者分别安装
pnpm install                    # 根目录
cd web && pnpm install         # 前端
cd ../server && pnpm install   # 后端
cd ../e2e && pnpm install      # E2E 测试
```

### 2. 环境变量设置

确保在 `server/.env` 文件中设置了以下变量：

```env
NODE_ENV=test
QWEN_API_KEY=your_api_key
QWEN_API_URL=your_api_url
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

## 测试类型

### 1. 单元测试

#### 前端单元测试

```bash
# 运行前端测试
cd web && pnpm test

# 监听模式
cd web && pnpm test:watch

# 生成覆盖率报告
cd web && pnpm test:coverage
```

#### 后端单元测试

```bash
# 运行后端测试
cd server && pnpm test

# 监听模式
cd server && pnpm test:watch

# 生成覆盖率报告
cd server && pnpm test:coverage
```

### 2. RAG 系统测试

```bash
# 基础功能测试（不需要 Docker）
cd server && pnpm test:basic

# 完整 RAG 系统测试（需要 ChromaDB）
cd server && pnpm test:rag
```

### 3. 集成测试

```bash
# 运行所有测试
pnpm test:all

# 分别运行
pnpm test:server
pnpm test:web
```

### 4. E2E 测试

```bash
# 启动应用
pnpm dev

# 在另一个终端运行 E2E 测试
cd e2e && pnpm test

# 带 UI 界面的测试
cd e2e && pnpm test:ui

# 调试模式
cd e2e && pnpm test:debug
```

## 测试覆盖的功能

### 前端测试

- ✅ 课程计划页面渲染
- ✅ 表单提交和验证
- ✅ 错误处理显示
- ✅ API 调用 Mock

### 后端测试

- ✅ API 路由测试
- ✅ 课程计划生成
- ✅ RAG 搜索功能
- ✅ 错误处理
- ✅ 参数验证

### RAG 系统测试

- ✅ 向量数据库连接
- ✅ 文档加载和处理
- ✅ 语义搜索
- ✅ 文档过滤
- ✅ 质量评分

### E2E 测试

- ✅ 完整的用户流程
- ✅ 跨浏览器兼容性
- ✅ 移动端适配
- ✅ 性能测试

## 测试最佳实践

### 1. 编写测试

```javascript
// 好的测试示例
describe("课程计划生成", () => {
  it("应该根据输入生成课程计划", async () => {
    // Arrange - 准备测试数据
    const input = { topic: "数学", grade: "三年级", subject: "数学" };

    // Act - 执行测试操作
    const result = await generateLessonPlan(input);

    // Assert - 验证结果
    expect(result).toBeDefined();
    expect(result).toContain("课程计划");
  });
});
```

### 2. Mock 策略

```javascript
// Mock 外部依赖
jest.mock("../services/ai-service", () => ({
  generateLessonPlan: jest.fn().mockResolvedValue("测试课程计划"),
}));

// Mock API 调用
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
});
```

### 3. 测试数据管理

```javascript
// 使用测试工厂函数
const createTestLessonPlan = (overrides = {}) => ({
  topic: "默认主题",
  grade: "默认年级",
  subject: "默认学科",
  ...overrides,
});
```

## 持续集成

### GitHub Actions 配置

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: pnpm install:all
      - run: pnpm test:all
      - run: pnpm test:coverage
```

## 调试测试

### 1. 单元测试调试

```bash
# 使用 Node.js 调试器
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code 调试配置
{
  "type": "node",
  "request": "launch",
  "name": "Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### 2. E2E 测试调试

```bash
# 使用 Playwright 调试器
cd e2e && pnpm test:debug

# 生成测试报告
cd e2e && pnpm report
```

## 性能测试

### 1. 前端性能

```javascript
// 使用 React Testing Library 的性能测试
import { render, screen } from "@testing-library/react";
import { performance } from "perf_hooks";

test("组件渲染性能", () => {
  const start = performance.now();
  render(<LessonPlanPage />);
  const end = performance.now();

  expect(end - start).toBeLessThan(100); // 100ms 内渲染完成
});
```

### 2. API 性能

```javascript
test("API 响应时间", async () => {
  const start = Date.now();
  const response = await request(app).get("/api/lesson-plan");
  const end = Date.now();

  expect(end - start).toBeLessThan(1000); // 1秒内响应
  expect(response.status).toBe(200);
});
```

## 故障排除

### 常见问题

1. **测试超时**
   - 增加 Jest 超时时间：`jest.setTimeout(30000)`
   - 检查异步操作是否正确等待

2. **Mock 不生效**
   - 确保 Mock 在测试之前定义
   - 检查模块路径是否正确

3. **E2E 测试失败**
   - 确保应用正在运行
   - 检查元素选择器是否正确

4. **ChromaDB 连接失败**
   - 确保 Docker 服务正在运行
   - 检查端口配置

### 测试环境清理

```bash
# 清理测试数据
rm -rf coverage/
rm -rf test-results/
rm -rf playwright-report/

# 重启测试服务
docker-compose -f server/docker-compose.yml restart
```

## 总结

通过以上配置，您的 TeachAI 项目现在具备了完整的测试体系：

- **单元测试**：确保各个组件和函数正常工作
- **集成测试**：验证不同模块间的交互
- **E2E 测试**：模拟真实用户操作流程
- **性能测试**：确保应用响应速度

定期运行测试，保持代码质量，为用户提供稳定可靠的服务。
