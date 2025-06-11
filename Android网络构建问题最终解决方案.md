# Android 网络构建问题最终解决方案

## 🚨 问题描述

Android 构建时需要下载 `platforms;android-31` 组件，但网络连接被拒绝：

```
Connection refused: java.net.ConnectException: Connection refused
Failed to install the following SDK components: platforms;android-31
```

## ✅ 已完成的配置

### 1. Flutter 国内镜像源 ✓

```bash
export FLUTTER_STORAGE_BASE_URL="https://storage.flutter-io.cn"
export PUB_HOSTED_URL="https://pub.flutter-io.cn"
```

### 2. Gradle 国内镜像源 ✓

- `android/build.gradle.kts` - 已配置阿里云、腾讯、华为镜像源
- `~/.gradle/init.gradle` - 全局 Gradle 镜像源配置

### 3. Android 构建优化 ✓

- `android/gradle.properties` - 网络超时、代理配置
- SDK 版本已更新到 API 35

## 🔧 最终解决方案（多选一）

### 方案 1: 手动下载 SDK 组件（推荐）

```bash
# 打开Android Studio
# Tools -> SDK Manager -> SDK Platforms
# 勾选 "Android 12 (API 31)" 并下载
# 或使用命令行：
$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager "platforms;android-31"
```

### 方案 2: 修改项目配置避开 API 31

在 `android/app/build.gradle.kts` 中强制使用 API 35：

```kotlin
android {
    compileSdk = 35

    defaultConfig {
        targetSdk = 35
        // 移除对API 31的依赖
    }
}
```

### 方案 3: 使用 VPN 或代理

```bash
# 临时启用代理（如果有可用的）
export http_proxy=http://proxy-server:port
export https_proxy=http://proxy-server:port
flutter build apk --debug
```

### 方案 4: 离线 SDK 包安装

1. 从其他设备或网络下载 `android-31` SDK 包
2. 手动复制到 `$ANDROID_SDK_ROOT/platforms/android-31/`
3. 重新构建项目

## 🌐 当前可用的替代方案

### Web 版本（✅ 完全可用）

```bash
flutter run -d chrome
```

- ✅ 所有 AI 功能正常
- ✅ 数据库存储正常
- ✅ 适合开发测试和演示

### macOS 版本（备选）

```bash
flutter run -d macos
```

## 📋 建议的开发流程

1. **优先使用 Web 版本**进行功能开发和测试
2. **功能稳定后**再解决 Android 构建问题
3. **发布时**考虑以下选项：
   - Web 版本部署到服务器
   - 在网络环境良好的设备上构建 Android APK
   - 使用 CI/CD 服务（如 GitHub Actions）构建

## 🔍 问题诊断命令

```bash
# 检查当前SDK组件
$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --list

# 检查网络连接
curl -I https://dl.google.com/android/repository/

# 检查Flutter配置
flutter doctor -v
```

## 💡 总结

当前状态：

- ✅ Web 版本完全可用，建议继续使用 Web 版进行开发
- ⚠️ Android 版本因网络问题暂时无法构建
- 🔧 多种解决方案可供选择，建议先尝试手动下载 SDK 组件

**推荐做法：继续使用 Web 版本进行 AI 教学助手的功能开发和测试，网络问题解决后再构建 Android 版本。**
