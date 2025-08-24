# TeachAI 项目交接文档

## 项目概述

TeachAI 是一个基于 AI 的智能教育内容生成平台，专为中小学教师设计，提供教案生成、练习题创建、内容管理等功能。系统采用 RAG（检索增强生成）技术，结合 95,360+ 优质教育资源，为教师提供个性化、高质量的教学内容。

## 核心技术模块

### 🎯 AI 教案生成服务
- **接口**: `POST /api/lesson-plan` - 流式 SSE 响应
- **核心引擎**: 通义千问 API (qwen-plus/qwen-turbo) + RAG 增强
- **请求处理**: 支持最大 2000 tokens，temperature=0.7 参数调优
- **模板系统**: 基于 Handlebars 的动态模板引擎，支持多种教案格式
- **流式渲染**: Server-Sent Events 实现实时内容推送到前端
- **格式支持**: Markdown → HTML/PDF/Word 转换，使用 Puppeteer 渲染引擎
- **缓存机制**: Redis 缓存相似请求，减少 AI API 调用成本

### 📝 练习题生成引擎
- **接口**: `POST /api/exercises` - 批量生成 API
- **参数配置**: JSON Schema 验证输入参数 (difficulty, questionTypes, count)
- **题型算法**: 
  - 选择题：基于知识点的干扰项生成算法
  - 填空题：关键词提取 + NLP 实体识别
  - 简答题：基于教学目标的开放性问题生成
- **难度控制**: 基于 Bloom 认知层次的难度评估模型
- **去重机制**: 内容哈希 + 语义相似度双重去重
- **导出服务**: 多格式导出服务 `GET /api/export/exercises/{id}`

### 📚 内容管理系统
- **数据模型**: MongoDB Collections (lessonPlans, exercises, favorites)
- **索引优化**: 复合索引 (userId + createdAt + subject + grade)
- **分页查询**: Cursor-based pagination，支持无限滚动
- **全文搜索**: MongoDB Text Index + Atlas Search 混合搜索
- **状态管理**: 
  - Draft/Published/Archived 状态机
  - 版本控制系统 (基于 timestamp 的简单版本)
- **权限系统**: RBAC 模型，支持 owner/editor/viewer 角色
- **API 接口**:
  - `GET /api/content/lesson-plans` - 分页查询教案
  - `GET /api/content/exercises` - 分页查询练习题  
  - `POST /api/content/favorites` - 收藏管理
  - `GET /api/content/stats` - 统计数据聚合

### 👤 认证授权系统
- **前端认证**: NextAuth.js v4 + JWT 策略
- **后端认证**: Express.js + JWT 中间件 + Session Cookie 双重验证
- **认证流程**:
  1. NextAuth 调用 `POST /api/auth/login`
  2. 后端验证用户凭据 (bcrypt 密码散列)
  3. 生成 JWT token (7天有效期) + HttpOnly Session Cookie
  4. 返回用户信息到 NextAuth session
- **权限中间件**: `authenticate()` 中间件支持 Bearer Token 和 Cookie 认证
- **会话管理**: MongoDB Sessions Collection + TTL 索引自动过期
- **安全特性**: 
  - Rate Limiting (express-rate-limit)
  - CORS 配置 + CSP 头部
  - JWT Secret 轮转支持

### 🔍 RAG 检索系统
- **向量数据库**: ChromaDB v0.4+ (本地/云端双模式)
- **嵌入模型**: text-embedding-ada-002 (OpenAI) / M3E (本地)
- **向量维度**: 1536 维向量空间
- **检索算法**: 
  - 语义搜索: cosine similarity top-k 检索
  - 混合搜索: BM25 + Dense Vector 加权融合
  - 重排序: Cross-Encoder 模型二次排序
- **数据管道**: 
  - 文本预处理: jieba 分词 + 停用词过滤
  - 文档分块: 递归字符分割 (chunk_size=1000, overlap=200)
  - 质量过滤: 基于困惑度的质量评分 (threshold=0.3)
- **性能优化**: 
  - Vector Index: HNSW 索引加速检索
  - Batch Processing: 批量嵌入 (batch_size=100)
  - Cache Layer: 查询结果缓存 (Redis)

