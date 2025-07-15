# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TeachAI is a full-stack AI-powered lesson plan generator with RAG (Retrieval-Augmented Generation) system. It consists of:

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Backend**: Node.js Express server with MongoDB
- **RAG System**: ChromaDB vector database with 6,805+ educational materials
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

```bash
# Start ChromaDB service
pnpm run chroma:start

# Stop ChromaDB service
pnpm run chroma:stop

# Load educational materials into vector database
pnpm run rag:load

# Check RAG system status
pnpm run rag:status

# One-time RAG setup
pnpm run setup:rag
```

## Architecture Overview

### Monorepo Structure

- **Root**: Workspace configuration with shared scripts
- **web/**: Next.js frontend application
- **server/**: Express.js backend with RAG system
- **server/optimized/**: Pre-processed educational materials (6,805+ chunks)
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
4. Load educational data: `pnpm run rag:load`
5. Start development: `pnpm run dev:full`

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

## Educational Materials

The RAG system uses 6,805+ pre-processed educational materials in `server/optimized/`:

- Format: JSON files with chunked content
- Coverage: Grades 1-12, multiple subjects
- Textbook versions: People's Education Press, Beijing Normal University, etc.
- Automatic loading via `pnpm run rag:load`

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

## Deployment Considerations

### Production Build

```bash
pnpm build
pnpm start
```

### ChromaDB Production

- Ensure ChromaDB service is running
- Educational materials must be loaded before first use
- Monitor vector database performance

### Environment Setup

- Configure production environment variables
- Set up MongoDB connection
- Configure reverse proxy for frontend/backend
