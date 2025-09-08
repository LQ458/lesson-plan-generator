#!/bin/bash
set -e

# TeachAI Docker Entrypoint Script
# Optimized for resource-constrained deployment

echo "🚀 Starting TeachAI RAG System..."

# Environment setup
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3001}
export WEB_PORT=${WEB_PORT:-3000}

# Create necessary directories
mkdir -p /app/data /app/logs /app/models /app/backups /app/server/simple-rag/data

# Set permissions
chown -R teachai:teachai /app/data /app/logs /app/models /app/backups

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check system resources
check_resources() {
    log "📊 System Resources Check:"
    
    # Memory check
    TOTAL_RAM=$(cat /proc/meminfo | grep MemTotal | awk '{print $2}')
    AVAILABLE_RAM=$(cat /proc/meminfo | grep MemAvailable | awk '{print $2}')
    TOTAL_RAM_GB=$((TOTAL_RAM / 1024 / 1024))
    AVAILABLE_RAM_GB=$((AVAILABLE_RAM / 1024 / 1024))
    
    log "   RAM: ${AVAILABLE_RAM_GB}GB available / ${TOTAL_RAM_GB}GB total"
    
    if [ $AVAILABLE_RAM_GB -lt 2 ]; then
        log "⚠️  Warning: Low available RAM (${AVAILABLE_RAM_GB}GB). Consider using ultra-lite embedding profile."
        export EMBEDDING_PROFILE=ultra-lite
    fi
    
    # CPU check
    CPU_COUNT=$(nproc)
    log "   CPU: ${CPU_COUNT} cores available"
    
    # Disk check
    DISK_AVAILABLE=$(df /app | awk 'NR==2 {print $4}')
    DISK_AVAILABLE_GB=$((DISK_AVAILABLE / 1024 / 1024))
    log "   Disk: ${DISK_AVAILABLE_GB}GB available"
    
    if [ $DISK_AVAILABLE_GB -lt 10 ]; then
        log "⚠️  Warning: Low disk space (${DISK_AVAILABLE_GB}GB). Consider cleanup."
    fi
}

# Function to initialize complete RAG system
init_rag() {
    log "🔧 Initializing Complete Self-Hosted RAG System..."
    
    # Check system memory and adjust embedding profile
    local available_ram_gb=8
    if [ -f /proc/meminfo ]; then
        local available_ram_kb=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
        available_ram_gb=$((available_ram_kb / 1024 / 1024))
    fi
    
    log "   Available RAM: ${available_ram_gb}GB"
    
    # Auto-adjust embedding profile based on memory
    case "${EMBEDDING_PROFILE:-auto}" in
        "auto")
            if [ $available_ram_gb -lt 3 ]; then
                export EMBEDDING_PROFILE=ultra-lite
            elif [ $available_ram_gb -lt 6 ]; then
                export EMBEDDING_PROFILE=balanced  
            else
                export EMBEDDING_PROFILE=quality
            fi
            log "   Auto-selected embedding profile: ${EMBEDDING_PROFILE}"
            ;;
        "ultra-lite")
            log "   Using ultra-lite embedding profile (~90MB memory)"
            ;;
        "balanced")
            log "   Using balanced embedding profile (~420MB memory)"
            ;;
        "quality")
            log "   Using quality embedding profile (~1.2GB memory)"
            ;;
        *)
            log "   Unknown profile, defaulting to balanced"
            export EMBEDDING_PROFILE=balanced
            ;;
    esac
    
    # Check if vector database exists
    if [ ! -f "/app/data/vectors.db" ]; then
        log "   Vector database not found"
        
        # Check if RAG data exists for initial loading
        if [ -d "/app/server/rag_data/chunks" ] && [ "$(ls -A /app/server/rag_data/chunks)" ]; then
            RAG_FILE_COUNT=$(find /app/server/rag_data/chunks -name "*.json" | wc -l)
            RAG_SIZE=$(du -sh /app/server/rag_data/chunks | cut -f1)
            log "   Found ${RAG_FILE_COUNT} RAG files (${RAG_SIZE}) for loading"
            log "   📚 This will take 15-30 minutes to process all educational materials"
            export INIT_LOAD_RAG=true
            export RAG_AUTO_SETUP=true
        else
            log "   No RAG data found. System will run without initial data."
        fi
    else
        local db_size=$(du -sh /app/data/vectors.db | cut -f1)
        log "   Vector database exists: ${db_size}"
        
        # Quick verification that database has content
        if command -v sqlite3 >/dev/null 2>&1; then
            local vector_count=$(sqlite3 /app/data/vectors.db "SELECT COUNT(*) FROM educational_vectors;" 2>/dev/null || echo "0")
            if [ "$vector_count" -gt 1000 ]; then
                log "   ✅ Database contains ${vector_count} vectors"
            else
                log "   ⚠️  Database exists but appears empty, may need reloading"
            fi
        fi
    fi
    
    # Check embedding models
    if [ -d "/app/models/${EMBEDDING_PROFILE}" ]; then
        local model_size=$(du -sh "/app/models/${EMBEDDING_PROFILE}" | cut -f1)
        log "   ✅ Embedding model ready: ${model_size}"
    else
        log "   📥 Embedding model will be downloaded on first use"
    fi
}

# Function to wait for dependencies
wait_for_deps() {
    log "⏳ Waiting for dependencies..."
    
    # Wait for MongoDB if using it
    if [ -n "${MONGODB_URI}" ]; then
        log "   Waiting for MongoDB..."
        until node -e "
            const { MongoClient } = require('mongodb');
            const client = new MongoClient('${MONGODB_URI}');
            client.connect()
                .then(() => { console.log('MongoDB ready'); client.close(); process.exit(0); })
                .catch(() => process.exit(1));
        " 2>/dev/null; do
            log "   MongoDB not ready, retrying in 5 seconds..."
            sleep 5
        done
        log "   ✅ MongoDB ready"
    fi
}

# Function to start the application
start_app() {
    log "🎯 Starting TeachAI Application..."
    
    case "${1:-start}" in
        "server")
            log "   Starting server only..."
            cd /app/server && node server.js
            ;;
        "web")
            log "   Starting web frontend only..."
            cd /app/web && npm start
            ;;
        "start"|*)
            log "   Starting full stack application..."
            
            # Start server in background
            cd /app/server && node server.js &
            SERVER_PID=$!
            
            # Start web frontend
            cd /app/web && npm start &
            WEB_PID=$!
            
            # Wait for either process to exit
            wait $SERVER_PID $WEB_PID
            ;;
    esac
}

# Function to handle shutdown
graceful_shutdown() {
    log "🛑 Graceful shutdown initiated..."
    
    if [ -n "$SERVER_PID" ]; then
        log "   Stopping server (PID: $SERVER_PID)..."
        kill -TERM $SERVER_PID 2>/dev/null || true
    fi
    
    if [ -n "$WEB_PID" ]; then
        log "   Stopping web frontend (PID: $WEB_PID)..."
        kill -TERM $WEB_PID 2>/dev/null || true
    fi
    
    # Wait a bit for graceful shutdown
    sleep 5
    
    log "   Cleanup completed"
    exit 0
}

# Set up signal handlers
trap graceful_shutdown SIGTERM SIGINT

# Main execution
main() {
    log "🏁 TeachAI Docker Container Starting"
    
    # System checks
    check_resources
    
    # Initialize RAG system
    init_rag
    
    # Wait for dependencies
    wait_for_deps
    
    # Start application
    start_app "$@"
}

# Run main function with all arguments
main "$@"