### 📊 数据分析服务
- **实时统计**: MongoDB Aggregation Pipeline
- **时间序列**: 按日/周/月维度的数据聚合
- **指标计算**: 
  - 用户活跃度: DAU/MAU/留存率 (基于 session 数据)
  - 内容质量: 平均评分/使用次数/分享次数
  - 系统性能: API 响应时间/错误率/吞吐量
- **数据可视化**: Chart.js 前端图表 + 后端数据接口
- **报表导出**: CSV/Excel 格式导出 (使用 xlsx 库)

## 数据架构与存储

### 教育内容数据库
- **存储格式**: JSON 文档存储，Schema 版本化管理
- **数据规模**: 95,360 chunks，4,557 处理文件，总计 ~2.3GB
- **文档结构**:
```json
{
  "content": "教学内容文本",
  "metadata": {
    "source": "教材来源",
    "subject": "学科分类", 
    "grade": "年级标识",
    "chapter": "章节信息",
    "qualityScore": 0.85,
    "ocrConfidence": 0.92,
    "semanticFeatures": ["公式", "实验", "定义"]
  },
  "embedding": [1536维向量],
  "enhancementVersion": "v2.0"
}
```
- **质量控制**: 
  - OCR 置信度阈值 > 0.8
  - 内容质量评分 > 0.3
  - 重复检测算法 (Jaccard 相似度 < 0.7)

### MongoDB 数据模型
- **用户集合** (users): 
  - 索引: `{username: 1}`, `{email: 1}`, `{createdAt: -1}`
  - TTL: session 字段 7天自动过期
- **教案集合** (lessonPlans):
  - 索引: `{createdBy: 1, createdAt: -1}`, `{subject: 1, grade: 1}`
  - 分片键: `createdBy` (支持水平扩展)
- **练习题集合** (exercises):
  - 索引: `{createdBy: 1, difficulty: 1}`, `{subject: 1, questionType: 1}`
- **收藏集合** (favorites):
  - 复合索引: `{userId: 1, contentType: 1, contentId: 1}`

### ChromaDB 向量存储
- **Collection**: `teachai_main` (生产) / `teachai_dev` (开发)
- **距离函数**: cosine similarity
- **元数据过滤**: 支持 subject, grade, qualityScore 等字段过滤
- **持久化**: SQLite 本地存储 / 云端 Chroma Cloud
- **备份策略**: 每日全量备份 + 增量同步

## 技术栈

### 前端
- **框架**: Next.js 15 + React 19 + TypeScript
- **认证**: NextAuth.js (JWT 策略)
- **样式**: Tailwind CSS
- **状态管理**: React Hooks

### 后端  
- **框架**: Node.js + Express.js
- **数据库**: MongoDB (用户数据和内容存储)
- **认证**: JWT + Session Cookie 双重机制
- **AI 集成**: 通义千问 API

### RAG 系统
- **向量数据库**: ChromaDB 
- **数据规模**: 95,360+ 教育内容块
- **搜索功能**: 语义搜索 + 关键词匹配

## 核心问题

### 🚨 跨域认证同步问题

**现象描述：**
- 用户可以成功登录系统
- 登录后无法访问 `/my-content` 页面的内容
- 前端控制台显示 API 接口 401 错误

**技术原因：**
1. **前端认证流程**：NextAuth 在 `localhost:3000` 管理用户会话
2. **后端认证流程**：Express 在 `localhost:3001` 设置 Session Cookie
3. **跨域问题**：两个不同端口的 Cookie 无法共享
4. **API 调用失败**：前端请求后端 API 时缺少有效认证信息

**影响范围：**
- 内容统计接口 (`/api/content/stats`)
- 练习题列表接口 (`/api/content/exercises`)  
- 收藏功能接口 (`/api/content/favorites`)
- 教案管理接口 (`/api/content/lesson-plans`)

## 解决方案

### 方案一：Nginx 统一代理 (推荐)
使用 Nginx 反向代理，将前后端统一到同一域名下，彻底解决跨域问题。

**优势：** 生产环境标准方案，性能最优
**实施：** 配置 Nginx 将 `/api/*` 路径转发到后端服务

