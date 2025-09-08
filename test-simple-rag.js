#!/usr/bin/env node

/**
 * Test Simple RAG Search (no filters)
 */

async function testSimpleRAG() {
    console.log('🧪 Testing Simple RAG Search (No Filters)');
    console.log('=========================================');

    try {
        const { Client } = require('@gradio/client');
        
        const client = await Client.connect('https://lq458-teachai.hf.space', { 
            hf_token: 'process.env.RAG_SERVICE_TOKEN || "your_huggingface_token_here"' 
        });
        console.log('✅ Gradio client connected');
        
        // Test search without filters
        const result = await client.predict('/search', {
            query: '数学分数',
            subject: '全部',  // No filter
            grade: '全部',    // No filter
            limit: 3
        });
        
        console.log('📊 Search result type:', typeof result);
        
        if (result && result.results && result.results.length > 0) {
            console.log('✅ RAG search successful!');
            console.log('📚 Results found:', result.results.length);
            for (let i = 0; i < Math.min(result.results.length, 2); i++) {
                const res = result.results[i];
                console.log(`\n🎯 Result ${i+1}:`);
                console.log(`   Content: ${res.content?.substring(0, 100)}...`);
                console.log(`   Subject: ${res.subject || 'Unknown'}`);
                console.log(`   Grade: ${res.grade || 'Unknown'}`);
                console.log(`   Similarity: ${(res.similarity * 100).toFixed(1)}%`);
            }
        } else if (result && result.data && result.data[0] && result.data[0].error) {
            console.log('❌ Search error:', result.data[0].error);
        } else {
            console.log('⚠️  No results found');
            console.log('📊 Raw result:', JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testSimpleRAG();