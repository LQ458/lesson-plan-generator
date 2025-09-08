#!/usr/bin/env node

/**
 * Test RAG Search Functionality with Frontend Configuration
 */

const path = require('path');
const fs = require('fs');

async function testRAGSearch() {
    console.log('🔍 Testing RAG Search with Frontend Configuration');
    console.log('===============================================\n');

    try {
        // Load the vector store service
        const VectorStoreService = require('./server/rag/services/vector-store.js');
        
        console.log('📦 Loading vector store service...');
        const vectorStore = new VectorStoreService();
        
        console.log('🔧 Initializing vector store...');
        await vectorStore.initialize();
        
        console.log('✅ Vector store initialized successfully\n');
        
        // Test cases matching your frontend usage
        const testCases = [
            {
                name: '数学 - 小学三年级 - 分数概念',
                query: '分数的基本概念',
                options: {
                    subject: '数学',
                    grade: '小学三年级',
                    limit: 5
                }
            },
            {
                name: '语文 - 小学二年级 - 汉字学习', 
                query: '汉字识读',
                options: {
                    subject: '语文',
                    grade: '小学二年级', 
                    limit: 3
                }
            },
            {
                name: '英语 - 初中一年级 - 语法基础',
                query: '语法基础',
                options: {
                    subject: '英语',
                    grade: '初中一年级',
                    limit: 4
                }
            },
            {
                name: '物理 - 初中二年级 - 力学概念',
                query: '力学基本概念',
                options: {
                    subject: '物理', 
                    grade: '初中二年级',
                    limit: 5
                }
            }
        ];

        let successCount = 0;
        let totalRelevantResults = 0;

        for (const testCase of testCases) {
            console.log(`🧪 ${testCase.name}`);
            console.log(`📋 Query: "${testCase.query}"`);
            console.log(`🎯 Filters: ${JSON.stringify(testCase.options)}`);
            
            try {
                const results = await vectorStore.search(testCase.query, testCase.options);
                
                if (results && results.length > 0) {
                    successCount++;
                    totalRelevantResults += results.length;
                    
                    console.log(`✅ Found ${results.length} relevant results`);
                    
                    // Show top result details
                    const topResult = results[0];
                    console.log(`📚 Top result:`);
                    console.log(`   📖 Subject: ${topResult.metadata?.subject || 'Unknown'}`);
                    console.log(`   🎓 Grade: ${topResult.metadata?.grade || 'Unknown'}`);
                    console.log(`   ⭐ Similarity: ${(topResult.similarity * 100).toFixed(1)}%`);
                    console.log(`   💎 Quality: ${((topResult.metadata?.quality_score || 0.8) * 100).toFixed(1)}%`);
                    console.log(`   📄 Content: ${topResult.content.substring(0, 120)}...`);
                    
                    // Check if results match the requested filters
                    const matchingResults = results.filter(r => {
                        const metadata = r.metadata || {};
                        const subjectMatch = !testCase.options.subject || 
                                           metadata.subject === testCase.options.subject ||
                                           metadata.subject === '未知';
                        const gradeMatch = !testCase.options.grade ||
                                         metadata.grade === testCase.options.grade ||
                                         metadata.grade === '未知';
                        return subjectMatch && gradeMatch;
                    });
                    
                    console.log(`🎯 ${matchingResults.length}/${results.length} results match filters`);
                    
                } else {
                    console.log(`⚠️  No results found for this query`);
                }
                
            } catch (error) {
                console.log(`❌ Search failed: ${error.message}`);
                console.log(`📄 Stack: ${error.stack?.substring(0, 200)}...`);
            }
            
            console.log('─'.repeat(50));
            console.log();
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Summary
        console.log('📊 Test Summary');
        console.log('==============');
        console.log(`✅ Successful searches: ${successCount}/${testCases.length}`);
        console.log(`📚 Total relevant results: ${totalRelevantResults}`);
        console.log(`📈 Average results per search: ${(totalRelevantResults / successCount || 0).toFixed(1)}`);
        
        if (successCount === testCases.length) {
            console.log('\n🎉 All RAG searches successful! System is working properly.');
        } else if (successCount > 0) {
            console.log('\n⚠️  Some searches failed, but core functionality is working.');
        } else {
            console.log('\n❌ All searches failed. Check RAG system configuration.');
        }
        
    } catch (error) {
        console.error(`💥 Failed to test RAG system: ${error.message}`);
        console.error(`📄 Stack: ${error.stack}`);
        
        // Try to diagnose the issue
        await diagnoseRAGIssues();
    }
}

async function diagnoseRAGIssues() {
    console.log('\n🔬 Diagnosing RAG System Issues');
    console.log('==============================');
    
    // Check if data files exist
    const ragDataPath = path.join(__dirname, 'server', 'rag_data', 'chunks');
    if (fs.existsSync(ragDataPath)) {
        const files = fs.readdirSync(ragDataPath).filter(f => f.endsWith('.json'));
        console.log(`✅ RAG data files: ${files.length} found`);
    } else {
        console.log(`❌ RAG data directory not found: ${ragDataPath}`);
    }
    
    // Check if vector store file exists
    const vectorStorePath = path.join(__dirname, 'server', 'rag', 'services', 'vector-store.js');
    if (fs.existsSync(vectorStorePath)) {
        console.log(`✅ Vector store service exists`);
    } else {
        console.log(`❌ Vector store service not found: ${vectorStorePath}`);
    }
    
    // Check environment configuration
    console.log('\n📋 Environment Configuration:');
    console.log(`   CHROMA_HOST: ${process.env.CHROMA_HOST || 'Not set'}`);
    console.log(`   CHROMA_PORT: ${process.env.CHROMA_PORT || 'Not set'}`);
    console.log(`   CHROMA_CLOUD_ENABLED: ${process.env.CHROMA_CLOUD_ENABLED || 'Not set'}`);
    console.log(`   RAG_SERVICE_URL: ${process.env.RAG_SERVICE_URL || 'Not set'}`);
}

// Main execution
async function main() {
    console.log('🚀 RAG System Testing with Frontend Configuration');
    console.log('===============================================\n');
    
    await testRAGSearch();
    
    console.log('\n🏁 Testing complete!');
}

main().catch(console.error);