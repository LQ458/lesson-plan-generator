#!/usr/bin/env python3
"""
TeachAI Standalone RAG Service
Optimized for Hugging Face Spaces deployment
Handles 95,360+ educational chunks with Chinese language support
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import tempfile
import shutil

import gradio as gr
import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import requests
import zipfile

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TeachAIRAGService:
    def __init__(self):
        self.model = None
        self.chroma_client = None
        self.collection = None
        self.is_initialized = False
        self.stats = {
            'total_chunks': 0,
            'subjects': {},
            'grades': {},
            'books': {}
        }
    
    async def initialize(self):
        """Initialize the RAG service with embedding model and vector database"""
        try:
            logger.info("🚀 Initializing TeachAI RAG Service...")
            
            # Initialize embedding model (optimized for Chinese)
            logger.info("📥 Loading embedding model...")
            self.model = SentenceTransformer(
                'paraphrase-multilingual-MiniLM-L12-v2',
                device='cpu'
            )
            logger.info("✅ Embedding model loaded")
            
            # Initialize ChromaDB
            logger.info("📊 Setting up vector database...")
            self.chroma_client = chromadb.Client(Settings(
                anonymized_telemetry=False,
                allow_reset=True
            ))
            
            # Create or get collection
            try:
                self.collection = self.chroma_client.get_collection("teachai_educational")
                logger.info(f"✅ Found existing collection with {self.collection.count()} documents")
            except:
                self.collection = self.chroma_client.create_collection(
                    name="teachai_educational",
                    metadata={"description": "Chinese educational materials"}
                )
                logger.info("✅ Created new collection")
                await self._load_educational_data()
            
            self._update_stats()
            self.is_initialized = True
            logger.info("🎉 RAG Service initialized successfully!")
            
        except Exception as e:
            logger.error(f"❌ Initialization failed: {e}")
            raise
    
    async def _load_educational_data(self):
        """Load educational data from GitHub or local files"""
        logger.info("📚 Loading educational materials...")
        
        data_dir = Path("rag_data/chunks")
        
        # Try to download data if not exists
        if not data_dir.exists():
            await self._download_rag_data()
        
        if not data_dir.exists():
            logger.warning("⚠️ No RAG data found, loading sample educational data...")
            await self._load_sample_data()
            return
        
        # Load JSON files
        json_files = list(data_dir.glob("*.json"))
        logger.info(f"📁 Found {len(json_files)} data files")
        
        batch_size = 10
        total_chunks = 0
        
        for i in range(0, len(json_files), batch_size):
            batch_files = json_files[i:i + batch_size]
            batch_chunks = []
            batch_embeddings = []
            batch_metadata = []
            batch_ids = []
            
            for file_path in batch_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        chunks = json.load(f)
                    
                    book_name = self._extract_book_name(file_path.name)
                    
                    for idx, chunk in enumerate(chunks):
                        if not chunk.get('content') or len(chunk['content']) < 50:
                            continue
                        
                        # Generate embedding
                        content = self._preprocess_text(chunk['content'])
                        embedding = self.model.encode(content)
                        
                        # Extract metadata
                        metadata = {
                            'book_name': book_name,
                            'subject': self._extract_subject(chunk.get('metadata', {}), book_name),
                            'grade': self._extract_grade(chunk.get('metadata', {}), book_name),
                            'quality_score': chunk.get('metadata', {}).get('qualityMetrics', {}).get('ocrConfidence', 0.8),
                            'chunk_index': idx,
                            'content_length': len(chunk['content'])
                        }
                        
                        chunk_id = f"{book_name}_{idx}"
                        
                        batch_chunks.append(content)
                        batch_embeddings.append(embedding.tolist())
                        batch_metadata.append(metadata)
                        batch_ids.append(chunk_id)
                        total_chunks += 1
                
                except Exception as e:
                    logger.warning(f"⚠️ Error loading {file_path.name}: {e}")
            
            # Add batch to ChromaDB
            if batch_chunks:
                self.collection.add(
                    documents=batch_chunks,
                    embeddings=batch_embeddings,
                    metadatas=batch_metadata,
                    ids=batch_ids
                )
                
                logger.info(f"✅ Loaded batch {i//batch_size + 1}/{(len(json_files) + batch_size - 1)//batch_size} "
                          f"({len(batch_chunks)} chunks)")
        
        logger.info(f"🎉 Successfully loaded {total_chunks} educational chunks!")
    
    async def _download_rag_data(self):
        """Download RAG data from GitHub if available"""
        logger.info("📥 Attempting to download RAG data...")
        # This would download from your GitHub repo if you make it public
        # For now, we'll create sample data
        await self._create_sample_data()
    
    async def _load_sample_data(self):
        """Load sample data from sample_data.json file"""
        logger.info("📚 Loading sample educational data...")
        
        sample_file = Path("sample_data.json")
        if not sample_file.exists():
            await self._create_sample_data()
            return
        
        try:
            with open(sample_file, 'r', encoding='utf-8') as f:
                sample_chunks = json.load(f)
            
            chunks = []
            embeddings = []
            metadata = []
            ids = []
            
            for idx, chunk in enumerate(sample_chunks):
                content = chunk.get('content', '')
                if len(content) < 20:
                    continue
                    
                # Generate embedding
                embedding = self.model.encode(content).tolist()
                
                chunks.append(content)
                embeddings.append(embedding)
                metadata.append(chunk.get('metadata', {}))
                ids.append(f"sample_{idx}")
            
            # Add to collection
            if chunks:
                self.collection.add(
                    documents=chunks,
                    embeddings=embeddings,
                    metadatas=metadata,
                    ids=ids
                )
                
            logger.info(f"✅ Loaded {len(chunks)} sample educational chunks!")
            
        except Exception as e:
            logger.error(f"❌ Failed to load sample data: {e}")
            await self._create_sample_data()
    
    async def _create_sample_data(self):
        """Create sample educational data for demonstration"""
        logger.info("🎭 Creating sample educational data...")
        
        data_dir = Path("rag_data/chunks")
        data_dir.mkdir(parents=True, exist_ok=True)
        
        sample_data = [
            {
                "content": "数学是研究数量、结构、变化、空间以及信息等概念的一门学科。在人类历史发展和社会生活中，数学发挥着不可替代的作用。数学的基本概念包括数、量、形、空间等。",
                "metadata": {
                    "source": "数学基础教材",
                    "qualityMetrics": {"ocrConfidence": 0.95}
                }
            },
            {
                "content": "语文是语言和文学的合称，包括语言文字规范、文学历史等内容。学好语文对于理解中华文化、提高人文素养具有重要意义。",
                "metadata": {
                    "source": "语文基础教材", 
                    "qualityMetrics": {"ocrConfidence": 0.92}
                }
            },
            {
                "content": "英语作为国际通用语言，在全球交流中发挥着重要作用。学习英语不仅能够开阔视野，还能为未来的学习和工作打下良好基础。",
                "metadata": {
                    "source": "英语基础教材",
                    "qualityMetrics": {"ocrConfidence": 0.88}
                }
            }
        ]
        
        sample_file = data_dir / "sample_educational_content.json"
        with open(sample_file, 'w', encoding='utf-8') as f:
            json.dump(sample_data, f, ensure_ascii=False, indent=2)
        
        logger.info("✅ Sample data created")
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for embedding"""
        if not text:
            return ""
        
        # Clean and normalize
        text = text.strip()
        text = ' '.join(text.split())  # Normalize whitespace
        
        # Limit length for embedding model
        return text[:512]
    
    def _extract_book_name(self, filename: str) -> str:
        """Extract book name from filename"""
        return filename.replace('.json', '').replace('_', ' ')
    
    def _extract_subject(self, metadata: Dict, book_name: str) -> str:
        """Extract subject from metadata or book name"""
        subjects_map = {
            '数学': ['数学', 'math', 'mathematics'],
            '语文': ['语文', 'chinese', '文学'],
            '英语': ['英语', 'english'],
            '物理': ['物理', 'physics'],
            '化学': ['化学', 'chemistry'],
            '生物': ['生物', 'biology'],
            '历史': ['历史', 'history'],
            '地理': ['地理', 'geography'],
            '政治': ['政治', 'politics'],
            '音乐': ['音乐', 'music'],
            '美术': ['美术', 'art'],
            '体育': ['体育', 'sports', '健康']
        }
        
        text_to_check = (book_name + ' ' + str(metadata)).lower()
        
        for subject, keywords in subjects_map.items():
            if any(keyword in text_to_check for keyword in keywords):
                return subject
        
        return '其他'
    
    def _extract_grade(self, metadata: Dict, book_name: str) -> str:
        """Extract grade from metadata or book name"""
        grade_patterns = {
            '一年级': ['一年级', '1年级', '小学一年级'],
            '二年级': ['二年级', '2年级', '小学二年级'],
            '三年级': ['三年级', '3年级', '小学三年级'],
            '四年级': ['四年级', '4年级', '小学四年级'],
            '五年级': ['五年级', '5年级', '小学五年级'],
            '六年级': ['六年级', '6年级', '小学六年级'],
            '七年级': ['七年级', '7年级', '初一', '初中一年级'],
            '八年级': ['八年级', '8年级', '初二', '初中二年级'],
            '九年级': ['九年级', '9年级', '初三', '初中三年级']
        }
        
        text_to_check = (book_name + ' ' + str(metadata)).lower()
        
        for grade, patterns in grade_patterns.items():
            if any(pattern in text_to_check for pattern in patterns):
                return grade
        
        return '未知'
    
    def _update_stats(self):
        """Update service statistics"""
        try:
            if not self.collection:
                return
            
            # Get all metadata
            results = self.collection.get(include=["metadatas"])
            
            self.stats['total_chunks'] = len(results['ids'])
            
            # Count subjects and grades
            subjects = {}
            grades = {}
            books = {}
            
            for metadata in results['metadatas']:
                subject = metadata.get('subject', '未知')
                grade = metadata.get('grade', '未知')
                book = metadata.get('book_name', '未知')
                
                subjects[subject] = subjects.get(subject, 0) + 1
                grades[grade] = grades.get(grade, 0) + 1
                books[book] = books.get(book, 0) + 1
            
            self.stats['subjects'] = subjects
            self.stats['grades'] = grades
            self.stats['books'] = books
            
        except Exception as e:
            logger.warning(f"Failed to update stats: {e}")
    
    def search(self, query: str, limit: int = 5, subject: Optional[str] = None, 
               grade: Optional[str] = None) -> Dict[str, Any]:
        """Search for relevant educational content"""
        try:
            if not self.is_initialized:
                return {
                    'error': 'RAG service not initialized',
                    'results': [],
                    'total': 0
                }
            
            if not query.strip():
                return {
                    'error': 'Empty query provided',
                    'results': [],
                    'total': 0
                }
            
            # Build where clause for filtering
            where_clause = {}
            if subject and subject != '全部':
                where_clause['subject'] = subject
            if grade and grade != '全部':
                where_clause['grade'] = grade
            
            # Generate query embedding
            query_embedding = self.model.encode(self._preprocess_text(query))
            
            # Search in ChromaDB
            search_results = self.collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=min(limit, 20),
                where=where_clause if where_clause else None,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            results = []
            if search_results['documents'] and search_results['documents'][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    search_results['documents'][0],
                    search_results['metadatas'][0],
                    search_results['distances'][0]
                )):
                    similarity = max(0, 1 - distance)  # Convert distance to similarity
                    
                    results.append({
                        'content': doc,
                        'similarity': round(similarity, 4),
                        'subject': metadata.get('subject', '未知'),
                        'grade': metadata.get('grade', '未知'),
                        'book_name': metadata.get('book_name', '未知'),
                        'quality_score': metadata.get('quality_score', 0.8),
                        'rank': i + 1
                    })
            
            return {
                'query': query,
                'results': results,
                'total': len(results),
                'filters': {
                    'subject': subject,
                    'grade': grade
                },
                'stats': self.stats
            }
        
        except Exception as e:
            logger.error(f"Search error: {e}")
            return {
                'error': str(e),
                'results': [],
                'total': 0
            }

