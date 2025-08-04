# 🚀 Zeabur Deployment Guide

Complete guide for deploying the AI Lesson Plan Generator to Zeabur cloud platform.

## 📋 Quick Start

### One-Command Deployment Preparation
```bash
./deploy-zeabur.sh
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Databases     │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│ MongoDB+ChromaDB│
│   Port: 3000    │    │   Port: 3001    │    │ RAG: 95,360+    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Prerequisites

### Required Environment Variables
Set these in your Zeabur dashboard **Variables** tab:

```bash
# Required - Get from https://dashscope.aliyun.com/
DASHSCOPE_API_KEY=your_qwen_api_key_here

# Required - Generate a secure random string (32+ characters)
JWT_SECRET=your_secure_jwt_secret_here

# Optional - Admin key for RAG management (default: dev-admin-key)
ADMIN_KEY=your_admin_key_here
```

### Auto-Generated Variables
These are automatically provided by Zeabur services:
```bash
MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/teachai?authSource=admin
CHROMA_HOST=chromadb
CHROMA_PORT=8000
```

## 🎯 Deployment Methods

### Method 1: Template Deployment (Recommended)
1. Go to [Zeabur Dashboard](https://dash.zeabur.com)
2. Click **"Deploy Template"**
3. Upload `zeabur-template.yaml`
4. Set required environment variables
5. Click **"Deploy"**

### Method 2: GitHub Repository
1. Go to [Zeabur Dashboard](https://dash.zeabur.com)
2. Click **"New Project"**
3. Connect GitHub repository: `https://github.com/LQ458/lesson-plan-generator`
4. Select branch: `web`
5. Zeabur auto-detects monorepo structure

### Method 3: Manual Service Creation
1. Create new project in Zeabur
2. Add services in this order:
   - **MongoDB** (Database service)
   - **ChromaDB** (Docker: `ghcr.io/chroma-core/chroma:latest`)
   - **Backend** (From `./server` directory)
   - **Frontend** (From `./web` directory)

## 📊 Service Configuration

### MongoDB Service
```yaml
Image: mongo:7.0
Port: 27017
Environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
  MONGO_INITDB_DATABASE: teachai
Resources:
  Memory: 512Mi - 1Gi
  CPU: 0.5 - 1.0
```

### ChromaDB Service
```yaml
Image: ghcr.io/chroma-core/chroma:latest
Port: 8000
Environment:
  IS_PERSISTENT: "TRUE"
  ALLOW_RESET: "TRUE" 
  ANONYMIZED_TELEMETRY: "FALSE"
Resources:
  Memory: 1Gi - 2Gi
  CPU: 0.5 - 1.0
Health Check: /api/v1/heartbeat
```

### Backend Service
```yaml
Directory: ./server
Build: pnpm install --frozen-lockfile
Start: node server.js
Port: 3001
Resources:
  Memory: 512Mi - 1Gi
  CPU: 0.5 - 1.0
Health Check: /api/health
```

### Frontend Service
```yaml
Directory: ./web
Build: pnpm install --frozen-lockfile && pnpm build
Start: pnpm start
Port: 3000
Resources:
  Memory: 512Mi - 1Gi
  CPU: 0.5 - 1.0
```

## ⚡ Post-Deployment Setup

### 1. Load Educational Data (Critical)
After all services are running (~5 minutes), load the RAG data:

```bash
# Method A: Using curl
curl -X POST "https://your-backend-url/api/admin/load-rag-data?adminKey=your_admin_key"

# Method B: Using admin panel (if implemented)
# Visit: https://your-frontend-url/admin
```

**⏳ Expected Timeline:**
- Service startup: 2-3 minutes
- RAG data loading: 5-10 minutes
- Total deployment time: ~10-15 minutes

### 2. Verify Services
Check all endpoints are working:

```bash
# Frontend
curl https://your-frontend-url

# Backend Health
curl https://your-backend-url/api/health

# ChromaDB Health
curl https://your-chromadb-url/api/v1/heartbeat

# RAG Status
curl "https://your-backend-url/api/admin/rag-status?adminKey=your_admin_key"
```

### 3. Test AI Generation
1. Visit your frontend URL
2. Create an account or login
3. Generate a test lesson plan
4. Verify ~3-5 second response time

## 📈 Monitoring & Maintenance

### Performance Metrics
Monitor these in Zeabur dashboard:
- **CPU Usage**: Should be <80% under normal load
- **Memory Usage**: 
  - Frontend: ~200-400MB
  - Backend: ~300-600MB
  - MongoDB: ~200-500MB
  - ChromaDB: ~500MB-1.5GB
- **Response Times**: 
  - API health: <100ms
  - AI generation: 3-5 seconds

