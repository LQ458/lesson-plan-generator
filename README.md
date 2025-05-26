# 毕节教师助手 (TeachAI App)

一个基于Flutter开发的教师教育辅助工具，支持Web、Android、iOS多平台，提供教案生成、练习推荐、文档数字化等功能。

## 📋 项目概述

### 应用定位
- **目标用户**：中小学教师
- **核心价值**：提高教学效率，减轻教师工作负担
- **技术特色**：支持离线使用，跨平台兼容

### 主要功能模块
1. **教案自动生成** ✅ - 基于AI生成符合教学要求的教案
2. **分层练习推荐** ✅ - 根据学生水平推荐适合的练习题  
3. **纸质资料数字化** ⚠️ - OCR识别将纸质资料转为电子版
4. **错题分析** ❌ - 智能分析学生错题（待开发）

## 🏗️ 技术架构

### 技术栈
- **前端框架**：Flutter 3.32.0
- **状态管理**：Provider模式
- **本地存储**：Hive + SharedPreferences
- **AI功能**：Flutter Gemma（离线AI）
- **OCR识别**：Google ML Kit
- **UI设计**：Material Design 3
- **网络请求**：Dio

### 项目结构
```
lib/
├── main.dart                    # 应用入口
├── models/
│   └── app_state.dart          # 全局状态管理
├── services/
│   └── ai_service.dart         # AI功能服务层
├── screens/
│   ├── home_screen.dart        # 主页面
│   ├── lesson_plan_screen.dart # 教案生成页面
│   ├── exercise_recommendation_screen.dart # 练习推荐页面
│   └── document_scan_screen.dart # 文档扫描页面
└── utils/
    └── app_theme.dart          # 主题配置

assets/
├── images/                     # 图片资源
├── icons/                      # 图标资源
└── models/                     # AI模型文件（空）
```

### 依赖包分析
```yaml
核心依赖：
- flutter: SDK核心
- provider: 状态管理
- hive: 本地数据库
- shared_preferences: 简单数据存储

AI相关：
- flutter_gemma: 离线AI模型（仅移动端）
- google_mlkit_text_recognition: OCR文本识别

UI相关：
- flutter_markdown: Markdown渲染
- google_fonts: 字体支持
- flutter_svg: SVG图标支持

工具类：
- path_provider: 文件路径
- camera: 相机功能
- image_picker: 图片选择
- dio: 网络请求
```

## 🔍 功能状态分析

### ✅ 已完成功能

#### 1. 基础架构
- [x] Flutter多平台项目搭建
- [x] Provider状态管理架构
- [x] Material Design 3主题系统
- [x] 深色/浅色主题切换
- [x] 本地数据持久化框架

#### 2. 教案生成模块
- [x] 基础UI界面
- [x] 表单输入（学科、年级、主题）
- [x] 模拟AI生成功能
- [x] Markdown格式教案展示
- [x] 教案保存功能

#### 3. 练习推荐模块  
- [x] 基础UI界面
- [x] 难度分层选择
- [x] 题目数量设置
- [x] 模拟练习题生成
- [x] 练习题展示

#### 4. 文档扫描模块
- [x] 基础UI界面
- [x] 相机/相册图片选择
- [x] 模拟OCR识别功能

### ⚠️ 部分完成功能

#### 1. AI服务层
- [x] 服务架构设计
- [x] Web平台兼容处理
- [x] 模拟数据生成
- [ ] 真实AI模型集成
- [ ] 模型下载管理

#### 2. OCR功能
- [x] Google ML Kit集成
- [x] 图片处理流程
- [ ] Web平台OCR支持
- [ ] 识别准确率优化

### ❌ 待开发功能

#### 1. 错题分析模块
- [ ] UI界面设计
- [ ] 错题数据模型
- [ ] 分析算法实现
- [ ] 报告生成功能

#### 2. 数据管理
- [ ] Hive数据模型定义
- [ ] 数据导入导出
- [ ] 云端同步功能

