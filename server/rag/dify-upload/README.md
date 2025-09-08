# Dify CSV Upload Tool

自动批量上传教育材料CSV文件到Dify知识库的工具。

## 功能特点

- 🚀 批量上传543个教育教材CSV文件
- 📚 每本教材一个独立的知识库文档
- ⏳ 智能批处理，避免API限制
- 🔄 上传进度追踪和错误处理
- ✅ 自动等待文档处理完成

## 安装配置

### 1. 安装依赖

```bash
cd server/rag/dify-upload
pip install -r requirements.txt
```

### 2. 获取Dify API配置信息

#### 2.1 获取API Token
1. 登录你的Dify控制台
2. 进入 **设置** > **API Keys**
3. 创建新的数据集API密钥
4. 复制生成的token（格式：`dataset-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

#### 2.2 获取知识库ID
1. 在Dify控制台中创建或选择知识库
2. 进入知识库详情页面
3. 从URL中获取知识库ID
   - URL格式：`https://cloud.dify.ai/datasets/{knowledge-base-id}`
   - 复制这个ID

#### 2.3 获取API地址
- **Dify云版本**: `https://api.dify.ai/v1`
- **自部署版本**: `http://your-domain/v1` 

### 3. 配置文件

编辑 `configs.py` 文件，填入你的配置信息：

```python
# 必需配置项
API_URL = 'https://api.dify.ai/v1'  # 你的Dify API地址
AUTHORIZATION = 'Bearer dataset-your-actual-token-here'  # 你的API Token
DIFY_DOC_KB_ID = 'your-knowledge-base-id-here'  # 你的知识库ID

# 可选配置项
DOC_COMMON_DATA = {
    "indexing_technique": "high_quality",  # 推荐高质量索引
    "process_rule": {
        "rules": {
            "segmentation": {
                "separator": "\\n\\n",
                "max_tokens": 1000  # 每个文档块的最大token数
            }
        },
        "mode": "automatic"
    }
}
```

## 使用方法

### 运行上传脚本

```bash
python upload_csv.py
```

### 上传过程

1. **配置验证**: 检查API配置是否正确
2. **连接测试**: 测试与Dify API的连接
3. **文件扫描**: 扫描CSV导出目录 (543个文件)
4. **批量上传**: 以3个文件为一批进行上传
   - 每个文件上传后等待2秒
   - 每批之间等待15秒
5. **处理等待**: 等待每个文档在Dify中处理完成
6. **结果汇总**: 显示上传成功/失败统计

### 预期结果

```
✅ Successfully uploaded: 543 files
❌ Failed uploads: 0 files  
📈 Success rate: 100.0%
```

## 文件结构

```
dify-upload/
├── configs.py          # 配置文件
├── dify_api.py         # Dify API客户端
├── upload_csv.py       # 主上传脚本
├── requirements.txt    # Python依赖
└── README.md          # 说明文档
```

## 上传的数据结构

每个CSV文件包含以下教育数据：

- **内容字段**: 文本块内容，质量评分，可靠性等级
- **教育元数据**: 学科，年级，学期，出版社信息
- **语义特征**: 是否包含公式，实验，定义，问题等
- **质量指标**: OCR置信度，中文字符比例，连贯性评分

## 故障排除

### 常见错误

1. **401 Unauthorized**
   - 检查API Token是否正确
   - 确认Token格式为 `Bearer dataset-xxx`

2. **404 Not Found**  
   - 检查知识库ID是否正确
   - 确认知识库存在且有访问权限

3. **413 Payload Too Large**
   - 某些CSV文件可能过大
   - 工具会自动跳过超过50MB的文件

4. **Rate Limiting**
   - 工具已内置速率限制
   - 如仍遇到限制，可增加批次间延迟时间

### 日志信息

上传过程中会显示详细日志：
- 📤 文件上传进度
- ⏳ 文档处理状态  
- ✅ 成功上传确认
- ❌ 失败文件和错误信息

## 性能优化

- **批处理**: 3个文件一批，避免API限制
- **文件排序**: 按文件大小排序，小文件优先
- **智能重试**: 自动等待文档处理完成
- **内存优化**: 流式文件读取，避免内存溢出

## 安全注意事项

- 不要将API Token提交到代码仓库
- 使用环境变量存储敏感信息（可选）
- 定期轮换API密钥

## 支持

如遇到问题，请检查：
1. Dify API文档: https://docs.dify.ai/
2. 网络连接是否正常
3. API配额是否充足
4. CSV文件格式是否正确