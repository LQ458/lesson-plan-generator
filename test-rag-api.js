#!/usr/bin/env node

/**
 * Test RAG API with exact frontend parameters
 * This replicates the exact calls your frontend makes
 */

// Using built-in fetch (Node.js 18+)

// Configuration from your .env
const RAG_SERVICE_URL = 'https://lq458-teachai.hf.space';
const RAG_SERVICE_TOKEN = 'process.env.RAG_SERVICE_TOKEN || "your_huggingface_token_here"';

async function testRAGService() {
    console.log('🧪 Testing RAG Service with Frontend Parameters');
    console.log('===============================================\n');

    // Test scenarios that match your frontend usage
    const testCases = [
        {
            name: '数学 - 小学三年级 - 分数概念',
            params: {
                query: '数学 小学三年级 分数的基本概念',
                subject: '数学',
                grade: '小学三年级',
                limit: 5
            }
        },
        {
            name: '语文 - 小学二年级 - 汉字学习',
            params: {
                query: '语文 小学二年级 汉字识读',
                subject: '语文', 
                grade: '小学二年级',
                limit: 3
            }
        },
        {
            name: '英语 - 初中一年级 - 基础语法',
            params: {
                query: '英语 初中一年级 语法基础',
                subject: '英语',
                grade: '初中一年级',
                limit: 4
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`🔍 Testing: ${testCase.name}`);
        console.log(`📋 Parameters:`, JSON.stringify(testCase.params, null, 2));
        
        try {
            // Test HF Space API directly
            const response = await fetch(`${RAG_SERVICE_URL}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(RAG_SERVICE_TOKEN && {
                        'Authorization': `Bearer ${RAG_SERVICE_TOKEN}`
                    })
                },
                body: JSON.stringify({
                    data: [
                        testCase.params.query,
                        testCase.params.subject,
                        testCase.params.grade,
                        testCase.params.limit
                    ]
                }),
                timeout: 30000
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Success!');
                console.log(`📊 Results: ${data.results?.length || 0} chunks found`);
                
                if (data.results && data.results.length > 0) {
                    console.log('📚 Sample result:');
                    const sample = data.results[0];
                    console.log(`   Subject: ${sample.subject || 'N/A'}`);
                    console.log(`   Grade: ${sample.grade || 'N/A'}`);
                    console.log(`   Similarity: ${(sample.similarity * 100).toFixed(1)}%`);
                    console.log(`   Quality: ${(sample.quality_score * 100).toFixed(1)}%`);
                    console.log(`   Content preview: ${sample.content?.substring(0, 100)}...`);
                }
                console.log();
                
            } else {
                const errorText = await response.text();
                console.log(`❌ API Error: ${response.status} ${response.statusText}`);
                console.log(`📄 Response: ${errorText}`);
                console.log();
            }

        } catch (error) {
            console.log(`💥 Connection Error: ${error.message}`);
            
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                console.log('🔄 This might indicate the HF Space is rebuilding...');
            }
            console.log();
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function testSpaceStatus() {
    console.log('🏠 Testing HF Space Status');
    console.log('===========================\n');
    
    try {
        const response = await fetch(RAG_SERVICE_URL, {
            timeout: 10000
        });
        
        const html = await response.text();
        
        if (html.includes('95,360')) {
            console.log('✅ HF Space is running and shows correct data count');
        } else if (html.includes('error') || html.includes('Error')) {
            console.log('⚠️  HF Space shows error state - might be rebuilding');
        } else if (html.includes('Building')) {
            console.log('🔨 HF Space is building...');
        } else {
            console.log('🔍 HF Space is running but data count not visible');
        }
        
    } catch (error) {
        console.log(`❌ Cannot reach HF Space: ${error.message}`);
    }
    
    console.log();
}

// Main execution
async function main() {
    console.log('🚀 RAG API Testing with Frontend Configuration');
    console.log('==============================================\n');
    console.log(`📍 Service URL: ${RAG_SERVICE_URL}`);
    console.log(`🔐 Using Token: ${RAG_SERVICE_TOKEN ? 'Yes' : 'No'}`);
    console.log();
    
    await testSpaceStatus();
    await testRAGService();
    
    console.log('🏁 Testing Complete!');
}

main().catch(console.error);