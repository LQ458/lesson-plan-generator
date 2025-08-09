#!/usr/bin/env node

/**
 * Retry Failed ChromaDB Cloud Uploads
 * Specifically handles the 9 failed files with enhanced error handling
 */

const ChromaDBCloudUploader = require('./server/rag/scripts/cloud-uploader');
const { DefaultEmbeddingFunction } = require('chromadb');
const path = require('path');

class FailedUploadRetry {
    constructor() {
        this.uploader = new ChromaDBCloudUploader();
        this.failedFiles = [
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
        this.maxRetries = 5;
        this.baseDelay = 3000; // 3 seconds base delay
    }

    async initialize() {
        console.log('🔄 Initializing ChromaDB Cloud connection with enhanced retry...');
        
        let retryCount = 0;
        while (retryCount < this.maxRetries) {
            try {
                await this.uploader.initialize();
                console.log('✅ Connection established successfully');
                return true;
            } catch (error) {
                retryCount++;
                console.log(`❌ Connection attempt ${retryCount}/${this.maxRetries} failed: ${error.message}`);
                
                if (retryCount < this.maxRetries) {
                    const delay = this.baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
                    console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
                    await this.sleep(delay);
                } else {
                    throw new Error(`Failed to connect after ${this.maxRetries} attempts: ${error.message}`);
                }
            }
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getOrCreateMainCollectionSafe() {
        try {
            // Try to get existing collection first
            const collection = await this.uploader.client.getCollection({
                name: this.uploader.config.collectionName,
                embeddingFunction: new DefaultEmbeddingFunction()
            });
            console.log(`✅ Using existing main collection: ${this.uploader.config.collectionName}`);
            return collection;
        } catch (error) {
            if (error.message.includes('does not exist')) {
                // Collection doesn't exist, create it
                try {
                    const collection = await this.uploader.client.createCollection({
                        name: this.uploader.config.collectionName,
                        embeddingFunction: new DefaultEmbeddingFunction(),
                        metadata: {
                            "hnsw:space": "cosine",
                            description: "TeachAI unified education materials",
                            version: "3.0",
                            created_at: new Date().toISOString()
                        }
                    });
                    console.log(`✅ Created main collection: ${this.uploader.config.collectionName}`);
                    return collection;
                } catch (createError) {
                    if (createError.message.includes('already exists')) {
                        // Race condition - collection was created by another process
                        console.log('⚠️ Collection created by another process, trying to get it...');
                        const collection = await this.uploader.client.getCollection({
                            name: this.uploader.config.collectionName,
                            embeddingFunction: new DefaultEmbeddingFunction()
                        });
                        return collection;
                    }
                    throw createError;
                }
            }
            throw error;
        }
    }

    async retryFailedFile(filename) {
        const filePath = path.join('server/rag_data/chunks', filename);
        console.log(`\n🔄 Retrying failed file: ${filename}`);
        
        let retryCount = 0;
        const maxFileRetries = 3;
        
        while (retryCount < maxFileRetries) {
            try {
                // Re-establish connection if needed
                if (!this.uploader.isInitialized) {
                    console.log('🔌 Re-establishing connection...');
                    await this.initialize();
                }
                
                // Override the getOrCreateMainCollection method temporarily
                const originalMethod = this.uploader.getOrCreateMainCollection;
                this.uploader.getOrCreateMainCollection = this.getOrCreateMainCollectionSafe.bind(this);
                
                // Attempt upload with enhanced error handling
                console.log(`📤 Upload attempt ${retryCount + 1}/${maxFileRetries}`);
                const result = await this.uploader.uploadFile(filePath);
                
                // Restore original method
                this.uploader.getOrCreateMainCollection = originalMethod;
                
                if (result.success) {
                    console.log(`✅ ${filename} uploaded successfully!`);
                    console.log(`   - Documents: ${result.uploadedDocuments}`);
                    console.log(`   - Collection size: ${result.totalCollectionSize}`);
                    return { success: true, filename, ...result };
                } else {
                    throw new Error(result.error || result.reason || 'Upload failed');
                }
                
            } catch (error) {
                retryCount++;
                console.log(`❌ Attempt ${retryCount} failed: ${error.message}`);
                
                // Handle specific errors
                if (error.message.includes('Failed to connect') || 
                    error.message.includes('network') ||
                    error.message.includes('timeout')) {
                    
                    if (retryCount < maxFileRetries) {
                        const delay = this.baseDelay * Math.pow(2, retryCount);
                        console.log(`⏳ Network issue detected, waiting ${delay/1000}s before retry...`);
                        await this.sleep(delay);
                        
                        // Reset uploader connection
                        this.uploader.isInitialized = false;
                        continue;
                    }
                }
                
                if (retryCount >= maxFileRetries) {
                    console.log(`💥 ${filename} failed after ${maxFileRetries} attempts`);
                    return { 
                        success: false, 
                        filename, 
                        error: error.message,
                        attempts: maxFileRetries 
                    };
                }
            }
        }
    }

    async retryAllFailedFiles() {
        console.log('🚀 Starting retry process for failed uploads...');
        console.log(`📁 Found ${this.failedFiles.length} failed files to retry\n`);
        
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        
        for (const filename of this.failedFiles) {
            try {
                const result = await this.retryFailedFile(filename);
                results.push(result);
                
                if (result.success) {
                    successCount++;
                } else {
                    failedCount++;
                }
                
                // Longer delay between files to avoid overwhelming the service
                if (this.failedFiles.indexOf(filename) < this.failedFiles.length - 1) {
                    console.log('⏳ Cooling down 10 seconds before next file...');
                    await this.sleep(10000);
                }
                
            } catch (error) {
                console.error(`💥 Fatal error processing ${filename}: ${error.message}`);
                results.push({ 
                    success: false, 
                    filename, 
                    error: error.message, 
                    fatal: true 
                });
                failedCount++;
            }
        }
        
        // Summary
        console.log('\n🎯 Retry Results Summary:');
        console.log('=========================');
        console.log(`✅ Successful uploads: ${successCount}/${this.failedFiles.length}`);
        console.log(`❌ Still failed: ${failedCount}/${this.failedFiles.length}`);
        console.log(`📊 Success rate: ${((successCount/this.failedFiles.length)*100).toFixed(1)}%`);
        
        if (failedCount > 0) {
            console.log('\n🔍 Remaining Failed Files:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`  - ${r.filename}: ${r.error}`);
            });
        }
        
        return {
            totalFiles: this.failedFiles.length,
            successful: successCount,
            failed: failedCount,
            results: results
        };
    }
}

async function main() {
    console.log('🔧 ChromaDB Failed Upload Recovery Tool');
    console.log('=====================================\n');
    
    const retryTool = new FailedUploadRetry();
    
    try {
        // Initialize connection
        await retryTool.initialize();
        
        // Retry all failed files
        const summary = await retryTool.retryAllFailedFiles();
        
        if (summary.successful === summary.totalFiles) {
            console.log('\n🎉 All failed files have been successfully uploaded!');
            console.log('🚀 Your ChromaDB Cloud collection is now complete.');
        } else if (summary.successful > 0) {
            console.log(`\n📈 Progress made! ${summary.successful} files recovered.`);
            console.log('💡 You can run this script again to retry the remaining files.');
        } else {
            console.log('\n😞 No files were successfully recovered.');
            console.log('🔍 Check your network connection and ChromaDB Cloud status.');
        }
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        console.error('\n🔧 Troubleshooting suggestions:');
        console.error('1. Check ChromaDB Cloud service status');
        console.error('2. Verify API key is valid and not expired');
        console.error('3. Ensure stable internet connection');
        console.error('4. Try running the script again later');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FailedUploadRetry;