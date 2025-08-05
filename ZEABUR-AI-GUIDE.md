# Zeabur AI Deployment Guide

AI Assistant deployment instructions for the TeachAI Lesson Plan Generator - a full-stack AI-powered educational application with RAG system.

## Project Overview

Deploy a comprehensive AI lesson plan generator with:
- **Frontend**: Next.js 15 with React 19 (Port 3000)
- **Backend**: Node.js Express server (Port 3001)  
- **Database**: MongoDB for user data
- **Vector DB**: ChromaDB for RAG system with 95,360+ educational chunks
- **AI Service**: Qwen (DashScope) API integration with direct streaming

## Architecture

```
Frontend (Next.js) → Backend (Node.js) → MongoDB + ChromaDB
    Port 3000           Port 3001         RAG: 95,360+ chunks
```

## Required Services

Create these services in the following order:

### 1. MongoDB Service
```yaml
Type: Prebuilt Service
Image: mongo:7.0
Port: 27017
Environment Variables:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: [auto-generate secure password]
  MONGO_INITDB_DATABASE: teachai
Resources:
  CPU: 0.5 cores
  Memory: 512MB
  Storage: 1GB
```

### 2. ChromaDB Service  
```yaml
Type: Docker Image
Image: ghcr.io/chroma-core/chroma:latest
Port: 8000
Environment Variables:
  IS_PERSISTENT: "TRUE"
  ALLOW_RESET: "TRUE"
  ANONYMIZED_TELEMETRY: "FALSE"
  CHROMA_SERVER_HOST: "0.0.0.0"
  CHROMA_SERVER_HTTP_PORT: "8000"
Resources:
  CPU: 0.5 cores
  Memory: 1GB
  Storage: 2GB
Health Check:
  Path: /api/v1/heartbeat
  Port: 8000
  Initial Delay: 30s
  Interval: 10s
```

### 3. Backend Service
```yaml
Type: Git Repository
Repository: https://github.com/LQ458/lesson-plan-generator
Branch: web
Root Directory: ./server
Build Command: pnpm install --frozen-lockfile && node install-missing-deps.js && node check-deps.js
Start Command: node server.js
Port: 3001
Dependencies: [mongodb, chromadb]
Environment Variables:
  NODE_ENV: production
  PORT: "3001"
  MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/teachai?authSource=admin
  CHROMA_HOST: chromadb
  CHROMA_PORT: "8000"
  DASHSCOPE_API_KEY: [REQUIRED - User must provide Qwen API key]
  JWT_SECRET: [REQUIRED - User must provide secure random string]
  ALLOWED_ORIGINS: https://bijielearn.com,https://www.bijielearn.com,https://api.bijielearn.com
  COOKIE_DOMAIN: .bijielearn.com
  NODE_ENV: production
  QWEN_MODEL: qwen-plus
  AI_MAX_TOKENS: "2000"
  AI_TEMPERATURE: "0.7"
  ADMIN_KEY: admin-key-2024
Resources:
  CPU: 0.5-1.0 cores
  Memory: 512MB-1GB
Health Check:
  Path: /api/health
  Port: 3001
  Initial Delay: 60s
  Interval: 30s
```

### 4. Frontend Service
```yaml
Type: Git Repository
Repository: https://github.com/LQ458/lesson-plan-generator
Branch: web
Root Directory: ./web  
Build Command: pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
Port: 3000
Dependencies: [teachai-backend]
Environment Variables:
  NODE_ENV: production
  PORT: "3000"
  NEXT_PUBLIC_API_URL: https://[BACKEND_SERVICE_URL]/api
  NEXT_TELEMETRY_DISABLED: "1"
Resources:
  CPU: 0.5 cores
  Memory: 512MB
```

## Critical Post-Deployment Steps

### Step 1: Wait for Service Initialization
- All 4 services must show "Running" status
- Wait 2-3 minutes for complete initialization
- Verify health checks pass

### Step 2: Load RAG Educational Data
**CRITICAL**: The system requires loading 95,360+ educational content chunks.

Execute this API call after all services are running:
```bash
POST https://[BACKEND_SERVICE_URL]/api/admin/load-rag-data?adminKey=admin-key-2024
```

Expected process:
- Duration: 5-10 minutes
- Progress: Real-time streaming output
- Result: 85,000+ educational chunks loaded
- Storage: Creates comprehensive-index.json file

Monitor progress output:
```
🚀 Starting cloud RAG data loading...
📚 Found 4557 educational files to process
📦 Processing batch 1/92 (50 files)
📊 Progress: 100/4557 files, 2,450 chunks (1.2min, 83 files/min)
...
🎉 Comprehensive loading completed in 8.7 minutes!
📚 Loaded 87,240 high-quality educational chunks
✅ Comprehensive RAG system ready!
```

### Step 3: Verify System Status
Check these endpoints:
```bash
GET https://[BACKEND_SERVICE_URL]/api/health
GET https://[BACKEND_SERVICE_URL]/api/admin/rag-status?adminKey=admin-key-2024
GET https://[FRONTEND_SERVICE_URL]
```

