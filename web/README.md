# TeachAI Web - 智能教案生成器

基于 Next.js 和 AI 技术的现代化教案生成工具，采用 Apple Design 风格设计。

## ✨ 特性

- 🎨 **Apple Design 风格** - 简洁、现代的用户界面
- 🌙 **深色模式支持** - 完整的主题切换功能
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🚀 **高性能** - 基于 Next.js 14 和 React 18
- 🎯 **智能生成** - AI 驱动的教案和练习题生成
- 🔧 **可配置** - 灵活的 AI 模型和参数设置

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI 组件**: Headless UI
- **图标**: Heroicons
- **主题**: next-themes
- **包管理**: pnpm

## 🚀 快速开始

### 环境要求

- Node.js 18.17 或更高版本
- pnpm 8.0 或更高版本

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 📁 项目结构

```
teachai-web/
├── src/
│   ├── app/                 # App Router 页面
│   │   ├── page.tsx        # 首页
│   │   ├── lesson-plan/    # 教案生成页面
│   │   ├── exercises/      # 练习题生成页面
│   │   ├── settings/       # 设置页面
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式
│   └── components/         # 可复用组件
│       ├── navbar.tsx      # 导航栏
│       ├── theme-provider.tsx  # 主题提供者
│       └── theme-toggle.tsx    # 主题切换按钮
├── public/                 # 静态资源
├── tailwind.config.ts      # Tailwind 配置
└── package.json
```

## 🎨 设计系统

### 颜色方案

- **主色调**: Apple Blue (#007AFF)
- **辅助色**: Apple Green, Purple, Orange 等
- **中性色**: 灰度色阶，支持深色模式

### 组件样式

- **按钮**: 三种变体 (primary, secondary, ghost)
- **卡片**: 圆角设计，阴影效果
- **输入框**: 圆角边框，聚焦状态
- **导航**: 活跃状态指示

## 🔧 配置说明

### API 配置

在设置页面配置您的 AI API：

1. 选择 API 提供商 (OpenAI, Anthropic, Google AI 等)
2. 输入 API 密钥
3. 选择模型和参数

### 主题配置

支持三种主题模式：

- 浅色模式
- 深色模式
- 跟随系统

## 📱 功能模块

### 1. 教案生成

- 选择学科和年级
- 输入课题和教学目标
- AI 生成结构化教案
- 支持复制和导出

### 2. 练习题生成

- 多种题型支持
- 难度等级选择
- 批量生成题目
- 包含答案和解析

### 3. 设置管理

- AI 模型配置
- 界面主题设置
- 应用偏好管理

## 🌟 相比 Flutter 版本的优势

1. **更好的 Web 体验** - 专为 Web 优化的架构
2. **更快的加载速度** - Next.js 的 SSR/SSG 优化
3. **更简洁的代码** - 移除了移动端特定的复杂性
4. **更好的 SEO** - 搜索引擎友好
5. **更容易部署** - 标准的 Web 应用部署

## 📦 部署

### Vercel (推荐)

```bash
pnpm build
# 部署到 Vercel
```

### 其他平台

```bash
pnpm build
pnpm start
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**TeachAI Web** - 让 AI 成为您的教学助手 🚀
