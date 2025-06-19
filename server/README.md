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
