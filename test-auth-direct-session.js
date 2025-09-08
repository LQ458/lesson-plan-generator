/**
 * Test authentication using session from registration directly
 */

const axios = require('axios');

async function testAuthDirectSession() {
    console.log("🔍 Testing authentication using registration session...");
    
    const baseUrl = 'http://localhost:3001';
    
    try {
        // Step 1: Register user to get session cookie
        console.log("📝 Step 1: Register a test user to get session...");
        
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            username: 'directtestuser',
            email: 'directtest@test.com',
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
        console.log("📄 Registration response:", {
            status: registerResponse.status,
            data: registerResponse.data,
            setCookieHeaders: registerResponse.headers['set-cookie']
        });
        
        // Extract cookies for next request
        const cookies = registerResponse.headers['set-cookie'];
        let cookieHeader = '';
        if (cookies) {
            cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
            console.log("🍪 Extracted session cookie:", cookieHeader);
        } else {
            console.log("❌ No cookies found in registration response");
            return;
        }
        
        // Step 2: Use registration session cookie for lesson plan request 
        console.log("\\n📚 Step 2: Make lesson plan request with registration session...");
        
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
        
        console.log("🎉 Lesson plan request successful with registration session!");
        console.log("📄 Response status:", lessonResponse.status);
        console.log("📝 Content preview:", lessonResponse.data?.substring?.(0, 200) + "...");
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log("❌ Authentication failed:", error.response.data);
        } else if (error.response?.status === 400 && error.response.data?.message?.includes('已存在')) {
            console.log("ℹ️  User already exists, trying to get session from existing user...");
            
            // If user exists, we need to login to get a session
            try {
                const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
                    email: 'directtest@test.com',
                    password: 'password123'
                }, {
                    timeout: 5000,
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const loginCookies = loginResponse.headers['set-cookie'];
                if (loginCookies) {
                    const loginCookieHeader = loginCookies.map(cookie => cookie.split(';')[0]).join('; ');
                    console.log("🔐 Got login session, trying lesson plan request...");
                    
                    const lessonResponse = await axios.post(`${baseUrl}/api/lesson-plan`, {
                        subject: '数学',
                        grade: '初中一年级', 
                        topic: '一元二次方程',
                        requirements: ''
                    }, {
                        timeout: 10000,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': loginCookieHeader
                        }
                    });
                    
                    console.log("🎉 Lesson plan request successful with login session!");
                    console.log("📄 Response status:", lessonResponse.status);
                } else {
                    console.log("❌ No session cookie from login");
                }
                
            } catch (loginError) {
                console.log("❌ Login failed:", loginError.response?.data || loginError.message);
            }
        } else {
            console.log("❌ Request failed:", error.response?.status, error.response?.data || error.message);
        }
    }
}

testAuthDirectSession().catch(console.error);