# 🔧 Dify配置获取指南

## 步骤1: 获取Dify API Token

### 方法A: 使用Dify Cloud (推荐)
1. 访问 https://cloud.dify.ai
2. 注册/登录账号
3. 进入控制台
4. 点击左侧菜单 **"设置"** → **"API Keys"**
5. 点击 **"创建API Key"**
6. 选择 **"数据集API"** (Dataset API)
7. 设置权限：**读取和写入**
8. 复制生成的Token (格式: `dataset-xxxxxxxxxxxxxxxxxxxxxxxx`)

### 方法B: 自部署Dify
1. 访问你的Dify部署地址
2. 进入管理后台
3. 找到API密钥管理
4. 创建数据集API密钥

## 步骤2: 创建/获取知识库ID

### 在Dify Cloud中:
1. 进入 **"知识库"** 页面
2. 点击 **"创建知识库"**
3. 填写信息：
   - 名称: `TeachAI教育材料库`
   - 描述: `K-12教育教材知识库，包含543本教材的教学内容`
4. 创建完成后，从浏览器URL获取知识库ID
   - URL格式: `https://cloud.dify.ai/datasets/{知识库ID}`
   - 复制这个ID

## 步骤3: 更新配置文件

编辑 `configs.py` 文件，替换以下内容：

```python
# 替换为你的实际配置
API_URL = 'https://api.dify.ai/v1'  # 或你的自部署地址
AUTHORIZATION = 'Bearer dataset-你的实际token'  # 从步骤1获取
DIFY_DOC_KB_ID = '你的知识库ID'  # 从步骤2获取
```

## 步骤4: 验证配置

运行测试脚本验证配置：
```bash
python test_connection.py
```

看到以下输出表示配置成功：
```
✅ API_URL: https://api.dify.ai/v1
✅ AUTHORIZATION: Bearer dataset-****...
✅ DIFY_DOC_KB_ID: your-kb-id
✅ CSV Directory: Found 543 CSV files
✅ Connected successfully!
```

## 步骤5: 开始上传

配置验证成功后，运行上传脚本：
```bash
python upload_csv.py
```

## 📋 配置模板

将以下内容复制到 `configs.py`，然后填入你的实际值：

```python
# ================== Dify API Configuration ==================
API_URL = 'https://api.dify.ai/v1'
AUTHORIZATION = 'Bearer dataset-YOUR_ACTUAL_TOKEN_HERE'
DIFY_DOC_KB_ID = 'YOUR_KNOWLEDGE_BASE_ID_HERE'

# ================== Document Upload Settings ==================
DOC_COMMON_DATA = {
    "indexing_technique": "high_quality",
    "process_rule": {
        "rules": {
            "pre_processing_rules": [
                {"id": "remove_extra_spaces", "enabled": True},
                {"id": "remove_urls_emails", "enabled": False}
            ],
            "segmentation": {
                "separator": "\\n\\n",
                "max_tokens": 1000
            }
        },
        "mode": "automatic"
    }
}

# 其他配置保持默认即可...
```

## ⚠️ 重要提醒

1. **保密性**: 不要将API Token提交到代码仓库
2. **配额**: 确认你的Dify账户有足够的配额用于上传543个文件
3. **网络**: 确保网络连接稳定，上传过程约需30-45分钟
4. **备份**: 上传前建议备份现有知识库数据

## 🆘 常见问题

**Q: Token格式不对？**
A: 确保格式为 `Bearer dataset-xxxxx`，注意空格和前缀

**Q: 知识库ID在哪里找？**
A: 在知识库详情页面的浏览器URL中

**Q: 上传速度慢？**
A: 工具已优化批处理，避免API限制，请耐心等待

**Q: 部分文件上传失败？**
A: 工具会显示详细错误信息，通常是文件过大或格式问题