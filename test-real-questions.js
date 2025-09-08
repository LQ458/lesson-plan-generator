#!/usr/bin/env node

/**
 * Test HF Space with Real Educational Questions
 * Verify returns are valid and reasonable for actual teaching scenarios
 */

async function testRealEducationalQuestions() {
    console.log('🎓 Testing HF Space with Real Educational Questions');
    console.log('==================================================');

    const realQuestions = [
        {
            name: '数学分数教学',
            query: '小学三年级分数的认识教学重点和难点',
            subject: '数学',
            grade: '小学三年级',
            expectedTopics: ['分数', '分子', '分母', '整体', '部分']
        },
        {
            name: '语文古诗词',
            query: '小学二年级古诗词朗读教学方法',
            subject: '语文', 
            grade: '小学二年级',
            expectedTopics: ['朗读', '古诗', '韵律', '理解']
        },
        {
            name: '英语字母学习',
            query: '小学一年级英语字母教学游戏活动',
            subject: '英语',
            grade: '小学一年级',
            expectedTopics: ['字母', 'ABC', '游戏', '活动']
        },
        {
            name: '科学实验',
            query: '小学四年级科学实验安全注意事项',
            subject: '科学',
            grade: '小学四年级',
            expectedTopics: ['实验', '安全', '操作', '注意']
        },
        {
            name: '物理力学基础',
            query: '初中二年级力和运动的关系',
            subject: '物理',
            grade: '初中二年级',
            expectedTopics: ['力', '运动', '速度', '加速度']
        }
    ];

    let successCount = 0;
    let totalRelevance = 0;
    let detailedResults = [];

    try {
        const { Client } = require('@gradio/client');
        const client = await Client.connect('https://lq458-teachai.hf.space', { 
            hf_token: 'process.env.RAG_SERVICE_TOKEN || "your_huggingface_token_here"' 
        });
        console.log('✅ Connected to HF Space\n');

        for (const question of realQuestions) {
            console.log(`📚 Testing: ${question.name}`);
            console.log(`❓ Question: "${question.query}"`);
            console.log(`🎯 Subject: ${question.subject} | Grade: ${question.grade}`);

            try {
                const result = await client.predict('/search', {
                    query: question.query,
                    subject: question.subject,
                    grade: question.grade,
                    limit: 5
                });

                if (result && result.results && result.results.length > 0) {
                    successCount++;
                    console.log(`✅ Found ${result.results.length} results`);

                    // Analyze quality and relevance
                    let relevantResults = 0;
                    let totalQuality = 0;
                    let topicMatches = 0;

                    console.log('\n📊 Result Analysis:');
                    for (let i = 0; i < Math.min(result.results.length, 3); i++) {
                        const res = result.results[i];
                        const similarity = res.similarity * 100;
                        const quality = res.quality_score * 100;
                        
                        console.log(`\n🔍 Result ${i+1}:`);
                        console.log(`   📖 Source: ${res.book_name || 'Unknown'}`);
                        console.log(`   📚 Subject: ${res.subject} | Grade: ${res.grade}`);
                        console.log(`   ⭐ Similarity: ${similarity.toFixed(1)}%`);
                        console.log(`   💎 Quality: ${quality.toFixed(1)}%`);
                        console.log(`   📄 Content Preview: ${res.content.substring(0, 150)}...`);

                        // Check topic relevance
                        const content = res.content.toLowerCase();
                        const matchingTopics = question.expectedTopics.filter(topic => 
                            content.includes(topic) || content.includes(topic.toLowerCase())
                        );
                        
                        if (matchingTopics.length > 0) {
                            topicMatches++;
                            console.log(`   🎯 Matching Topics: ${matchingTopics.join(', ')}`);
                        }

                        if (similarity > 50) relevantResults++;
                        totalQuality += quality;
                    }

                    const avgQuality = totalQuality / Math.min(result.results.length, 3);
                    const relevanceScore = (relevantResults / Math.min(result.results.length, 3)) * 100;
                    const topicRelevance = (topicMatches / Math.min(result.results.length, 3)) * 100;
                    
                    totalRelevance += relevanceScore;

                    console.log(`\n📈 Quality Metrics:`);
                    console.log(`   📊 Average Quality: ${avgQuality.toFixed(1)}%`);
                    console.log(`   🎯 Relevance Score: ${relevanceScore.toFixed(1)}%`);
                    console.log(`   📝 Topic Match Rate: ${topicRelevance.toFixed(1)}%`);

                    // Determine if results are reasonable
                    const isReasonable = avgQuality > 70 && (relevanceScore > 30 || topicMatches > 0);
                    console.log(`   ✅ Results Quality: ${isReasonable ? '良好 (Good)' : '需改进 (Needs Improvement)'}`);

                    detailedResults.push({
                        question: question.name,
                        resultsCount: result.results.length,
                        avgQuality: avgQuality,
                        relevanceScore: relevanceScore,
                        topicMatches: topicMatches,
                        isReasonable: isReasonable
                    });

                } else {
                    console.log('❌ No results found');
                    detailedResults.push({
                        question: question.name,
                        resultsCount: 0,
                        avgQuality: 0,
                        relevanceScore: 0,
                        topicMatches: 0,
                        isReasonable: false
                    });
                }

            } catch (error) {
                console.log(`❌ Query failed: ${error.message}`);
            }

            console.log('─'.repeat(80));
            console.log();

            // Wait between requests to avoid overwhelming the service
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Final Summary
        console.log('🎯 FINAL ASSESSMENT');
        console.log('==================');
        console.log(`📊 Successful Queries: ${successCount}/${realQuestions.length}`);
        console.log(`📈 Average Relevance: ${(totalRelevance / successCount || 0).toFixed(1)}%`);
        
        const reasonableResults = detailedResults.filter(r => r.isReasonable).length;
        console.log(`✅ Reasonable Results: ${reasonableResults}/${realQuestions.length} (${(reasonableResults/realQuestions.length*100).toFixed(1)}%)`);

        console.log('\n📋 Detailed Assessment:');
        detailedResults.forEach(result => {
            console.log(`   ${result.isReasonable ? '✅' : '❌'} ${result.question}: ${result.resultsCount} results, ${result.avgQuality.toFixed(1)}% quality, ${result.topicMatches} topic matches`);
        });

        if (reasonableResults >= realQuestions.length * 0.8) {
            console.log('\n🎉 VERDICT: RAG system returns are VALID and REASONABLE for educational use!');
        } else if (reasonableResults >= realQuestions.length * 0.6) {
            console.log('\n⚠️  VERDICT: RAG system shows promising results but needs some improvements');
        } else {
            console.log('\n❌ VERDICT: RAG system needs significant improvements for educational use');
        }

    } catch (error) {
        console.log('💥 Test failed:', error.message);
    }
}

testRealEducationalQuestions();