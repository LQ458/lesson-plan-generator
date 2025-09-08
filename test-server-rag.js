#!/usr/bin/env node

/**
 * Test RAG API exactly as your server calls it
 * This replicates the exact server-side call from ai-service.js
 */

const RAG_SERVICE_URL = 'https://lq458-teachai.hf.space';
const RAG_SERVICE_TOKEN = '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';

async function testServerRAGCall() {
    console.log('🖥️  Testing RAG API as Server Calls It');
    console.log('=====================================\n');
    console.log(`🌐 Service URL: ${RAG_SERVICE_URL}`);
    console.log(`🔐 Token: ${RAG_SERVICE_TOKEN ? 'Configured' : 'None'}\n`);

    const testCases = [
        {
            name: '数学分数概念',
            ragQuery: '数学 小学三年级 分数',
            subject: '数学',
            grade: '小学三年级'
        },
        {
            name: '语文汉字识读',
            ragQuery: '语文 小学二年级 汉字',
            subject: '语文',
            grade: '小学二年级'
        }
    ];

    for (const testCase of testCases) {
        console.log(`🧪 Testing: ${testCase.name}`);
        console.log(`📋 Query: "${testCase.ragQuery}"`);
        console.log(`🎯 Subject: ${testCase.subject}, Grade: ${testCase.grade}`);

        try {
            // Replicate exact server call from ai-service.js lines 311-320
            const headers = {
                'Content-Type': 'application/json',
            };
            if (RAG_SERVICE_TOKEN) {
                headers['Authorization'] = `Bearer ${RAG_SERVICE_TOKEN}`;
            }

            const response = await fetch(`${RAG_SERVICE_URL}/api/search`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    data: [testCase.ragQuery, testCase.subject, testCase.grade, 5]
                })
            });

            console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`❌ RAG API Error: ${response.status} ${response.statusText}`);
                console.log(`📄 Error Details: ${errorText}`);
                
                if (response.status === 422) {
                    console.log('💡 This indicates API format issue - space is working but expects different format');
                } else if (response.status === 503) {
                    console.log('⚠️  Service unavailable - space might be building/loading');
                } else if (response.status === 404) {
                    console.log('✅ Space is working but expects Gradio client format');
                }
            } else {
                const ragResults = await response.json();
                console.log('✅ Success!');
                console.log(`📊 Results: ${ragResults.results?.length || 0} found`);

                if (ragResults.results && ragResults.results.length > 0) {
                    const sample = ragResults.results[0];
                    console.log('📚 Sample result:');
                    console.log(`   Content: ${sample.content?.substring(0, 100)}...`);
                    console.log(`   Subject: ${sample.subject}`);
                    console.log(`   Grade: ${sample.grade}`);
                    console.log(`   Similarity: ${(sample.similarity * 100).toFixed(1)}%`);
                }
            }

        } catch (error) {
            console.log(`💥 Connection Error: ${error.message}`);
            
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                console.log('🔄 Network timeout - space might be rebuilding');
            } else if (error.message.includes('fetch')) {
                console.log('🌐 Network connectivity issue');
            }
        }

        console.log('─'.repeat(50));
        console.log();

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function checkSpaceStatus() {
    console.log('🏠 Checking HF Space Status');
    console.log('============================\n');

    try {
        const response = await fetch(RAG_SERVICE_URL, { timeout: 10000 });
        const html = await response.text();
        
        console.log(`📡 Space HTTP Status: ${response.status}`);
        
        if (html.includes('TeachAI RAG Service')) {
            console.log('✅ Space is running and showing correct interface');
        } else if (html.includes('Building')) {
            console.log('🔨 Space is building...');
        } else if (html.includes('Error') || html.includes('error')) {
            console.log('❌ Space shows error state');
        } else {
            console.log('🔍 Space is running but interface not fully loaded');
        }
        
        console.log();
        
    } catch (error) {
        console.log(`❌ Cannot reach space: ${error.message}\n`);
    }
}

// Main execution
async function main() {
    console.log('🚀 Server RAG API Testing');
    console.log('=========================\n');
    
    await checkSpaceStatus();
    await testServerRAGCall();
    
    console.log('🏁 Testing Complete!');
    console.log('\n💡 Summary:');
    console.log('   - If getting 404/422: Space is working but needs Gradio client format');
    console.log('   - If getting 503: Space is stuck in loading (our optimizations should fix this)');
    console.log('   - If getting timeouts: Space is rebuilding');
    console.log('   - If successful: RAG system is fully functional');
}

main().catch(console.error);