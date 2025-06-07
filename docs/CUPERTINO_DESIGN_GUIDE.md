# Cupertino Design 实现指南

## 概述

本项目已成功从 Material Design 转换为 Apple 的 Cupertino Design（iOS 风格设计），提供了原生 iOS 应用的外观和体验。

## 主要变更

### 1. 应用架构变更

#### 主应用 (main.dart)

- **MaterialApp** → **CupertinoApp**
- 使用 `AppTheme.getCupertinoTheme()` 提供 iOS 风格主题
- 保留了中文本地化支持

#### 主题系统 (app_theme.dart)

- 添加了完整的 iOS 系统颜色调色板
- 实现了 `CupertinoThemeData` 配置
- 支持深色/浅色模式自动切换
- 使用 iOS 标准的颜色命名规范

### 2. UI 组件转换

#### 导航组件

- **Scaffold + AppBar** → **CupertinoPageScaffold + CupertinoNavigationBar**
- **TabBar** → **CupertinoSegmentedControl**
- **MaterialPageRoute** → **CupertinoPageRoute**

#### 输入组件

- **TextField** → **CupertinoTextField**
- **DropdownButton** → **CupertinoActionSheet**
- **Switch** → **CupertinoSwitch**

#### 按钮组件

- **ElevatedButton** → **CupertinoButton.filled**
- **OutlinedButton** → **CupertinoButton**
- **TextButton** → **CupertinoButton**
- **IconButton** → **CupertinoButton**

#### 对话框组件

- **AlertDialog** → **CupertinoAlertDialog**
- **SnackBar** → **CupertinoAlertDialog**
- **showDialog** → **showCupertinoDialog**

#### 其他组件

- **Card** → **Container** with iOS-style decoration
- **Chip** → **Container** with rounded corners
- **CircularProgressIndicator** → **CupertinoActivityIndicator**

### 3. 图标系统

全面采用 **CupertinoIcons**：

- `Icons.add` → `CupertinoIcons.add`
- `Icons.refresh` → `CupertinoIcons.refresh`
- `Icons.person` → `CupertinoIcons.person`
- `Icons.book` → `CupertinoIcons.book`
- `Icons.analytics` → `CupertinoIcons.chart_bar`
- `Icons.document_scanner` → `CupertinoIcons.doc_text_viewfinder`

### 4. 颜色系统

#### iOS 系统颜色

```dart
// 主要颜色
static const Color systemBlue = Color(0xFF007AFF);
static const Color systemGreen = Color(0xFF34C759);
static const Color systemOrange = Color(0xFFFF9500);
static const Color systemRed = Color(0xFFFF3B30);

// 灰色系
static const Color systemGray = Color(0xFF8E8E93);
static const Color systemGray2 = Color(0xFFAEAEB2);
static const Color systemGray3 = Color(0xFFC7C7CC);
static const Color systemGray4 = Color(0xFFD1D1D6);
static const Color systemGray5 = Color(0xFFE5E5EA);
static const Color systemGray6 = Color(0xFFF2F2F7);

// 背景色
static const Color systemBackground = Color(0xFFFFFFFF);
static const Color secondarySystemBackground = Color(0xFFF2F2F7);
static const Color systemBackgroundDark = Color(0xFF000000);
static const Color secondarySystemBackgroundDark = Color(0xFF1C1C1E);
```

### 5. 交互模式

#### 模态展示

- 使用 `showCupertinoModalPopup` 展示选择器
- 使用 `CupertinoActionSheet` 替代下拉菜单
- 支持 iOS 标准的滑动手势

#### 导航模式

- 采用 iOS 标准的导航栏布局
- 左侧返回按钮，右侧操作按钮
- 支持大标题和普通标题切换

#### 反馈机制

- 使用 `CupertinoAlertDialog` 提供用户反馈
- 采用 iOS 标准的按钮样式和布局
- 支持触觉反馈（在支持的设备上）

## 屏幕实现详情

### 1. 主屏幕 (HomeScreen)

- **CupertinoPageScaffold** 作为主容器
- **CupertinoNavigationBar** 包含主题切换和离线模式开关
- 功能卡片使用 iOS 风格的圆角和阴影
- 每个功能模块使用不同的系统颜色标识

### 2. 错题分析屏幕 (MistakeAnalysisScreen)

- **CupertinoSegmentedControl** 替代 TabBar
- **CupertinoSearchTextField** 提供搜索功能
- 筛选器使用 **CupertinoActionSheet**
- 错题卡片采用 iOS 风格的布局和颜色

### 3. 教案生成屏幕 (LessonPlanScreen)

- 表单输入使用 **CupertinoTextField**
- 加载状态使用 **CupertinoActivityIndicator**
- 按钮布局符合 iOS 设计规范

### 4. 添加错题屏幕 (AddMistakeScreen)

- 完全重新设计为 iOS 风格
- 使用 **CupertinoActionSheet** 进行选择
- 表单验证和保存流程优化

## 设计原则

### 1. 一致性

- 所有组件都遵循 iOS 设计语言
- 颜色、字体、间距保持一致
- 交互模式符合 iOS 用户习惯

### 2. 可访问性

- 支持深色模式
- 文本对比度符合 WCAG 标准
- 触摸目标大小适中

### 3. 性能

- 使用原生 Cupertino 组件
- 优化渲染性能
- 减少不必要的重绘

### 4. 响应式设计

- 适配不同屏幕尺寸
- 支持横屏和竖屏
- 布局自适应

## 兼容性说明

### Material Design 兼容

- 保留了 Material Design 主题配置
- 可以在需要时快速切换回 Material Design
- 某些复杂组件仍使用 Material 组件作为后备

### 平台兼容

- Web 端完全支持 Cupertino 风格
- iOS 端获得原生体验
- Android 端提供 iOS 风格的一致体验

## 开发建议

### 1. 新功能开发

- 优先使用 Cupertino 组件
- 遵循 iOS 设计规范
- 参考 Apple Human Interface Guidelines

### 2. 主题定制

- 使用 `AppTheme.getCupertinoTheme()` 获取主题
- 通过 `CupertinoTheme.of(context)` 访问主题数据
- 支持动态主题切换

### 3. 测试建议

- 在不同设备上测试 UI 表现
- 验证深色模式兼容性
- 确保交互流程符合 iOS 标准

## 未来改进

### 1. 动画效果

- 添加 iOS 风格的页面转场动画
- 实现弹性滚动效果
- 优化加载动画

### 2. 手势支持

- 添加滑动返回手势
- 支持长按菜单
- 实现拖拽排序

### 3. 高级功能

- 集成 iOS 风格的搜索栏
- 添加分段控制器动画
- 实现上下文菜单

## 总结

通过全面采用 Cupertino Design，应用现在提供了：

- 原生 iOS 应用的外观和感觉
- 一致的用户体验
- 更好的可访问性支持
- 优秀的性能表现

这种设计转换不仅提升了应用的视觉效果，还改善了用户交互体验，使应用更符合 iOS 用户的使用习惯。
