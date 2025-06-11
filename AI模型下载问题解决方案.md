# 🤖 AI 模型下载问题解决方案

## 📋 问题概述

如果您在使用教师 AI 助手应用时遇到"AI 模型下载失败"的问题，这通常是由于网络连接问题导致的。本文档将为您提供详细的解决方案。

## 🔍 常见错误类型

### 1. SSL 握手失败 (HandshakeException)

**错误信息**: `HandshakeException: Connection terminated during handshake`

**原因**:

- SSL 证书验证失败
- 网络安全设置过于严格
- 使用了不兼容的 VPN 或代理

**解决方案**:

1. **检查网络连接**

   - 确保 WiFi 或移动网络连接正常
   - 尝试访问其他网站确认网络畅通

2. **切换网络环境**

   - 如果使用 WiFi，尝试切换到移动网络
   - 如果使用移动网络，尝试切换到 WiFi

3. **关闭 VPN/代理**

   - 暂时关闭 VPN 软件
   - 检查手机系统设置中的代理配置

4. **重启应用**
   - 完全关闭应用后重新打开
   - 清除应用缓存（如果问题持续）

### 2. 网络连接失败 (SocketException)

**错误信息**: `SocketException: Connection failed`

**解决方案**:

1. **检查网络设置**

   - 验证 WiFi 密码是否正确
   - 检查移动网络是否有流量限制

2. **防火墙设置**

   - 确保防火墙没有阻止应用联网
   - 检查企业网络的安全策略

3. **DNS 设置**
   - 尝试更换 DNS 服务器（如 8.8.8.8）
   - 清除 DNS 缓存

### 3. 连接超时 (TimeoutException)

**错误信息**: `TimeoutException: Connection timeout`

**解决方案**:

1. **网络速度优化**

   - 确保网络速度足够下载大文件
   - 暂停其他设备的网络使用

2. **选择最佳时间**
   - 避开网络高峰期
   - 选择网络较为空闲的时段

## 🛠️ 技术优化方案

### 多镜像下载支持

应用已支持多个下载镜像，会自动尝试以下镜像：

1. **HuggingFace 镜像** (hf-mirror.com)
2. **阿里魔搭社区** (modelscope.cn)
3. **始智 AI** (wisemodel.cn)
4. **Gitee 镜像** (gitee.com)

### 网络优化配置

```bash
# 更新依赖包
flutter pub get

# 清理缓存
flutter clean
flutter pub get

# 重新构建应用
flutter build apk  # Android
flutter build ios  # iOS
```

## 📱 按平台解决方案

### Android 设备

1. **检查权限**

   - 设置 → 应用管理 → 教师 AI 助手 → 权限
   - 允许"存储"权限

2. **网络权限**

   - 确保应用有网络访问权限
   - 检查数据使用限制设置

3. **省电模式**
   - 关闭省电模式或将应用加入白名单
   - 允许应用后台运行

### iOS 设备

1. **网络权限**

   - 设置 → 隐私与安全性 → 本地网络
   - 确保应用有网络访问权限

2. **移动网络**
   - 设置 → 蜂窝网络 → 教师 AI 助手
   - 允许使用蜂窝网络

## 🔧 高级解决方案

### 1. 手动下载模型

如果自动下载持续失败，可以尝试：

```bash
# 使用curl下载（需要终端）
curl -L -o model.gguf "https://hf-mirror.com/qwen/Qwen-1_8B-Chat-Int4-GGUF/resolve/main/qwen-1_8b-chat-int4-q8_0.gguf"

# 使用wget下载
wget "https://modelscope.cn/api/v1/models/qwen/Qwen-1_8B-Chat-Int4/repo?Revision=master&FilePath=qwen-1_8b-chat-int4-q8_0.gguf"
```

### 2. 代理设置

如果在企业网络环境中：

```bash
# 设置HTTP代理
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# 临时取消代理
unset HTTP_PROXY
unset HTTPS_PROXY
```

### 3. 模型文件验证

下载完成后验证文件完整性：

```bash
# 计算文件SHA256值
shasum -a 256 model.gguf

# 对比官方提供的校验值
```

## 🏥 应急方案

### 使用在线 AI 服务

如果离线模型下载始终失败，可以：

1. **配置在线 API**

   - 使用深度求索(DeepSeek)免费 API
   - 申请地址：https://platform.deepseek.com/

2. **获取 API 密钥**

   ```bash
   # 设置环境变量
   export DEEPSEEK_API_KEY="your_api_key_here"
   ```

3. **切换到在线模式**
   - 在应用中选择"在线 AI"模式
   - 享受更强大的 AI 能力

### 联系技术支持

如果问题仍未解决：

📧 **邮箱**: tech-support@teachai.com
📱 **微信**: TeachAI_Support  
🕐 **服务时间**: 工作日 9:00-18:00

## 📝 常见问题 FAQ

**Q: 为什么模型文件这么大？**
A: AI 模型包含大量参数，压缩后的模型文件通常在 600MB-3GB 之间。这些参数用于提供准确的教学内容生成。

**Q: 下载的模型能离线使用吗？**
A: 是的！下载完成后，您可以在没有网络的情况下使用 AI 功能，特别适合偏远地区的教师使用。

**Q: 模型下载失败会影响在线功能吗？**
A: 不会。即使离线模型下载失败，您仍可以使用在线 AI 服务，功能更加强大。

**Q: 如何更新模型？**
A: 应用会自动检查模型更新。当有新版本时，会提示您下载最新模型。

## 🎯 预防措施

1. **网络环境**

   - 选择稳定的 WiFi 网络
   - 确保有足够的存储空间（至少 5GB）

2. **设备优化**

   - 定期清理设备存储空间
   - 保持应用为最新版本

3. **定期维护**
   - 定期重启应用
   - 清理应用缓存

---

_本文档会根据用户反馈持续更新，确保为教师用户提供最佳的技术支持。_
