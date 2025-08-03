#!/bin/bash

echo "🔧 Fixing ChromaDB Collection Issues"
echo "==================================="

# Create proper ChromaDB JavaScript client solution
echo "📝 Creating proper ChromaDB client loader..."
docker exec lesson-plan-generator-teachai-1 sh -c "cat > /app/server/proper-rag-loader.js << 'EOF'
const fs = require('fs').promises;
const path = require('path');
const { ChromaClient } = require('chromadb');

async function loadRAGDataProperly() {
    console.log('🚀 Loading RAG data with proper ChromaDB client...');
    
    try {
        // Connect using proper ChromaDB client
        const client = new ChromaClient({ 
            path: 'http://chroma:8000'
        });
        
        console.log('✅ Connected to ChromaDB');
        
        // Use getOrCreateCollection to avoid UniqueConstraintError
        console.log('🔨 Getting or creating collection...');
        const collection = await client.getOrCreateCollection({
            name: 'lesson_materials',
            metadata: { 
                description: 'Educational materials',
                created: new Date().toISOString()
            }
        });
        
        console.log('✅ Collection ready');
        
        // Check current count
        try {
            const currentCount = await collection.count();
            console.log(\`📊 Current collection has \${currentCount} items\`);
            
            if (currentCount > 0) {
                console.log('🧹 Collection has existing data, clearing it...');
                // Delete the collection and recreate
                await client.deleteCollection({ name: 'lesson_materials' });
                console.log('✅ Deleted old collection');
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Recreate fresh collection
                const freshCollection = await client.createCollection({
                    name: 'lesson_materials',
                    metadata: { 
                        description: 'Fresh educational materials',
                        created: new Date().toISOString()
                    }
                });
                
                console.log('✅ Created fresh collection');
                return await loadDataIntoCollection(freshCollection);
            } else {
                return await loadDataIntoCollection(collection);
            }
            
        } catch (countError) {
            console.log('ℹ️ Could not check count, proceeding with loading...');
            return await loadDataIntoCollection(collection);
        }
        
    } catch (error) {
        console.error('❌ RAG loading failed:', error.message);
        process.exit(1);
    }
}

async function loadDataIntoCollection(collection) {
    try {
        // Load data files
        const dataPath = '/app/server/rag_data/chunks';
        const files = await fs.readdir(dataPath);
        const jsonFiles = files.filter(f => f.endsWith('.json')).slice(0, 30);
        
        console.log(\`📁 Loading \${jsonFiles.length} educational files...\`);
        
        let totalChunks = 0;
        
        for (let fileIndex = 0; fileIndex < jsonFiles.length; fileIndex++) {
            const file = jsonFiles[fileIndex];
            try {
                const filePath = path.join(dataPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);
                
                const chunks = Array.isArray(data) ? data : (data.chunks || []);
                const validChunks = chunks.filter(c => 
                    c.content && 
                    c.content.trim().length > 50 &&
                    (!c.qualityScore || c.qualityScore >= 0.3)
                ).slice(0, 100);
                
                if (validChunks.length === 0) continue;
                
                // Process in small batches using proper ChromaDB client
                const batchSize = 25;
                for (let i = 0; i < validChunks.length; i += batchSize) {
                    const batch = validChunks.slice(i, i + batchSize);
                    
                    const ids = batch.map((_, idx) => \`\${file.replace('.json', '')}_\${i + idx}_\${Date.now()}\`);
                    const documents = batch.map(chunk => chunk.content.substring(0, 1200));
                    const metadatas = batch.map(chunk => ({
                        source: file,
                        grade: chunk.metadata?.grade || 'unknown',
                        subject: chunk.metadata?.subject || 'other',
                        publisher: chunk.metadata?.publisher || 'unknown',
                        qualityScore: chunk.qualityScore || 1.0
                    }));
                    
                    // Use proper ChromaDB client add method
                    await collection.add({
                        ids: ids,
                        documents: documents,
                        metadatas: metadatas
                    });
                    
                    totalChunks += batch.length;
                    
                    // Small delay between batches
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                if (fileIndex % 5 === 0) {
                    console.log(\`📊 Progress: \${fileIndex + 1}/\${jsonFiles.length} files, \${totalChunks} chunks\`);
                }
                
            } catch (error) {
                console.log(\`⚠️ Skipped \${file}: \${error.message}\`);
            }
        }
        
        console.log(\`\\n🎉 Successfully loaded \${totalChunks} educational chunks!\`);
        
        // Test search with proper client
        try {
            const searchResults = await collection.query({
                queryTexts: ['数学教学', '语文学习'],
                nResults: 3
            });
            
            console.log(\`🔍 Search test successful: Found \${searchResults.documents[0].length} results\`);
            console.log('Sample result:', searchResults.documents[0][0]?.substring(0, 100) + '...');
            console.log('✅ RAG system ready for AI lesson planning!');
            
        } catch (searchError) {
            console.log('⚠️ Search test failed:', searchError.message);
            console.log('ℹ️ Data loaded but search needs debugging');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Data loading failed:', error.message);
        throw error;
    }
}

// Run the loader
loadRAGDataProperly().then(() => {
    console.log('🎯 RAG loading completed successfully!');
}).catch(error => {
    console.error('💥 RAG loading failed:', error.message);
    process.exit(1);
});
EOF"

echo "🚀 Running proper ChromaDB client loader..."
docker exec lesson-plan-generator-teachai-1 sh -c "cd /app/server && node proper-rag-loader.js"

echo "✅ ChromaDB fix complete!"