#!/bin/bash
# TeachAI Docker Deployment Script
# Optimized for CentOS servers with 4-core CPU, 8GB RAM, 100GB storage

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="teachai"
IMAGE_NAME="teachai:latest"
DATA_DIR="${DATA_DIR:-./docker-data}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check system requirements
check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check available RAM
    if command -v free &> /dev/null; then
        TOTAL_RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
        if [ "$TOTAL_RAM_GB" -lt 6 ]; then
            log_warning "Available RAM (${TOTAL_RAM_GB}GB) is below recommended 8GB"
        else
            log_success "RAM check passed: ${TOTAL_RAM_GB}GB available"
        fi
    fi
    
    # Check available disk space
    AVAILABLE_SPACE_GB=$(df -BG "$SCRIPT_DIR" | awk 'NR==2 {gsub(/G/, "", $4); print $4}')
    if [ "$AVAILABLE_SPACE_GB" -lt 20 ]; then
        log_error "Insufficient disk space. Available: ${AVAILABLE_SPACE_GB}GB, Required: 20GB+"
        exit 1
    else
        log_success "Disk space check passed: ${AVAILABLE_SPACE_GB}GB available"
    fi
    
    # Check CPU cores
    CPU_CORES=$(nproc)
    if [ "$CPU_CORES" -lt 2 ]; then
        log_warning "CPU cores (${CPU_CORES}) below recommended 4 cores"
    else
        log_success "CPU check passed: ${CPU_CORES} cores available"
    fi
}

# Function to check Docker installation
check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        log_info "For CentOS: sudo yum install -y docker-ce docker-ce-cli containerd.io"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker service."
        log_info "For CentOS: sudo systemctl start docker && sudo systemctl enable docker"
        exit 1
    fi
    
    log_success "Docker is properly installed and running"
}

# Function to setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    # Create data directories
    mkdir -p "$DATA_DIR"/{teachai_data,teachai_logs,teachai_models,teachai_backups,mongodb_data,mongodb_config}
    
    # Set proper permissions
    if [ "$EUID" -eq 0 ]; then
        chown -R 1001:1001 "$DATA_DIR"
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        if [ -f ".env.docker.example" ]; then
            log_info "Creating .env from template..."
            cp ".env.docker.example" ".env"
            log_warning "Please edit .env file with your configuration before proceeding"
            exit 1
        else
            log_error ".env file not found. Please create one based on .env.docker.example"
            exit 1
        fi
    fi
    
    log_success "Environment setup completed"
}

# Function to pull/build images
build_images() {
    local build_type="$1"
    log_info "Building Docker images..."
    
    case "$build_type" in
        "complete")
            log_info "Building complete self-hosted system (includes RAG data + models)..."
            log_info "This will take 15-30 minutes but includes everything needed..."
            docker build -f Dockerfile.complete -t "$IMAGE_NAME" . || {
                log_error "Failed to build complete Docker image"
                exit 1
            }
            ;;
        "fast")
            log_info "Using fast build (minimal dependencies)..."
            docker build -f Dockerfile.fast -t "$IMAGE_NAME" . || {
                log_error "Failed to build Docker image (fast)"
                exit 1
            }
            ;;
        *)
            # Auto-select build type based on requirements
            if [ -d "server/rag_data/chunks" ] && [ "$(find server/rag_data/chunks -name '*.json' | wc -l)" -gt 1000 ]; then
                log_info "RAG data detected, using complete build..."
                docker build -f Dockerfile.complete -t "$IMAGE_NAME" . || {
                    log_warning "Complete build failed, trying fast build..."
                    docker build -f Dockerfile.fast -t "$IMAGE_NAME" . || {
                        log_error "All builds failed"
                        exit 1
                    }
                }
            else
                log_info "No RAG data detected, using fast build..."
                docker build -f Dockerfile.fast -t "$IMAGE_NAME" . || {
                    log_error "Fast build failed"
                    exit 1
                }
            fi
            ;;
    esac
    
    log_success "Docker image built successfully"
}

# Function to start services
start_services() {
    local profile="$1"
    log_info "Starting TeachAI services..."
    
    case "$profile" in
        "production")
            docker-compose --profile production up -d
            ;;
        "monitoring")
            docker-compose --profile monitoring up -d
            ;;
        "full")
            docker-compose --profile production --profile monitoring up -d
            ;;
        *)
            docker-compose up -d
            ;;
    esac
    
    log_success "Services started successfully"
}

# Function to stop services
stop_services() {
    log_info "Stopping TeachAI services..."
    
    docker-compose down
    
    log_success "Services stopped successfully"
}

# Function to show service status
show_status() {
    log_info "Service Status:"
    docker-compose ps
    
    echo
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker-compose ps -q) 2>/dev/null || true
}

# Function to show logs
show_logs() {
    local service="$1"
    local lines="${2:-100}"
    
    if [ -n "$service" ]; then
        docker-compose logs --tail="$lines" -f "$service"
    else
        docker-compose logs --tail="$lines" -f
    fi
}

