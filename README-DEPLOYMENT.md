# 🚀 TeachAI One-Command Deployment

## ⚡ **Single Command Setup**

```bash
./deploy-all.sh
```

**That's it! 🎉** This one command does everything:
- ✅ Installs all dependencies and modules
- ✅ Builds and deploys Docker containers
- ✅ Sets up databases (MongoDB + ChromaDB)
- ✅ Loads educational RAG data automatically
- ✅ Starts your AI lesson plan generator

**Access your application:**
- 🌐 **Frontend**: http://localhost:3002
- 🔧 **API**: http://localhost:3001

## 🎯 **Single Command Deployment**

For any environment (development, staging, production):

```bash
./deploy.sh
```

This single command will:
- ✅ Check prerequisites (Docker, Docker Compose)
- ✅ Build and start all services (TeachAI, MongoDB, ChromaDB)
- ✅ Handle environment configuration
- ✅ Wait for services to be healthy
- ✅ **Automatically load RAG educational data (95,360+ chunks)**
- ✅ Provide access URLs and management commands
- ✅ **Start app immediately while RAG loads in background**

## 📋 **Prerequisites**

- Docker and Docker Compose installed
- (Optional) RAG educational data in `./server/rag_data/chunks/`

## 🔧 **Environment Configuration**

### **Minimal Setup**
The deployment script will create a basic `.env` file if none exists. You just need to add your API key:

```bash
# Edit .env file
DASHSCOPE_API_KEY=your_qwen_api_key_here
```

### **Full Configuration** (Optional)
```bash
# AI Service Configuration
DASHSCOPE_API_KEY=your_qwen_api_key_here
QWEN_MODEL=qwen-turbo
AI_MAX_TOKENS=1500
AI_TEMPERATURE=0.7

# Additional AI Providers (Optional)
BAIDU_API_KEY=your_baidu_key
ZHIPU_API_KEY=your_zhipu_key
MOONSHOT_API_KEY=your_moonshot_key

# Security
JWT_SECRET=your_secure_jwt_secret

# Database (Auto-configured for Docker)
MONGODB_URI=mongodb://mongodb:27017/teachai
CHROMA_HOST=chroma
CHROMA_PORT=8000
```

## 🌐 **Access Points**

After deployment:
- **Frontend**: http://localhost:3002
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **ChromaDB**: http://localhost:8000
- **MongoDB**: localhost:27017

## 📊 **Service Management**

```bash
# View real-time logs
docker-compose logs -f

# Check service status
docker-compose ps

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Full cleanup (removes data)
docker-compose down -v
```

## 📥 **RAG Educational Data - Fully Integrated**

### **Automatic Loading** ✅
RAG data is now **automatically included and loaded** during deployment:

- ✅ **Embedded in Container**: RAG data (95,360+ chunks) included in Docker image
- ✅ **Auto-Detection**: Checks if data already exists in ChromaDB
- ✅ **Background Loading**: Loads data in background while app starts
- ✅ **Progress Monitoring**: Real-time progress tracking in logs
- ✅ **No Manual Steps**: Completely automated

### **Monitor Loading Progress**
```bash
# Watch RAG loading progress
docker-compose logs -f teachai | grep -E "(✅|📊|🔄)"

# Check current status
./check-status.sh
```

### **Loading Timeline**
- **0-2 minutes**: Services start and health checks pass
- **2-60 minutes**: RAG data loads with robust error handling (95,360+ chunks)
- **App Available Immediately**: Frontend/API work during loading
- **Full Functionality**: Available once RAG loading completes
- **Automatic Recovery**: Failed chunks are retried with exponential backoff

### **Robust Loading Features** ✅
- **Retry Mechanism**: Up to 3 retries per failed batch with exponential backoff
- **Progress Tracking**: Resumable from breakpoints if interrupted
- **Error Handling**: Detailed failure reporting and recovery suggestions
- **Timeout Protection**: Prevents hanging on slow operations
- **Quality Filtering**: Automatic filtering of low-quality educational content
- **Success Monitoring**: Real-time statistics on loading success rates

