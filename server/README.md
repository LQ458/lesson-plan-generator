# TeachAI Web 服务器

TeachAI 应用的 Web 版本后端服务器，提供教案生成、练习题生成和内容分析等 API 服务。

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

1. **进入服务器目录**

   ```bash
   cd server
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置 AI 服务**

   ```bash
   # 自动配置（推荐）
   ./setup-ai.sh

   # 或者手动配置
   cp .env.example .env
   # 编辑 .env 文件，添加您的阿里云API密钥
   ```

   📖 **详细配置指南**: 请查看 [AI_SETUP.md](./AI_SETUP.md)

4. **启动服务器**

   ```bash
   # 开发模式（自动重启）
   npm run dev

   # 生产模式
   npm start
   ```

5. **验证服务器运行**
   访问：http://localhost:3000/api/health

## 📚 API 文档

### 基础信息

- **基础 URL**: http://localhost:3000/api
- **内容类型**: application/json
- **字符编码**: UTF-8

### 端点列表

#### 1. 健康检查

```
GET /api/health
```

**响应示例**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00+08:00",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### 2. 服务器状态

```
GET /api/status
```

**响应示例**:

```json
{
  "server": "TeachAI Web Server",
  "status": "running",
  "timestamp": "2024-01-20T10:30:00+08:00",
  "uptime": 3600,
  "memory": {...},
  "version": "1.0.0",
  "ai": {
    "enabled": true,
    "model": "qwen-turbo",
    "maxTokens": 2000,
    "temperature": 0.7,
    "apiConfigured": true
  },
  "endpoints": [...]
}
```

#### 3. 生成教案

```
POST /api/lesson-plan
```

**请求参数**:

```json
{
  "subject": "数学",
  "grade": "小学三年级",
  "topic": "分数的认识",
  "requirements": "注重实践操作"
}
```

**响应示例**:

```json
{
  "success": true,
  "content": "# 小学三年级 数学教案 - 分数的认识\n\n## 教学目标...",
  "timestamp": "2024-01-20T10:30:00+08:00",
  "metadata": {
    "subject": "数学",
    "grade": "小学三年级",
    "topic": "分数的认识",
    "requirements": "注重实践操作",
    "wordCount": 1250
  }
}
```

#### 4. 生成练习题

```
POST /api/exercises
```

**请求参数**:

```json
{
  "subject": "数学",
  "grade": "小学三年级",
  "topic": "分数的认识",
  "difficulty": "medium",
  "count": 5
}
```

**响应示例**:

```json
{
  "success": true,
  "content": "# 小学三年级 数学练习题 - 分数的认识\n\n...",
  "timestamp": "2024-01-20T10:30:00+08:00",
  "metadata": {
    "subject": "数学",
    "grade": "小学三年级",
    "topic": "分数的认识",
    "difficulty": "medium",
    "count": 5,
    "wordCount": 850
  }
}
```

#### 5. 内容分析

```
POST /api/analyze
```

**请求参数**:

```json
{
  "content": "要分析的内容文本...",
  "analysisType": "语法检查"
}
```

**响应示例**:

```json
{
  "success": true,
  "content": "# 内容分析报告 - 语法检查\n\n...",
  "timestamp": "2024-01-20T10:30:00+08:00",
  "metadata": {
    "analysisType": "语法检查",
    "originalLength": 200,
    "analysisLength": 800
  }
}
```

## 🔧 配置说明

### 环境变量

| 变量名            | 默认值      | 说明             |
| ----------------- | ----------- | ---------------- |
| PORT              | 3000        | 服务器端口       |
| NODE_ENV          | development | 运行环境         |
| LOG_LEVEL         | info        | 日志级别         |
| CORS_ORIGIN       | \*          | CORS 来源配置    |
| DASHSCOPE_API_KEY | -           | 阿里云 API 密钥  |
| QWEN_MODEL        | qwen-turbo  | 通义千问模型     |
| AI_ENABLED        | true        | 是否启用 AI 服务 |
| AI_MAX_TOKENS     | 2000        | 最大 token 数量  |
| AI_TEMPERATURE    | 0.7         | 生成文本随机性   |

### 日志文件

- `error.log`: 错误日志
- `combined.log`: 完整日志

## 🛠️ 开发指南

### 项目结构

```
server/
├── server.js          # 主服务器文件
├── ai-service.js      # AI服务模块
├── package.json       # 依赖配置
├── .env.example       # 环境变量示例
├── .env               # 实际环境配置
├── AI_SETUP.md        # AI配置指南
├── setup-ai.sh        # AI配置脚本
├── README.md          # 文档
├── error.log          # 错误日志
└── combined.log       # 完整日志
```

### 添加新 API 端点

1. 在 `server.js` 中添加路由处理函数
2. 实现相应的业务逻辑
3. 添加错误处理和日志记录
4. 更新 API 文档

### 日志使用

```javascript
const winston = require("winston");

// 记录信息
logger.info("操作成功", { data: {} });

