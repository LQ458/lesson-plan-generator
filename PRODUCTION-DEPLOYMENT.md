# ChromaDB Cloud Production Deployment Guide

This guide covers deploying the TeachAI RAG system with ChromaDB Cloud for production use.

## Overview

The system now supports both local ChromaDB development and ChromaDB Cloud production deployment through environment variable configuration.

## Environment Variables

### Required Production Environment Variables

```bash
# ChromaDB Cloud Configuration
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_chromadb_cloud_api_key
CHROMADB_TENANT=your_tenant_id
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main

# Application Configuration  
NODE_ENV=production
PORT=3001

# MongoDB (if using cloud MongoDB)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/teachai

# Authentication
JWT_SECRET=your_production_jwt_secret

# AI Service
DASHSCOPE_API_KEY=your_qwen_api_key
QWEN_MODEL=qwen-plus
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

### Optional Environment Variables

```bash
# ChromaDB Cloud Collection Settings
CHROMA_COLLECTION=teachai_main           # Default collection name
CHROMADB_BATCH_SIZE=50                   # Upload batch size
CHROMADB_TIMEOUT=30000                   # Request timeout in milliseconds

# RAG System Configuration
RAG_MIN_QUALITY_SCORE=0.3                # Minimum quality score for chunks
RAG_MAX_CONTEXT_TOKENS=4000              # Maximum context tokens
RAG_DEFAULT_SEARCH_LIMIT=15              # Default search result limit

# Logging
LOG_LEVEL=info                           # Production log level
```

## ChromaDB Cloud Setup

### 1. Create ChromaDB Cloud Account

1. Visit [ChromaDB Cloud](https://www.trychroma.com/cloud) 
2. Sign up for an account
3. Create a new database instance

### 2. Get API Credentials

1. In your ChromaDB Cloud dashboard:
   - Copy your **API Key** (`CHROMADB_API_KEY`)
   - Copy your **Tenant ID** (`CHROMADB_TENANT`)
   - Note your **Database name** (`CHROMADB_DATABASE`)

### 3. Configure Environment Variables

Create a `.env.production` file or set environment variables in your deployment platform:

```bash
# ChromaDB Cloud
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=ck-YourActualAPIKeyHere
CHROMADB_TENANT=your-tenant-id-here
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main
```

## Data Upload to ChromaDB Cloud

### Option 1: Automated Upload (Recommended)

```bash
# Set environment variables first
export CHROMA_CLOUD_ENABLED=true
export CHROMADB_API_KEY=your_api_key
export CHROMADB_TENANT=your_tenant_id
export CHROMADB_DATABASE=teachai
export CHROMADB_COLLECTION=teachai_main

# Upload all RAG data to cloud
pnpm run rag:upload:cloud

# Or use the direct script
node server/rag/scripts/upload-to-cloud.js
```

### Option 2: Manual Upload with Specific Files

```bash
# Upload a specific file
node server/rag/scripts/cloud-uploader.js "server/rag_data/chunks/specific-file.json"

# Retry failed uploads
node simple-retry.js
```

### Option 3: Bulk Upload with Progress Monitoring

```bash
# Start bulk upload in background
nohup pnpm run rag:upload:cloud > upload.log 2>&1 &

# Monitor progress in real-time
tail -f upload.log

# Or use the progress monitoring
pnpm run rag:progress:watch
```

## Production Configuration Files

### 1. Update `server/.env.production`

```bash
NODE_ENV=production
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_production_api_key
CHROMADB_TENANT=your_production_tenant_id
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
DASHSCOPE_API_KEY=your_production_dashscope_key
```

### 2. Update Docker Configuration (if using Docker)

```dockerfile
# In your Dockerfile
ENV CHROMA_CLOUD_ENABLED=true
ENV NODE_ENV=production

# In docker-compose.yml
environment:
  - CHROMA_CLOUD_ENABLED=true
  - CHROMADB_API_KEY=${CHROMADB_API_KEY}
  - CHROMADB_TENANT=${CHROMADB_TENANT}
  - CHROMADB_DATABASE=teachai
  - CHROMADB_COLLECTION=teachai_main
