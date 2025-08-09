# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TeachAI is a full-stack AI-powered lesson plan generator with RAG (Retrieval-Augmented Generation) system. It consists of:

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Backend**: Node.js Express server with MongoDB
- **RAG System**: ChromaDB vector database with 95,360+ enhanced educational chunks
- **AI Service**: Integration with Qwen LLM via OpenAI-compatible API

## Common Development Commands

### Building and Running

```bash
# Install all dependencies
pnpm run install:all

# Development mode (frontend + backend)
pnpm dev

# Full development mode (with ChromaDB)
pnpm run dev:full

# Build entire project
pnpm build

# Production start
pnpm start
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run server tests only
pnpm run test:server

# Run web tests only
pnpm run test:web

# Run single test file
cd web && pnpm test -- --testPathPattern=page.test.tsx
cd server && pnpm test -- --testPathPattern=ai-service.test.js
```

### Linting and Type Checking

```bash
# Run linter (web only)
pnpm lint

# Type check (web)
cd web && pnpm type-check

# Format code
pnpm format
```

### RAG System Management

#### Local Development (ChromaDB)

```bash
# Start ChromaDB service
pnpm run chroma:start

# Stop ChromaDB service
pnpm run chroma:stop

# Load enhanced educational materials (optimized with breakpoint resume)
pnpm run rag:load

# Monitor loading progress (live updates)
pnpm run rag:progress:watch

# Check current loading progress
pnpm run rag:progress

# Verify loaded data integrity and performance
pnpm run rag:verify

# Check RAG system status and data quality metrics
pnpm run rag:status

# Run comprehensive RAG system tests
pnpm run rag:test

# Test RAG accuracy with quality scoring
pnpm run rag:test-accuracy

# One-time RAG setup with enhanced data
pnpm run setup:rag

# Legacy loader (for compatibility)
pnpm run rag:load:legacy
```

#### ChromaDB Cloud Production

```bash
# Upload all RAG data to ChromaDB Cloud
node server/rag/scripts/cloud-uploader.js

# Upload specific file to cloud
node server/rag/scripts/cloud-uploader.js "server/rag_data/chunks/specific-file.json"

# Test environment configuration
node test-env-config.js

# Retry failed uploads
node simple-retry.js

# Clean up unnecessary cloud collections
node server/rag/scripts/upload-to-cloud.js --cleanup

# List cloud collections
node -e "
const uploader = require('./server/rag/scripts/cloud-uploader');
const u = new uploader();
u.initialize().then(() => u.listCloudCollections()).then(console.log);
"
```

## Architecture Overview

### Monorepo Structure

