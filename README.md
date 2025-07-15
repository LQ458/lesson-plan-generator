# 📚 TeachAI - 智能教案生成器

基于 Next.js 和 Node.js 的全栈 AI 教案生成应用，集成 RAG (检索增强生成) 系统，提供更准确的教学内容生成。

## 🚀 快速开始

### 环境要求

- Node.js >= 18.17.0
- pnpm >= 8.0.0
- Python >= 3.8 (用于 ChromaDB)

### 📦 包管理器安装

项目使用 **pnpm** 作为包管理器。如果您还没有安装 pnpm，请先安装：

```bash
# 全局安装 pnpm
npm install -g pnpm

# 或者使用 Corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```

### 🔧 项目安装与运行

1. **克隆项目**

   ```bash
   git clone https://github.com/your-username/teachai.git
   cd teachai
   ```

2. **安装所有依赖**

   ```bash
   # 安装根目录、web 和 server 的所有依赖
   pnpm run install:all

   # 或者分别安装
   pnpm install # 根目录依赖
   cd web && pnpm install # 前端依赖
   cd ../server && pnpm install # 后端依赖
   ```

3. **安装 ChromaDB (RAG 系统)**

   ```bash
   # 安装 ChromaDB
   pip install chromadb

   # 或者使用 conda
   conda install -c conda-forge chromadb
   ```

4. **配置环境变量**

   ```bash
   # 复制环境变量模板
   cp server/.env.example server/.env

   # 编辑环境变量，设置 AI API 密钥
   # DASHSCOPE_API_KEY=your_api_key_here
   ```

## 🧠 RAG 系统设置

本项目集成了 RAG (检索增强生成) 系统，使用 ChromaDB 作为向量数据库，提供基于教学材料的智能内容生成。

### 启动 RAG 系统

1. **启动 ChromaDB 服务**

   ```bash
   # 启动 ChromaDB 向量数据库
   pnpm run chroma:start
   ```

2. **加载教学材料数据**

   ```bash
   # 加载 optimized 文件夹中的教学材料到向量数据库
   pnpm run rag:load
   ```

3. **检查 RAG 系统状态**

   ```bash
   # 检查数据库状态和数据统计
   pnpm run rag:status
   ```

### 一键设置 RAG 系统

```bash
# 自动启动 ChromaDB 并加载数据
pnpm run setup:rag
```

### RAG 系统管理

```bash
# 启动 ChromaDB 服务
pnpm run chroma:start

# 停止 ChromaDB 服务
pnpm run chroma:stop

# 检查系统状态
pnpm run rag:status

# 重新加载数据
pnpm run rag:load
```

## 🏃‍♂️ 运行项目

### 开发模式

1. **标准开发模式 (不含 RAG)**

   ```bash
   # 同时启动前端和后端开发服务器
   pnpm dev
   ```

2. **完整开发模式 (含 RAG)**

   ```bash
   # 同时启动 ChromaDB、前端和后端服务器
   pnpm run dev:full
   ```

### 分别启动各服务

```bash
# 启动 ChromaDB 服务
pnpm run chroma:start

# 启动后端服务器
pnpm run dev:server

# 启动前端服务器
pnpm run dev:web
```

访问地址：

- 前端应用：http://localhost:3000
- 后端 API：http://localhost:3001
- ChromaDB：http://localhost:8000

## 📚 教学材料数据

### 数据结构

项目的 `server/optimized/` 文件夹包含了预处理的教学材料数据，格式为 JSON 文件：

```
server/optimized/
├── 1751827962807_湘教版数学九年级下册教师用书.pdf.json
├── 1751827960661_华师大版数学九年级下册电子课本.pdf.json
├── 1751827949169_人教版物理九年级全一册电子课本.pdf.json
└── ... (更多教学材料)
```

### 数据格式

每个 JSON 文件包含以下结构：

```json
{
  "chunks": [
    {
      "content": "教学内容文本",
      "page_number": 1,
      "metadata": {
        "source": "文件名",
        "chunk_index": 0
      }
    }
  ]
}
```

### 支持的教材版本

- **数学**: 人教版、北师大版、湘教版、华师大版
- **语文**: 人教版、苏教版、北师大版
- **英语**: 人教版、外研版、译林版
- **物理**: 人教版、北师大版、沪科版
- **化学**: 人教版、鲁科版
- **生物**: 人教版、苏教版
- **其他**: 音乐、美术、科学等

### 构建项目

```bash
# 构建整个项目
pnpm build

# 分别构建
pnpm run build:web     # 构建前端
pnpm run build:server  # 构建后端
```

## 🎯 技术特性

### RAG (检索增强生成) 系统

本项目集成了先进的 RAG 系统，通过向量数据库检索相关教学材料，显著提升AI生成内容的质量和准确性。

#### 核心特性

