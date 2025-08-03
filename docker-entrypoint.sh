#!/bin/sh
set -e

echo "🚀 Starting TeachAI with integrated RAG loading..."

# Function to check if ChromaDB is ready
wait_for_chroma() {
    echo "⏳ Waiting for ChromaDB to be ready..."
    while ! node -e "
        fetch('http://chroma:8000/api/v1/heartbeat')
            .then(() => { console.log('✅ ChromaDB ready'); process.exit(0); })
            .catch(() => { console.log('⏳ ChromaDB not ready, retrying...'); process.exit(1); })
    " 2>/dev/null; do
        sleep 2
    done
}

# Function to check if MongoDB is ready
wait_for_mongodb() {
    echo "⏳ Waiting for MongoDB to be ready..."
    while ! node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/teachai', {serverSelectionTimeoutMS: 5000})
            .then(() => { console.log('✅ MongoDB ready'); mongoose.disconnect(); process.exit(0); })
            .catch(() => { console.log('⏳ MongoDB not ready, retrying...'); process.exit(1); })
    " 2>/dev/null; do
        sleep 2
    done
}

# Function to load RAG data if needed
load_rag_data() {
    echo "🔍 Checking RAG data status..."
    
    # Check if collection exists and has data
    if node -e "
        const { ChromaClient } = require('chromadb');
        const client = new ChromaClient({ path: 'http://chroma:8000' });
        client.getCollection({ name: 'lesson_materials' })
            .then(collection => collection.count())
            .then(count => {
                console.log(\`📊 Found \${count} existing chunks\`);
                if (count > 1000) {
                    console.log('✅ RAG data already loaded, skipping...');
                    process.exit(0);
                } else {
                    console.log('📥 Loading RAG data...');
                    process.exit(1);
                }
            })
            .catch(() => {
                console.log('📥 No existing collection, loading RAG data...');
                process.exit(1);
            })
    " 2>/dev/null; then
        echo "✅ RAG data already present"
    else
        echo "📥 Loading RAG data from embedded dataset..."
        if [ -d "/app/server/rag_data/chunks" ]; then
            echo "🚀 Starting robust RAG data loading (this may take 30-60 minutes)..."
            cd /app/server && CHROMA_HOST=chroma CHROMA_PORT=8000 node rag/scripts/robust-rag-loader.js &
            RAG_PID=$!
            
            # Wait a bit to see if loading starts successfully
            sleep 10
            if kill -0 $RAG_PID 2>/dev/null; then
                echo "✅ RAG loading started successfully in background (PID: $RAG_PID)"
                echo "📊 Progress can be monitored in container logs"
                echo "🚀 Starting application while RAG data loads..."
            else
                echo "❌ RAG loading failed to start, continuing without RAG data"
            fi
        else
            echo "⚠️  RAG data directory not found, starting without RAG data"
            echo "💡 To add RAG data: mount volume with data or use 'docker cp' to copy data"
        fi
    fi
}

# Function to start the application
start_application() {
    echo "🚀 Starting TeachAI application..."
    
    # Start server in background
    cd /app/server && PORT=3001 pnpm start &
    SERVER_PID=$!
    
    # Start web frontend in background  
    cd /app/web && PORT=3002 pnpm start &
    WEB_PID=$!
    
    # Wait for both processes
    wait $SERVER_PID $WEB_PID
}

# Main execution flow
main() {
    echo "🐳 TeachAI Docker Container Starting..."
    echo "=================================="
    
    # Wait for dependencies
    wait_for_mongodb
    wait_for_chroma
    
    # Load RAG data if needed
    load_rag_data
    
    # Start application
    start_application
}

# Handle shutdown signals
cleanup() {
    echo "🛑 Shutting down TeachAI..."
    kill $SERVER_PID $WEB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Run main function
main