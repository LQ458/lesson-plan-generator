# TeachAI - 智能教案生成平台

基于 Next.js 和 Node.js 的全栈 AI 教案生成应用，采用现代化的 Web 技术栈。

## 🏗️ 项目架构

```
teachai/
├── web/                    # Next.js 前端应用
│   ├── src/
│   │   ├── app/           # App Router 页面
│   │   └── components/    # React 组件
│   ├── package.json
│   └── README.md
├── server/                 # Node.js 后端服务
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑
│   ├── config/            # 配置文件
│   ├── server.js          # 服务器入口
│   └── package.json
└── README.md              # 项目总览
```

## 🚀 快速开始

### 环境要求

- Node.js 18.17 或更高版本
- pnpm 8.0 或更高版本

### 安装和运行

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd teachai
   ```

2. **启动后端服务**

   ```bash
   cd server
   pnpm install
   pnpm start
   ```

   后端服务将在 http://localhost:3001 启动

3. **启动前端应用**
   ```bash
   cd web
   pnpm install
   pnpm dev
   ```
   前端应用将在 http://localhost:3000 启动

## 🛠️ 技术栈

### 前端 (Web)

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI组件**: Headless UI + Heroicons
- **主题**: next-themes
- **包管理**: pnpm

### 后端 (Server)

- **运行时**: Node.js
- **框架**: Express.js
- **AI集成**: OpenAI API / 其他AI服务
- **数据库**: 根据需要配置
- **包管理**: pnpm

## 📱 功能特性

- 🎨 **Apple Design 风格** - 简洁现代的用户界面
- 🌙 **深色模式支持** - 完整的主题切换功能
- 📱 **响应式设计** - 完美适配各种设备
- 🤖 **AI 教案生成** - 智能生成结构化教案
- 📝 **练习题创建** - 多种题型和难度选择
- ⚙️ **灵活配置** - 支持多种AI模型和参数

## 🔧 开发指南

### 前端开发

```bash
cd web
pnpm dev          # 开发模式
pnpm build        # 生产构建
pnpm start        # 生产运行
pnpm lint         # 代码检查
```

### 后端开发

```bash
cd server
pnpm run dev      # 开发模式（如果配置了nodemon）
pnpm start        # 生产运行
pnpm test         # 运行测试
```

## 📦 部署

### 前端部署

- **Vercel** (推荐): 零配置部署
- **Netlify**: 静态站点托管
- **Docker**: 容器化部署

### 后端部署

- **传统服务器**: PM2 + Nginx
- **云平台**: AWS, Google Cloud, Azure
- **容器化**: Docker + Kubernetes

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目链接: [GitHub Repository](https://github.com/your-username/teachai)
- 问题反馈: [Issues](https://github.com/your-username/teachai/issues)

---

**TeachAI** - 让 AI 成为您的教学助手 🚀
