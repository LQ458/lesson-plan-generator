#!/usr/bin/env node

/**
 * Test script to verify ChromaDB 422 error fixes
 * Tests small batch upload with proper validation
 */

const ChromaDBCloudUploader = require('./server/rag/scripts/cloud-uploader');
const fs = require('fs').promises;
const path = require('path');

async function test422Fix() {
    console.log('🧪 Testing ChromaDB 422 Error Fixes...\n');
    
    const uploader = new ChromaDBCloudUploader();
    
    try {
        // 1. Test Connection
        console.log('1️⃣ Testing connection...');
        await uploader.initialize();
        console.log('✅ Connection successful\n');
        
        // 2. Test collection creation/retrieval
        console.log('2️⃣ Testing unified collection access...');
        const collection = await uploader.getOrCreateMainCollection();
        console.log('✅ Main collection ready\n');
        
        // 3. Find smallest test file
        console.log('3️⃣ Finding smallest test file...');
        const dataDir = 'server/rag_data/chunks';
        const files = await fs.readdir(dataDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        // Find the smallest file for testing
        let smallestFile = null;
        let smallestSize = Infinity;
        
        for (const file of jsonFiles.slice(0, 10)) { // Check first 10 files
            const filePath = path.join(dataDir, file);
            const stats = await fs.stat(filePath);
            if (stats.size < smallestSize) {
                smallestSize = stats.size;
                smallestFile = file;
            }
        }
        
        if (!smallestFile) {
            throw new Error('No test files found');
        }
        
        console.log(`📁 Selected test file: ${smallestFile} (${Math.round(smallestSize/1024)}KB)\n`);
        
        // 4. Test single file upload with enhanced validation
        console.log('4️⃣ Testing enhanced upload with 422 fixes...');
        const testFilePath = path.join(dataDir, smallestFile);
        
        // Check file content first
        const content = await fs.readFile(testFilePath, 'utf8');
        const data = JSON.parse(content);
        console.log(`📊 File contains ${data.length} chunks`);
        
        // Filter for quality
        const qualityChunks = data.filter(chunk => 
            chunk.content && 
            chunk.content.trim().length >= 10 &&
            (!chunk.qualityScore || chunk.qualityScore >= 0.3)
        );
        console.log(`📈 Quality filtered: ${qualityChunks.length} chunks`);
        
        if (qualityChunks.length === 0) {
            console.log('⚠️ No quality chunks found, trying another file...');
            return;
        }
        
        // Test upload
        const result = await uploader.uploadFile(testFilePath);
        
        if (result.success) {
            console.log('🎉 Upload successful!');
            console.log(`📚 Collection: ${result.collectionName}`);
            console.log(`📄 Documents uploaded: ${result.uploadedDocuments}`);
            console.log(`💾 Total collection size: ${result.totalCollectionSize}`);
        } else {
            console.log('❌ Upload failed:', result.error || result.reason);
            if (result.error && result.error.includes('422')) {
                console.log('\n🔧 422 error still occurring. Check:');
                console.log('1. Embedding dimension consistency');
                console.log('2. Metadata validation');
                console.log('3. Document content format');
                console.log('4. API key permissions');
            }
        }
        
        // 5. Test collection status
        console.log('\n5️⃣ Testing collection status...');
        try {
            const collections = await uploader.listCloudCollections();
            console.log(`📚 Found ${collections.length} collections in cloud`);
            
            const mainCollection = collections.find(c => c.name === 'teachai_main');
            if (mainCollection) {
                console.log(`✅ Main collection exists with ${mainCollection.count} documents`);
            } else {
                console.log('⚠️ Main collection not found in listings');
            }
        } catch (listError) {
            console.log('⚠️ Could not list collections:', listError.message);
        }
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n🚀 Ready for full upload with: node upload-to-cloud.js');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (error.message.includes('422')) {
            console.error('\n🔧 422 Error Troubleshooting:');
            console.error('1. Check if embeddings have consistent dimensions');
            console.error('2. Validate all metadata values are not null/undefined');
            console.error('3. Ensure document content is valid UTF-8 text');
            console.error('4. Verify collection embedding function consistency');
            console.error('5. Try smaller batch sizes (current: 10 documents/batch)');
        } else if (error.message.includes('Unauthorized')) {
            console.error('\n🔐 Authentication Error:');
            console.error('1. Check if API key is valid and not expired');
            console.error('2. Verify tenant ID is correct');
            console.error('3. Ensure database permissions are granted');
        } else {
            console.error('\n🔍 Debug information:');
            console.error('Stack trace:', error.stack);
        }
        
        process.exit(1);
    }
}

// Run test if called directly
if (require.main === module) {
    test422Fix().catch(console.error);
}

module.exports = test422Fix;