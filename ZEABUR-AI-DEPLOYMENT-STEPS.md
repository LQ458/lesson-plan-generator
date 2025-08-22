# 🤖 Zeabur AI 部署详细步骤指南

为 Zeabur 部署 AI 提供的详细操作步骤，确保每一步都清晰可执行。

## 📋 目录
1. [准备阶段](#准备阶段)
2. [创建 Zeabur 项目](#创建-zeabur-项目)
3. [部署 MongoDB 服务](#部署-mongodb-服务)
4. [部署 ChromaDB 服务](#部署-chromadb-服务)
5. [部署后端服务](#部署后端服务)
6. [部署前端服务](#部署前端服务)
7. [配置环境变量](#配置环境变量)
8. [加载 RAG 数据](#加载-rag-数据)
9. [验证部署](#验证部署)
10. [性能优化](#性能优化)

---

## 准备阶段

### 步骤 1.1: 获取必要的 API 密钥

#### 通义千问 API 密钥 (必需)
1. 访问 [通义千问控制台](https://dashscope.aliyun.com/)
2. 注册/登录阿里云账号
3. 进入 DashScope 控制台
4. 点击 **"API-KEY 管理"**
5. 创建新的 API-KEY
6. 复制 API-KEY（格式: `sk-xxxxxxxxxx`）
7. **充值账户余额** (建议 ¥50+ 用于测试)

#### JWT 密钥生成 (必需)
```bash
# 方法 1: 使用 OpenSSL (推荐)
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 在线生成器
# 访问 https://generate-secret.vercel.app/32
```

### 步骤 1.2: 准备代码仓库
1. 确保代码已推送到 GitHub
2. 分支: `web`
3. 仓库地址: `https://github.com/LQ458/lesson-plan-generator`

### 步骤 1.3: 检查项目结构
```
lesson-plan-generator/
├── zbpack.json              ✅ Zeabur 配置
├── zeabur-template.yaml     ✅ 服务模板
├── deploy-zeabur.sh         ✅ 部署脚本
├── server/                  ✅ 后端代码
│   ├── package.json
│   ├── server.js
│   └── rag_data/chunks/     ✅ 教育数据 (95,360+ 块)
├── web/                     ✅ 前端代码
│   ├── package.json
│   └── next.config.js
└── package.json             ✅ 根配置
```

---

## 创建 Zeabur 项目

### 步骤 2.1: 访问 Zeabur 控制台
1. 打开 [Zeabur Dashboard](https://dash.zeabur.com)
2. 使用 GitHub 账号登录
3. 授权 Zeabur 访问你的 GitHub 仓库

### 步骤 2.2: 创建新项目
1. 点击 **"Create Project"** 按钮
2. 输入项目名称: `ai-lesson-plan-generator`
3. 选择区域: **Asia Pacific (Hong Kong)** (推荐，延迟更低)
4. 点击 **"Create"**

### 步骤 2.3: 设置项目基础配置
1. 在项目设置中，确保以下配置:
   - **Project Name**: `ai-lesson-plan-generator`
   - **Region**: `ap-east-1` (香港)
   - **Environment**: `Production`

---

## 部署 MongoDB 服务

### 步骤 3.1: 添加 MongoDB 服务
1. 在项目页面点击 **"Create Service"**
2. 选择 **"Prebuilt"** 选项卡
3. 搜索 **"MongoDB"**
4. 选择 **"MongoDB"** 官方镜像
5. 点击 **"Deploy"**

### 步骤 3.2: 配置 MongoDB
1. **服务名称**: `mongodb`
2. **镜像版本**: `mongo:7.0` (推荐)
3. **端口配置**: `27017`
4. **资源配置**:
   ```yaml
   CPU: 0.5 cores
   Memory: 512 MB
   Storage: 1 GB
   ```

### 步骤 3.3: 设置 MongoDB 环境变量
1. 进入 MongoDB 服务页面
2. 点击 **"Variables"** 选项卡
3. 添加以下环境变量:
   ```
   MONGO_INITDB_ROOT_USERNAME = admin
   MONGO_INITDB_ROOT_PASSWORD = [自动生成或自定义密码]
   MONGO_INITDB_DATABASE = teachai
   ```

### 步骤 3.4: 部署并等待启动
1. 点击 **"Deploy"**
2. 等待状态变为 **"Running"** (约 1-2 分钟)
3. 记录 **内部连接地址**: `mongodb:27017`

---

## 部署 ChromaDB 服务

### 步骤 4.1: 添加 ChromaDB 服务
1. 点击 **"Create Service"**
2. 选择 **"Docker Image"** 选项卡
3. 输入镜像地址: `ghcr.io/chroma-core/chroma:latest`
4. 点击 **"Deploy"**

### 步骤 4.2: 配置 ChromaDB
1. **服务名称**: `chromadb`
2. **端口配置**: `8000`
3. **资源配置**:
   ```yaml
   CPU: 0.5 cores
   Memory: 1 GB
   Storage: 2 GB
   ```

### 步骤 4.3: 设置 ChromaDB 环境变量
1. 进入 ChromaDB 服务页面
2. 点击 **"Variables"** 选项卡
3. 添加以下环境变量:
   ```
   IS_PERSISTENT = TRUE
   ALLOW_RESET = TRUE
   ANONYMIZED_TELEMETRY = FALSE
   CHROMA_SERVER_HOST = 0.0.0.0
   CHROMA_SERVER_HTTP_PORT = 8000
   ```

### 步骤 4.4: 设置健康检查
1. 点击 **"Settings"** 选项卡
2. 启用 **"Health Check"**
3. 配置健康检查:
   ```
   Path: /api/v1/heartbeat
   Port: 8000
   Initial Delay: 30 seconds
   Interval: 10 seconds
   ```

### 步骤 4.5: 部署并验证
1. 点击 **"Deploy"**
2. 等待状态变为 **"Running"** (约 2-3 分钟)
3. 验证健康检查通过
4. 记录 **内部连接地址**: `chromadb:8000`

---

## 部署后端服务

### 步骤 5.1: 连接 GitHub 仓库
1. 点击 **"Create Service"**
2. 选择 **"Git Repository"** 选项卡
3. 连接 GitHub 账号 (如未连接)
4. 选择仓库: `LQ458/lesson-plan-generator`
5. 选择分支: `web`

### 步骤 5.2: 配置后端服务
1. **服务名称**: `teachai-backend`
2. **根目录**: 保持默认 `/`
3. **构建目录**: `./server`
4. **构建命令**: `pnpm install --frozen-lockfile`
5. **启动命令**: `node server.js`
6. **端口**: `3001`

### 步骤 5.3: 设置后端环境变量
1. 进入后端服务页面
2. 点击 **"Variables"** 选项卡
3. 添加以下环境变量:
   ```
   NODE_ENV = production
   PORT = 3001
   
   # 数据库连接 (使用 MongoDB 服务的内部地址)
   MONGODB_URI = mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/teachai?authSource=admin
   
   # ChromaDB 连接
   CHROMA_HOST = chromadb
   CHROMA_PORT = 8000
   
   # AI 服务配置 (使用步骤 1.1 获取的密钥)
   DASHSCOPE_API_KEY = sk-xxxxxxxxxx
   JWT_SECRET = [步骤 1.1 生成的 JWT 密钥]
   
   # 可选配置
   QWEN_MODEL = qwen-plus
   AI_MAX_TOKENS = 2000
   AI_TEMPERATURE = 0.7
   ADMIN_KEY = your-admin-key-here
   ```

### 步骤 5.4: 设置服务依赖
1. 点击 **"Dependencies"** 选项卡
2. 添加依赖服务:
   - `mongodb` (必需)
   - `chromadb` (必需)
3. 这确保后端服务在数据库服务启动后才启动

### 步骤 5.5: 配置资源限制
1. 点击 **"Resources"** 选项卡
2. 设置资源配置:
   ```yaml
   CPU: 0.5-1.0 cores
   Memory: 512 MB - 1 GB
   ```

### 步骤 5.6: 设置健康检查
1. 点击 **"Settings"** 选项卡
2. 启用 **"Health Check"**
3. 配置健康检查:
   ```
   Path: /api/health
   Port: 3001
   Initial Delay: 60 seconds
   Interval: 30 seconds
   ```

### 步骤 5.7: 部署后端服务
1. 点击 **"Deploy"**
2. 监控构建日志，确保没有错误
3. 等待状态变为 **"Running"** (约 3-5 分钟)
4. 记录 **外部访问地址**: `https://xxx.zeabur.app`

---

## 部署前端服务

### 步骤 6.1: 添加前端服务
1. 点击 **"Create Service"**
2. 选择 **"Git Repository"** 选项卡
3. 选择同一个仓库: `LQ458/lesson-plan-generator`
4. 选择分支: `web`

### 步骤 6.2: 配置前端服务
1. **服务名称**: `teachai-frontend`
2. **根目录**: 保持默认 `/`
3. **构建目录**: `./web`
4. **构建命令**: `pnpm install --frozen-lockfile && pnpm build`
5. **启动命令**: `pnpm start`
6. **端口**: `3000`

### 步骤 6.3: 设置前端环境变量
1. 进入前端服务页面
2. 点击 **"Variables"** 选项卡
3. 添加以下环境变量:
   ```
   NODE_ENV = production
   PORT = 3000
   
   # API 连接 (使用后端服务的外部地址)
   NEXT_PUBLIC_API_URL = https://[后端服务地址]/api
   
   # Next.js 配置
   NEXT_TELEMETRY_DISABLED = 1
   ```

### 步骤 6.4: 设置服务依赖
1. 点击 **"Dependencies"** 选项卡
2. 添加依赖服务:
   - `teachai-backend` (必需)

### 步骤 6.5: 配置资源限制
1. 点击 **"Resources"** 选项卡
2. 设置资源配置:
   ```yaml
   CPU: 0.5 cores
   Memory: 512 MB
   ```

### 步骤 6.6: 部署前端服务
1. 点击 **"Deploy"**
2. 监控构建日志，确保 Next.js 构建成功
3. 等待状态变为 **"Running"** (约 3-5 分钟)
4. 记录 **外部访问地址**: `https://xxx.zeabur.app`

---

## 配置环境变量

### 步骤 7.1: 验证所有环境变量
回到项目总览页面，检查所有服务的环境变量是否正确设置:

#### MongoDB 服务
```
✅ MONGO_INITDB_ROOT_USERNAME = admin
✅ MONGO_INITDB_ROOT_PASSWORD = [已设置]
✅ MONGO_INITDB_DATABASE = teachai
```

#### ChromaDB 服务
```
✅ IS_PERSISTENT = TRUE
✅ ALLOW_RESET = TRUE
✅ ANONYMIZED_TELEMETRY = FALSE
✅ CHROMA_SERVER_HOST = 0.0.0.0
✅ CHROMA_SERVER_HTTP_PORT = 8000
```

#### 后端服务
```
✅ NODE_ENV = production
✅ PORT = 3001
✅ MONGODB_URI = mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/teachai?authSource=admin
✅ CHROMA_HOST = chromadb
✅ CHROMA_PORT = 8000
✅ DASHSCOPE_API_KEY = sk-xxxxxxxxxx
✅ JWT_SECRET = [已设置]
✅ ADMIN_KEY = [已设置]
```

#### 前端服务
```
✅ NODE_ENV = production
✅ PORT = 3000
✅ NEXT_PUBLIC_API_URL = https://[后端地址]/api
✅ NEXT_TELEMETRY_DISABLED = 1
```

### 步骤 7.2: 更新前端 API 地址
1. 获取后端服务的外部地址 (如 `https://backend-abc123.zeabur.app`)
2. 更新前端服务的 `NEXT_PUBLIC_API_URL` 环境变量:
   ```
   NEXT_PUBLIC_API_URL = https://backend-abc123.zeabur.app/api
   ```
3. 重启前端服务使环境变量生效

---

## 加载 RAG 数据

### 步骤 8.1: 等待所有服务启动
1. 确认所有 4 个服务状态都为 **"Running"**
2. 等待约 2-3 分钟让服务完全初始化
3. 检查健康检查都通过

### 步骤 8.2: 验证服务连通性
```bash
# 检查后端健康状态
curl https://[后端地址]/api/health

# 预期响应:
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 120,
  "database": { "status": "connected" },
  "services": { "mongodb": true, "chromadb": false }
}
```

### 步骤 8.3: 开始加载 RAG 数据
```bash
# 方法 1: 使用 curl (推荐)
curl -X POST "https://[后端地址]/api/admin/load-rag-data?adminKey=[你的管理员密钥]" \
  --max-time 900 \
  --no-buffer

# 方法 2: 使用浏览器
# 访问: https://[后端地址]/api/admin/load-rag-data?adminKey=[你的管理员密钥]
```

### 步骤 8.4: 监控加载进度
预期输出示例:
```
🚀 Starting cloud RAG data loading...
📊 Target: Loading comprehensive educational materials
⏳ Estimated time: 5-10 minutes
📁 Scanning educational files...
📚 Found 4557 educational files to process

📦 Processing batch 1/92 (50 files)
📊 Progress: 50/4557 files, 1,250 chunks (0.5min, 100 files/min)
📦 Processing batch 2/92 (50 files)
📊 Progress: 100/4557 files, 2,680 chunks (1.0min, 100 files/min)
...
📊 Progress: 4500/4557 files, 89,450 chunks (8.5min, 88 files/min)

🔄 Finalizing comprehensive educational index...
🧹 Removed 1,210 duplicate chunks
🎉 Comprehensive loading completed in 9.2 minutes!
📚 Loaded 88,240 high-quality educational chunks
💾 Saved to: /app/server/rag/data/comprehensive-index.json

🔍 Testing comprehensive search capabilities...
  数学: 12,450 matches
  语文: 18,320 matches
  英语: 8,750 matches
  科学: 9,650 matches
  历史: 6,430 matches
  地理: 5,240 matches
🎯 Total searchable content: 60,840 subject-specific matches
✅ Comprehensive RAG system ready for advanced AI lesson planning!

🎉 RAG data loading completed successfully!
```

### 步骤 8.5: 验证 RAG 数据加载
```bash
# 检查 RAG 系统状态
curl "https://[后端地址]/api/admin/rag-status?adminKey=[你的管理员密钥]"

# 预期响应:
{
  "success": true,
  "status": {
    "isLoaded": true,
    "isComprehensive": true,
    "mode": "comprehensive",
    "totalChunks": 88240,
    "metadata": {
      "created": "2024-01-01T12:00:00.000Z",
      "totalChunks": 88240,
      "processedFiles": 4557,
      "totalFiles": 4557,
      "loadingTime": "9.2 minutes",
      "status": "completed"
    }
  }
}
```

---

## 验证部署

### 步骤 9.1: 检查所有服务状态
1. 在 Zeabur 项目页面确认所有服务状态:
   ```
   ✅ MongoDB: Running (绿色)
   ✅ ChromaDB: Running (绿色)
   ✅ Backend: Running (绿色)
   ✅ Frontend: Running (绿色)
   ```

### 步骤 9.2: 测试前端访问
1. 访问前端地址: `https://[前端地址]`
2. 确认页面正常加载
3. 检查控制台无 JavaScript 错误

### 步骤 9.3: 测试用户注册/登录
1. 在前端页面注册新用户
2. 验证能够成功登录
3. 检查用户认证功能正常

### 步骤 9.4: 测试 AI 教案生成
1. 登录后访问教案生成页面
2. 填写测试数据:
   ```
   学科: 数学
   年级: 五年级
   主题: 分数的基本概念
   要求: 包含实际例子和练习题
   ```
3. 点击生成教案
4. 验证:
   - 响应时间 < 10 秒 (理想 3-5 秒)
   - 生成内容包含教育相关信息
   - 内容格式正确 (Markdown)
   - 包含相关的 RAG 检索内容

### 步骤 9.5: 性能验证
```bash
# 测试 API 响应时间
time curl "https://[后端地址]/api/health"
# 期望: < 200ms

# 测试 AI 生成 (需要认证 token)
time curl -X POST "https://[后端地址]/api/lesson-plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -d '{
    "subject": "数学",
    "grade": "五年级", 
    "topic": "分数运算",
    "requirements": "包含练习题"
  }'
# 期望: < 10 秒
```

---

## 性能优化

### 步骤 10.1: 监控资源使用情况
1. 在 Zeabur 控制台查看各服务的资源使用:
   - **CPU 使用率**: 应保持在 70% 以下
   - **内存使用率**: 应保持在 80% 以下
   - **网络流量**: 监控入站/出站流量

### 步骤 10.2: 根据使用情况调整资源
如果发现资源不足:

#### 高 CPU 使用率
```yaml
# 升级 CPU 配置
MongoDB: 0.5 → 1.0 cores
ChromaDB: 0.5 → 1.0 cores  
Backend: 0.5 → 1.0 cores
Frontend: 保持 0.5 cores
```

#### 高内存使用率
```yaml
# 升级内存配置
MongoDB: 512MB → 1GB
ChromaDB: 1GB → 2GB
Backend: 512MB → 1GB
Frontend: 保持 512MB
```

### 步骤 10.3: 设置监控警报
1. 在 Zeabur 控制台启用警报
2. 设置以下警报规则:
   - CPU 使用率 > 80% 持续 5 分钟
   - 内存使用率 > 90% 持续 2 分钟
   - 服务下线 > 1 分钟
   - 错误率 > 5% 持续 5 分钟

### 步骤 10.4: 优化 AI 响应速度
如果 AI 响应过慢 (>10 秒):

1. **检查 API 配额**:
   ```bash
   # 登录通义千问控制台检查:
   # - API 调用次数剩余
   # - 账户余额充足
   # - 无 API 限流
   ```

2. **优化 RAG 搜索**:
   ```bash
   # 如果 RAG 搜索过慢，可以减少搜索结果数量
   # 在后端环境变量中添加:
   RAG_MAX_RESULTS = 3
   RAG_SEARCH_TIMEOUT = 2000
   ```

3. **调整 AI 参数**:
   ```bash
   # 更快的响应设置:
   QWEN_MODEL = qwen-turbo  # 更快的模型
   AI_MAX_TOKENS = 1500     # 减少最大 token 数
   AI_TEMPERATURE = 0.6     # 降低创造性以提高速度
   ```

---

## 🎉 部署完成！

### ✅ 部署成功清单
- [ ] MongoDB 服务运行正常
- [ ] ChromaDB 服务运行正常  
- [ ] 后端服务运行正常
- [ ] 前端服务运行正常
- [ ] RAG 数据加载完成 (88,000+ 教育内容块)
- [ ] 用户注册/登录功能正常
- [ ] AI 教案生成功能正常 (3-5 秒响应)
- [ ] 所有服务健康检查通过
- [ ] 资源使用率在合理范围内

### 📊 预期性能指标
- **服务启动时间**: 2-3 分钟
- **RAG 数据加载时间**: 5-10 分钟
- **API 响应时间**: < 200ms
- **AI 生成时间**: 3-5 秒
- **前端页面加载时间**: < 2 秒
- **资源使用率**: CPU < 70%, Memory < 80%

### 🔗 访问地址
- **前端应用**: `https://[前端地址]`
- **后端 API**: `https://[后端地址]/api`
- **健康检查**: `https://[后端地址]/api/health`
- **API 文档**: `https://[后端地址]/api/status`

### 📞 获取支持
如果遇到问题:
1. 检查 Zeabur 控制台的服务日志
2. 参考 `ZEABUR-DEPLOYMENT.md` 故障排除章节
3. 在 GitHub 仓库创建 issue: https://github.com/LQ458/lesson-plan-generator/issues

---

**🎓 恭喜！你的 AI 教案生成器现已成功部署到 Zeabur 云平台，具备:**
- ⚡ 60-75% 更快的 AI 响应速度
- 📚 88,000+ 高质量教育内容数据库
- 🚀 云原生架构，自动扩展
- 💰 按使用量付费，成本可控
- 🛡️ 生产级稳定性和安全性

**立即开始使用你的 AI 教案生成器，为教育创造更多价值！** 🚀