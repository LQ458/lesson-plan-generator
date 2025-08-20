# TeachAI CentOS 8 Production Deployment Guide

## Overview

This guide provides production deployment instructions for TeachAI on CentOS 8 cloud servers, based on 2024 ChromaDB best practices and RAG system research.

## ChromaDB Production Suitability

✅ **ChromaDB is ideal for TeachAI's production needs:**
- Small-to-medium production workloads (under 1M documents)
- TeachAI has 95,360+ educational chunks - perfect fit
- Open-source with good persistence and metadata support
- HTTP API suitable for production deployments

## Architecture Overview

```
TeachAI Production Stack:
├── Frontend: Next.js 15 (Port 3000)
├── Backend: Node.js Express (Port 3001)
├── Vector DB: ChromaDB HTTP Server (Port 8000)
├── Main DB: MongoDB
└── AI Service: Qwen LLM via OpenAI API
```

## CentOS 8 Deployment Steps

### 1. ChromaDB Server Setup

```bash
# Start ChromaDB with Docker (recommended for CentOS 8)
pnpm run chroma:start:centos

# Alternative: Python-based startup
pnpm run chroma:start
```

### 2. RAG Data Loading

```bash
# Production-optimized loader for CentOS 8
pnpm run rag:load

# Monitor loading progress (separate terminal)
pnpm run rag:progress:watch

# Check final status
pnpm run rag:status
```

### 3. Application Deployment

```bash
# Build production assets
pnpm run build

# Start production servers
pnpm run start
```

## Cleaned Up Script Architecture

**Essential Production Scripts (8 remaining):**
- `centos-rag-loader.js` - CentOS 8 optimized RAG loader with HTTP client
- `check-collection.js` - Production monitoring
- `monitor-loading-progress.js` - Live progress tracking
- `reset-chromadb.js` - Maintenance utility
- `run-accuracy-test.js` - Quality monitoring
- `ci-rag-test.js` - CI/CD integration
- `cloud-uploader.js` - ChromaDB Cloud deployment
- `initialize-vector-db.js` - Initial setup

**Removed Redundant Scripts (12 cleaned up):**
- Multiple redundant loaders (robust, optimized, simple, legacy)
- Debug scripts (debug-chromadb-api, debug-rag-matching)
- Redundant test scripts (6 different test files)
- Verification scripts (consolidated functionality)

## ChromaDB API v2 Configuration

**HTTP Client Features:**
- ✅ Tenant-Database-Collection hierarchy
- ✅ Production-ready error handling
- ✅ Batch processing optimization
- ✅ CentOS 8 compatibility

**API Endpoints:**
```
v2 Structure: /api/v2/tenants/{tenant}/databases/{database}/collections
Default Config: default_tenant/default_database/teachai_centos
```

## Production Requirements Checklist

### ✅ High Availability
- Docker containerization for ChromaDB
- Graceful shutdown handling
- Progress persistence and resume

### ✅ Security
- HTTPS recommended for production
- Authentication headers support
- Data validation and sanitization

### ✅ Observability
- Real-time progress monitoring
- Quality score tracking
- Performance metrics

### ✅ Backup & Recovery
- Progress file persistence
- Collection reset capability
- Data integrity verification

## Performance Optimizations

**CentOS 8 Specific:**
- Batch size: 50 (optimized for CentOS 8)
- Single-threaded processing for stability
- Memory-efficient chunking
- Network timeout handling

**Quality Filtering:**
- Minimum quality score: 0.3
- OCR confidence validation
- Content length thresholds
- Duplicate detection

## Commands Reference

```bash
# Core Production Commands
pnpm run chroma:start:centos    # Start ChromaDB Docker
pnpm run rag:load              # Load all RAG data
pnpm run rag:status            # Check system health
pnpm run start                 # Start production app

# Monitoring Commands
pnpm run rag:progress:watch    # Live progress monitoring
pnpm run test:rag-accuracy     # Quality testing
pnpm run test:rag-ci           # CI/CD testing

# Maintenance Commands
pnpm run rag:reset             # Reset ChromaDB
pnpm run chroma:stop:centos    # Stop ChromaDB
```

## Hardware Requirements

**Minimum for CentOS 8 Production:**
- CPU: 4+ cores (Intel/AMD x64)
- RAM: 8GB+ (for 95K+ chunks)
- Storage: 20GB+ SSD
- Network: Stable internet connection

## Troubleshooting

**Common CentOS 8 Issues:**
1. **GLIBC compatibility**: Use Docker deployment
2. **Node.js dependencies**: HTTP client bypasses native bindings
3. **Memory constraints**: Optimized batch sizes
4. **Network timeouts**: Retry logic implemented

## Next Steps

1. Deploy ChromaDB on your CentOS 8 server
2. Run the optimized RAG loader
3. Test the complete system
4. Monitor performance and quality metrics
5. Consider scaling strategies for growth

---

**Note**: This deployment is optimized for small-to-medium production workloads. For enterprise-scale deployments (1M+ documents), consider managed vector databases like Pinecone or Weaviate.