### Log Monitoring
Check logs for:
```bash
# Success indicators
✅ MongoDB connected successfully
✅ ChromaDB is ready
✅ RAG system loaded with X chunks
✅ AI service initialized

# Warning indicators
⚠️ High memory usage
⚠️ Slow API responses
⚠️ RAG search failures

# Error indicators
❌ Database connection failed
❌ AI API key invalid
❌ Service unreachable
```

### Maintenance Tasks

#### Weekly
- Check resource usage trends
- Monitor error rates in logs
- Verify AI API quota usage

#### Monthly
- Review and optimize resource allocation
- Update dependencies if needed
- Backup MongoDB data (if configured)

#### As Needed
- Reload RAG data if content updated
- Scale services based on usage
- Update API keys before expiration

## 🛠️ Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check: Environment variables set correctly?
# Check: All dependencies installed?
# Check: Port conflicts?

# Solution: Review Zeabur logs, verify environment variables
```

#### 2. RAG Data Loading Fails
```bash
# Symptoms: AI responses have no educational context
# Check: ChromaDB service running?
# Check: Admin key configured?

# Solution:
curl -X POST "https://your-backend-url/api/admin/clear-rag-data?adminKey=your_admin_key"
curl -X POST "https://your-backend-url/api/admin/load-rag-data?adminKey=your_admin_key"
```

#### 3. Slow AI Responses (>10 seconds)
```bash
# Check: Qwen API key valid and has quota?
# Check: RAG system loaded properly?
# Check: Network connectivity?

# Solution: Check AI service logs, verify API key, restart backend service
```

#### 4. Frontend Can't Connect to Backend
```bash
# Check: NEXT_PUBLIC_API_URL environment variable correct?
# Check: Backend service URL accessible?
# Check: CORS configuration?

# Solution: Update frontend environment variables with correct backend URL
```

### Debug Commands

```bash
# Check service status
curl https://your-backend-url/api/status

# Check RAG system
curl "https://your-backend-url/api/admin/rag-status?adminKey=your_admin_key"

# Clear and reload RAG data
curl -X POST "https://your-backend-url/api/admin/clear-rag-data?adminKey=your_admin_key"
curl -X POST "https://your-backend-url/api/admin/load-rag-data?adminKey=your_admin_key"

# Test AI generation
curl -X POST "https://your-backend-url/api/lesson-plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"subject":"数学","grade":"五年级","topic":"分数运算"}'
```

## 💰 Cost Optimization

### Zeabur Pricing Tiers
- **Free**: $0/month - Basic deployment, limited resources
- **Developer**: $5/month - Production workloads, priority support  
- **Team**: $80/month - Team features, advanced scaling

### Resource Recommendations
```yaml
Development/Testing:
  Frontend: 256Mi RAM, 0.25 CPU
  Backend: 256Mi RAM, 0.25 CPU
  MongoDB: 256Mi RAM, 0.25 CPU
  ChromaDB: 512Mi RAM, 0.25 CPU

Production:
  Frontend: 512Mi RAM, 0.5 CPU
  Backend: 512Mi RAM, 0.5 CPU
  MongoDB: 512Mi RAM, 0.5 CPU
  ChromaDB: 1Gi RAM, 0.5 CPU

High Traffic:
  Frontend: 1Gi RAM, 1.0 CPU
  Backend: 1Gi RAM, 1.0 CPU
  MongoDB: 1Gi RAM, 1.0 CPU
  ChromaDB: 2Gi RAM, 1.0 CPU
```

## 🔗 Useful Links

- **Zeabur Documentation**: https://zeabur.com/docs
- **Project Repository**: https://github.com/LQ458/lesson-plan-generator
- **Issue Tracker**: https://github.com/LQ458/lesson-plan-generator/issues
- **DashScope API**: https://dashscope.aliyun.com/

## 📞 Support

### Getting Help
1. **Documentation**: Check this guide and Zeabur docs
2. **Logs**: Review service logs in Zeabur dashboard
3. **Issues**: Create issue in GitHub repository
4. **Community**: Zeabur Discord server

### Reporting Issues
Include this information:
- Zeabur project URL
- Service logs (sanitized)
- Environment variable configuration (without secrets)
- Steps to reproduce the issue
- Expected vs actual behavior

---

**🎉 Congratulations!** Your AI Lesson Plan Generator is now deployed on Zeabur with:
- ✅ Direct streaming (60-75% faster responses)
- ✅ Comprehensive educational database (95,360+ chunks)
- ✅ Production-ready infrastructure
- ✅ Automatic scaling and monitoring

**Next Steps**: Test your deployment, monitor performance, and start generating amazing lesson plans! 🎓