# Global RAG service instance
rag_service = TeachAIRAGService()

# Gradio interface functions
async def initialize_service():
    """Initialize the RAG service"""
    if not rag_service.is_initialized:
        await rag_service.initialize()
    return "✅ RAG Service Initialized Successfully!"

def search_educational_content(query: str, subject: str = "全部", grade: str = "全部", limit: int = 5):
    """Search for educational content"""
    if not rag_service.is_initialized:
        return "❌ Service not initialized. Please initialize first."
    
    results = rag_service.search(query, limit, subject if subject != "全部" else None, grade if grade != "全部" else None)
    
    if 'error' in results:
        return f"❌ Error: {results['error']}"
    
    if not results['results']:
        return "😔 No relevant educational content found. Try different keywords."
    
    # Format results for display
    output = f"🔍 Found {results['total']} results for: '{results['query']}'\n\n"
    
    for result in results['results']:
        output += f"📚 **Rank {result['rank']}** (Similarity: {result['similarity']:.1%})\n"
        output += f"📖 Subject: {result['subject']} | Grade: {result['grade']}\n"
        output += f"📗 Book: {result['book_name']}\n"
        output += f"📄 Content: {result['content'][:200]}...\n"
        output += f"⭐ Quality: {result['quality_score']:.1%}\n\n"
        output += "---\n\n"
    
    return output

