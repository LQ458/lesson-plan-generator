# ChromaDB Cloud Upload Guide

This guide shows you how to upload your local RAG data (95,360+ enhanced educational materials) to ChromaDB Cloud for production use.

## Quick Start

### 1. Command Line Upload (Recommended)

```bash
# Upload all RAG data to ChromaDB Cloud
node upload-to-cloud.js

# Upload a specific file
node upload-to-cloud.js server/rag_data/chunks/数学一年级.json

# Show help
node upload-to-cloud.js --help
```

### 2. API Endpoint Upload

```bash
# Start your server
pnpm dev

# Upload via API (with admin authentication)
curl -X POST http://localhost:3001/api/admin/upload-to-cloud \
  -H "x-admin-key: dev-admin-key"

# Upload specific file
curl -X POST http://localhost:3001/api/admin/upload-file-to-cloud \
  -H "x-admin-key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "server/rag_data/chunks/数学一年级.json"}'

# List cloud collections
curl -X GET http://localhost:3001/api/admin/cloud-collections \
  -H "x-admin-key: dev-admin-key"
```

## Features

### ✨ Enhanced Upload System
- **Quality Filtering**: Only uploads chunks with quality score ≥ 0.3
- **Batch Processing**: Optimized 100-document batches for cloud API
- **Progress Monitoring**: Real-time upload progress and statistics
- **Error Handling**: Graceful error recovery and detailed reporting
- **Automatic Retry**: Built-in retry logic for network issues

### 📊 Data Characteristics
- **Volume**: 95,360+ enhanced educational chunks
- **Quality**: AI-enhanced content with OCR correction
- **Metadata**: Rich semantic features and educational classification
- **Languages**: Chinese educational materials with English technical terms

### 🔧 Configuration
- **ChromaDB Cloud Endpoint**: `https://api.trychroma.com`
- **Database**: `teachai`
- **API Key**: Pre-configured (ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF)
- **Tenant**: ac97bc90-bba3-4f52-ab06-f0485262312e

## Upload Process

### What Gets Uploaded

1. **Source Data**: JSON files from `server/rag_data/chunks/`
2. **Quality Filtering**: Chunks with quality score < 0.3 are filtered out
3. **Metadata Enhancement**: Each chunk includes:
   - Source file information
   - Subject and grade classification
   - Quality metrics (OCR confidence, coherence score)
   - Semantic features (formulas, definitions, questions)
   - Educational content type classification

### Collection Structure

Each JSON file creates a separate collection in ChromaDB Cloud:
- **Naming Pattern**: `teachai_[filename]`
- **Document IDs**: `[filename]_chunk_[index]`
- **Metadata**: Rich educational metadata for precise retrieval

## Monitoring and Verification

### Progress Tracking
```bash
# Watch upload progress in real-time
node upload-to-cloud.js
```

### Verify Upload Success
```bash
# List all cloud collections
curl -X GET http://localhost:3001/api/admin/cloud-collections \
  -H "x-admin-key: dev-admin-key"
```

### Example Output
```
🎉 批量上传完成! 成功率: 98.5%
================
⏱️  用时: 12.3 分钟
📁 总文件数: 4557
✅ 成功上传: 4489
❌ 失败文件: 68
📊 总文档数: 95360
📈 成功率: 98.5%
```

## API Integration

### Update Your Application Config

After uploading, update your vector store configuration to use ChromaDB Cloud:

```javascript
// server/rag/config/vector-db-config.js
const config = {
  chroma: {
    // For cloud deployment
    path: "https://api.trychroma.com",
    auth: {
      provider: "token",
      credentials: "ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF"
    },
    tenant: "ac97bc90-bba3-4f52-ab06-f0485262312e",
    database: "teachai",
    
    // For local development  
    // path: "http://localhost:8000",
  }
};
```

### Environment Variables

Set these for production:

```bash
# .env
CHROMA_PATH=https://api.trychroma.com
CHROMA_AUTH_TOKEN=ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF
CHROMA_TENANT=ac97bc90-bba3-4f52-ab06-f0485262312e
CHROMA_DATABASE=teachai
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   ```
   ❌ ChromaDB Cloud连接失败: timeout
   ```
   - **Solution**: Check internet connection and retry

2. **Authentication Failed**
   ```
   ❌ ChromaDB Cloud连接失败: unauthorized
   ```
   - **Solution**: Verify API key in the uploader configuration

3. **File Not Found**
   ```
   ❌ 数据目录不存在: server/rag_data/chunks
   ```
   - **Solution**: Run `pnpm run rag:load` to generate RAG data first

4. **Upload Interruption**
   ```
   ❌ 批次上传失败: network error
   ```
   - **Solution**: Re-run the upload - it will skip already uploaded collections

### Performance Optimization

- **Network Speed**: Affects upload time (10-20 minutes typical)
- **Batch Size**: Default 100 documents per batch (optimal for cloud API)
- **Concurrent Files**: Process files sequentially to avoid API rate limits
- **Memory Usage**: Efficient streaming processing for large datasets

## Production Deployment

### Zeabur Integration

The uploaded ChromaDB Cloud data works seamlessly with your Zeabur deployment:

1. **Deploy Application**: Your app automatically uses ChromaDB Cloud
2. **No Local Setup**: No need to run local ChromaDB service
3. **High Availability**: ChromaDB Cloud provides reliable vector search
4. **Scalability**: Handles concurrent user requests efficiently

### Performance Benefits

- **Faster Queries**: Cloud infrastructure optimized for vector search
- **Global CDN**: Reduced latency worldwide
- **Automatic Scaling**: Handles traffic spikes automatically
- **Backup & Recovery**: Built-in data protection

## Next Steps

After successful upload:

1. **Deploy Your App**: Use Zeabur or your preferred platform
2. **Test RAG System**: Verify lesson plan generation uses cloud data
3. **Monitor Performance**: Track query performance and accuracy
4. **Incremental Updates**: Upload new educational materials as needed

---

**Need Help?**
- Check server logs for detailed error messages
- Verify ChromaDB Cloud dashboard for collection status
- Test individual file uploads before bulk operations