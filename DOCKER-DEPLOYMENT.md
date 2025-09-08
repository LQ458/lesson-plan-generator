# 🐳 TeachAI Docker Deployment Guide

Complete Docker deployment guide for TeachAI RAG system, optimized for CentOS servers with resource constraints (4-core CPU, 8GB RAM, 100GB storage).

## 📋 Quick Start

### 1. Prerequisites

#### System Requirements
- **OS**: CentOS 7/8, Ubuntu 18+, or RHEL 7/8
- **CPU**: 4+ cores (minimum 2)
- **RAM**: 8GB (minimum 6GB)
- **Storage**: 100GB (minimum 50GB)
- **Network**: Internet access for downloading images

#### Software Requirements
```bash
# CentOS/RHEL - Install Docker
sudo yum update -y
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

### 2. Environment Setup

```bash
# Clone repository
git clone <your-repo-url> teachai
cd teachai

# Setup environment
./deploy.sh setup

# Configure environment variables
cp .env.docker.example .env
nano .env  # Edit with your configuration
```

### 3. Configuration

Edit `.env` file with your settings:

```bash
# REQUIRED: AI Service API Key
DASHSCOPE_API_KEY=your_actual_api_key_here

# REQUIRED: Security
JWT_SECRET=your_very_long_secure_jwt_secret_change_this

# REQUIRED: Database Password
MONGO_ROOT_PASSWORD=your_secure_mongodb_password

# OPTIONAL: Resource Profile (ultra-lite/balanced/quality)
EMBEDDING_PROFILE=balanced
```

### 4. Deployment

```bash
# Deploy core services
./deploy.sh start

# Or deploy with nginx proxy
./deploy.sh start production

# Or deploy with monitoring
./deploy.sh start full
```

### 5. Verification

```bash
# Check service status
./deploy.sh status

# Perform health check
./deploy.sh health

# View logs
./deploy.sh logs
```

## 🏗️ Architecture Overview

### Container Services

| Service | Purpose | Resources | Ports |
|---------|---------|-----------|--------|
| **teachai** | Main app (Frontend + Backend + RAG) | 6GB RAM, 3.5 CPU | 3000, 3001 |
| **mongodb** | Database | 1GB RAM, 0.5 CPU | 27017 (internal) |
| **nginx** | Reverse proxy (optional) | 128MB RAM, 0.2 CPU | 80, 443 |
| **monitoring** | System metrics (optional) | 64MB RAM, 0.1 CPU | host network |

### Resource Allocation

Total resource usage for full deployment:
- **RAM**: ~7.2GB (90% of 8GB)
- **CPU**: ~4.3 cores (suitable for 4-core system)
- **Storage**: ~15GB (application + data)

## 🔧 Deployment Commands

### Core Commands

```bash
# Complete deployment workflow
./deploy.sh setup      # Setup environment
./deploy.sh build      # Build images  
./deploy.sh start      # Start services
./deploy.sh health     # Verify deployment

# Service management
./deploy.sh stop       # Stop all services
./deploy.sh restart    # Restart services
./deploy.sh status     # Show service status

# Troubleshooting
./deploy.sh logs teachai    # View app logs
./deploy.sh logs mongodb    # View database logs
```

### Deployment Profiles

#### Default Profile (Minimal)
```bash
./deploy.sh start
```
- Core services only: TeachAI app + MongoDB
- RAM usage: ~7GB
- Suitable for development and small deployments

#### Production Profile
```bash
./deploy.sh start production
```
- Adds Nginx reverse proxy for better performance
- SSL termination support
- RAM usage: ~7.2GB

#### Full Profile (with Monitoring)
```bash
./deploy.sh start full
```
- All services + system monitoring
- Resource monitoring with Node Exporter
- RAM usage: ~7.3GB

## 📊 Monitoring & Management

### Health Checks

The system includes comprehensive health monitoring:

```bash
# Full health check
./deploy.sh health

# Individual service health
docker exec teachai-app ./docker/healthcheck.sh backend
docker exec teachai-app ./docker/healthcheck.sh rag
docker exec teachai-app ./docker/healthcheck.sh resources
```

### Resource Monitoring

```bash
# Real-time resource usage
./deploy.sh status

# Detailed container stats
docker stats

# System resources
docker exec teachai-app ./docker/healthcheck.sh resources
```

### Log Management

```bash
# View all logs
./deploy.sh logs

# View specific service logs
./deploy.sh logs teachai
./deploy.sh logs mongodb

# Follow logs in real-time
./deploy.sh logs teachai 50  # Last 50 lines, follow
```

## 💾 Data Management

### Backup and Restore

```bash
# Create backup
./deploy.sh backup
# Creates: ./backups/teachai-backup-YYYYMMDD-HHMMSS.tar.gz

