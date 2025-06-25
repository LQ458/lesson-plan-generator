# 📚 TeachAI - 智能教案生成器

基于 Next.js 和 Node.js 的全栈 AI 教案生成应用

## 🚀 快速开始

### 环境要求

- Node.js >= 18.17.0
- pnpm >= 8.0.0

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

   ```

# 安装根目录、web 和 server 的所有依赖

pnpm run install:all

# 或者分别安装

pnpm install # 根目录依赖
cd web && pnpm install # 前端依赖
cd ../server && pnpm install # 后端依赖

````

3. **启动开发服务器**
   ```bash
# 同时启动前端和后端开发服务器
   pnpm dev

# 或者分别启动
pnpm run dev:web       # 启动前端开发服务器 (http://localhost:3000)
pnpm run dev:server    # 启动后端开发服务器 (http://localhost:8080)
````

4. **构建项目**

```bash
# 构建整个项目
pnpm build

# 分别构建
pnpm run build:web     # 构建前端
pnpm run build:server  # 构建后端
```

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