### 方案二：Next.js API 路由代理
在 Next.js 中创建 API 路由，代理转发到后端服务。

**优势：** 开发环境友好，无需额外服务
**实施：** 创建 `web/src/app/api/content/*/route.ts` 代理文件

### 方案三：环境变量调整
修改前端 API 配置，直接调用后端服务地址。

**优势：** 配置简单，快速验证
**限制：** 仅适用于同源部署环境

## 部署架构

```
用户访问 → Nginx (统一入口) → Next.js 前端 (3000端口)
                            ↓
                     Express 后端 (3001端口)
                            ↓
                     MongoDB + ChromaDB
```

## 环境要求

### 服务器配置
- **操作系统**: Ubuntu 20.04+ / CentOS 8+
- **内存**: 4GB+ (推荐 8GB)
- **存储**: 50GB+ (包含向量数据库)
- **网络**: 支持外网访问

### 软件依赖
- **Node.js**: v18+
- **MongoDB**: v5.0+
- **Python**: v3.8+ (ChromaDB 依赖)
- **Nginx**: 最新稳定版
- **PM2**: 进程管理工具

## 关键配置项

### 环境变量
- `NEXTAUTH_SECRET`: NextAuth 加密密钥
- `JWT_SECRET`: 后端 JWT 签名密钥  
- `MONGODB_URI`: MongoDB 连接字符串
- `DASHSCOPE_API_KEY`: 通义千问 API 密钥
- `CORS_ORIGINS`: 跨域白名单设置

### 服务端口
- **前端服务**: 3000
- **后端服务**: 3001
- **ChromaDB**: 8000
- **MongoDB**: 27017
- **Nginx**: 80/443

## 系统架构与数据流

### 请求处理流程
```
用户请求 → Nginx → Next.js → API Routes → Express.js → Services层
                                              ↓
                 MongoDB ← Business Logic ← Controllers
                                              ↓  
                 ChromaDB ← RAG Service ← AI Service → 通义千问API
```

### 技术实现细节

#### 教案生成数据流
1. **请求解析**: Zod Schema 验证输入参数
2. **RAG 检索**: 
   - 查询向量化: 使用嵌入模型将用户输入转为向量
   - 向量搜索: ChromaDB cosine_similarity 检索 top-10 相关内容
   - 结果重排: 基于质量评分和相关性的加权排序
3. **提示词构建**: 
   - 系统提示词 + 检索内容 + 用户需求
   - Token 长度控制 (最大 4000 tokens 上下文)
4. **AI 生成**: 
   - 通义千问 API 调用 (stream=true)
   - Server-Sent Events 推送到前端
5. **内容存储**: MongoDB 异步保存生成结果

#### 认证流程技术细节
**问题**: NextAuth (localhost:3000) 与 Express (localhost:3001) 跨域 session 同步
**当前状态**: 
- NextAuth 成功调用 `POST http://localhost:3001/api/auth/login`
- 后端设置 HttpOnly Session Cookie (domain=localhost:3001)
- 前端 API 调用 `http://localhost:3000/api/content/*` 缺少认证信息
- 结果: 401 Unauthorized 错误

**技术解决方案**:
1. **Nginx 代理方案**: 统一域名，消除跨域问题
2. **API 路由代理**: Next.js `/api/content/*` 代理到后端
3. **Cookie 域设置**: 修改 session cookie domain 配置

### 性能优化策略

#### 缓存架构
- **Redis 缓存**: 
  - AI 生成结果缓存 (TTL: 1小时)
  - 用户 session 缓存 (TTL: 7天)
  - RAG 检索结果缓存 (TTL: 30分钟)
- **CDN 缓存**: 静态资源 + 生成的 PDF 文件
- **数据库查询优化**: 
  - MongoDB 索引策略优化
  - 分页查询使用 cursor-based pagination
  - 聚合查询使用 $facet 并行处理

#### 并发处理
- **限流策略**: 
  - 用户级别: 10 req/min (教案生成)
  - IP 级别: 100 req/min (一般 API)
- **队列系统**: Bull Queue + Redis 处理批量任务
- **连接池**: MongoDB 连接池 (maxPoolSize: 50)

