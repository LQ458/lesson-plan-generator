# ChromaDB Cloud 数据注入指南

## 概述

本指南介绍如何使用提供的脚本将JSON数据文件注入到ChromaDB Cloud数据库中。

## 文件说明

### 1. `chromadb_cloud_injector.py`
- **功能**: 注入单个特定文件的数据
- **目标文件**: `server/rag_data/chunks/义务教育教科书·人文地理上册.json`
- **集合名称**: `human_geography_textbook`

### 2. `cloud_injector.py`
- **功能**: 批量注入多个JSON文件的数据
- **目标目录**: `server/rag_data/chunks/`
- **集合命名**: 自动根据文件名生成集合名称

### 3. `test_chroma_connection.py`
- **功能**: 测试ChromaDB Cloud连接
- **用途**: 验证API密钥和连接配置

## 使用方法

### 安装依赖

```bash
pip install chromadb
```

### 1. 测试连接

首先测试ChromaDB Cloud连接是否正常：

```bash
python test_chroma_connection.py
```

### 2. 注入单个文件

使用特定脚本注入人文地理教材数据：

```bash
python chromadb_cloud_injector.py
```

### 3. 批量注入所有文件

注入目录下所有JSON文件：

```bash
python cloud_injector.py
```

### 4. 注入指定文件

```bash
python cloud_injector.py "server/rag_data/chunks/你的文件名.json"
```

## 数据格式要求

JSON文件应包含以下结构：

```json
[
  {
    "content": "文档内容文本",
    "metadata": {
      "source": "文件路径",
      "extractedAt": "提取时间",
      "method": "提取方法",
      "chunkIndex": 0,
      "qualityMetrics": {
        "chineseCharRatio": 0.75,
        "lengthScore": 0.76,
        "coherenceScore": 0.8
      }
    }
  }
]
```

## 配置信息

- **API密钥**: `ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF`
- **租户ID**: `ac97bc90-bba3-4f52-ab06-f0485262312e`
- **数据库名**: `teachai`

## 功能特性

### 自动分批处理
- 每批处理1000个文档
- 避免API限制和内存溢出

### 错误处理
- 连接失败重试
- 文件不存在检查
- 数据格式验证

### 进度显示
- 实时显示注入进度
- 详细的成功/失败统计

### 集合管理
- 自动创建新集合
- 使用现有集合
- 智能集合命名

## 注意事项

1. **API限制**: 添加了0.1秒延迟避免API限制
2. **数据过滤**: 自动过滤空内容文档
3. **ID唯一性**: 使用文件名前缀确保ID唯一性
4. **编码处理**: 使用UTF-8编码处理中文内容

## 故障排除

### 连接失败
- 检查API密钥是否正确
- 验证网络连接
- 确认租户ID和数据库名

### 数据注入失败
- 检查JSON文件格式
- 验证文件路径
- 查看错误日志

### 内存不足
- 减少批处理大小
- 分批处理大文件
- 增加系统内存

## 示例输出

```
🚀 开始ChromaDB Cloud数据注入...
✅ 成功连接到ChromaDB Cloud
✅ 成功加载数据文件: server/rag_data/chunks/义务教育教科书·人文地理上册.json
📊 数据条数: 2028
📚 创建新集合: textbook_义务教育教科书人文地理上册
📝 准备注入 2028 个文档
📤 已注入 1000/2028 个文档
📤 已注入 2028/2028 个文档
✅ 数据注入完成！总共注入 2028 个文档
📊 集合总文档数: 2028
🎉 数据注入成功完成！
```