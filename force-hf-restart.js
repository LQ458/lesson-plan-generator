/**
 * Force HuggingFace Space Restart and Re-initialization
 * This script tries to force the HF space to reinitialize with the new metadata logic
 */

const { Client } = require("@gradio/client");

async function forceHFRestart() {
    console.log("🔧 Forcing HuggingFace Space Restart and Re-initialization");
    console.log("========================================================");
    
    try {
        // Connect to HuggingFace Space
        console.log("📡 Connecting to HuggingFace Space...");
        const client = await Client.connect("https://lq458-teachai.hf.space/", {
            hf_token: "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"
        });
        
        console.log("✅ Connected successfully");
        
        // Try to initialize the service explicitly
        console.log("\n🚀 Triggering service initialization...");
        try {
            const initFunction = client.predict ? client.predict : null;
            if (initFunction) {
                // The HF space should have an initialization endpoint or trigger
                console.log("📞 Calling initialization...");
                
                // Try different ways to trigger initialization
                const attempts = [
                    // Try to get stats which should trigger initialization
                    () => client.predict("/stats", {}),
                    // Try a simple search to trigger initialization  
                    () => client.predict("/search", {
                        query: "测试",
                        subject: "全部",
                        grade: "全部",
                        limit: 1
                    })
                ];
                
                for (let i = 0; i < attempts.length; i++) {
                    try {
                        console.log(`🔄 Attempt ${i + 1}: Triggering initialization...`);
                        const result = await attempts[i]();
                        console.log("✅ Initialization triggered successfully");
                        
                        // Wait a bit for processing
                        console.log("⏳ Waiting for processing to complete...");
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        
                        // Check if initialization worked by getting stats
                        const statsResult = await client.predict("/stats", {});
                        const subjects = statsResult.data?.data?.subjects || {};
                        const hasProperSubjects = Object.keys(subjects).some(subject => 
                            subject !== '未知' && ['数学', '语文', '英语', '物理', '化学'].includes(subject)
                        );
                        
                        if (hasProperSubjects) {
                            console.log("🎉 SUCCESS! Metadata fix is now working!");
                            console.log("📊 Sample subjects found:", Object.keys(subjects).filter(s => s !== '未知').slice(0, 5));
                            return true;
                        } else {
                            console.log(`⚠️  Attempt ${i + 1}: Still showing '未知' subjects. Trying next approach...`);
                        }
                        
                    } catch (error) {
                        console.log(`❌ Attempt ${i + 1} failed:`, error.message);
                    }
                }
                
                console.log("🔄 All initialization attempts completed. Checking final state...");
                
                // Final check
                const finalStats = await client.predict("/stats", {});
                const finalSubjects = finalStats.data?.data?.subjects || {};
                const finalHasProperSubjects = Object.keys(finalSubjects).some(subject => 
                    subject !== '未知' && ['数学', '语文', '英语', '物理', '化学'].includes(subject)
                );
                
                if (finalHasProperSubjects) {
                    console.log("🎉 FINAL SUCCESS! Metadata is now working correctly!");
                    console.log("📊 Final subjects:", Object.keys(finalSubjects).slice(0, 10));
                } else {
                    console.log("⚠️  The space may need more time to fully reinitialize.");
                    console.log("💡 The collection reset and metadata fix have been deployed.");
                    console.log("🔄 The space should reinitialize on next restart or data reload.");
                }
                
            } else {
                console.log("❌ Unable to find prediction function");
            }
        } catch (initError) {
            console.log("⚠️  Initialization call failed:", initError.message);
        }
        
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
    }
    
    console.log("\n🏁 Restart attempt completed!");
}

if (require.main === module) {
    forceHFRestart().catch(console.error);
}

module.exports = forceHFRestart;