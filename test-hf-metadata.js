/**
 * Test HuggingFace Space Metadata Fix
 * This script tests if the metadata extraction is working properly
 */

const { Client } = require("@gradio/client");

async function testHFMetadata() {
    console.log("🔬 Testing HuggingFace Space Metadata Fix");
    console.log("==========================================");
    
    try {
        // Connect to HuggingFace Space
        console.log("📡 Connecting to HuggingFace Space...");
        const client = await Client.connect("https://lq458-teachai.hf.space/", {
            hf_token: "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"
        });
        
        console.log("✅ Connected successfully");
        
        // Test 1: Get statistics to check metadata
        console.log("\n📊 Test 1: Checking service statistics...");
        try {
            const statsResult = await client.predict("/stats", {});
            console.log("📈 Statistics result:", JSON.stringify(statsResult.data, null, 2));
            
            if (statsResult.data.data && statsResult.data.data.subjects) {
                const subjects = statsResult.data.data.subjects;
                const hasProperSubjects = Object.keys(subjects).some(subject => 
                    subject !== '未知' && ['数学', '语文', '英语', '物理', '化学'].includes(subject)
                );
                
                if (hasProperSubjects) {
                    console.log("✅ Metadata Fix SUCCESS: Found proper subjects!", Object.keys(subjects).slice(0, 5));
                } else {
                    console.log("❌ Metadata Fix FAILED: Still showing '未知' subjects");
                }
            }
        } catch (statsError) {
            console.log("⚠️  Statistics call failed:", statsError.message);
        }
        
        // Test 2: Search with subject filtering
        console.log("\n🔍 Test 2: Testing search with subject filtering...");
        try {
            const searchResult = await client.predict("/search", {
                query: "数学加法",
                subject: "数学", 
                grade: "二年级",
                limit: 3
            });
            
            console.log("🔍 Search result:", JSON.stringify(searchResult.data, null, 2));
            
            if (searchResult.data.results && searchResult.data.results.length > 0) {
                const result = searchResult.data.results[0];
                const hasProperMetadata = result.subject !== '未知' && result.grade !== '未知';
                
                if (hasProperMetadata) {
                    console.log("✅ Search Metadata SUCCESS:");
                    console.log(`   📚 Subject: ${result.subject}`);
                    console.log(`   🎓 Grade: ${result.grade}`);
                    console.log(`   📄 Content: ${result.content.substring(0, 100)}...`);
                } else {
                    console.log("❌ Search Metadata FAILED: Still showing '未知' in results");
                    console.log(`   📚 Subject: ${result.subject}`);
                    console.log(`   🎓 Grade: ${result.grade}`);
                }
            } else {
                console.log("⚠️  No search results returned");
            }
        } catch (searchError) {
            console.log("⚠️  Search call failed:", searchError.message);
        }
        
        // Test 3: General search to see various metadata
        console.log("\n🔍 Test 3: Testing general search for metadata variety...");
        try {
            const generalResult = await client.predict("/search", {
                query: "学习",
                subject: "全部",
                grade: "全部", 
                limit: 5
            });
            
            if (generalResult.data.results && generalResult.data.results.length > 0) {
                console.log("📋 Sample results metadata:");
                generalResult.data.results.forEach((result, index) => {
                    console.log(`   ${index + 1}. Subject: ${result.subject}, Grade: ${result.grade}`);
                });
                
                const uniqueSubjects = [...new Set(generalResult.data.results.map(r => r.subject))];
                const uniqueGrades = [...new Set(generalResult.data.results.map(r => r.grade))]; 
                
                const hasVariety = uniqueSubjects.length > 1 || uniqueGrades.length > 1;
                const hasProperData = !uniqueSubjects.includes('未知') && !uniqueGrades.includes('未知');
                
                if (hasProperData && hasVariety) {
                    console.log("✅ METADATA VARIETY SUCCESS: Found diverse, proper metadata");
                    console.log(`   📚 Subjects found: ${uniqueSubjects.join(', ')}`);
                    console.log(`   🎓 Grades found: ${uniqueGrades.join(', ')}`);
                } else if (hasProperData) {
                    console.log("⚠️  Metadata is proper but limited variety in this sample");
                } else {
                    console.log("❌ Still finding '未知' metadata in results");
                }
            }
        } catch (generalError) {
            console.log("⚠️  General search failed:", generalError.message);
        }
        
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
    }
    
    console.log("\n🏁 Metadata testing completed!");
}

if (require.main === module) {
    testHFMetadata().catch(console.error);
}

module.exports = testHFMetadata;