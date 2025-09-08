# 🚀 TeachAI Microservices Deployment Guide

This guide explains how to deploy TeachAI using a microservices architecture with separated RAG service on Hugging Face Spaces.

## 📋 Overview

**Problem**: Monolithic Docker deployment was complex with large builds (6.5GB), long build times (15-30 minutes), and high resource requirements (8GB+ RAM).

**Solution**: Microservices architecture with RAG service deployed to Hugging Face Spaces and main app using the RAG API.

### Benefits of Microservices Architecture

- ✅ **Fast Deployment**: RAG service deploys in 2-5 minutes on HF Spaces
- ✅ **Resource Efficiency**: Separate resource allocation per service
- ✅ **Easy Scaling**: Independent scaling of RAG and main app
- ✅ **Simplified Maintenance**: Focused responsibility per service
- ✅ **Platform Independence**: Use best platform for each service

## 🎯 Architecture

```
┌─────────────────────┐    HTTP API     ┌──────────────────────┐
│   Main TeachAI App  │ ──────────────→ │    RAG Service       │
│                     │                 │                      │
│ • Next.js Frontend  │                 │ • Gradio Web UI      │
│ • Express Backend   │                 │ • Flask REST API     │
│ • MongoDB Database  │                 │ • ChromaDB Vector DB │
│ • User Management   │                 │ • 95,360+ edu chunks │
└─────────────────────┘                 └──────────────────────┘
         │                                        │
         │                                        │
    Your Server                           Hugging Face Spaces
   (Docker/VPS)                              (Free/Paid)
```

## 🛠️ Step 1: Deploy RAG Service to Hugging Face Spaces

### Option A: One-Click Deploy

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces/new)
2. Choose "Gradio" SDK
3. Upload the `standalone-rag-service/` folder
4. Set to Public
5. Deploy!

### Option B: Manual Setup

```bash
# 1. Create new Space on Hugging Face
# 2. Clone your space repository
git clone https://huggingface.co/spaces/YOUR_USERNAME/teachai-rag-service

# 3. Copy service files
cp -r standalone-rag-service/* teachai-rag-service/

# 4. Copy your educational data (IMPORTANT!)
cp -r server/rag_data/ teachai-rag-service/rag_data/

# 5. Push to deploy
cd teachai-rag-service
git add .
git commit -m "Deploy TeachAI RAG Service"
git push
```

### RAG Service Features

Your deployed RAG service will provide:

- **🔍 Search API**: `/api/search` for educational content retrieval
- **📊 Statistics**: `/api/stats` for service health monitoring  
- **🌐 Web Interface**: Interactive Gradio UI for testing
- **📚 95,360+ Chunks**: Complete educational material database

## 🔧 Step 2: Configure Main App

### Environment Configuration

Update your `.env` file:

```bash
# RAG Service Configuration
RAG_SERVICE_URL=https://your-username-teachai-rag-service.hf.space

# Existing configuration
DASHSCOPE_API_KEY=your_qwen_api_key
JWT_SECRET=your_jwt_secret
MONGO_ROOT_PASSWORD=your_mongo_password
NODE_ENV=production
```

### Verify Integration

Test the connection:

```bash
# Start your main app
pnpm dev

# Check logs for RAG service connection
# You should see: "🌐 Using external RAG service: https://your-space-url"
```

## 📦 Step 3: Deploy Main App

Now your main app is much lighter without RAG data:

### Docker Deployment (Simplified)

```bash
# Much faster build without RAG data
./deploy.sh build fast

# Start services
./deploy.sh start
```

### Traditional Deployment

```bash
# Install dependencies
pnpm run install:all

# Build application
pnpm build

# Start production
pnpm start
```

## 🔍 Testing the Integration

### 1. Test RAG Service Directly

```bash
curl -X POST https://your-space-url/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "数学基础概念",
    "subject": "数学",
    "grade": "三年级",
    "limit": 5
  }'
```

### 2. Test Main App Integration

