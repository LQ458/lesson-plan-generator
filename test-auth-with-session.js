/**
 * Test authentication with session cookie
 */

const axios = require('axios');

async function testAuthWithSession() {
    console.log("🔍 Testing authentication with session cookie...");
    
    const baseUrl = 'http://localhost:3001';
    
    try {
        // Step 1: Register user first
        console.log("📝 Step 1: Register a test user...");
        
        try {
            const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
                username: 'testuser2',
                email: 'test2@test.com',
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
            
            console.log("✅ Registration successful!");
        } catch (regError) {
            if (regError.response?.status !== 400) {  // 400 means user already exists, which is OK
                console.log("❌ Registration failed:", regError.response?.data || regError.message);
                return;
            } else {
                console.log("ℹ️  User already exists, proceeding with login...");
            }
        }
        
        // Step 2: Login to get session cookie
        console.log("🔐 Step 2: Login to get session cookie...");
        
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'test2@test.com',
            password: 'password123'
        }, {
            timeout: 5000,
            withCredentials: true,  // This is important for cookies
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log("✅ Login successful!");
        console.log("📄 Login response:", {
            status: loginResponse.status,
            data: loginResponse.data,
            cookies: loginResponse.headers['set-cookie']
        });
        
        // Extract cookies for next request
        const cookies = loginResponse.headers['set-cookie'];
        let cookieHeader = '';
        if (cookies) {
            cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        }
        
        console.log("🍪 Cookie header for next request:", cookieHeader);
        
        // Step 3: Use session cookie for lesson plan request
        console.log("\\n📚 Step 3: Make lesson plan request with session cookie...");
        
        const lessonResponse = await axios.post(`${baseUrl}/api/lesson-plan`, {
            subject: '数学',
            grade: '初中一年级', 
            topic: '一元二次方程',
            requirements: ''
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader
            }
        });
        
        console.log("🎉 Lesson plan request successful!");
        console.log("📄 Response status:", lessonResponse.status);
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log("❌ Authentication failed:", error.response.data);
        } else {
            console.log("❌ Request failed:", error.response?.status, error.response?.data || error.message);
        }
    }
}

testAuthWithSession().catch(console.error);