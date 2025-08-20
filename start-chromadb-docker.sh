#!/bin/bash
# Docker ChromaDB setup for CentOS 8

echo "🐳 Starting ChromaDB with Docker (CentOS 8 optimized)..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    
    # CentOS 8 Docker installation
    sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install docker-ce docker-ce-cli containerd.io -y
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo "✅ Docker installed and started"
fi

# Stop any existing ChromaDB container
docker stop chromadb-teachai 2>/dev/null || true
docker rm chromadb-teachai 2>/dev/null || true

# Create data directory
mkdir -p /www/wwwroot/lesson-plan-generator/chroma_docker_data

# Start ChromaDB with Docker
echo "🚀 Starting ChromaDB container..."
docker run -d \
  --name chromadb-teachai \
  -p 8000:8000 \
  -v /www/wwwroot/lesson-plan-generator/chroma_docker_data:/chroma/chroma \
  -e ANONYMIZED_TELEMETRY=False \
  -e ALLOW_RESET=True \
  chromadb/chroma:latest

echo "⏳ Waiting for ChromaDB to start..."
sleep 10

# Test connection
echo "🔍 Testing ChromaDB connection..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB v1 API available"
    curl -s http://localhost:8000/api/v1/heartbeat
elif curl -s http://localhost:8000/api/v2/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB v2 API available"
    curl -s http://localhost:8000/api/v2/heartbeat
else
    echo "❌ ChromaDB not responding"
    docker logs chromadb-teachai
    exit 1
fi

echo ""
echo "🎉 ChromaDB is ready!"
echo "📊 Container status:"
docker ps | grep chromadb-teachai