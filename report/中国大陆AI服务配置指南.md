# 中国大陆 AI 服务配置指南

## 概述

本应用已针对中国大陆用户进行优化，支持多个国内主流 AI 服务商，提供在线+离线双模式，确保在各种网络环境下都能正常使用。

## 🚀 快速开始

### 1. 环境配置

复制 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

### 2. 推荐配置方案

#### 方案一：教育场景推荐 ⭐

- **在线服务**：阿里云通义千问
- **离线模型**：教育专用模型
- **适用场景**：学校、培训机构、教师个人使用
- **优势**：专业教育内容生成，价格实惠

#### 方案二：高性价比方案 💰

- **在线服务**：深度求索 DeepSeek
- **离线模型**：通用轻量模型
- **适用场景**：个人用户、小型机构
- **优势**：成本最低，性能优秀

#### 方案三：企业级方案 🏢

- **在线服务**：智谱 ChatGLM + 百度文心一言
- **离线模型**：全套模型
- **适用场景**：大型教育机构、企业培训
- **优势**：多重保障，稳定可靠

## 🔧 详细配置步骤

### 在线 AI 服务配置

#### 1. 阿里云通义千问（推荐）

**获取 API 密钥：**

1. 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 注册并完成实名认证
3. 创建 API Key
4. 在 `.env` 文件中配置：
   ```
   ALI_CLOUD_API_KEY=your_qianwen_api_key_here
   ```

**特点：**

- ✅ 性价比高，教育场景友好
- ✅ 中文理解能力强
- ✅ 免费额度充足
- ✅ 响应速度快

#### 2. 深度求索 DeepSeek（高性价比）

**获取 API 密钥：**

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册账号
3. 获取 API Key
4. 配置：
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

**特点：**

- ✅ 价格最低
- ✅ 代码生成能力强
- ✅ 支持长文本
- ✅ 开发者友好

#### 3. 智谱 ChatGLM（技术领先）

**获取 API 密钥：**

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 注册并认证
3. 创建 API Key
4. 配置：
   ```
   CHATGLM_API_KEY=your_chatglm_api_key_here
   ```

**特点：**

- ✅ 技术先进
- ✅ 多模态支持
- ✅ 推理能力强
- ✅ 学术背景深厚

#### 4. 百度文心一言（稳定可靠）

**获取 API 密钥：**

1. 访问 [百度千帆大模型平台](https://console.bce.baidu.com/qianfan/)
2. 创建应用
3. 获取 API Key 和 Secret Key
4. 配置：
   ```
   BAIDU_API_KEY=your_baidu_api_key_here
   BAIDU_SECRET_KEY=your_baidu_secret_key_here
   ```

**特点：**

- ✅ 企业级稳定性
- ✅ 中文优化
- ✅ 丰富的模型选择
- ✅ 完善的文档支持

### 离线 AI 模型配置

#### 支持的模型类型

1. **教育专用模型** (`education`)

   - 针对教学场景优化
   - 支持教案生成、习题创建
   - 模型大小：~2GB

2. **通用轻量模型** (`general`)

   - 通用文本生成
   - 快速响应
   - 模型大小：~500MB

3. **数学专用模型** (`math`)
   - 数学问题求解
   - 公式识别
   - 模型大小：~1.5GB

#### 下载和配置

1. **应用内下载**（推荐）

   - 打开应用设置 → AI 服务配置
   - 选择需要的模型类型
   - 点击下载按钮

2. **手动下载**

   ```bash
   # 创建模型目录
   mkdir -p assets/models

   # 下载模型文件（示例）
   wget https://hf-mirror.com/models/chinese-alpaca-plus/resolve/main/chinese-alpaca-2-7b-education.gguf
   ```

## 📱 使用指南

### 智能路由机制

应用会自动选择最佳的 AI 服务：

1. **在线优先模式**（默认）

   ```
   网络可用 → 在线AI服务
   网络不可用 → 离线AI模型
   都不可用 → 基础模板
   ```

2. **离线优先模式**
   ```
   离线模型可用 → 离线AI模型
   离线模型不可用 → 在线AI服务
   都不可用 → 基础模板
   ```

### 功能特性

#### 教案生成

- 支持全学科、全年级
- 符合中国教育部课程标准
- 包含教学目标、重难点、教学过程等完整结构

#### 练习题生成

- 多种题型：选择题、填空题、解答题
- 分层难度：基础、提高、拓展
- 详细解析和答案

#### 内容分析

- 知识点梳理
- 难度评估
- 教学建议
- 改进方向

#### OCR 文字识别

- 支持手写文字识别
- 数学公式识别
- 批量图片处理

## 🔒 安全和隐私

### API 密钥安全

- 本地加密存储
- 不会上传到服务器
- 支持随时更换

### 数据隐私

- 生成的内容仅存储在本地
- 可选择完全离线模式
- 符合数据保护要求

### 网络安全

- 使用 HTTPS 加密传输
- 支持代理配置
- 国内服务器，访问稳定

## 💰 成本优化

### 免费额度利用

- 阿里云：每月 100 万 tokens 免费
- 深度求索：每月 500 万 tokens 免费
- 智谱：每月 100 万 tokens 免费
- 百度：每月 1000 次调用免费

### 成本控制策略

1. **混合使用**：配置多个服务商，自动切换
2. **离线优先**：下载离线模型，减少在线调用
3. **智能缓存**：相似请求复用结果
4. **用量监控**：实时查看 API 使用情况

## 🛠️ 故障排除

### 常见问题

#### 1. API 调用失败

**症状**：提示"API 密钥无效"或"网络请求失败"
**解决方案**：

- 检查 API 密钥是否正确
- 确认账户余额充足
- 检查网络连接
- 尝试切换服务商

#### 2. 离线模型加载失败

**症状**：提示"模型未初始化"
**解决方案**：

- 检查模型文件是否完整下载
- 确认存储空间充足
- 重新下载模型文件
- 检查文件权限

#### 3. 生成内容质量不佳

**症状**：生成的教案或习题不符合要求
**解决方案**：

- 优化输入提示词
- 尝试不同的 AI 服务商
- 使用专用模型（如教育模型）
- 调整生成参数

### 性能优化

#### 1. 提升响应速度

- 使用离线模型
- 选择地理位置较近的服务商
- 优化网络连接

#### 2. 提升生成质量

- 提供详细的需求描述
- 使用专业术语
- 分步骤生成复杂内容

## 📞 技术支持

### 官方文档

- [阿里云 DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [深度求索 API 文档](https://platform.deepseek.com/api-docs/)
- [智谱 AI 文档](https://open.bigmodel.cn/dev/api)
- [百度千帆文档](https://cloud.baidu.com/doc/WENXINWORKSHOP/)

### 社区支持

- GitHub Issues
- 用户交流群
- 技术论坛

### 联系方式

- 邮箱：support@teachai.com
- 微信群：扫描二维码加入
- QQ 群：123456789

## 🔄 更新日志

### v1.0.0 (2024-12-19)

- ✅ 支持 6 个国内主流 AI 服务商
- ✅ 离线 AI 模型支持
- ✅ 智能路由和自动切换
- ✅ 完整的教案生成功能
- ✅ 多类型练习题生成
- ✅ OCR 文字识别
- ✅ 中国大陆网络优化

### 即将推出

- 🔄 更多 AI 服务商支持
- 🔄 模型微调功能
- 🔄 协作编辑
- 🔄 云端同步

---

**注意**：本指南会持续更新，请关注最新版本。如有问题，欢迎反馈！
