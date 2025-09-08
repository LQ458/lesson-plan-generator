/**
 * Test authentication debug - minimal lesson plan request
 */

const axios = require('axios');

async function testAuthDebug() {
    console.log("🔍 Testing authentication with detailed debug logs...");
    
    const baseUrl = 'http://localhost:3001';
    
    try {
        // Test lesson plan API directly without auth
        console.log("📤 Making lesson plan request without authentication...");
        const response = await axios.post(`${baseUrl}/api/lesson-plan`, {
            subject: '数学',
            grade: '初中一年级',
            topic: '一元二次方程',
            requirements: ''
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log("✅ Response received:", response.status);
        
    } catch (error) {
        console.log("❌ Request failed:", error.response?.status, error.response?.data || error.message);
        console.log("📄 Response headers:", error.response?.headers);
    }
}

testAuthDebug().catch(console.error);