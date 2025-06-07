# Loading 和 Tour 功能指南

## 概述

本文档介绍了毕节教师助手应用中新添加的页面加载和用户引导功能。

## 🚀 页面加载功能 (Loading)

### Web 初始加载

应用在 Web 端启动时会显示一个精美的加载界面，包含：

- **应用 Logo**: 🎓 教育主题图标
- **应用标题**: 毕节教师助手
- **副标题**: 智能 AI 教学工具
- **加载动画**: 旋转的加载指示器
- **进度条**: 显示加载进度
- **中文字体预加载**: 确保中文字符正确显示

#### 技术实现

1. **HTML Loading 界面** (`web/index.html`):

   ```html
   <div id="loading-indicator" class="loading-container">
     <div class="loading-content">
       <div class="app-logo">🎓</div>
       <div class="app-title">毕节教师助手</div>
       <div class="app-subtitle">智能AI教学工具</div>
       <div class="loading-spinner"></div>
       <div class="loading-text">
         正在加载应用<span class="loading-dots"></span>
       </div>
       <div class="progress-bar"><div class="progress-fill"></div></div>
     </div>
   </div>
   ```

2. **中文字体预加载**:

   ```html
   <link
     href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
     rel="stylesheet"
   />
   ```

3. **自动移除机制**:
   - 监听 `flutter-first-frame` 事件
   - 延迟 1 秒确保字体加载完成
   - 备用方案：10 秒后自动移除

### 应用内加载

使用 `loader_overlay` 包提供应用内的加载覆盖层：

#### LoadingService 使用方法

```dart
// 显示loading
LoadingService.show(context, message: '正在处理...');

// 隐藏loading
LoadingService.hide(context);

// 执行异步操作并显示loading
final result = await LoadingService.withLoading(
  context,
  () async {
    // 你的异步操作
    return await someAsyncOperation();
  },
  loadingMessage: '正在生成教案...',
  successMessage: '教案生成成功！',
);
```

#### 功能特性

- ✅ 自动错误处理
- ✅ 成功/失败消息提示
- ✅ 进度更新支持
- ✅ iOS 风格的加载指示器

## 🎯 用户引导功能 (Tour)

### 引导流程

新用户首次使用应用时会看到：

1. **欢迎对话框**: 询问是否开始功能引导
2. **逐步引导**: 高亮显示各个功能模块
3. **完成确认**: 引导结束后的确认对话框

### 引导内容

#### 1. 主题切换

- **位置**: 导航栏右侧
- **说明**: 支持浅色、深色和跟随系统三种模式

#### 2. 离线模式

- **位置**: 导航栏右侧开关
- **说明**: 开启后使用本地 AI 模型，无需网络连接

#### 3. 教案自动生成

- **位置**: 主页功能卡片
- **说明**: 智能生成符合教学要求的教案

#### 4. 分层练习推荐

- **位置**: 主页功能卡片
- **说明**: 根据学生水平智能推荐练习题

#### 5. 错题分析

- **位置**: 主页功能卡片
- **说明**: 智能分析学生错题模式

#### 6. 纸质资料数字化

- **位置**: 主页功能卡片
- **说明**: 使用 OCR 技术将纸质资料转为电子版

### TourService 使用方法

```dart
// 检查并显示引导（在页面初始化时调用）
TourService.checkAndShowTour(context);

// 手动重新开始引导
TourService.restartTour(context);

// 创建引导包装组件
TourService.buildShowcase(
  key: TourService.lessonPlanKey,
  title: '教案自动生成',
  description: '智能生成符合教学要求的教案\n支持多学科、多年级的教案模板',
  child: YourWidget(),
);
```

## 📦 依赖包

### 新增依赖

```yaml
dependencies:
  # Loading覆盖层
  loader_overlay: ^5.0.0

  # Tour引导功能
  showcaseview: ^3.0.0
```

### 安装命令

```bash
flutter pub get
```

## 🎨 样式配置

### Loading 样式

- **主色调**: 渐变蓝紫色背景 (#667eea → #764ba2)
- **字体**: Noto Sans SC (中文优化)
- **动画**: 旋转加载器 + 脉冲文字 + 进度条

### Tour 样式

- **背景**: 半透明黑色遮罩 (80% 透明度)
- **提示框**: iOS 蓝色背景 (#007AFF)
- **文字**: 白色，支持多行描述
- **形状**: 圆角矩形高亮

## 🔧 配置选项

### 禁用引导

如果需要禁用引导功能，可以在 `HomeScreen` 中注释相关代码：

```dart
// 注释这行来禁用引导
// TourService.checkAndShowTour(context);
```

### 自定义 Loading

可以通过修改 `GlobalLoaderOverlay` 的 `overlayWidgetBuilder` 来自定义加载样式：

```dart
GlobalLoaderOverlay(
  useDefaultLoading: false,
  overlayWidgetBuilder: (progress) {
    return YourCustomLoadingWidget(message: progress);
  },
  child: YourApp(),
);
```

## 🐛 故障排除

### 常见问题

1. **中文字体显示异常**

   - 确保网络连接正常，字体能够从 Google Fonts 加载
   - 检查 `web/index.html` 中的字体链接

2. **引导不显示**

   - 确认用户是首次使用（清除应用数据重试）
   - 检查 `AuthService.hasSeenTour` 状态

3. **Loading 不消失**
   - 检查 `flutter-first-frame` 事件是否正常触发
   - 备用方案会在 10 秒后自动移除

### 调试技巧

```dart
// 重置引导状态（用于测试）
await AuthService.resetTourStatus();

// 检查Loading状态
bool isVisible = LoadingService.isVisible(context);
```

## 📱 平台兼容性

- ✅ **Web**: 完整支持所有功能
- ✅ **iOS**: 支持应用内 Loading 和 Tour
- ✅ **Android**: 支持应用内 Loading 和 Tour
- ⚠️ **桌面**: 基础支持（可能需要样式调整）

## 🚀 性能优化

### Web 端优化

1. **字体预加载**: 减少首次渲染时的字体闪烁
2. **渐进式加载**: 先显示 Loading，再加载 Flutter 应用
3. **缓存策略**: 字体和资源文件的浏览器缓存

### 内存优化

1. **按需加载**: Tour 组件只在需要时创建
2. **及时清理**: Loading 状态及时清除
3. **事件监听**: 适当的事件监听器管理

---

_最后更新: 2024 年 12 月_
