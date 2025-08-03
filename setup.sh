#!/bin/bash
set -e

echo "🚀 TeachAI One-Command Setup"
echo "============================"

# Check if we're in the right directory
if [ ! -f "deploy-all.sh" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

# Make sure deploy script is executable
chmod +x deploy-all.sh

# Run the comprehensive deployment
echo "🎯 Starting complete TeachAI deployment..."
./deploy-all.sh

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo "Your AI-powered lesson plan generator is ready!"
echo ""
echo "🌐 Access your app at: http://localhost:3002"
echo "🔧 API endpoint: http://localhost:3001"
echo ""
echo "📋 Quick commands:"
echo "  View status: docker-compose ps"
echo "  View logs: docker-compose logs -f"
echo "  Stop all: docker-compose down"
echo ""
echo "🎯 Features enabled:"
echo "  ✓ Direct streaming (60-75% faster responses)"
echo "  ✓ Chinese AI providers (Qwen + fallbacks)"
echo "  ✓ Educational RAG system with 400+ chunks"
echo "  ✓ MongoDB user management"
echo "  ✓ Full Docker deployment"