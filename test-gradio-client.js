#!/usr/bin/env node

/**
 * Test Gradio Client Integration
 */

async function testGradioClient() {
    console.log('🔧 Testing Gradio Client Integration');
    console.log('===================================');

    try {
        // Test Gradio client
        const { Client } = require('@gradio/client');
        console.log('📦 Gradio client loaded');
        
        const client = await Client.connect('https://lq458-teachai.hf.space', { 
            hf_token: 'process.env.RAG_SERVICE_TOKEN || "your_huggingface_token_here"' 
        });
        console.log('✅ Gradio client connected successfully');
        
        // Test the search endpoint
        const result = await client.predict('/search', {
            query: '数学',
            subject: '数学',
            grade: '小学三年级',
            limit: 3
        });
        
        console.log('📊 Search result type:', typeof result);
        console.log('📊 Has results:', !!(result && result.results));
        
        if (result && result.results) {
            console.log('📚 Results count:', result.results.length);
            if (result.results.length > 0) {
                console.log('🎯 Sample result:', result.results[0].content?.substring(0, 100) + '...');
                console.log('📚 Subject:', result.results[0].subject);
                console.log('🎓 Grade:', result.results[0].grade);
                console.log('⭐ Similarity:', (result.results[0].similarity * 100).toFixed(1) + '%');
            }
        } else {
            console.log('📊 Raw result:', JSON.stringify(result, null, 2));
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        if (error.stack) {
            console.log('📄 Error stack:', error.stack.substring(0, 500));
        }
    }
}

testGradioClient();