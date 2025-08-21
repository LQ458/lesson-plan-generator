#!/usr/bin/env node

/**
 * Simple RAG Loader with Resume - Just run: node load-rag-data.js
 */

const ChromaDBHTTPClient = require('./server/rag/services/chromadb-http-client');
const fs = require('fs').promises;
const path = require('path');

const PROGRESS_FILE = './rag-progress.json';

async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { processedFiles: [], totalProcessed: 0 };
  }
}

async function saveProgress(progress) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function loadRAGData() {
  const client = new ChromaDBHTTPClient();
  const ragDataPath = './server/rag_data/chunks';
  const collectionName = 'teachai';
  
  // Load previous progress
  const progress = await loadProgress();
  globalProgress = progress; // Set global for SIGINT handler
  console.log(`🚀 Loading RAG data... (${progress.processedFiles.length} files already done)`);
  
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
    console.log(`📁 Processing ${jsonFiles.length} files (skipping ${progress.processedFiles.length} done)...`);
    
    let total = progress.totalProcessed;
    
    for (let i = 0; i < jsonFiles.length; i++) {
      const file = jsonFiles[i];
      
      // Skip if already processed
      if (progress.processedFiles.includes(file)) {
        continue;
      }
      
      console.log(`📄 ${i + 1}/${jsonFiles.length}: ${file}`);
      
      try {
        const content = await fs.readFile(path.join(ragDataPath, file), 'utf-8');
        const data = JSON.parse(content);
        const chunks = Array.isArray(data) ? data : (data.chunks || []);
        
        const goodChunks = chunks.filter(c => c.content && c.content.length > 10);
        if (goodChunks.length === 0) {
          progress.processedFiles.push(file);
          continue;
        }
        
        // Process in batches
        for (let j = 0; j < goodChunks.length; j += 30) {
          const batch = goodChunks.slice(j, j + 30);
          
          await client.addDocuments(collectionName, {
            ids: batch.map((_, k) => `${file}_${j + k}_${Date.now()}`),
            documents: batch.map(c => c.content.trim()),
            metadatas: batch.map((_, k) => ({ source: file, index: j + k }))
          });
          
          total += batch.length;
          console.log(`  ✅ ${batch.length} chunks (total: ${total})`);
        }
        
        // Mark file as processed and save progress immediately
        progress.processedFiles.push(file);
        progress.totalProcessed = total;
        await saveProgress(progress);
        console.log(`💾 Progress saved: ${file} (${progress.processedFiles.length}/${jsonFiles.length})`);
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        // Continue with next file
      }
    }
    
    // Final save
    await saveProgress(progress);
    
    // Test query
    const results = await client.queryCollection(collectionName, {
      queryTexts: ['数学'],
      nResults: 2
    });
    
    console.log(`\n🎉 Success! Loaded ${total} documents total`);
    console.log(`🔍 Test query found ${results.documents[0].length} results`);
    console.log(`📊 Processed ${progress.processedFiles.length}/${jsonFiles.length} files`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure ChromaDB is running with Docker');
    // Save progress even on error
    await saveProgress(progress);
  }
}

// Global progress variable for SIGINT handler
let globalProgress = null;

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupted! Saving progress...');
  if (globalProgress) {
    try {
      await saveProgress(globalProgress);
      console.log(`💾 Progress saved! Processed ${globalProgress.processedFiles.length} files so far.`);
    } catch (error) {
      console.log('❌ Failed to save progress:', error.message);
    }
  }
  console.log('Run "node load-rag-data.js" again to continue...');
  process.exit(0);
});

loadRAGData();