def get_service_stats():
    """Get service statistics"""
    if not rag_service.is_initialized:
        return "❌ Service not initialized"
    
    stats = rag_service.stats
    
    output = f"📊 **TeachAI RAG Service Statistics**\n\n"
    output += f"📚 Total Educational Chunks: {stats['total_chunks']:,}\n\n"
    
    if stats['subjects']:
        output += "📖 **Subjects:**\n"
        for subject, count in sorted(stats['subjects'].items(), key=lambda x: x[1], reverse=True):
            output += f"   • {subject}: {count:,} chunks\n"
        output += "\n"
    
    if stats['grades']:
        output += "🎓 **Grades:**\n"
        for grade, count in sorted(stats['grades'].items(), key=lambda x: x[1], reverse=True):
            output += f"   • {grade}: {count:,} chunks\n"
        output += "\n"
    
    if stats['books']:
        top_books = sorted(stats['books'].items(), key=lambda x: x[1], reverse=True)[:10]
        output += "📗 **Top 10 Books:**\n"
        for book, count in top_books:
            output += f"   • {book}: {count} chunks\n"
    
    return output

# Create Gradio interface
def create_gradio_app():
    """Create the Gradio web interface"""
    
    with gr.Blocks(title="TeachAI RAG Service", theme=gr.themes.Soft()) as app:
        gr.Markdown("# 🎓 TeachAI RAG Service")
        gr.Markdown("Intelligent search for Chinese educational materials with 95,000+ chunks")
        
        with gr.Tab("🔍 Search"):
            with gr.Row():
                query_input = gr.Textbox(
                    label="Search Query", 
                    placeholder="Enter your educational question in Chinese or English...",
                    lines=2
                )
            
            with gr.Row():
                subject_dropdown = gr.Dropdown(
                    choices=["全部", "数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "音乐", "美术", "体育", "其他"],
                    value="全部",
                    label="Subject Filter"
                )
                
                grade_dropdown = gr.Dropdown(
                    choices=["全部", "一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "七年级", "八年级", "九年级"],
                    value="全部", 
                    label="Grade Filter"
                )
                
                limit_slider = gr.Slider(
                    minimum=1,
                    maximum=20,
                    value=5,
                    step=1,
                    label="Max Results"
                )
            
            search_button = gr.Button("🔍 Search", variant="primary")
            search_output = gr.Textbox(label="Search Results", lines=15)
            
            search_button.click(
                search_educational_content,
                inputs=[query_input, subject_dropdown, grade_dropdown, limit_slider],
                outputs=search_output
            )
        
        with gr.Tab("📊 Statistics"):
            stats_button = gr.Button("📊 Get Statistics", variant="secondary")
            stats_output = gr.Textbox(label="Service Statistics", lines=20)
            
            stats_button.click(get_service_stats, outputs=stats_output)
        
        with gr.Tab("⚙️ Setup"):
            gr.Markdown("### Initialize the RAG Service")
            gr.Markdown("Click the button below to initialize the service with educational data.")
            
            init_button = gr.Button("🚀 Initialize Service", variant="primary")
            init_output = gr.Textbox(label="Initialization Status")
            
            init_button.click(initialize_service, outputs=init_output)
        
        with gr.Tab("📚 API"):
            gr.Markdown("### REST API Endpoints")
            gr.Markdown("""
            Use these endpoints to integrate with your main TeachAI application:
            
            **Search Endpoint:**
            ```
            POST /api/search
            {
                "query": "数学基础概念",
                "subject": "数学",
                "grade": "三年级", 
                "limit": 5
            }
            ```
            
            **Statistics Endpoint:**
            ```
            GET /api/stats
            ```
            
            **Health Check:**
            ```
            GET /api/health
            ```
            """)
    
    return app

# Flask API for programmatic access
from flask import Flask, request, jsonify
flask_app = Flask(__name__)

@flask_app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy' if rag_service.is_initialized else 'initializing',
        'service': 'TeachAI RAG Service',
        'version': '1.0.0'
    })

@flask_app.route('/api/search', methods=['POST'])
def api_search():
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'Query required'}), 400
    
    results = rag_service.search(
        query=data['query'],
        limit=data.get('limit', 5),
        subject=data.get('subject'),
        grade=data.get('grade')
    )
    
    return jsonify(results)

@flask_app.route('/api/stats', methods=['GET'])
def api_stats():
    return jsonify(rag_service.stats)

# Main execution
if __name__ == "__main__":
    import asyncio
    import threading
    
    # Initialize service in background
    async def init_service():
        await rag_service.initialize()
    
    def run_flask():
        flask_app.run(host="0.0.0.0", port=7860, debug=False)
    
    # Start Flask API in background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # Create and launch Gradio app
    app = create_gradio_app()
    
    # Auto-initialize service
    asyncio.run(init_service())
    
    # Launch Gradio interface
    app.launch(
        server_name="0.0.0.0",
        server_port=7861,
        share=False,
        show_api=True
    )