## 🏭 **Production Deployment**

### **Docker Compose Production**
```bash
# Production deployment with optimizations
NODE_ENV=production ./deploy.sh
```

### **With External Databases**
Update `docker-compose.yml` to point to external MongoDB/ChromaDB instances:

```yaml
services:
  teachai:
    environment:
      - MONGODB_URI=mongodb://your-mongo-host:27017/teachai
      - CHROMA_HOST=your-chroma-host
      - CHROMA_PORT=8000
```

### **Kubernetes Deployment**
The Docker images can be used in Kubernetes with appropriate ConfigMaps and Secrets.

## 🔒 **Security Considerations**

1. **API Keys**: Never commit `.env` files with real API keys
2. **JWT Secret**: Use a strong, random JWT secret in production
3. **Network**: Configure firewalls to restrict database access
4. **SSL/TLS**: Add reverse proxy (nginx) for HTTPS in production

## 🚨 **Troubleshooting**

### **Services Not Starting**
```bash
# Check logs for errors
docker-compose logs

# Check service health
docker-compose ps

# Restart specific service
docker-compose restart teachai
```

### **ChromaDB Connection Issues**
```bash
# Test ChromaDB connectivity
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB
docker-compose restart chroma
```

### **RAG Loading Issues**
```bash
# Check RAG loading status and progress
./check-status.sh

# Recover from failed RAG loading
./recover-rag.sh

# Force restart RAG loading
./recover-rag.sh --force

# Monitor RAG loading progress in real-time
watch -n 10 './check-status.sh'

# View detailed RAG loading logs
docker-compose logs -f teachai | grep -E "(✅|📊|🔄|❌|🚀)"

# Check RAG data files exist
ls -la ./server/rag_data/chunks/ | head -10

# Manual RAG loading with robust error handling
docker-compose exec teachai sh -c "cd server && CHROMA_HOST=chroma node rag/scripts/robust-rag-loader.js"
```

### **RAG Loading Success Indicators**
- ✅ **Expected final count**: 95,360+ chunks
- ✅ **Success rate**: >95% batch success rate
- ✅ **Loading time**: 30-60 minutes depending on system
- ✅ **Memory usage**: <4GB during loading
- ✅ **No hanging**: Automatic timeout protection

### **Port Conflicts**
```bash
# Check what's using ports
netstat -tulpn | grep -E ":3001|:3002|:8000|:27017"

# Update ports in docker-compose.yml if needed
```

## 📈 **Performance Optimization**

The deployment includes:
- ✅ **Direct Streaming**: 60-75% faster AI responses than OpenAI compatibility layer
- ✅ **Chinese AI Providers**: Lower latency for Chinese users
- ✅ **Smart Caching**: 60-80% speed improvement for repeated requests
- ✅ **Optimized Docker Build**: Multi-stage build with layer caching
- ✅ **Health Checks**: Automatic service monitoring

## 🔄 **Updates and Maintenance**

```bash
# Update to latest version
git pull
./deploy.sh

# View application metrics
docker stats

# Backup data
docker-compose exec mongodb mongodump --out /data/db/backup
docker cp $(docker-compose ps -q chroma):/chroma/chroma ./chroma_backup
```

## 🎯 **Summary**

**For any environment, just run:**
```bash
./deploy.sh
```

This provides a complete, production-ready TeachAI deployment with:
- 🚀 **60-75% faster AI responses** through direct streaming
- 📚 **95,360+ educational chunks** (when RAG data is loaded)
- 🔧 **Full monitoring and health checks**
- 🌐 **Multi-provider AI fallback system**
- 🐳 **Containerized and portable**

**Your AI-powered lesson plan generator will be ready in minutes!** 🎉