## Required User Configuration

**IMPORTANT**: User must provide these environment variables:

### 1. DASHSCOPE_API_KEY (Required)
- Get from: https://dashscope.aliyun.com/
- Format: sk-xxxxxxxxxxxxxxxxxx
- Purpose: Qwen AI model access
- Cost: Pay-per-use (recommend ¥50+ initial funding)

### 2. JWT_SECRET (Required)  
- Generate: `openssl rand -base64 32`
- Purpose: User authentication security
- Length: Minimum 32 characters

### 3. ALLOWED_ORIGINS (Required)
- Purpose: CORS configuration for cross-origin requests
- Format: Comma-separated list of allowed domains
- Example: `https://bijielearn.com,https://www.bijielearn.com`
- Note: Must match your frontend domain exactly

### 4. MONGO_PASSWORD (Auto-generated)
- Zeabur auto-generates secure password
- Used in MONGODB_URI connection string

## Performance Expectations

### Deployment Timeline
- Service deployment: 3-5 minutes
- RAG data loading: 5-10 minutes  
- Total ready time: 10-15 minutes

### Runtime Performance
- API response time: <200ms
- AI generation time: 3-5 seconds (60-75% faster than standard)
- Frontend load time: <2 seconds
- RAG search time: <1 second

### Resource Usage
- Total CPU: 1.5-3.0 cores
- Total Memory: 2.5-4.5GB
- Storage: ~3-5GB
- Network: Minimal (AI API calls only)

## Testing Instructions

After deployment, verify functionality:

### 1. User Registration/Login
- Visit frontend URL
- Create test user account
- Verify JWT authentication works

### 2. AI Lesson Plan Generation
Test with these parameters:
```json
{
  "subject": "数学",
  "grade": "五年级",
  "topic": "分数的基本概念",
  "requirements": "包含实际例子和练习题"
}
```

Expected results:
- Response time: 3-5 seconds
- Content: Structured lesson plan with educational context
- Format: Markdown with proper sections
- RAG enhancement: Relevant educational materials included

### 3. System Health
All health checks should return "healthy" status:
- MongoDB: Database connected
- ChromaDB: Vector database ready
- RAG System: 85,000+ chunks loaded
- AI Service: Qwen API accessible

## Troubleshooting

### Common Issues

**Service Startup Failures**
- Check environment variables are set correctly
- Verify service dependencies (mongodb, chromadb must start first)
- Check resource limits (increase memory if needed)

**RAG Data Loading Fails**
- Verify ChromaDB service is running and healthy
- Check ADMIN_KEY matches in environment variables
- Ensure sufficient memory (>1GB) for ChromaDB service
- Retry loading: `POST /api/admin/clear-rag-data` then reload

**AI Generation Errors**
- Verify DASHSCOPE_API_KEY is valid and has quota
- Check Qwen API service status
- Confirm network connectivity to DashScope API
- Review backend service logs for AI service errors

**Slow Performance**
- Ensure RAG data is fully loaded (check rag-status endpoint)
- Verify adequate CPU/memory resources
- Check AI API quota and rate limits
- Monitor network latency to AI service

### Debug Commands
```bash
# Check service status
GET /api/health

# Check RAG system
GET /api/admin/rag-status?adminKey=admin-key-2024

# Clear and reload RAG data
POST /api/admin/clear-rag-data?adminKey=admin-key-2024
POST /api/admin/load-rag-data?adminKey=admin-key-2024

# Test AI generation (requires user auth)
POST /api/lesson-plan
Headers: Authorization: Bearer [JWT_TOKEN]
Body: {"subject":"数学","grade":"五年级","topic":"测试"}
```

## Success Criteria

Deployment is successful when:
- ✅ All 4 services show "Running" status
- ✅ Health checks pass for all services  
- ✅ RAG system loaded 85,000+ educational chunks
- ✅ User can register and login
- ✅ AI lesson plan generation works in 3-5 seconds
- ✅ Frontend displays properly without errors
- ✅ System passes all test scenarios

## Important Notes

1. **RAG Data Loading is Critical**: The system will not function properly without loading the educational content database. This step cannot be skipped.

2. **API Key Required**: User must provide valid DASHSCOPE_API_KEY with sufficient quota. Without this, AI generation will fail.

3. **Service Dependencies**: Services must start in order: MongoDB → ChromaDB → Backend → Frontend. Zeabur dependency configuration handles this automatically.

4. **Resource Requirements**: This is a resource-intensive application due to the large educational database and AI processing. Ensure adequate CPU/memory allocation.

5. **Network Requirements**: The system requires external API access to DashScope (Qwen) service. Ensure network policies allow outbound HTTPS connections.

6. **Data Persistence**: Both MongoDB and ChromaDB require persistent storage. Ensure volume mounts are configured for data persistence across deployments.

This deployment creates a production-ready AI educational platform capable of generating contextually-aware lesson plans using advanced RAG technology and direct AI streaming for optimal performance.