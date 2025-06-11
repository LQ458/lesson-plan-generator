# 🔧 Android 网络构建问题解决方案

## 📋 问题概述

您遇到的是中国网络环境下 Flutter Android 构建的经典问题：

- Google Maven 仓库访问受限
- 代理配置冲突 (127.0.0.1:7890)
- Gradle 依赖下载失败

## ✅ 已实施的修复

### 1. 更新了 Google MLKit 依赖

```yaml
google_mlkit_text_recognition: ^0.13.1 # 从0.10.0升级
```

### 2. 配置了国内镜像源

在 `android/build.gradle.kts` 中添加了：

- 阿里云镜像源（优先）
- 腾讯云镜像源（备选）
- 华为云镜像源（备选）

### 3. 优化了 Gradle 配置

在 `android/gradle.properties` 中配置了：

- 网络代理设置
- 超时时间优化
- 中国网络环境适配

## 🚀 推荐解决步骤

### 步骤 1: 检查网络环境

```bash
# 检查是否有VPN或代理软件运行
# 如果有，请暂时关闭再重试
```

### 步骤 2: 清理项目缓存

```bash
cd /path/to/your/project
flutter clean
rm -rf android/.gradle
rm -rf ~/.gradle/caches
```

### 步骤 3: 重新构建

```bash
flutter pub get
flutter run
```

### 步骤 4: 如果 Android 仍有问题，使用 Web 版本

```bash
flutter run -d chrome
```

## 🛠️ 高级解决方案

### 选项 A: 完全离线配置

如果网络问题持续，可以配置完全离线构建：

1. **下载 Gradle Wrapper 离线包**

```bash
# 在gradle/wrapper/gradle-wrapper.properties中配置
distributionUrl=file:///path/to/gradle-8.10-all.zip
```

2. **使用本地 Maven 仓库**

```bash
# 配置本地Maven缓存
gradle.properties 中添加：
maven.repo.local=/path/to/local/maven/repo
```

### 选项 B: 使用 Docker 构建环境

```dockerfile
# 使用预配置的Flutter Docker镜像
FROM cirrusci/flutter:stable

WORKDIR /app
COPY . .
RUN flutter pub get
RUN flutter build apk
```

### 选项 C: 切换到稳定的网络环境

- 使用学校或公司网络
- 使用手机热点
- 使用稳定的 VPN 服务

## 📱 临时解决方案 - 使用 Web 版本

由于您主要是进行 AI 功能开发，Web 版本完全可以满足需求：

```bash
# 启动Web版本
flutter run -d chrome

# 或者构建Web版本
flutter build web
cd build/web
python -m http.server 8000
```

## 🔍 故障排除

### 常见错误 1: Socket 连接被拒绝

```
Connect to 127.0.0.1:7890 failed: Connection refused
```

**解决方案**: 关闭 VPN/代理软件或配置正确的代理设置

### 常见错误 2: SSL 证书问题

```
SSL misconfiguration
```

**解决方案**: 在 gradle.properties 中添加：

```
systemProp.javax.net.ssl.trustStore=
systemProp.javax.net.ssl.trustStorePassword=
```

### 常见错误 3: 依赖版本冲突

```
Could not resolve org.jetbrains.kotlin:kotlin-gradle-plugin
```

**解决方案**: 更新依赖版本或锁定版本

## 💡 建议

1. **优先使用 Web 版本开发**: AI 功能在 Web 上调试更方便
2. **定期更新依赖**: 保持依赖包为最新版本
3. **配置稳定的网络环境**: 避免频繁的网络问题
4. **使用国内镜像源**: 提高下载速度和稳定性

## 📞 进一步帮助

如果问题仍然存在，建议：

1. 提供完整的错误日志
2. 检查网络环境配置
3. 尝试使用其他设备或网络环境
4. 考虑使用 Flutter Web 进行开发和测试

---

_最后更新_: ${new Date().toISOString().split('T')[0]}
_状态_: 📋 网络配置已优化，建议使用 Web 版本开发
