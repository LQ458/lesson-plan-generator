#!/usr/bin/env node

const ChromaDBCloudUploader = require('./server/rag/scripts/cloud-uploader');
const fs = require('fs').promises;
const path = require('path');

async function testUpload() {
    console.log('🧪 Testing ChromaDB Cloud Upload...');
    
    const uploader = new ChromaDBCloudUploader();
    
    try {
        // Test connection
        console.log('\n1. Testing connection...');
        await uploader.initialize();
        console.log('✅ Connection successful');
        
        // Find a small file to test with
        console.log('\n2. Finding small test file...');
        const dataDir = 'server/rag_data/chunks';
        const files = await fs.readdir(dataDir);
        const jsonFiles = files.filter(f => f.endsWith('.json')).slice(0, 3); // First 3 files only
        
        if (jsonFiles.length === 0) {
            throw new Error('No JSON files found in data directory');
        }
        
        console.log(`📁 Found ${jsonFiles.length} files to test with`);
        
        // Test upload of first small file
        for (let i = 0; i < Math.min(1, jsonFiles.length); i++) {
            const filePath = path.join(dataDir, jsonFiles[i]);
            console.log(`\n3. Testing upload of: ${jsonFiles[i]}`);
            
            // Check file size first
            const stats = await fs.stat(filePath);
            console.log(`📊 File size: ${Math.round(stats.size / 1024)}KB`);
            
            const result = await uploader.uploadFile(filePath);
            
            if (result.success) {
                console.log('✅ Upload successful!');
                console.log(`📚 Collection: ${result.collectionName}`);
                console.log(`📄 Documents uploaded: ${result.uploadedDocuments}`);
                console.log(`💾 Total collection size: ${result.totalCollectionSize}`);
            } else {
                console.log('❌ Upload failed:', result.error || result.reason);
            }
        }
        
        // Test collection listing
        console.log('\n4. Testing collection listing...');
        try {
            const collections = await uploader.listCloudCollections();
            console.log(`📚 Found ${collections.length} collections in cloud`);
            collections.forEach(col => {
                console.log(`  - ${col.name}: ${col.count} documents`);
            });
        } catch (listError) {
            console.log('⚠️ Could not list collections:', listError.message);
        }
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        
        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('1. Check if API key is still valid');
        console.log('2. Verify network connectivity to ChromaDB Cloud');
        console.log('3. Ensure data files are in correct format');
        console.log('4. Try with a smaller test file first');
        
        process.exit(1);
    }
}

testUpload().catch(console.error);