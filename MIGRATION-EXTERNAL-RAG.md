# Migration to External RAG Service

## Overview

The TeachAI application has been migrated from local ChromaDB to external HuggingFace RAG service, simplifying local development setup.

## Changes Made

### 📦 Package Scripts Updated

**Before:**
```bash
pnpm run dev:full        # Started ChromaDB + server + web
pnpm run chroma:start    # Started local ChromaDB
pnpm run rag:load        # Loaded educational data locally
pnpm run rag:status      # Checked local RAG status
```

**After:**
```bash
pnpm dev                 # Starts server + web (no ChromaDB needed)
pnpm run chroma:start    # Shows info message about external service
pnpm run rag:load        # Shows info message about external service
pnpm run rag:status      # Shows info message about external service
```

### 🔧 Development Setup Simplified

**Before:**
1. Install dependencies
2. Configure environment variables
3. Start ChromaDB service
4. Load RAG data (95,360+ chunks)
5. Verify RAG system
6. Start development

**After:**
1. Install dependencies
2. Configure environment variables
3. Start development with `pnpm dev`

### 🌐 External RAG Configuration

The system now uses HuggingFace Spaces for RAG functionality:

- **Service URL**: `https://lq458-teachai.hf.space`
- **Authentication**: Via `RAG_SERVICE_TOKEN` environment variable
- **Educational Data**: 95,360+ enhanced chunks hosted externally
- **No local setup**: ChromaDB, vector loading, and data management handled externally

### 📝 Environment Variables Required

```bash
# server/.env
RAG_SERVICE_URL=https://lq458-teachai.hf.space
RAG_SERVICE_TOKEN=hf_your_token_here
DASHSCOPE_API_KEY=sk_your_key_here
JWT_SECRET=your_jwt_secret_here
```

### ⚡ Benefits

1. **Faster Setup**: No ChromaDB installation or data loading
2. **Reduced Complexity**: Fewer moving parts in local development
3. **Consistent Data**: All developers use the same RAG dataset
4. **Better Performance**: Optimized external RAG service
5. **Easier Deployment**: No vector database deployment needed

### 🔄 Backward Compatibility

All old commands still work but show helpful informational messages:
- Commands like `pnpm run chroma:start` display guidance
- Documentation updated with new workflow
- Migration is transparent to users

### 🚀 Next Steps

1. Developers should use `pnpm dev` for local development
2. Update local `.env` files with HuggingFace token
3. Remove any local ChromaDB installations (optional cleanup)
4. Use standard `pnpm build` and `pnpm start` commands

This migration significantly simplifies the development workflow while maintaining all RAG functionality through the external service.