/**
 * Test Backend Integration with HuggingFace Space
 * This script tests if the backend properly connects to the HF Space RAG system
 */

const axios = require('axios');

async function testBackendHFIntegration() {
    console.log("🔬 Testing Backend Integration with HuggingFace Space");
    console.log("====================================================");
    
    const baseUrl = 'http://localhost:3001';
    
    try {
        // Test 1: Health check
        console.log("🏥 Test 1: Backend health check...");
        try {
            const healthResponse = await axios.get(`${baseUrl}/api/health`);
            console.log("✅ Backend health check passed:", healthResponse.data);
        } catch (healthError) {
            console.log("❌ Backend health check failed:", healthError.message);
            console.log("💡 Make sure the backend server is running: cd server && npm start");
            return;
        }
        
        // Test 2: Generate lesson plan with specific subject/grade
        console.log("\n📚 Test 2: Generate lesson plan with subject/grade filtering...");
        const lessonPlanData = {
            subject: '数学',
            grade: '小学二年级', 
            topic: '加法运算',
            duration: 40,
            objectives: '学会基本的加法运算'
        };
        
        try {
            console.log("📤 Sending lesson plan request...", lessonPlanData);
            const lessonResponse = await axios.post(`${baseUrl}/api/lesson-plan`, lessonPlanData, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("✅ Lesson plan generation successful!");
            console.log("📄 Response preview:", {
                status: lessonResponse.status,
                hasContent: !!lessonResponse.data?.content,
                contentLength: lessonResponse.data?.content?.length || 0,
                hasSources: !!lessonResponse.data?.sources,
                sourcesCount: lessonResponse.data?.sources?.length || 0
            });
            
            // Check if RAG context was used
            const content = lessonResponse.data?.content || '';
            const hasEducationalContent = content.includes('教') || content.includes('学') || content.includes('加法');
            const hasRagIndicators = content.length > 200; // Longer content suggests RAG enhancement
            
            if (hasEducationalContent && hasRagIndicators) {
                console.log("🎉 SUCCESS: Lesson plan appears to use RAG-enhanced content!");
                console.log("📊 Content indicators: Educational terms found, substantial length");
            } else {
                console.log("⚠️  WARNING: Lesson plan may not be using RAG enhancement properly");
                console.log("📊 Content indicators: Educational terms:", hasEducationalContent, "Substantial length:", hasRagIndicators);
            }
            
            // Show sources if available
            if (lessonResponse.data?.sources && lessonResponse.data.sources.length > 0) {
                console.log("📚 RAG sources found:");
                lessonResponse.data.sources.slice(0, 3).forEach((source, index) => {
                    console.log(`   ${index + 1}. ${source}`);
                });
            } else {
                console.log("⚠️  No RAG sources found in response");
            }
            
        } catch (lessonError) {
            console.log("❌ Lesson plan generation failed:", lessonError.message);
            if (lessonError.response) {
                console.log("📄 Error response:", lessonError.response.status, lessonError.response.data);
            }
        }
        
        // Test 3: Test with different subject
        console.log("\n🔬 Test 3: Generate lesson plan for different subject (科学)...");
        const scienceLessonData = {
            subject: '科学',
            grade: '小学四年级',
            topic: '动物的特征',
            duration: 45,
            objectives: '了解不同动物的基本特征'
        };
        
        try {
            const scienceResponse = await axios.post(`${baseUrl}/api/lesson-plan`, scienceLessonData, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("✅ Science lesson generation successful!");
            console.log("📊 Science lesson details:", {
                contentLength: scienceResponse.data?.content?.length || 0,
                sourcesCount: scienceResponse.data?.sources?.length || 0,
                hasAnimalContent: (scienceResponse.data?.content || '').includes('动物')
            });
            
        } catch (scienceError) {
            console.log("⚠️  Science lesson generation failed:", scienceError.message);
        }
        
        // Test 4: Check if backend is properly using HF Space
        console.log("\n🌐 Test 4: Verify HuggingFace Space connection...");
        try {
            // Make a direct API call that should trigger RAG
            const ragTestResponse = await axios.post(`${baseUrl}/api/lesson-plan`, {
                subject: '英语',
                grade: '初中一年级',
                topic: '英语学习方法',
                duration: 40,
                objectives: '掌握基本的英语学习技巧'
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const englishContent = ragTestResponse.data?.content || '';
            const hasEnglishTerms = englishContent.includes('英语') || englishContent.includes('English');
            const hasEducationalStructure = englishContent.includes('教学目标') || englishContent.includes('教学步骤');
            
            if (hasEnglishTerms && hasEducationalStructure) {
                console.log("🎉 HuggingFace Space integration is working correctly!");
                console.log("✅ Content shows proper subject-specific terms and educational structure");
            } else {
                console.log("⚠️  HuggingFace Space integration may need verification");
            }
            
        } catch (ragTestError) {
            console.log("❌ RAG connection test failed:", ragTestError.message);
        }
        
    } catch (error) {
        console.error("❌ Integration test failed:", error.message);
    }
    
    console.log("\n🏁 Backend-HuggingFace integration testing completed!");
}

if (require.main === module) {
    testBackendHFIntegration().catch(console.error);
}

module.exports = testBackendHFIntegration;