```

### 3. Update Platform-Specific Configuration

#### Vercel
```bash
# In Vercel dashboard, add environment variables:
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_api_key
CHROMADB_TENANT=your_tenant_id
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main
```

#### Heroku
```bash
heroku config:set CHROMA_CLOUD_ENABLED=true
heroku config:set CHROMADB_API_KEY=your_api_key
heroku config:set CHROMADB_TENANT=your_tenant_id
heroku config:set CHROMADB_DATABASE=teachai
heroku config:set CHROMADB_COLLECTION=teachai_main
```

#### Railway/Render
Add environment variables in your platform's dashboard with the values above.

## Deployment Steps

### 1. Pre-deployment Checklist

- [ ] ChromaDB Cloud account created and configured
- [ ] API credentials obtained and tested
- [ ] Environment variables configured
- [ ] RAG data uploaded to ChromaDB Cloud
- [ ] Collection verified and accessible

### 2. Deploy Application

```bash
# Build the application
pnpm build

# Start in production mode
NODE_ENV=production pnpm start

# Or deploy to your platform
# (Vercel, Heroku, Railway, etc.)
```

### 3. Verify Deployment

```bash
# Test ChromaDB Cloud connection
curl -X POST https://your-app.com/api/rag/health

# Test RAG search functionality
curl -X POST https://your-app.com/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "数学教学", "subject": "数学", "grade": "一年级"}'

# Check collection stats
curl -X GET https://your-app.com/api/rag/stats
```

## Monitoring and Maintenance

### 1. Health Monitoring

The application provides several monitoring endpoints:

```bash
# RAG system health
GET /api/rag/health

# Collection statistics
GET /api/rag/stats

# Search performance metrics
GET /api/rag/metrics
```

### 2. Data Updates

To update RAG data in production:

```bash
# Upload new data files
node server/rag/scripts/cloud-uploader.js "path/to/new/data.json"

# Verify updated collection
node -e "
const uploader = require('./server/rag/scripts/cloud-uploader');
const u = new uploader();
u.initialize().then(() => u.listCloudCollections()).then(console.log);
"
```

### 3. Backup and Recovery

ChromaDB Cloud provides automatic backups. For additional safety:

1. Export collection data periodically
2. Keep backup of your RAG source data
3. Document your collection schema and metadata structure

## Troubleshooting

### Common Issues

#### 1. Connection Errors
```bash
# Verify credentials
echo $CHROMADB_API_KEY | wc -c  # Should be > 10 characters
echo $CHROMADB_TENANT | wc -c   # Should be > 10 characters

# Test connection
node -e "
const {CloudClient} = require('chromadb');
const client = new CloudClient({
  apiKey: process.env.CHROMADB_API_KEY,
  tenant: process.env.CHROMADB_TENANT,
  database: process.env.CHROMADB_DATABASE || 'teachai'
});
client.heartbeat().then(() => console.log('✅ Connected')).catch(console.error);
"
```

#### 2. Collection Not Found
```bash
# List all collections
node -e "
const uploader = require('./server/rag/scripts/cloud-uploader');
const u = new uploader();
u.initialize().then(() => u.listCloudCollections()).then(console.log);
"

# Create main collection if missing
node -e "
const uploader = require('./server/rag/scripts/cloud-uploader');
const u = new uploader();
u.initialize().then(() => u.getOrCreateMainCollection()).then(() => console.log('✅ Collection ready'));
"
```

#### 3. Upload Failures
```bash
# Retry failed uploads
node simple-retry.js

# Check failed file logs
grep -i "failed\|error" upload.log

# Upload single file for testing
node server/rag/scripts/cloud-uploader.js "server/rag_data/chunks/test-file.json"
```

### Performance Optimization

1. **Batch Size**: Adjust `CHROMADB_BATCH_SIZE` based on your data
2. **Quality Filtering**: Increase `RAG_MIN_QUALITY_SCORE` for better results
3. **Search Limits**: Optimize `RAG_DEFAULT_SEARCH_LIMIT` for performance
4. **Caching**: Consider implementing application-level caching for frequently accessed content

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use secure environment variable management
3. **Network Security**: Ensure HTTPS for all communications
4. **Access Control**: Implement proper authentication and authorization
5. **Data Privacy**: Review ChromaDB Cloud's data processing and storage policies

## Support

For issues specific to:
- **ChromaDB Cloud**: Contact ChromaDB support
- **TeachAI Application**: Check application logs and error messages
- **RAG Data Upload**: Use the retry scripts and check data format
- **Performance Issues**: Review monitoring metrics and adjust configuration

## Migration from Local to Cloud

If migrating from local ChromaDB to ChromaDB Cloud:

1. **Export existing data** (if needed)
2. **Set environment variables** for cloud configuration
3. **Upload data** using the cloud uploader scripts
4. **Test functionality** thoroughly
5. **Update deployment configuration**
6. **Monitor performance** post-migration