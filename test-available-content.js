#!/usr/bin/env node

/**
 * Test what educational content is actually available in the HF Space
 */

async function testAvailableContent() {
    console.log('🔍 Testing Available Educational Content in HF Space');
    console.log('==================================================');

    const basicQueries = [
        { name: '数学内容', query: '数学', subject: '全部', grade: '全部' },
        { name: '语文内容', query: '语文', subject: '全部', grade: '全部' },
        { name: '分数概念', query: '分数', subject: '全部', grade: '全部' },
        { name: '小学数学', query: '小学 数学', subject: '全部', grade: '全部' },
        { name: '教学方法', query: '教学', subject: '全部', grade: '全部' }
    ];

    try {
        const { Client } = require('@gradio/client');
        const client = await Client.connect('https://lq458-teachai.hf.space', { 
            hf_token: 'process.env.RAG_SERVICE_TOKEN || "your_huggingface_token_here"' 
        });
        console.log('✅ Connected to HF Space\n');

        for (const query of basicQueries) {
            console.log(`🔍 Testing: ${query.name}`);
            console.log(`📝 Query: "${query.query}"`);

            try {
                const result = await client.predict('/search', {
                    query: query.query,
                    subject: query.subject,
                    grade: query.grade,
                    limit: 3
                });

                if (result && result.results && result.results.length > 0) {
                    console.log(`✅ Found ${result.results.length} results\n`);

                    // Show available subjects and grades
                    const subjects = [...new Set(result.results.map(r => r.subject).filter(s => s && s !== '未知'))];
                    const grades = [...new Set(result.results.map(r => r.grade).filter(g => g && g !== '未知'))];
                    
                    console.log(`📚 Available Subjects: ${subjects.length > 0 ? subjects.join(', ') : 'None tagged'}`);
                    console.log(`🎓 Available Grades: ${grades.length > 0 ? grades.join(', ') : 'None tagged'}`);

                    console.log('\n📄 Sample Results:');
                    for (let i = 0; i < Math.min(result.results.length, 2); i++) {
                        const res = result.results[i];
                        console.log(`\n   Result ${i+1}:`);
                        console.log(`   📖 Source: ${res.book_name}`);
                        console.log(`   📚 Subject: ${res.subject}`);
                        console.log(`   🎓 Grade: ${res.grade}`);
                        console.log(`   💎 Quality: ${(res.quality_score * 100).toFixed(1)}%`);
                        console.log(`   📄 Content: ${res.content.substring(0, 200)}...`);
                    }

                } else {
                    console.log('❌ No results found');
                }

            } catch (error) {
                console.log(`❌ Query failed: ${error.message}`);
                if (error.message.includes('operator')) {
                    console.log('   (This suggests the ChromaDB filter fix hasn\'t deployed yet)');
                }
            }

            console.log('─'.repeat(70));
            console.log();

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Test service stats
        console.log('📊 Checking Service Statistics...');
        try {
            const statsResult = await client.predict('/stats', {});
            if (statsResult && statsResult.data) {
                console.log('📈 Service Stats:', JSON.stringify(statsResult.data, null, 2));
            }
        } catch (error) {
            console.log('⚠️  Could not retrieve service stats');
        }

    } catch (error) {
        console.log('💥 Test failed:', error.message);
    }
}

testAvailableContent();