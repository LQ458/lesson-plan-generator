#!/usr/bin/env node

/**
 * Test Actual Search Output from HF Space RAG System
 * This will show the real search results to verify authenticity
 */

async function testActualSearchOutput() {
    console.log('🔍 Testing Actual Search Output from HF Space RAG System');
    console.log('=====================================================\n');

    try {
        const { Client } = require('@gradio/client');
        
        console.log('🌐 Connecting to HF Space...');
        const client = await Client.connect('https://lq458-teachai.hf.space', {
            hf_token: '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'
        });
        console.log('✅ Connected successfully!\n');

        // Test queries that should return actual educational content
        const testQueries = [
            {
                name: '小学数学加法问题',
                query: '加法 计算 数学题',
                description: 'Elementary math addition problems'
            },
            {
                name: '地理知识查询', 
                query: '中国地理 河流 山脉',
                description: 'Chinese geography - rivers and mountains'
            },
            {
                name: '化学基础概念',
                query: '化学反应 元素 实验',
                description: 'Chemistry reactions and experiments'
            }
        ];

        for (const testQuery of testQueries) {
            console.log(`🧪 Test Query: ${testQuery.name}`);
            console.log(`📝 Query: "${testQuery.query}"`);
            console.log(`📖 Description: ${testQuery.description}`);
            console.log('─'.repeat(60));

            try {
                const result = await client.predict('/search', {
                    query: testQuery.query,
                    subject: '全部',
                    grade: '全部', 
                    limit: 3
                });

                if (result && result.results && result.results.length > 0) {
                    console.log(`✅ Found ${result.results.length} results\n`);

                    result.results.forEach((res, i) => {
                        console.log(`📄 Result ${i + 1}:`);
                        console.log(`   🎯 Relevance: ${(res.similarity * 100).toFixed(1)}%`);
                        console.log(`   🏆 Quality: ${(res.quality_score * 100).toFixed(1)}%`);
                        console.log(`   📚 Subject: ${res.subject}`);
                        console.log(`   🎓 Grade: ${res.grade}`);
                        console.log(`   📖 Source: ${res.book_name}`);
                        console.log(`   📝 Content:`);
                        console.log(`      ${res.content.substring(0, 300)}...`);
                        console.log();
                    });

                    // Analyze content authenticity
                    console.log('🔬 AUTHENTICITY ANALYSIS:');
                    let authenticResults = 0;
                    
                    result.results.forEach((res, i) => {
                        const content = res.content.toLowerCase();
                        
                        // Check for educational markers
                        const hasEducationalTerms = ['练习', '题目', '学习', '单元', '课', '章', '年级'].some(term => content.includes(term));
                        const hasChineseContent = /[\u4e00-\u9fff]/.test(content);
                        const hasMathContent = /[0-9]+\s*[+\-×÷=]\s*[0-9]/.test(content) || content.includes('数学') || content.includes('计算');
                        const hasGeographyContent = content.includes('地理') || content.includes('河流') || content.includes('山脉') || content.includes('中国');
                        const hasChemistryContent = content.includes('化学') || content.includes('反应') || content.includes('元素');
                        
                        const relevantContent = hasEducationalTerms || hasMathContent || hasGeographyContent || hasChemistryContent;
                        
                        if (hasChineseContent && relevantContent && res.quality_score > 0.5) {
                            authenticResults++;
                            console.log(`   ✅ Result ${i + 1}: AUTHENTIC educational content`);
                        } else {
                            console.log(`   ⚠️  Result ${i + 1}: Questionable authenticity`);
                        }
                    });
                    
                    const authenticityRate = (authenticResults / result.results.length) * 100;
                    console.log(`   📊 Authenticity Rate: ${authenticityRate.toFixed(1)}%`);

                } else {
                    console.log('❌ No results found');
                }

            } catch (searchError) {
                console.log(`❌ Search failed: ${searchError.message}`);
            }

            console.log('\n' + '='.repeat(80) + '\n');
            
            // Wait between queries
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('🎯 FINAL ASSESSMENT:');
        console.log('===================');
        console.log('Based on the actual search results above, you can verify:');
        console.log('1. 📚 Content Quality: Check the quality scores and relevance percentages');
        console.log('2. 🎓 Educational Value: Look for authentic educational terminology and structure');
        console.log('3. 📖 Source Authenticity: Examine the book names and content previews');
        console.log('4. 🏫 Subject Coverage: Verify appropriate content for different subjects');
        console.log('5. 🔬 Content Depth: Assess whether content matches expected educational standards');

        console.log('\n💡 Note: Subject/Grade may show as "未知" due to metadata extraction issue');
        console.log('This is a display bug that will be fixed when the updated code is deployed.');

    } catch (error) {
        console.log(`💥 Test failed: ${error.message}`);
        console.log('\n🔧 Troubleshooting:');
        console.log('- Check internet connection');  
        console.log('- Verify HF Space is running');
        console.log('- Confirm API token is valid');
    }
}

testActualSearchOutput();