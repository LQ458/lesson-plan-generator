#!/usr/bin/env node

/**
 * Final Fix for ChromaDB 422 Error
 * Based on actual data structure analysis
 */

const { CloudClient, DefaultEmbeddingFunction } = require("chromadb");
const fs = require('fs').promises;
const path = require('path');

class ChromaDB422Fixer {
    constructor() {
        this.client = null;
        this.collection = null;
        
        this.config = {
            apiKey: process.env.CHROMADB_API_KEY || 'ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
            tenant: process.env.CHROMADB_TENANT || 'ac97bc90-bba3-4f52-ab06-f0485262312e',
            database: process.env.CHROMADB_DATABASE || 'teachai',
            collectionName: 'teachai_main'
        };
    }
    
    async initialize() {
        this.client = new CloudClient({
            apiKey: this.config.apiKey,
            tenant: this.config.tenant,
            database: this.config.database
        });
        
        await this.client.heartbeat();
        console.log('✅ Connected to ChromaDB Cloud');
        
        // Get or create main collection
        try {
            this.collection = await this.client.getCollection({
                name: this.config.collectionName,
                embeddingFunction: new DefaultEmbeddingFunction()
            });
            console.log(`✅ Using existing collection: ${this.config.collectionName}`);
        } catch (error) {
            this.collection = await this.client.createCollection({
                name: this.config.collectionName,
                embeddingFunction: new DefaultEmbeddingFunction(),
                metadata: {
                    "hnsw:space": "cosine",
                    description: "TeachAI unified education materials",
                    version: "3.0"
                }
            });
            console.log(`✅ Created new collection: ${this.config.collectionName}`);
        }
    }
    
    // Clean and validate content for ChromaDB Cloud
    sanitizeContent(content) {
        if (!content || typeof content !== 'string') return null;
        
        // Remove control characters and normalize whitespace
        let cleaned = content
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
            
        // Ensure minimum length
        if (cleaned.length < 10) return null;
        
        // Limit maximum length for reliability
        if (cleaned.length > 8000) {
            cleaned = cleaned.substring(0, 7950) + '...';
        }
        
        return cleaned;
    }
    
    // Create ChromaDB-compatible metadata
    sanitizeMetadata(chunk, filename, index) {
        const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        
        const metadata = {
            source: cleanFilename,
            chunk_index: index,
            content_length: chunk.content ? chunk.content.length : 0,
            created_at: new Date().toISOString()
        };
        
        // Add quality score if valid
        if (typeof chunk.qualityScore === 'number' && 
            !isNaN(chunk.qualityScore) && 
            chunk.qualityScore >= 0 && 
            chunk.qualityScore <= 1) {
            metadata.quality_score = Math.round(chunk.qualityScore * 1000) / 1000;
        }
        
        // Add reliability if valid
        if (chunk.reliability && ['high', 'medium', 'low'].includes(chunk.reliability)) {
            metadata.reliability = chunk.reliability;
        }
        
        // Add subject if extractable
        const subject = this.extractSubject(filename);
        if (subject) {
            metadata.subject = subject;
        }
        
        // Add grade if extractable  
        const grade = this.extractGrade(filename);
        if (grade) {
            metadata.grade = grade;
        }
        
        // Add semantic features (only booleans)
        if (chunk.semanticFeatures) {
            const features = chunk.semanticFeatures;
            ['hasFormulas', 'hasNumbers', 'hasExperiment', 'hasDefinition', 'hasQuestion', 'isTableContent'].forEach(key => {
                if (typeof features[key] === 'boolean') {
                    metadata[key] = features[key];
                }
            });
        }
        
        return metadata;
    }
    