// 记录错误
logger.error("操作失败", error);
```

## 🚦 测试

### 使用 curl 测试

1. **健康检查**

   ```bash
   curl http://localhost:3000/api/health
   ```

2. **生成教案**

   ```bash
   curl -X POST http://localhost:3000/api/lesson-plan \
     -H "Content-Type: application/json" \
     -d '{"subject":"数学","grade":"小学三年级","topic":"分数的认识"}'
   ```

3. **生成练习题**
   ```bash
   curl -X POST http://localhost:3000/api/exercises \
     -H "Content-Type: application/json" \
     -d '{"subject":"数学","grade":"小学三年级","topic":"分数的认识","difficulty":"medium","count":5}'
   ```

## 📊 监控

### 性能监控

- 请求响应时间记录在日志中
- 内存使用情况可通过 `/api/status` 查看
- 服务器运行时间统计

### 错误监控

- 所有错误自动记录到 `error.log`
- 包含错误堆栈信息和请求上下文

## 🔐 安全特性

- 使用 Helmet.js 设置安全头
- CORS 跨域保护
- 请求体大小限制（10MB）
- 输入参数验证

## 📝 更新日志

### v1.0.0 (2024-01-20)

- 初始版本发布
- 支持教案生成 API
- 支持练习题生成 API
- 支持内容分析 API
- 完整的日志系统
- 健康检查和状态监控

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 支持

如有问题，请联系开发团队或提交 Issue。

## AI服务配置

### 启用真实AI服务

本项目支持使用阿里云通义千问API来生成真实的AI教案。要启用AI服务，请按以下步骤配置：

#### 1. 获取API密钥

1. 访问 [阿里云DashScope控制台](https://dashscope.console.aliyun.com/)
2. 注册并登录账号
3. 创建API Key

#### 2. 配置环境变量

在 `server` 目录下创建 `.env` 文件：

```bash
# 阿里云通义千问API配置（必填）
DASHSCOPE_API_KEY=your_api_key_here
AI_ENABLED=true

# 可选配置
QWEN_MODEL=qwen-turbo
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
AI_TOP_P=0.8
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com
```

#### 3. 重启服务

配置完成后重启服务器，系统会自动检测并启用AI服务。

### API配置说明

我们现在使用**原生DashScope API**，完全按照官方规范：

- **API端点**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- **认证方式**: `Authorization: Bearer {YOUR_API_KEY}`
- **请求格式**:
  ```json
  {
    "model": "qwen-turbo",
    "input": {
      "messages": [
        { "role": "system", "content": "系统提示词" },
        { "role": "user", "content": "用户提示词" }
      ]
    },
    "parameters": {
      "result_format": "message",
      "top_p": 0.8,
      "temperature": 0.7,
      "enable_search": false,
      "max_tokens": 2000
    }
  }
  ```

### 智能模拟模式

如果没有配置API密钥，系统会自动使用智能模拟模式：

- 根据学科、年级、课题动态生成教案内容
- 比静态模板更灵活，能适应不同的教学需求
- 内容质量高，可直接用于教学

### 环境变量说明

| 变量名               | 说明           | 默认值                           |
| -------------------- | -------------- | -------------------------------- |
| `DASHSCOPE_API_KEY`  | 阿里云API密钥  | 必填                             |
| `AI_ENABLED`         | 是否启用AI服务 | `true`                           |
| `QWEN_MODEL`         | 使用的模型     | `qwen-turbo`                     |
| `AI_MAX_TOKENS`      | 最大生成长度   | `2000`                           |
| `AI_TEMPERATURE`     | 生成随机性     | `0.7`                            |
| `AI_TOP_P`           | 核采样参数     | `0.8`                            |
| `DASHSCOPE_BASE_URL` | API基础URL     | `https://dashscope.aliyuncs.com` |

## 功能特性

### 🤖 AI教案生成

- 支持多学科：语文、数学、英语、物理、化学、生物、历史、地理、政治
- 多年级适配：小学、初中、高中
- 个性化定制：根据特殊要求调整教案内容

### 📝 教案内容

- 完整的教学目标（知识技能、过程方法、情感态度）
- 详细的教学过程设计
- 清晰的板书设计
- 分层作业布置
- 教学反思

### 🎯 智能优化

- 根据学科特点调整术语和方法
- 适应不同年级的认知水平
- 支持特殊教学要求

## API接口

### 生成教案

```http
POST /api/lesson-plan
Content-Type: application/json

{
  "subject": "数学",
  "grade": "初中二年级",
  "topic": "一元二次方程",
  "requirements": "重点讲解解题方法"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "content": "# 教案内容...",
    "metadata": {
      "aiGenerated": true,
      "model": "qwen-turbo",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }
}
```

## 开发说明

### 项目结构

```
server/
├── server.js          # 主服务器文件
├── ai-service.js       # AI服务封装
├── config/            # 配置文件
├── middleware/        # 中间件
├── models/           # 数据模型
├── services/         # 业务服务
└── utils/            # 工具函数
```

### 添加新功能

1. 在 `ai-service.js` 中添加新的AI方法
2. 在 `server.js` 中添加对应的路由
3. 更新文档说明

## 注意事项

1. **API限制**：请注意阿里云API的调用频率限制
2. **成本控制**：AI调用会产生费用，建议设置合理的token限制
3. **内容审核**：生成的内容仅供参考，请教师根据实际情况调整
4. **数据安全**：请妥善保管API密钥，不要提交到版本控制系统

## 故障排除

### AI服务无法启动

- 检查 `DASHSCOPE_API_KEY` 是否正确设置
- 确认网络连接正常
- 查看服务器日志获取详细错误信息

### 生成内容质量不佳

- 调整 `AI_TEMPERATURE` 参数（0.1-1.0）
- 增加 `AI_MAX_TOKENS` 值
- 优化提示词内容

### API调用失败

- 检查API密钥是否有效
- 确认账户余额充足
- 查看阿里云控制台的调用记录
