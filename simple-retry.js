#!/usr/bin/env node

/**
 * Simple Retry Script for Failed ChromaDB Uploads
 * Uses the main uploader with enhanced retry logic
 */

const ChromaDBCloudUploader = require('./server/rag/scripts/cloud-uploader');
const path = require('path');

const failedFiles = [
    '义务教育三至六年级·书法练习指导（实验）三年级上册_e55cd9ef.json',
    '义务教育教科书·化学九年级上册_1268b174.json', 
    '义务教育教科书·数学二年级下册_6cea9cae.json',
    '义务教育教科书·数学五年级下册_88c59ed1.json',
    '义务教育教科书·数学八年级上册_ef4b30bb.json',
    '义务教育教科书·音乐（五线谱）五年级上册.json',
    '义务教育教科书·音乐（简谱）九年级下册_a4a1489a.json',
    '科普版_七年级_义务教育教科书·地理七年级下册.json',
    '统编版-人民教育出版社_七年级_义务教育教科书·中国历史七年级上册.json'
];

async function retryFailedUploads() {
    console.log('🔧 Simple Retry Tool for Failed Uploads');
    console.log('=====================================\n');
    console.log(`📁 Retrying ${failedFiles.length} failed files...\n`);
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < failedFiles.length; i++) {
        const filename = failedFiles[i];
        const filePath = path.join('server/rag_data/chunks', filename);
        
        console.log(`\n📤 [${i+1}/${failedFiles.length}] Retrying: ${filename}`);
        
        let success = false;
        let error = null;
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxAttempts}...`);
                
                // Create fresh uploader instance for each attempt
                const uploader = new ChromaDBCloudUploader();
                
                // Initialize with longer timeout
                console.log('🔌 Connecting to ChromaDB Cloud...');
                await uploader.initialize();
                
                // Upload file
                console.log('📤 Starting upload...');
                const result = await uploader.uploadFile(filePath);
                
                if (result.success) {
                    console.log(`✅ SUCCESS! Uploaded ${result.uploadedDocuments} documents`);
                    console.log(`📊 Collection now has ${result.totalCollectionSize} total documents`);
                    success = true;
                    break;
                } else {
                    throw new Error(result.error || result.reason || 'Upload failed');
                }
                
            } catch (attemptError) {
                error = attemptError.message;
                console.log(`❌ Attempt ${attempt} failed: ${error}`);
                
                if (attempt < maxAttempts) {
                    const delay = attempt * 5000; // 5s, 10s, 15s
                    console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        results.push({
            filename,
            success,
            error: success ? null : error,
            attempts: success ? results.length + 1 : maxAttempts
        });
        
        if (success) {
            successCount++;
        }
        
        // Cool down between files
        if (i < failedFiles.length - 1) {
            console.log('⏳ Cooling down 15 seconds before next file...');
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }
    
    // Final summary
    console.log('\n🎯 Final Results Summary:');
    console.log('========================');
    console.log(`✅ Successful uploads: ${successCount}/${failedFiles.length}`);
    console.log(`❌ Still failed: ${failedFiles.length - successCount}/${failedFiles.length}`);
    console.log(`📊 Success rate: ${((successCount/failedFiles.length)*100).toFixed(1)}%`);
    
    if (successCount < failedFiles.length) {
        console.log('\n🔍 Still Failed Files:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.filename}: ${r.error}`);
        });
        
        console.log('\n💡 If files still fail:');
        console.log('1. Check ChromaDB Cloud service status');
        console.log('2. Verify your internet connection stability');
        console.log('3. Try running this script again later');
        console.log('4. Consider running files individually with: node upload-to-cloud.js "path/to/file.json"');
    } else {
        console.log('\n🎉 All failed files have been successfully uploaded!');
        console.log('🚀 Your ChromaDB Cloud collection is now complete.');
    }
    
    return results;
}

// Run the retry
retryFailedUploads().catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
});