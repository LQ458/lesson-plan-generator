#!/bin/bash
# Python ChromaDB runner for older Linux systems

echo "🐍 Starting ChromaDB with Python..."

# Check if Python and pip are installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi

# Install ChromaDB if not present
if ! python3 -c "import chromadb" 2>/dev/null; then
    echo "📦 Installing ChromaDB Python package..."
    pip3 install chromadb --user
fi

# Start ChromaDB server
echo "🚀 Starting ChromaDB server on port 8000..."
python3 -c "
import chromadb
from chromadb.config import Settings
import uvicorn
from chromadb.server.fastapi import app

# Configure ChromaDB
settings = Settings(
    chroma_server_host='0.0.0.0',
    chroma_server_http_port=8000,
    persist_directory='./chroma_db',
    allow_reset=True
)

# Start server
print('✅ ChromaDB server starting on http://localhost:8000')
uvicorn.run(app, host='0.0.0.0', port=8000)
"