# ChromaDB Cloud Production Deployment Guide

This guide explains how to configure TeachAI to use ChromaDB Cloud in production instead of the local ChromaDB instance.

## Prerequisites

1. ChromaDB Cloud account with active subscription
2. API key, tenant ID, and database configured in ChromaDB Cloud
3. Access to production server environment variables

## Environment Variables

Create or update your production `.env` file with the following ChromaDB Cloud configuration:

### Required ChromaDB Cloud Variables

```bash
# ChromaDB Cloud Configuration
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_api_key_here
CHROMADB_TENANT=your_tenant_id_here
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main

# Optional: Override embedding model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### Example Configuration

```bash
# ChromaDB Cloud Configuration
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF
CHROMADB_TENANT=ac97bc90-bba3-4f52-ab06-f0485262312e
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main

# Other required variables
DASHSCOPE_API_KEY=your_qwen_api_key
MONGODB_URI=mongodb://localhost:27017/teachai
JWT_SECRET=your_jwt_secret
PORT=3001
```

## Deployment Steps

### 1. Configure Environment Variables

Set the environment variables in your production deployment platform:

**For Docker/Docker Compose:**
```yaml
environment:
  - CHROMA_CLOUD_ENABLED=true
  - CHROMADB_API_KEY=ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF
  - CHROMADB_TENANT=ac97bc90-bba3-4f52-ab06-f0485262312e
  - CHROMADB_DATABASE=teachai
  - CHROMADB_COLLECTION=teachai_main
```

**For Vercel/Netlify:**
Add variables through the platform's environment variable settings.

**For AWS/Google Cloud/Azure:**
Configure through the respective cloud platform's environment variable management.

### 2. Upload RAG Data to Cloud

Upload your educational materials to ChromaDB Cloud:

```bash
# Upload all RAG data files
CHROMADB_API_KEY=your_api_key CHROMADB_TENANT=your_tenant node server/rag/scripts/upload-to-cloud.js

# Or upload a specific file
CHROMADB_API_KEY=your_api_key CHROMADB_TENANT=your_tenant node server/rag/scripts/upload-to-cloud.js "server/rag_data/chunks/specific-file.json"
```

### 3. Verify Cloud Connection

Test the cloud connection:

```bash
# Run RAG verification
pnpm run rag:verify

# Check collection status
pnpm run rag:status
```

## Configuration Details

### Automatic Switching Logic

The system automatically detects the deployment mode:

- **Local Mode** (`CHROMA_CLOUD_ENABLED=false` or unset): Uses local ChromaDB at `http://localhost:8000`
- **Cloud Mode** (`CHROMA_CLOUD_ENABLED=true`): Uses ChromaDB Cloud with provided credentials

### Updated Files

The following files have been updated to support cloud deployment:

1. **`server/rag/config/vector-db-config.js`**
   - Added cloud configuration section
   - Environment variable support for all cloud settings

2. **`server/rag/services/vector-store.js`**
   - CloudClient import and initialization
   - Automatic switching between local and cloud modes

3. **`server/rag/scripts/cloud-uploader.js`**
   - Environment variable configuration
   - Unified main collection strategy

## Collection Strategy

### Unified Main Collection

- **Collection Name**: `teachai_main` (configurable via `CHROMADB_COLLECTION`)
- **Strategy**: Single collection for all educational materials
- **Benefits**: 
  - Simplified management
  - Better search across all subjects and grades
  - Reduced complexity and costs

### Data Upload Process

1. **Quality Filtering**: Only chunks with quality score ≥ 0.3 are uploaded
2. **Batch Processing**: Files uploaded in batches of 50 documents
3. **Retry Logic**: Automatic retry on upload failures with exponential backoff
4. **Progress Tracking**: Real-time upload progress monitoring

## Monitoring and Maintenance

### Health Checks

```bash
# Check ChromaDB connection
curl http://your-production-url/api/health

# Verify RAG system status
pnpm run rag:status
```

### Collection Management

```bash
# List all collections in cloud
node server/rag/scripts/cloud-uploader.js --list

# Clean up unnecessary collections
node server/rag/scripts/cloud-uploader.js --cleanup
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify `CHROMADB_API_KEY` is correct
   - Check tenant ID format
   - Ensure API key has proper permissions

2. **Collection Not Found**
   - Run upload script to create main collection
   - Verify collection name matches environment variable

3. **Upload Failures**
   - Check file format (should be JSON arrays)
   - Verify quality scores exist in data
   - Monitor batch size and rate limiting

### Debug Commands

```bash
# Test cloud connection
node -e "
const { CloudClient } = require('chromadb');
const client = new CloudClient({
  apiKey: process.env.CHROMADB_API_KEY,
  tenant: process.env.CHROMADB_TENANT,
  database: process.env.CHROMADB_DATABASE
});
client.heartbeat().then(() => console.log('✅ Connection OK')).catch(console.error);
"

# List collections with details
node server/rag/scripts/cloud-uploader.js --list --verbose
```

## Security Considerations

1. **API Key Security**
   - Never commit API keys to version control
   - Use secure environment variable management
   - Rotate keys regularly

2. **Network Security**
   - ChromaDB Cloud uses HTTPS by default
   - Consider IP whitelisting if available

3. **Access Control**
   - Limit API key permissions to minimum required
   - Monitor usage and access logs

## Performance Optimization

### Upload Performance

- Use batch uploads (current: 50 documents per batch)
- Implement exponential backoff for rate limiting
- Monitor and adjust batch sizes based on success rates

### Query Performance

- Quality score filtering reduces irrelevant results
- Single collection strategy improves search efficiency
- Metadata indexing for faster filtering

## Cost Management

### ChromaDB Cloud Costs

- **Storage**: Based on number of documents and vectors
- **Compute**: Based on search queries and operations
- **Bandwidth**: Based on data transfer

### Optimization Tips

1. **Quality Filtering**: Remove low-quality documents (< 0.3 score)
2. **Deduplication**: Avoid uploading duplicate content
3. **Batch Operations**: Use batch APIs for better efficiency
4. **Collection Consolidation**: Use single main collection instead of multiple collections

## Support

For issues with this deployment:

1. Check the application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test ChromaDB Cloud connectivity independently
4. Review ChromaDB Cloud documentation for API changes

## Migration from Local to Cloud

If migrating from local ChromaDB to cloud:

1. **Export Local Data** (if needed):
   ```bash
   # Local collections can be exported if you need to backup
   pnpm run rag:export
   ```

2. **Set Environment Variables**:
   ```bash
   export CHROMA_CLOUD_ENABLED=true
   export CHROMADB_API_KEY=your_key
   export CHROMADB_TENANT=your_tenant
   export CHROMADB_DATABASE=teachai
   ```

3. **Upload Data to Cloud**:
   ```bash
   pnpm run rag:load  # This will now upload to cloud instead of local
   ```

4. **Verify Migration**:
   ```bash
   pnpm run rag:status
   pnpm run rag:test
   ```

5. **Update Production Configuration**:
   - Set cloud environment variables in production
   - Remove local ChromaDB service dependencies
   - Update deployment scripts

The system will automatically switch to cloud mode when `CHROMA_CLOUD_ENABLED=true` is set.