# Restore from backup
./deploy.sh restore ./backups/teachai-backup-20240101-120000.tar.gz
```

### Data Persistence

Data is stored in `./docker-data/` directory:

```
docker-data/
├── teachai_data/       # RAG vectors, models, cache
├── teachai_logs/       # Application logs
├── teachai_models/     # AI models
├── teachai_backups/    # Automated backups
├── mongodb_data/       # Database files
└── mongodb_config/     # Database configuration
```

### RAG Data Loading

The system automatically detects and loads RAG data:

```bash
# If you have existing RAG data in server/rag_data/chunks/
# The system will automatically load it on first startup

# Monitor loading progress
./deploy.sh logs teachai | grep RAG

# Check RAG system status
curl http://localhost:3001/api/rag/status
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Use strong JWT secret (64+ characters)
- [ ] Configure firewall to allow only necessary ports
- [ ] Enable SSL/TLS with nginx profile
- [ ] Regular security updates
- [ ] Monitor access logs

### Firewall Configuration (CentOS)

```bash
# Enable firewall
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow necessary ports
sudo firewall-cmd --permanent --add-port=3000/tcp  # Frontend
sudo firewall-cmd --permanent --add-port=3001/tcp  # Backend API
sudo firewall-cmd --permanent --add-port=80/tcp    # HTTP (if using nginx)
sudo firewall-cmd --permanent --add-port=443/tcp   # HTTPS (if using nginx)

# Reload firewall
sudo firewall-cmd --reload
```

## ⚡ Performance Optimization

### Memory Optimization

For 8GB RAM constraints:

```bash
# Use ultra-lite embedding profile
EMBEDDING_PROFILE=ultra-lite

# Reduce Node.js memory limit
NODE_OPTIONS=--max-old-space-size=3072

# Optimize MongoDB
# MongoDB limited to 1GB in docker-compose.yml
```

### Storage Optimization

```bash
# Clean up unused Docker resources
./deploy.sh clean

# Monitor storage usage
df -h
du -sh docker-data/*

# Archive old logs
find docker-data/teachai_logs/ -name "*.log" -mtime +30 -delete
```

### CPU Optimization

The system is optimized for 4-core CPU:
- 1 core for embedding generation
- 2 cores for vector search
- 1 core for API handling

## 🐛 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
./deploy.sh logs teachai

# Check system resources
./deploy.sh status

# Check environment variables
docker exec teachai-app env | grep -E "(DASH|JWT|MONGO)"
```

#### 2. High Memory Usage
```bash
# Switch to ultra-lite profile
echo "EMBEDDING_PROFILE=ultra-lite" >> .env
./deploy.sh restart

# Monitor memory usage
watch -n 5 'docker stats --no-stream'
```

#### 3. RAG System Issues
```bash
# Check RAG status
curl http://localhost:3001/api/rag/status

# View RAG-specific logs
./deploy.sh logs teachai | grep -i rag

# Check vector database
docker exec teachai-app ls -la /app/data/
```

#### 4. Database Connection Issues
```bash
# Check MongoDB status
docker exec teachai-mongodb mongosh --eval "db.adminCommand('ping')"

# Check network connectivity
docker exec teachai-app nc -zv mongodb 27017
```

### Performance Debugging

```bash
# Monitor resource usage
docker exec teachai-app ./docker/healthcheck.sh resources

# Check application performance
curl -w "@curl-format.txt" -s http://localhost:3001/api/health

# Monitor database performance
docker exec teachai-mongodb mongostat --host localhost
```

## 📈 Scaling Considerations

### Vertical Scaling (Single Server)

For servers with more resources:

```bash
# Increase memory limits in docker-compose.yml
services:
  teachai:
    deploy:
      resources:
        limits:
          memory: 12G  # Increase for 16GB+ servers
          cpus: '7'    # Increase for 8+ core servers
```

### Horizontal Scaling (Multiple Servers)

For multi-server deployment:
1. Use external MongoDB cluster
2. Use ChromaDB Cloud for RAG
3. Load balance with external nginx
4. Shared storage for persistent data

## 📚 Additional Resources

### Useful Commands

```bash
# Enter container shell
docker exec -it teachai-app /bin/sh

# View container resource usage
docker exec teachai-app cat /proc/meminfo
docker exec teachai-app cat /proc/cpuinfo

# Test API endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/rag/status

# MongoDB operations
docker exec -it teachai-mongodb mongosh teachai
```

### Environment Variables Reference

See `.env.docker.example` for complete configuration options including:
- AI service settings
- Database configuration  
- Resource optimization
- Security settings
- Monitoring options

### Support and Updates

```bash
# Update to latest version
git pull origin main
./deploy.sh build
./deploy.sh restart

# Check for system updates
sudo yum update -y  # CentOS
./deploy.sh health  # Verify after updates
```

This deployment setup provides a production-ready, resource-optimized TeachAI system that can run efficiently on your CentOS server constraints.