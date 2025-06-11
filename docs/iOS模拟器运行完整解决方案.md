# iOS 模拟器运行完整解决方案

## 🍎 **问题描述**

Flutter 应用在 iOS 模拟器中运行时出现代码签名错误：

```
Failed to build iOS app
Uncategorized (Xcode): Command CodeSign failed with a nonzero exit code
```

## 💡 **根据[Flutter GitHub Issue #148370](https://github.com/flutter/flutter/issues/148370)的解决方案**

### 方法一：Xcode 手动配置（推荐）

#### 第 1 步：打开 Xcode 项目

```bash
open ios/Runner.xcworkspace
```

#### 第 2 步：配置签名设置

1. **选择 Runner 项目**

   - 在左侧导航器中点击最顶部的"Runner"

2. **选择 Runner 目标**

   - 在中间面板选择"Runner"目标

3. **进入签名配置**

   - 点击"Signing & Capabilities"标签

4. **配置自动签名**

   - ✅ 勾选"Automatically manage signing"
   - 在"Team"下拉菜单中选择您的 Apple ID

5. **添加 Apple ID（如果需要）**
   - Xcode 菜单 → Settings → Accounts
   - 点击"+"添加 Apple ID
   - 使用您的 Apple ID 登录

#### 第 3 步：验证 Bundle ID

- 确认 Bundle Identifier 为：`com.teachai.app`
- 如果显示错误，Xcode 会自动尝试修复

#### 第 4 步：重新运行

```bash
flutter run -d "iPhone X"
```

### 方法二：命令行解决方案

#### 设置开发团队（需要 Apple ID）

```bash
# 查看可用的开发团队
security find-identity -v -p codesigning

# 使用特定团队ID运行
flutter run -d "iPhone X" --dart-define=DEVELOPMENT_TEAM=YOUR_TEAM_ID
```

### 方法三：无 Apple ID 解决方案

如果您没有 Apple Developer 账户，可以：

#### 1. 使用 Web 版本（已验证可用）

```bash
flutter run -d web-server --web-port=8080
```

**访问：** http://localhost:8080

#### 2. 创建免费 Apple ID

1. 访问 https://appleid.apple.com/
2. 创建免费 Apple ID
3. 在 Xcode 中添加该账户
4. 使用个人团队进行签名

#### 3. 禁用代码签名（仅模拟器）

编辑 `ios/Runner.xcodeproj/project.pbxproj`：

```xml
CODE_SIGN_IDENTITY = "";
CODE_SIGNING_REQUIRED = NO;
```

## 🔧 **已完成的修复**

我们已经为您的项目进行了以下优化：

1. ✅ **Bundle ID 修复**

   - 从 `com.example.teachaiApp` 改为 `com.teachai.app`

2. ✅ **自动签名配置**

   - 为所有构建配置添加了 `CODE_SIGN_STYLE = Automatic`

3. ✅ **Info.plist 优化**

   - 添加了相机、相册、麦克风权限
   - 优化了应用显示名称为"教师 AI 助手"

4. ✅ **网络权限配置**
   - 允许 HTTP 请求以支持 AI 服务调用

## 📱 **推荐工作流程**

### 方案 A：主力开发使用 Web 版本

```bash
# 快速开发和测试
flutter run -d web-server --web-port=8080
```

**优势：** 零配置、快速、功能完整

### 方案 B：iOS 特定功能测试

1. 在 Xcode 中一次性配置签名
2. 后续使用：

```bash
flutter run -d "iPhone X"
```

### 方案 C：双平台并行开发

```bash
# 终端1: Web版本
flutter run -d web-server --web-port=8080

# 终端2: iOS版本（配置完成后）
flutter run -d "iPhone X"
```

## 🎯 **教师版特性验证**

无论使用哪种方案，都支持：

- ✅ 在线 AI 教案生成
- ✅ 练习题智能推荐
- ✅ 文档 OCR 识别
- ✅ 流式输出体验
- ✅ Apple Design 界面
- ✅ 多 AI 服务商支持

## 🆘 **常见问题**

### Q: 为什么会出现 CodeSign 错误？

A: 这是 iOS 开发的标准安全机制。根据[Flutter 官方 Issue](https://github.com/flutter/flutter/issues/148370)，需要有效的开发者身份。

### Q: 免费 Apple ID 可以用吗？

A: 可以！免费 Apple ID 可以在模拟器和个人设备上测试应用。

### Q: Web 版本功能完整吗？

A: 是的！Web 版本支持所有核心功能，只是不支持离线 AI 模型下载。

### Q: 配置一次就够了吗？

A: 是的！在 Xcode 中配置一次后，后续使用 Flutter 命令行即可。

---

🍎 **iOS 配置虽复杂，但配置一次终身受益！**  
🌐 **Web 版本零配置，立即可用！**

**选择最适合您的开发方式，让 AI 助手服务山村教育！**
 