#### 监控指标
- **应用监控**: 
  - API 响应时间 P95 < 2s
  - 错误率 < 1%
  - AI API 调用成功率 > 99%
- **系统监控**:
  - CPU 使用率 < 70%
  - 内存使用率 < 80% 
  - 磁盘 I/O 监控
- **业务监控**:
  - 教案生成成功率
  - 用户活跃度指标
  - 内容质量评分趋势

## 数据初始化

### RAG 系统数据加载
项目包含预处理的教育内容数据，需要在部署后加载到 ChromaDB：
- 数据文件位置：`server/rag_data/chunks/`
- 加载命令：`pnpm run rag:load`
- 预计时间：30-60分钟
- 技术细节：批量嵌入处理 (batch_size=166)，断点续传支持

## 监控要点

### 服务健康检查
- 前端页面访问正常
- 后端 API 响应正常  
- MongoDB 连接状态
- ChromaDB 服务可用性

### 日志监控
- 应用错误日志
- Nginx 访问日志
- 认证失败日志
- AI 接口调用日志

## 业务流程

### 典型使用场景

#### 场景1：生成数学教案
1. 教师选择"小学三年级" + "数学" + "加减法运算"
2. 设置教学目标："掌握两位数加减法计算方法"
3. AI 从 RAG 系统检索相关教学资源
4. 生成包含教学流程、重难点、练习题的完整教案
5. 支持实时编辑修改和多格式导出

#### 场景2：批量生成练习题
1. 选择"初中一年级" + "英语" + "现在进行时"
2. 配置题型分布：选择题40%、填空题30%、翻译题30%
3. 设定难度级别和题目数量
4. 系统生成配套答案和解析
5. 一键导出标准试卷格式

#### 场景3：内容管理与复用
1. 在"我的内容"中查看历史创建的教案
2. 使用搜索功能快速定位特定内容
3. 收藏优质内容到个人收藏夹
4. 查看内容使用统计和受欢迎程度
5. 基于历史内容创建新的教学材料

## 系统特色

### AI 能力优势
- **上下文理解**: 基于教材内容的深度语义理解
- **个性化生成**: 根据教师偏好和学生特点定制内容
- **质量控制**: 多层过滤确保生成内容的准确性和适用性
- **实时响应**: 流式生成提供即时反馈体验

### 数据驱动决策
- **内容质量评分**: 每个数据块都有可靠性评分(0.3-1.0)
- **使用行为分析**: 跟踪内容使用效果和用户偏好
- **智能推荐**: 基于协同过滤的内容推荐算法
- **持续优化**: 基于用户反馈不断改进生成质量

## 维护建议

### 定期任务
- **数据备份**: MongoDB 数据库定期备份
- **日志清理**: 应用日志轮转和清理
- **依赖更新**: 定期更新 Node.js 依赖包
- **性能监控**: 关注 API 响应时间和错误率
- **RAG 数据更新**: 定期更新教育内容数据库

### 安全考虑
- **HTTPS 配置**: 生产环境必须启用 SSL
- **防火墙设置**: 仅开放必要端口
- **API 限流**: 配置合理的请求频率限制
- **密钥管理**: 妥善保管各类 API 密钥
- **用户数据保护**: 遵循教育数据隐私保护规范

### 性能优化
- **CDN 加速**: 静态资源使用 CDN 分发
- **数据库索引**: 优化 MongoDB 查询索引
- **缓存策略**: Redis 缓存热点数据
- **负载均衡**: 高并发场景下的水平扩展

## 运营指标

### 核心 KPI
- **用户活跃度**: DAU、MAU、留存率
- **内容生成量**: 日均教案/练习题生成数量  
- **用户满意度**: 内容质量评分、使用时长
- **系统稳定性**: 服务可用性、响应时间
- **成本效益**: AI 调用成本、服务器资源使用率

## 联系信息

- **技术文档**: 项目根目录 `CLAUDE.md`
- **开发规范**: 遵循 ESLint + Prettier 配置
- **测试覆盖**: 运行 `pnpm test` 进行全面测试
- **API 文档**: Swagger 文档位于 `/api/docs`

---

**最后更新**: 2025-01-22  
**文档版本**: 1.1  
**项目状态**: 核心功能完成，待解决认证同步问题