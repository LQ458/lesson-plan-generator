---
title: TeachAI RAG Service
emoji: 🎓
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 3.44.4
app_file: app.py
pinned: false
license: mit
models:
  - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
tags:
  - education
  - rag
  - chinese
  - search
  - vector-database
  - teaching
  - lesson-planning
short_description: Intelligent search across 95,000+ Chinese educational materials
---

# 🎓 TeachAI RAG Service

Intelligent search across 95,360+ Chinese educational materials using RAG (Retrieval-Augmented Generation) technology.

## 📋 Features

- **🔍 Semantic Search**: Advanced Chinese text search with multilingual embeddings
- **📚 Educational Database**: 95,360+ enhanced educational chunks from K-12 curriculum
- **🎯 Subject/Grade Filtering**: Targeted search by subject and grade level
- **🌐 Dual Interface**: Both interactive Gradio UI and REST API
- **📊 Quality Scoring**: Content reliability metrics and OCR confidence scores

## 🚀 Usage

### Interactive Web Interface
Use the Gradio interface above to:
- Enter search queries for educational content
- Filter by subject (数学, 语文, 英语, 物理, etc.)
- Filter by grade level (一年级 to 九年级)
- View search results with quality scores

### REST API Endpoints

#### Search Educational Content
```
POST /api/search
Content-Type: application/json

{
  "query": "数学基础概念",
  "subject": "数学",
  "grade": "三年级",
  "limit": 5
}
```

#### Service Statistics
```
GET /api/stats
```

#### Health Check
```
GET /api/health
```

## 📊 Database Statistics

- **Total Chunks**: 95,360+ educational content pieces
- **Source Files**: 4,557+ processed educational documents
- **Publishers**: People's Education Press, Beijing Normal University, etc.
- **Coverage**: Complete K-12 curriculum (Grades 1-12)
- **Languages**: Optimized for Chinese educational content

## 🔧 Technical Details

- **Embedding Model**: `paraphrase-multilingual-MiniLM-L12-v2`
- **Vector Database**: ChromaDB with SQLite backend
- **Enhancement**: OCR correction, quality scoring, duplicate detection
- **API Framework**: Flask + Gradio
- **Chinese Language**: Specialized preprocessing for Chinese educational materials

## 📚 Integration

This RAG service is designed to integrate with TeachAI lesson plan generator:

```python
import requests

response = requests.post('https://your-space-url/api/search', json={
    'query': '三年级数学加法',
    'subject': '数学', 
    'grade': '三年级',
    'limit': 5
})

results = response.json()
```

## 🎯 Quality Features

- **OCR Error Correction**: Improved text accuracy for scanned educational materials
- **Quality Scoring**: Each result includes reliability metrics (0.3-1.0 scale)
- **Content Classification**: Automatic categorization of formulas, experiments, definitions
- **Duplicate Detection**: Advanced algorithms eliminate redundant content
- **Semantic Enhancement**: Rich metadata with educational context

---

*Powered by Hugging Face Spaces and optimized for Chinese educational content retrieval.*