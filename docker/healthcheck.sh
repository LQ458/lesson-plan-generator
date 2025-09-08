#!/bin/bash
# TeachAI Health Check Script
# Validates both frontend and backend services

set -e

# Configuration
MAX_RETRIES=3
TIMEOUT=10
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# Logging function
log() {
    echo "[HEALTH] $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local service_name=$2
    local max_retries=${3:-$MAX_RETRIES}
    
    for i in $(seq 1 $max_retries); do
        if curl -f -s -m $TIMEOUT "$url" >/dev/null 2>&1; then
            log "✅ $service_name is healthy ($url)"
            return 0
        else
            if [ $i -lt $max_retries ]; then
                log "⚠️ $service_name check failed (attempt $i/$max_retries), retrying..."
                sleep 2
            fi
        fi
    done
    
    log "❌ $service_name is unhealthy ($url)"
    return 1
}

# Function to check system resources
check_resources() {
    local warnings=0
    
    # Memory check
    if [ -f /proc/meminfo ]; then
        AVAILABLE_RAM=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
        AVAILABLE_RAM_MB=$((AVAILABLE_RAM / 1024))
        
        if [ $AVAILABLE_RAM_MB -lt 512 ]; then
            log "⚠️ Low memory warning: ${AVAILABLE_RAM_MB}MB available"
            warnings=$((warnings + 1))
        else
            log "✅ Memory: ${AVAILABLE_RAM_MB}MB available"
        fi
    fi
    
    # Disk space check
    DISK_AVAILABLE=$(df /app 2>/dev/null | awk 'NR==2 {print $4}' || echo "unknown")
    if [ "$DISK_AVAILABLE" != "unknown" ]; then
        DISK_AVAILABLE_MB=$((DISK_AVAILABLE / 1024))
        
        if [ $DISK_AVAILABLE_MB -lt 1024 ]; then
            log "⚠️ Low disk space warning: ${DISK_AVAILABLE_MB}MB available"
            warnings=$((warnings + 1))
        else
            log "✅ Disk: ${DISK_AVAILABLE_MB}MB available"
        fi
    fi
    
    # CPU load check
    if [ -f /proc/loadavg ]; then
        LOAD_1MIN=$(awk '{print $1}' /proc/loadavg)
        CPU_COUNT=$(nproc)
        
        # Use bc for floating point comparison if available, otherwise use integer
        if command -v bc >/dev/null 2>&1; then
            if [ $(echo "$LOAD_1MIN > $CPU_COUNT * 2" | bc -l) -eq 1 ]; then
                log "⚠️ High CPU load warning: ${LOAD_1MIN} (${CPU_COUNT} cores)"
                warnings=$((warnings + 1))
            else
                log "✅ CPU load: ${LOAD_1MIN} (${CPU_COUNT} cores)"
            fi
        else
            # Simple integer comparison (load * 100 > cpu_count * 200)
            LOAD_INT=$(echo "$LOAD_1MIN * 100" | cut -d'.' -f1)
            CPU_THRESHOLD=$((CPU_COUNT * 200))
            
            if [ "${LOAD_INT:-0}" -gt $CPU_THRESHOLD ]; then
                log "⚠️ High CPU load warning: ${LOAD_1MIN} (${CPU_COUNT} cores)"
                warnings=$((warnings + 1))
            else
                log "✅ CPU load: ${LOAD_1MIN} (${CPU_COUNT} cores)"
            fi
        fi
    fi
    
    return $warnings
}

# Function to check RAG system
check_rag_system() {
    # Check if vector database exists and has reasonable size
    if [ -f "/app/data/vectors.db" ]; then
        DB_SIZE=$(du -sm /app/data/vectors.db 2>/dev/null | cut -f1 || echo "0")
        if [ "${DB_SIZE:-0}" -gt 0 ]; then
            log "✅ RAG database: ${DB_SIZE}MB"
        else
            log "⚠️ RAG database exists but appears empty"
            return 1
        fi
    else
        log "⚠️ RAG database not found (first run?)"
        return 1
    fi
    
    return 0
}

# Function to perform comprehensive health check
comprehensive_check() {
    local failures=0
    
    log "🏥 Starting comprehensive health check..."
    
    # Check backend service
    if ! check_endpoint "$BACKEND_URL/api/health" "Backend API"; then
        failures=$((failures + 1))
    fi
    
    # Check frontend service (if not running in API-only mode)
    if [ "${WEB_PORT:-3000}" != "0" ]; then
        if ! check_endpoint "$FRONTEND_URL" "Frontend"; then
            failures=$((failures + 1))
        fi
    fi
    
    # Check system resources
    check_resources
    resource_warnings=$?
    
    # Check RAG system
    if ! check_rag_system; then
        log "ℹ️ RAG system not ready (may be initializing)"
    fi
    
    # Additional backend-specific checks
    if check_endpoint "$BACKEND_URL/api/health" "Backend" 1; then
        # Check RAG endpoint if backend is running
        if check_endpoint "$BACKEND_URL/api/rag/status" "RAG Status" 1; then
            log "✅ RAG endpoint responsive"
        else
            log "⚠️ RAG endpoint not responsive"
            failures=$((failures + 1))
        fi
    fi
    
    # Summary
    if [ $failures -eq 0 ]; then
        if [ $resource_warnings -eq 0 ]; then
            log "🎉 All health checks passed"
            return 0
        else
            log "✅ Services healthy, but ${resource_warnings} resource warning(s)"
            return 0  # Don't fail on warnings
        fi
    else
        log "❌ Health check failed: ${failures} service(s) unhealthy"
        return 1
    fi
}

# Main health check execution
main() {
    case "${1:-full}" in
        "quick")
            log "🩺 Quick health check..."
            check_endpoint "$BACKEND_URL/api/health" "Backend API"
            ;;
        "backend")
            log "🩺 Backend health check..."
            check_endpoint "$BACKEND_URL/api/health" "Backend API"
            ;;
        "frontend")
            log "🩺 Frontend health check..."
            check_endpoint "$FRONTEND_URL" "Frontend"
            ;;
        "resources")
            log "🩺 Resource health check..."
            check_resources
            ;;
        "rag")
            log "🩺 RAG system health check..."
            check_rag_system
            ;;
        "full"|*)
            comprehensive_check
            ;;
    esac
}

# Execute main function
main "$@"