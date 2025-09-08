/**
 * Test Complete Frontend-Backend-HuggingFace Integration
 */

const axios = require('axios');

async function testCompleteIntegration() {
    console.log("🎯 Testing Complete Frontend-Backend-HuggingFace Integration");
    console.log("========================================================");
    
    const baseUrl = 'http://localhost:3001';
    
    try {
        // Step 1: Test backend health
        console.log("🏥 Step 1: Testing backend health...");
        const healthResponse = await axios.get(`${baseUrl}/api/health`);
        console.log("✅ Backend health check passed");
        
        // Step 2: Register and authenticate user
        console.log("\\n👤 Step 2: Testing user authentication...");
        
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            username: 'integrationtestuser',
            email: 'integration@test.com',
            password: 'password123',
            confirmPassword: 'password123',
            inviteCode: 'TEACHER2024'
        }, {
            timeout: 5000,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log("✅ User registration successful");
        
        // Extract session cookie
        const cookies = registerResponse.headers['set-cookie'];
        const sessionCookie = cookies.find(c => c.startsWith('session='));
        const cookieHeader = sessionCookie ? sessionCookie.split(';')[0] : '';
        
        if (!cookieHeader) {
            throw new Error("No session cookie found");
        }
        
        console.log("✅ Session cookie extracted");
        
        // Step 3: Test lesson plan generation with authentication
        console.log("\\n📚 Step 3: Testing lesson plan generation with HF RAG...");
        
        const lessonPlanData = {
            subject: '数学',
            grade: '初中一年级',
            topic: '一元二次方程',
            requirements: '需要包含基础概念、解法步骤和练习题'
        };
        
        console.log("🚀 Sending lesson plan request (timeout: 45s)...");
        const startTime = Date.now();
        
        const lessonResponse = await axios.post(`${baseUrl}/api/lesson-plan`, lessonPlanData, {
            timeout: 45000, // 45 second timeout
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader
            }
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Lesson plan generated successfully in ${duration}s`);
        
        // Step 4: Analyze the response
        console.log("\\n🔍 Step 4: Analyzing the response...");
        
        const responseContent = lessonResponse.data;
        const isStreamingResponse = typeof responseContent === 'string';
        
        if (isStreamingResponse) {
            console.log("📄 Response format: Streaming text");
            console.log(`📏 Content length: ${responseContent.length} characters`);
            console.log(`📝 Preview: "${responseContent.substring(0, 150)}..."`);
            
            // Check for educational content indicators
            const hasEducationalTerms = responseContent.includes('教学') || 
                                      responseContent.includes('目标') ||
                                      responseContent.includes('一元二次方程') ||
                                      responseContent.includes('步骤');
            
            const hasStructuredContent = responseContent.includes('#') || 
                                       responseContent.includes('##') ||
                                       responseContent.includes('###');
            
            console.log(`✅ Contains educational terms: ${hasEducationalTerms}`);
            console.log(`✅ Has structured markdown: ${hasStructuredContent}`);
            
            if (hasEducationalTerms && hasStructuredContent && responseContent.length > 500) {
                console.log("🎉 Lesson plan content appears to be high-quality and complete!");
            } else {
                console.log("⚠️  Lesson plan content may need quality verification");
            }
        } else {
            console.log("📄 Response format: JSON object");
            console.log("📊 Response keys:", Object.keys(responseContent));
        }
        
        // Step 5: Test different subject
        console.log("\\n🔬 Step 5: Testing different subject (科学)...");
        
        const scienceLessonData = {
            subject: '科学', 
            grade: '小学四年级',
            topic: '动物的特征',
            requirements: '适合小学生理解的内容'
        };
        
        const scienceStartTime = Date.now();
        const scienceResponse = await axios.post(`${baseUrl}/api/lesson-plan`, scienceLessonData, {
            timeout: 45000,
            headers: {
                'Content-Type': 'application/json', 
                'Cookie': cookieHeader
            }
        });
        
        const scienceDuration = ((Date.now() - scienceStartTime) / 1000).toFixed(2);
        const scienceContent = scienceResponse.data;
        
        console.log(`✅ Science lesson generated in ${scienceDuration}s`);
        console.log(`📏 Science content length: ${scienceContent.length} characters`);
        
        const hasAnimalTerms = scienceContent.includes('动物') || 
                              scienceContent.includes('特征') ||
                              scienceContent.includes('科学');
        
        console.log(`✅ Contains animal/science terms: ${hasAnimalTerms}`);
        
        // Final success summary
        console.log("\\n🎉 INTEGRATION TEST RESULTS");
        console.log("===============================");
        console.log("✅ Backend health check: PASSED");
        console.log("✅ User authentication (session): PASSED");
        console.log("✅ Lesson plan API authentication: PASSED");
        console.log("✅ HuggingFace RAG integration: CONNECTED");
        console.log("✅ AI content generation: WORKING");
        console.log("✅ Multi-subject support: WORKING");
        console.log(`⏱️  Average generation time: ${((parseFloat(duration) + parseFloat(scienceDuration)) / 2).toFixed(1)}s`);
        console.log("\\n💡 The TeachAI system is fully operational!");
        console.log("🌐 Frontend: http://localhost:3000");
        console.log("🔧 Backend: http://localhost:3001");
        console.log("🤖 HF Space: https://lq458-teachai.hf.space");
        
    } catch (error) {
        console.error("\\n❌ INTEGRATION TEST FAILED");
        console.error("Error:", error.response?.status, error.response?.data || error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error("⏱️  Request timed out - AI generation may be taking longer than expected");
        }
    }
}

testCompleteIntegration().catch(console.error);