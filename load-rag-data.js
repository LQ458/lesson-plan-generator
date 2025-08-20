#!/usr/bin/env node

/**
 * Simple RAG Loader - Just run: node load-rag-data.js
 */

const ChromaDBHTTPClient = require('./server/rag/services/chromadb-http-client');
const fs = require('fs').promises;
const path = require('path');

async function loadRAGData() {
  const client = new ChromaDBHTTPClient();
  const ragDataPath = './server/rag_data/chunks';
  const collectionName = 'teachai';
  
  console.log('🚀 Loading RAG data...');
  
  try {
    // Test connection
    await client.heartbeat();
    console.log('✅ ChromaDB connected');
    
    // Create collection
    await client.createCollection(collectionName);
    console.log('✅ Collection ready');
    
    // Load files
    const files = await fs.readdir(ragDataPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    console.log(`📁 Processing ${jsonFiles.length} files...`);
    
    let total = 0;
    
    for (let i = 0; i < jsonFiles.length; i++) {
      const file = jsonFiles[i];
      console.log(`📄 ${i + 1}/${jsonFiles.length}: ${file}`);
      
      const content = await fs.readFile(path.join(ragDataPath, file), 'utf-8');
      const data = JSON.parse(content);
      const chunks = Array.isArray(data) ? data : (data.chunks || []);
      
      const goodChunks = chunks.filter(c => c.content && c.content.length > 10);
      if (goodChunks.length === 0) continue;
      
      // Process in batches
      for (let j = 0; j < goodChunks.length; j += 30) {
        const batch = goodChunks.slice(j, j + 30);
        
        await client.addDocuments(collectionName, {
          ids: batch.map((_, k) => `${file}_${j + k}`),
          documents: batch.map(c => c.content.trim()),
          metadatas: batch.map((_, k) => ({ source: file, index: j + k }))
        });
        
        total += batch.length;
        console.log(`  ✅ ${batch.length} chunks (total: ${total})`);
      }
    }
    
    // Test query
    const results = await client.queryCollection(collectionName, {
      queryTexts: ['数学'],
      nResults: 2
    });
    
    console.log(`\n🎉 Success! Loaded ${total} documents`);
    console.log(`🔍 Test query found ${results.documents[0].length} results`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure ChromaDB is running: chroma run --host localhost --port 8000');
  }
}

loadRAGData();