#### 3. 高级功能
- [ ] 用户账户系统
- [ ] 班级管理功能
- [ ] 学生成绩跟踪
- [ ] 教学资源库

## 🚀 当前可完成的开发任务

### 高优先级（立即可做）

#### 1. 完善UI和用户体验
```bash
# 安装依赖
flutter pub get

# Web端运行测试
flutter run -d chrome
```

**具体任务：**
- [ ] 优化响应式布局设计
- [ ] 添加加载动画和进度指示器
- [ ] 完善错误处理和用户提示
- [ ] 添加帮助文档和使用指南
- [ ] 优化表单验证逻辑

#### 2. 数据持久化完善
**具体任务：**
- [ ] 定义Hive数据模型
- [ ] 实现教案本地保存
- [ ] 实现练习题历史记录
- [ ] 添加数据导出功能（JSON/PDF）
- [ ] 实现搜索和筛选功能

#### 3. 错题分析模块开发
**具体任务：**
- [ ] 设计错题数据结构
- [ ] 创建错题录入界面
- [ ] 实现基础统计分析
- [ ] 生成可视化报告
- [ ] 添加知识点关联功能

### 中优先级（需要额外资源）

#### 1. 真实AI模型集成
**技术方案：**
- 选择轻量级模型（如TinyLLaMA、Phi-2）
- 使用ONNX Runtime或TensorFlow Lite
- 实现模型量化和优化

#### 2. OCR功能增强
**技术方案：**
- 集成Tesseract OCR
- 添加图像预处理
- 支持手写文字识别
- 实现表格识别功能

### 低优先级（长期规划）

#### 1. 云端服务
- 用户账户系统
- 数据云端同步
- 协作功能

#### 2. 高级AI功能
- 个性化推荐算法
- 智能评分系统
- 自然语言对话

## 🛠️ 开发环境配置

### 环境要求
- Flutter SDK 3.32.0+
- Dart SDK 2.19.0+
- Android Studio / VS Code
- Chrome浏览器（Web开发）

### 快速开始
```bash
# 克隆项目
git clone [项目地址]
cd lesson-plan-generator

# 安装依赖
flutter pub get

# Web端运行
flutter run -d chrome

# Android端运行（需要连接设备或模拟器）
flutter run -d android

# iOS端运行（仅macOS）
flutter run -d ios
```

### 构建发布
```bash
# Web构建
flutter build web

# Android APK构建
flutter build apk

# iOS构建（需要开发者证书）
flutter build ios
```

## 📊 项目评估

### 优势
- ✅ 跨平台兼容性好
- ✅ 架构设计合理
- ✅ UI界面美观现代
- ✅ 支持离线使用
- ✅ 主题系统完善

### 挑战
- ⚠️ AI模型集成复杂
- ⚠️ OCR准确率有待提升
- ⚠️ 数据模型需要完善
- ⚠️ 缺乏真实用户测试

### 建议发展路径

#### 第一阶段（1-2周）
1. 完善现有UI和交互
2. 实现数据持久化
3. 开发错题分析基础功能
4. 添加单元测试

#### 第二阶段（1个月）
1. 集成轻量级AI模型
2. 优化OCR功能
3. 添加数据导出功能
4. 进行用户测试

#### 第三阶段（2-3个月）
1. 开发云端服务
2. 添加协作功能
3. 优化性能和稳定性
4. 准备应用商店发布

## 📝 开发注意事项

### Web平台限制
- 不支持本地AI模型
- 相机功能受限
- 文件系统访问受限

### 移动平台考虑
- AI模型文件较大，需要优化下载策略
- 需要申请相机和存储权限
- 考虑电池消耗优化

### 性能优化
- 使用懒加载减少内存占用
- 实现图片缓存机制
- 优化AI推理速度

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交代码变更
4. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证，详见LICENSE文件。

---

**项目状态**：开发中 🚧  
**最后更新**：2024年12月  
**维护者**：[项目团队]

