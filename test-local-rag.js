#!/usr/bin/env node

/**
 * Test Local RAG System Integration
 * This tests the actual AI service with RAG integration
 */

const fs = require('fs');
const path = require('path');

async function testLocalRAGIntegration() {
    console.log('🧪 Testing Local RAG System Integration');
    console.log('=====================================\n');

    try {
        // Load AI service
        const aiServicePath = path.join(__dirname, 'server', 'ai-service.js');
        
        if (!fs.existsSync(aiServicePath)) {
            throw new Error('AI service not found at: ' + aiServicePath);
        }
        
        console.log('📦 Loading AI service...');
        
        // Import the AI service
        const aiService = require(aiServicePath);
        
        console.log('✅ AI service loaded successfully');
        console.log();
        
        // Test RAG search functionality
        const testCases = [
            {
                name: '数学分数概念测试',
                query: '数学 小学三年级 分数的基本概念',
                subject: '数学',
                grade: '小学三年级'
            },
            {
                name: '语文汉字学习测试', 
                query: '语文 小学二年级 汉字识读',
                subject: '语文',
                grade: '小学二年级'
            }
        ];

        for (const testCase of testCases) {
            console.log(`🔍 ${testCase.name}`);
            console.log(`📋 Query: "${testCase.query}"`);
            
            try {
                // Test the search functionality directly
                const searchResult = await testRAGSearch(testCase.query, testCase.subject, testCase.grade);
                
                if (searchResult.success) {
                    console.log(`✅ RAG Search Success: ${searchResult.count} results found`);
                    if (searchResult.results && searchResult.results.length > 0) {
                        const sample = searchResult.results[0];
                        console.log(`📚 Sample result: ${sample.content?.substring(0, 100)}...`);
                        console.log(`🎯 Relevance: ${(sample.similarity * 100).toFixed(1)}%`);
                    }
                } else {
                    console.log(`⚠️  RAG Search Failed: ${searchResult.error}`);
                }
                
            } catch (error) {
                console.log(`❌ Test Error: ${error.message}`);
            }
            
            console.log();
        }
        
    } catch (error) {
        console.error(`💥 Failed to load AI service: ${error.message}`);
        console.log();
        
        // Alternative: Test vector store directly
        await testVectorStoreDirect();
    }
}

async function testRAGSearch(query, subject, grade) {
    // Simulate the RAG search that would be called by AI service
    try {
        const vectorStorePath = path.join(__dirname, 'server', 'rag', 'services', 'vector-store.js');
        
        if (fs.existsSync(vectorStorePath)) {
            const VectorStore = require(vectorStorePath);
            const vectorStore = new VectorStore();
            
            // Perform search
            const results = await vectorStore.searchSimilar(query, {
                subject,
                grade,
                limit: 5
            });
            
            return {
                success: true,
                count: results.length,
                results
            };
        } else {
            throw new Error('Vector store not found');
        }
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function testVectorStoreDirect() {
    console.log('🎯 Testing Vector Store Directly');
    console.log('================================\n');
    
    try {
        const vectorStorePath = path.join(__dirname, 'server', 'rag', 'services', 'vector-store.js');
        
        if (!fs.existsSync(vectorStorePath)) {
            console.log('❌ Vector store file not found');
            return;
        }
        
        console.log('📦 Loading vector store...');
        const VectorStore = require(vectorStorePath);
        
        console.log('✅ Vector store loaded');
        console.log();
        
        // Test initialization
        const vectorStore = new VectorStore();
        console.log('🔧 Vector store initialized');
        
        // Test simple search
        const testQuery = '数学 分数';
        console.log(`🔍 Testing search: "${testQuery}"`);
        
        const results = await vectorStore.searchSimilar(testQuery, { limit: 3 });
        
        console.log(`📊 Found ${results.length} results`);
        
        if (results.length > 0) {
            results.forEach((result, index) => {
                console.log(`📚 Result ${index + 1}: ${result.content?.substring(0, 80)}...`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Vector store test failed: ${error.message}`);
    }
}

async function checkRAGDataAvailability() {
    console.log('📋 Checking RAG Data Availability');
    console.log('=================================\n');
    
    const ragDataPath = path.join(__dirname, 'server', 'rag_data', 'chunks');
    
    if (fs.existsSync(ragDataPath)) {
        const files = fs.readdirSync(ragDataPath).filter(f => f.endsWith('.json'));
        console.log(`✅ Found ${files.length} RAG data files`);
        
        // Check a sample file
        if (files.length > 0) {
            const sampleFile = path.join(ragDataPath, files[0]);
            const sampleData = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
            console.log(`📊 Sample file contains ${sampleData.length} chunks`);
            console.log(`📚 Sample content: ${sampleData[0]?.content?.substring(0, 100)}...`);
        }
    } else {
        console.log('❌ RAG data directory not found');
    }
    
    console.log();
}

// Main execution
async function main() {
    console.log('🚀 Local RAG System Testing');
    console.log('===========================\n');
    
    await checkRAGDataAvailability();
    await testLocalRAGIntegration();
    
    console.log('🏁 Local testing complete!');
}

main().catch(console.error);