    extractSubject(filename) {
        const subjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '科学'];
        return subjects.find(s => filename.includes(s)) || null;
    }
    
    extractGrade(filename) {
        const gradeMatch = filename.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级)/);
        return gradeMatch ? gradeMatch[1] : null;
    }
    
    // Create ChromaDB-safe ID
    generateSafeId(content, filename, index) {
        const crypto = require('crypto');
        const contentHash = crypto.createHash('md5').update(content + filename).digest('hex').substring(0, 8);
        return `doc_${contentHash}_${index}`;
    }
    
    async uploadFileFixed(filePath) {
        console.log(`\n📤 Testing fixed upload: ${path.basename(filePath)}`);
        
        try {
            // Read and parse file
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Invalid data format');
            }
            
            console.log(`📊 File contains ${data.length} chunks`);
            
            // Process and validate chunks
            const validChunks = [];
            for (let i = 0; i < Math.min(data.length, 5); i++) { // Limit to 5 for testing
                const chunk = data[i];
                
                // Sanitize content
                const cleanContent = this.sanitizeContent(chunk.content);
                if (!cleanContent) {
                    console.log(`⚠️ Skipping invalid chunk ${i}`);
                    continue;
                }
                
                // Create safe metadata
                const metadata = this.sanitizeMetadata(chunk, filePath, i);
                
                // Generate safe ID
                const chunkId = this.generateSafeId(cleanContent, path.basename(filePath), i);
                
                validChunks.push({
                    id: chunkId,
                    content: cleanContent,
                    metadata: metadata
                });
            }
            
            if (validChunks.length === 0) {
                throw new Error('No valid chunks after processing');
            }
            
            console.log(`✅ Prepared ${validChunks.length} valid chunks`);
            
            // Upload in very small batches
            const batchSize = 3; // Very small for testing
            let uploadedCount = 0;
            
            for (let i = 0; i < validChunks.length; i += batchSize) {
                const batch = validChunks.slice(i, i + batchSize);
                
                const batchPayload = {
                    ids: batch.map(c => c.id),
                    documents: batch.map(c => c.content),
                    metadatas: batch.map(c => c.metadata)
                };
                
                console.log(`📤 Uploading batch ${Math.floor(i/batchSize) + 1} (${batch.length} docs)`);
                
                try {
                    await this.collection.add(batchPayload);
                    uploadedCount += batch.length;
                    console.log(`✅ Batch successful! Total: ${uploadedCount}`);
                } catch (batchError) {
                    console.error(`❌ Batch failed:`, batchError.message);
                    
                    // Log detailed debug info
                    console.error('🔧 Debug info:');
                    console.error('Sample ID:', batch[0].id);
                    console.error('Sample content length:', batch[0].content.length);
                    console.error('Sample metadata keys:', Object.keys(batch[0].metadata));
                    console.error('Sample metadata:', JSON.stringify(batch[0].metadata, null, 2));
                    
                    throw batchError;
                }
                
                // Small delay between batches
                if (i + batchSize < validChunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            console.log(`🎉 Upload successful! Uploaded ${uploadedCount} documents`);
            
            // Verify collection
            const count = await this.collection.count();
            console.log(`📊 Collection now has ${count} total documents`);
            
            return { success: true, uploadedCount, totalCount: count };
            
        } catch (error) {
            console.error(`❌ Upload failed:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

// Test the fix
async function testFix() {
    console.log('🧪 Testing ChromaDB 422 Fix with Real Data...\n');
    
    const fixer = new ChromaDB422Fixer();
    
    try {
        await fixer.initialize();
        
        // Test with a real file
        const testFile = 'server/rag_data/chunks/义务教育教科书·数学一年级上册.json';
        const result = await fixer.uploadFileFixed(testFile);
        
        if (result.success) {
            console.log('\n🎉 422 Error FIXED! The solution works!');
            console.log('📈 Next steps:');
            console.log('1. Apply this fix to the main uploader');
            console.log('2. Test with full batch upload');
            console.log('3. Monitor for any remaining issues');
        } else {
            console.log('\n❌ Fix needs more work:', result.error);
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        
        if (error.message.includes('422')) {
            console.error('\n🔍 422 Error Analysis:');
            console.error('- Content encoding issues with Chinese text');
            console.error('- Metadata validation failures');
            console.error('- Batch payload format problems');
            console.error('- ChromaDB Cloud strict validation');
        }
    }
}

// Run test if called directly
if (require.main === module) {
    testFix().catch(console.error);
}

module.exports = ChromaDB422Fixer;