# Function to perform health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for services to be ready
    sleep 10
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Some services are not running"
        docker-compose ps
        return 1
    fi
    
    # Check application health endpoints
    local max_retries=30
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f -s http://localhost:3001/api/health > /dev/null; then
            log_success "Backend service is healthy"
            break
        fi
        
        retry_count=$((retry_count + 1))
        log_info "Waiting for backend service... (${retry_count}/${max_retries})"
        sleep 5
    done
    
    if [ $retry_count -eq $max_retries ]; then
        log_error "Backend service health check failed"
        return 1
    fi
    
    # Check frontend if enabled
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend service is healthy"
    else
        log_warning "Frontend service check failed (may be disabled)"
    fi
    
    log_success "Health check completed successfully"
}

# Function to backup data
backup_data() {
    local backup_name="teachai-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="./backups/$backup_name"
    
    log_info "Creating backup: $backup_name"
    
    mkdir -p "$backup_dir"
    
    # Backup application data
    if [ -d "$DATA_DIR" ]; then
        cp -r "$DATA_DIR" "$backup_dir/"
    fi
    
    # Backup MongoDB (if running)
    if docker-compose ps mongodb | grep -q "Up"; then
        log_info "Backing up MongoDB..."
        docker-compose exec -T mongodb mongodump --db teachai --archive > "$backup_dir/mongodb-dump.archive" || {
            log_warning "MongoDB backup failed"
        }
    fi
    
    # Create archive
    tar -czf "${backup_dir}.tar.gz" -C "./backups" "$backup_name"
    rm -rf "$backup_dir"
    
    log_success "Backup created: ${backup_dir}.tar.gz"
}

# Function to restore from backup
restore_data() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring from backup: $backup_file"
    
    # Stop services
    stop_services
    
    # Extract backup
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Restore data
    local backup_name=$(basename "$backup_file" .tar.gz)
    if [ -d "$temp_dir/$backup_name/docker-data" ]; then
        cp -r "$temp_dir/$backup_name/docker-data"/* "$DATA_DIR/"
    fi
    
    # Restore MongoDB
    if [ -f "$temp_dir/$backup_name/mongodb-dump.archive" ]; then
        log_info "Restoring MongoDB..."
        start_services
        sleep 10
        docker-compose exec -T mongodb mongorestore --db teachai --archive < "$temp_dir/$backup_name/mongodb-dump.archive"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "Restore completed successfully"
}

# Function to display help
show_help() {
    cat << EOF
TeachAI Docker Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    setup           - Setup environment and check requirements
    build [TYPE]    - Build Docker images
                      complete: Full system with RAG data + models (15-30 min)
                      fast:     Quick build minimal dependencies (2-5 min)
                      (auto):   Auto-select based on available data
    start [PROFILE] - Start services (profiles: production, monitoring, full)
    stop            - Stop all services
    restart         - Restart all services
    status          - Show service status and resource usage
    logs [SERVICE]  - Show logs (optional service name)
    health          - Perform health check
    backup          - Create data backup
    restore FILE    - Restore from backup file
    clean           - Clean up stopped containers and unused images
    help            - Show this help message

Profiles:
    default         - Core services (teachai + mongodb)
    production      - Core services + nginx reverse proxy
    monitoring      - Core services + system monitoring
    full            - All services (production + monitoring)

Examples:
    $0 setup                    # Initial setup
    $0 build complete           # Complete self-hosted build (recommended)
    $0 build fast               # Quick build (minimal dependencies)
    $0 start                    # Auto-detect and start services
    $0 start production         # Start with nginx proxy
    $0 logs teachai             # Show teachai service logs
    $0 health                   # Check all system components
    $0 backup                   # Create backup
    $0 restore backup.tar.gz    # Restore from backup

Environment:
    Edit .env file to configure API keys and settings.
    See .env.docker.example for available options.

EOF
}

# Main execution
main() {
    case "${1:-help}" in
        "setup")
            check_system_requirements
            check_docker
            setup_environment
            ;;
        "build")
            check_docker
            build_images "$2"
            ;;
        "start")
            check_docker
            setup_environment
            
            # Check if image exists, skip build if it does
            if ! docker images | grep -q "teachai.*latest"; then
                build_images
            else
                log_info "Using existing teachai:latest image"
            fi
            
            start_services "$2"
            health_check
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            start_services "$2"
            health_check
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2" "$3"
            ;;
        "health")
            health_check
            ;;
        "backup")
            backup_data
            ;;
        "restore")
            if [ -z "$2" ]; then
                log_error "Please specify backup file to restore from"
                exit 1
            fi
            restore_data "$2"
            ;;
        "clean")
            log_info "Cleaning up Docker resources..."
            docker system prune -f
            docker volume prune -f
            log_success "Cleanup completed"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Execute main function with all arguments
main "$@"