Visit your main app and generate a lesson plan. Check logs for:

```
🔍 [RAG] 开始检索相关教学资料
✅ [RAG] 成功检索到相关教学资料 - ragType: external-api
```

## 📊 Monitoring & Health Checks

### RAG Service Health

```bash
# Check service health
curl https://your-space-url/api/health

# Check service statistics
curl https://your-space-url/api/stats
```

### Main App Health

```bash
# Check main app backend
curl http://your-main-app:3001/api/health

# Check frontend
curl http://your-main-app:3000
```

## 🚨 Troubleshooting

### Common Issues

#### RAG Service Not Responding

```bash
# Check if service is up
curl https://your-space-url/api/health

# Check Hugging Face Spaces logs in web interface
```

#### Main App Can't Connect to RAG

1. Verify `RAG_SERVICE_URL` in `.env`
2. Check network connectivity
3. Ensure no firewall blocking outbound requests

#### Slow RAG Responses

- Hugging Face free tier may have cold starts
- Consider upgrading to HF paid tier for better performance
- Monitor response times in logs

#### Missing Educational Data

Make sure you copied `server/rag_data/` to your RAG service:

```bash
# Check if data exists in RAG service
ls standalone-rag-service/rag_data/chunks/

# Should show .json files with educational content
```

## 💰 Cost Analysis

### Hugging Face Spaces

- **Free Tier**: Perfect for development and small usage
- **Pro Tier ($9/month)**: Better performance, private spaces
- **Enterprise**: Custom pricing for high-volume usage

### Main App Hosting

- **VPS/Cloud**: $5-50/month depending on traffic
- **Docker**: Simplified deployment on any platform
- **Kubernetes**: For high-availability production

### Total Cost Comparison

| Deployment Type | Monthly Cost | Setup Time | Maintenance |
|----------------|--------------|------------|-------------|
| **Monolithic Docker** | $50+ | 30+ min | Complex |
| **Microservices** | $10-30 | 5-10 min | Simple |

## 🔄 Scaling & Updates

### Scaling RAG Service

- Upgrade HF Spaces tier for better performance
- Deploy multiple RAG instances with load balancing
- Use dedicated GPU instances for faster embedding

### Scaling Main App

- Horizontal scaling with Docker containers
- Database replication for MongoDB
- CDN for static assets

### Updates

**RAG Service Updates:**
```bash
git push  # Automatic deployment on HF Spaces
```

**Main App Updates:**
```bash
./deploy.sh restart  # Standard deployment
```

## 📈 Advanced Configuration

### Load Balancing Multiple RAG Services

```javascript
// In your main app configuration
const RAG_SERVICES = [
  'https://teachai-rag-1.hf.space',
  'https://teachai-rag-2.hf.space',
  'https://teachai-rag-3.hf.space'
];

// Round-robin or health-based selection
const selectedRagService = selectHealthyService(RAG_SERVICES);
```

### Caching RAG Responses

```javascript
// Add Redis caching for frequent queries
const redis = require('redis');
const client = redis.createClient();

async function getCachedRagResults(query) {
  const cached = await client.get(`rag:${query}`);
  if (cached) return JSON.parse(cached);
  
  const results = await fetchFromRagService(query);
  await client.setex(`rag:${query}`, 3600, JSON.stringify(results));
  return results;
}
```

## 🎉 Success!

You now have a scalable, maintainable TeachAI system with:

- ✅ **Fast RAG Service**: 2-5 minute deployments on HF Spaces
- ✅ **Lightweight Main App**: No more 6.5GB Docker builds
- ✅ **Easy Maintenance**: Update services independently
- ✅ **Cost Effective**: Pay only for what you use
- ✅ **High Availability**: Separate service reliability

The microservices architecture provides better separation of concerns, easier debugging, and more flexible deployment options while maintaining all the functionality of the original system.

---

📧 **Questions?** Check the logs for `ragType: external-api` to confirm the integration is working properly!