- **智能检索**: 基于语义相似度检索相关教学内容
- **多版本教材支持**: 覆盖人教版、北师大版、苏教版等主流教材
- **年级适配**: 自动匹配年级相关的教学材料
- **学科专业化**: 针对不同学科提供专业化的教学内容
- **实时增强**: 生成过程中实时检索和融合相关教学资源

#### 数据统计

- **教学材料数量**: 6,805+ 个教学内容片段
- **覆盖年级**: 小学一年级至高中三年级
- **支持学科**: 数学、语文、英语、物理、化学、生物、历史、地理、政治、音乐、美术、科学
- **教材版本**: 20+ 种主流教材版本

#### 技术架构

```
用户请求 → AI服务 → 向量检索 → 内容融合 → 增强生成 → 返回结果
            ↓
      ChromaDB向量数据库
      (6,805+ 教学材料)
```

### AI 生成能力

- **教案生成**: 支持完整的教学设计，包含教学目标、重难点、教学过程
- **练习题生成**: 智能出题，支持多种题型和难度级别
- **内容分析**: 智能分析教学内容，提取核心概念
- **多格式输出**: 支持文本、思维导图、流程图、时间线等多种展示格式

### 用户体验

- **流式输出**: 实时显示生成过程，提升用户体验
- **个性化设置**: 根据用户偏好定制生成内容
- **内容管理**: 完整的内容收藏、导出、删除功能
- **多格式导出**: 支持PDF、Word、图片等多种导出格式

## 📖 使用指南

### 基本使用流程

1. **启动服务**

   ```bash
   # 启动完整服务（推荐）
   pnpm run dev:full
   ```

2. **生成教案**
   - 访问 http://localhost:3000
   - 选择学科、年级、主题
   - 点击生成，AI将结合RAG系统提供专业教案

3. **管理内容**
   - 查看生成历史
   - 收藏优质内容
   - 导出为PDF/Word

### 高级功能

- **RAG系统管理**: 使用 `pnpm run rag:status` 查看数据库状态
- **数据更新**: 使用 `pnpm run rag:load` 重新加载教学材料
- **系统监控**: 查看生成日志和性能指标

5. **生产环境启动**

```bash
# 启动生产环境
pnpm start

# 分别启动
pnpm run start:web     # 启动前端生产服务器
pnpm run start:server  # 启动后端生产服务器
```

## 📁 项目结构

```
lesson-plan-generator/
├── web/              # Next.js 前端应用
│   ├── src/
│   │   ├── app/      # App Router 页面
│   │   └── components/ # React 组件
│   ├── package.json
│   └── pnpm-lock.yaml
├── server/           # Node.js 后端服务
│   ├── models/       # 数据模型
│   ├── services/     # 业务服务
│   ├── middleware/   # 中间件
│   ├── config/       # 配置文件
│   ├── utils/        # 工具函数
│   ├── package.json
│   └── pnpm-lock.yaml
├── package.json      # 根目录配置（工作空间）
├── pnpm-lock.yaml    # 锁定文件
└── .gitignore        # Git 忽略文件
```

## 🛠️ 开发工具

### 可用脚本

```bash
pnpm dev              # 开发模式启动前后端
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器
pnpm lint             # 代码风格检查
pnpm test             # 运行测试
pnpm clean            # 清理 node_modules 和构建文件
pnpm format           # 代码格式化
```

### Git 忽略规则

项目已配置完整的 `.gitignore` 文件，自动忽略：

- `**/node_modules/` - 所有层级的依赖目录
- `**/.next/` - Next.js 构建输出
- `**/*.log` - 日志文件
- `.env*` - 环境变量文件
- `.DS_Store` - macOS 系统文件
- IDE 配置文件等

## 🔑 环境配置

请在 `server/` 目录下创建 `.env` 文件：

```bash
# MongoDB 连接
MONGODB_URI=your_mongodb_connection_string

# JWT 密钥
JWT_SECRET=your_jwt_secret

# OpenAI API Key (如果使用)
OPENAI_API_KEY=your_openai_api_key

# 服务器端口
PORT=8080
```

## 📖 技术栈

### 前端 (web/)

- **Next.js 15** - React 全栈框架
- **React 19** - UI 库
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Framer Motion** - 动画库
- **Lucide React** - 图标库

### 后端 (server/)

- **Node.js** - 运行时环境
- **Express.js** - Web 框架
- **MongoDB** - 数据库
- **Mongoose** - ODM
- **JWT** - 身份验证
- **Winston** - 日志记录

## 🤝 贡献

欢迎提交 Pull Request 和 Issue！

## 📄 许可证

MIT License

## 📞 联系我们

- 项目链接: [GitHub Repository](https://github.com/your-username/teachai)
- 问题反馈: [Issues](https://github.com/your-username/teachai/issues)

---

**TeachAI** - 让 AI 成为您的教学助手 🚀
