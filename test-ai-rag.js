#!/usr/bin/env node

/**
 * Test AI Service RAG Integration
 */

// Set environment variables for testing
process.env.RAG_SERVICE_URL = 'https://lq458-teachai.hf.space';
process.env.RAG_SERVICE_TOKEN = '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';
process.env.DASHSCOPE_API_KEY = 'test-key'; // Dummy key for testing

async function testAIServiceRAG() {
    console.log('🧪 Testing AI Service RAG Integration');
    console.log('====================================');
    console.log(`🌐 RAG Service: ${process.env.RAG_SERVICE_URL}`);
    console.log(`🔐 Has Token: ${!!process.env.RAG_SERVICE_TOKEN}`);
    console.log();

    try {
        // Test direct Gradio client call
        console.log('🔧 Testing direct Gradio client...');
        const { Client } = require('@gradio/client');
        
        const client = await Client.connect(process.env.RAG_SERVICE_URL, { 
            hf_token: process.env.RAG_SERVICE_TOKEN 
        });
        console.log('✅ Gradio client connected');
        
        // Test search
        const result = await client.predict('/search', {
            query: '数学 小学三年级 分数',
            subject: '数学', 
            grade: '小学三年级',
            limit: 3
        });
        
        console.log('📊 Search result type:', typeof result);
        
        if (result && result.results && result.results.length > 0) {
            console.log('✅ RAG search successful!');
            console.log('📚 Results found:', result.results.length);
            console.log('🎯 Sample content:', result.results[0].content?.substring(0, 100) + '...');
            console.log('📖 Subject:', result.results[0].subject);
            console.log('🎓 Grade:', result.results[0].grade);
            console.log('⭐ Similarity:', (result.results[0].similarity * 100).toFixed(1) + '%');
        } else {
            console.log('⚠️  No results found');
            console.log('📊 Raw result:', JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
        if (error.stack) {
            console.log('📄 Stack:', error.stack.substring(0, 300));
        }
    }
}

testAIServiceRAG();