- **Root**: Workspace configuration with shared scripts
- **web/**: Next.js frontend application
- **server/**: Express.js backend with RAG system
- **server/rag_data/**: Enhanced educational materials with quality scoring (95,360+ chunks)
- **server/rag/**: RAG system implementation

### Key Components

#### RAG System (`server/rag/`)

- **vector-store.js**: ChromaDB integration service
- **text-processor.js**: Document chunking and processing
- **scripts/**: Database management and testing utilities
- **config/**: Vector database configuration

#### AI Service (`server/ai-service.js`)

- Qwen LLM integration via OpenAI-compatible API
- RAG-enhanced content generation
- Request logging and monitoring
- Streaming response support

#### Frontend Features (`web/src/`)

- **lesson-plan/**: Main lesson plan generation interface
- **exercises/**: Exercise generation functionality
- **my-content/**: User content management
- **components/**: Reusable UI components including streaming markdown renderer

### Data Flow

1. User request → Frontend (Next.js)
2. API call → Backend (Express)
3. Vector search → ChromaDB (RAG)
4. AI generation → Qwen LLM
5. Streaming response → Frontend display

## Development Workflow

### Setting Up Development Environment

1. Run `pnpm run install:all` to install dependencies
2. Copy `server/.env.example` to `server/.env` and configure API keys
3. Start ChromaDB: `pnpm run chroma:start`
4. Load enhanced educational data: `pnpm run rag:load` (loads 95,360+ quality-scored chunks)
5. Verify RAG system: `pnpm run rag:status`
6. Start development: `pnpm run dev:full`

### Running Tests

- Always run tests before committing
- Use `pnpm test:coverage` to check coverage
- Individual test files can be run with Jest patterns

### Code Quality

- Frontend uses TypeScript strict mode
- ESLint configured for Next.js
- Prettier for code formatting
- Run `pnpm lint` and `pnpm type-check` before commits

## Key Files to Understand

### Server Architecture

- `server/server.js`: Main Express server entry point
- `server/ai-service.js`: AI service with RAG integration
- `server/rag/services/vector-store.js`: ChromaDB vector operations
- `server/middleware/auth.js`: Authentication middleware

### Frontend Architecture

- `web/src/app/layout.tsx`: Root layout with theme provider
- `web/src/app/lesson-plan/page.tsx`: Main lesson plan interface
- `web/src/components/streaming-markdown.tsx`: Real-time content display
- `web/src/components/lesson-plan-generator.tsx`: Core generation logic

### Configuration

- `pnpm-workspace.yaml`: Monorepo workspace configuration
- `jest.config.js`: Test configuration (root, web, server)
- `server/rag/config/vector-db-config.js`: RAG system settings

## Environment Variables

### Required for Development

```bash
# Server (.env)
DASHSCOPE_API_KEY=your_qwen_api_key
MONGODB_URI=mongodb://localhost:27017/teachai
JWT_SECRET=your_jwt_secret
PORT=3001

# Optional
QWEN_MODEL=qwen-plus
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

### ChromaDB Cloud Production Configuration

```bash
# ChromaDB Cloud Configuration (Production)
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_chromadb_cloud_api_key
CHROMADB_TENANT=your_tenant_id
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main

# Production Environment
NODE_ENV=production

# Optional ChromaDB Cloud Settings
CHROMADB_BATCH_SIZE=50
CHROMADB_TIMEOUT=30000
RAG_MIN_QUALITY_SCORE=0.3
RAG_MAX_CONTEXT_TOKENS=4000
```

## Educational Materials

The RAG system uses 95,360+ enhanced educational materials in `server/rag_data/chunks/`:

### Data Characteristics
- **Format**: JSON files with enhanced chunked content and metadata
- **Volume**: 95,360 chunks from 4,557 processed files  
- **Coverage**: Comprehensive K-12 curriculum (Grades 1-12), multiple subjects
- **Publishers**: People's Education Press, Beijing Normal University, Qingdao Press, etc.
- **Quality Control**: Advanced preprocessing with quality scoring and OCR correction

### Enhancement Features (Version 2.0)
- **OCR Error Correction**: Improved text accuracy for Chinese educational content
- **Duplicate Detection**: Advanced algorithms to identify and merge similar content
- **Quality Scoring**: Each chunk includes reliability metrics and coherence scores
- **Content Classification**: Semantic features like formulas, experiments, definitions
- **Boilerplate Removal**: Automatic filtering of non-educational content
- **Smart Chunking**: Optimized text segmentation for better retrieval

### Data Structure
Each chunk includes:
- **content**: Enhanced, corrected educational text
- **metadata**: Rich metadata including quality metrics, OCR confidence, source info
- **qualityScore**: Numerical score indicating content reliability (0.3-1.0 scale)
- **semanticFeatures**: Classification of content type (formulas, questions, definitions)
- **enhancementVersion**: Version tracking for quality improvements

### Optimized Loading System (v2.0)
The RAG system now features an advanced loading pipeline with enterprise-grade capabilities:

#### **Breakpoint Resume Functionality**
- **Progress Tracking**: Automatic progress saving every few batches
- **Resume Capability**: Interrupted loads can resume from the last checkpoint
- **Signal Handling**: Graceful shutdown with progress preservation on Ctrl+C
- **Progress File**: Stored in `server/rag/data/loading-progress.json`

#### **Performance Optimizations**
- **Optimal Batch Size**: Uses ChromaDB's maximum batch size (166) for fastest insertion
- **Concurrent Processing**: Processes multiple files simultaneously (3 concurrent files)
- **Smart Chunking**: Optimized batch processing to minimize database operations
- **Memory Efficiency**: Processes large datasets without memory overflow

#### **Data Quality & Cleanup**
- **Quality Filtering**: Automatic filtering of low-quality chunks (< 0.3 threshold)
- **Old Data Cleanup**: Automatically removes and backs up legacy `optimized/` data
- **Collection Reset**: Cleans and recreates ChromaDB collection for optimal performance
- **Metadata Enhancement**: Rich metadata with OCR confidence and semantic features

#### **Monitoring & Verification**
- **Live Progress Monitoring**: Real-time progress tracking with ETA calculations
- **Performance Metrics**: Insertion speed tracking and optimization
- **Data Integrity Verification**: Post-load validation of embeddings and metadata
- **Search Function Testing**: Automated testing of retrieval functionality

#### **Usage Commands**
```bash
# Start optimized loading (with resume support)
pnpm run rag:load

# Monitor progress in real-time
pnpm run rag:progress:watch

# Verify data quality after loading
pnpm run rag:verify
```

## RAG System Best Practices

### Quality-Driven Retrieval
The system implements 2024 best practices for production RAG systems:

- **Hybrid Search**: Combines semantic similarity with quality scoring for optimal results
- **Quality Filtering**: Uses reliability thresholds (minimum 0.3) to ensure content accuracy  
- **Reranking**: Secondary ranking based on OCR confidence and coherence scores
- **Semantic Classification**: Content categorization for targeted retrieval

### Production Considerations
- **Hallucination Mitigation**: Quality scores help identify unreliable content
- **Dynamic Updates**: Enhancement version tracking enables iterative improvements
- **Educational Context**: Specialized preprocessing for Chinese educational materials
- **Scalable Architecture**: Batch processing supports large-scale educational datasets

### Performance Monitoring
- Track retrieval accuracy through automated testing
- Monitor quality score distributions across subjects
- Evaluate OCR confidence levels for content reliability
- Assess enhancement effectiveness through version comparisons

## Testing Strategy

### Unit Tests

- Component tests in `web/src/components/__tests__/`
- Service tests in `server/__tests__/`
- RAG system tests in `server/rag/tests/`

### Integration Tests

- API endpoint tests with supertest
- RAG system integration tests
- End-to-end tests in `e2e/`

### Test Commands

```bash
# Run specific test suites
pnpm test -- --testPathPattern=vector-store
pnpm test -- --testPathPattern=ai-service
pnpm test -- --testPathPattern=components
```

## Deployment

### Local Development Deployment

```bash
pnpm build
pnpm start
```

### ChromaDB Cloud Production Deployment

For production deployment with ChromaDB Cloud, see the comprehensive [Production Deployment Guide](PRODUCTION-DEPLOYMENT.md).

#### Quick Start for ChromaDB Cloud

1. **Set Environment Variables:**
```bash
export CHROMA_CLOUD_ENABLED=true
export CHROMADB_API_KEY=your_chromadb_api_key
export CHROMADB_TENANT=your_tenant_id
export CHROMADB_DATABASE=teachai
export CHROMADB_COLLECTION=teachai_main
```

2. **Test Configuration:**
```bash
node test-env-config.js
```

3. **Upload RAG Data to Cloud:**
```bash
node server/rag/scripts/cloud-uploader.js
```

4. **Deploy Application:**
```bash
NODE_ENV=production pnpm build && pnpm start
```

### Local ChromaDB Production

- Ensure ChromaDB service is running
- Educational materials must be loaded before first use
- Monitor vector database performance

### Environment Setup

- Configure production environment variables
- Set up MongoDB connection (local or cloud)
- Configure reverse proxy for frontend/backend
- For ChromaDB Cloud: Set cloud-specific environment variables
