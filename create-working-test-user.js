/**
 * Create a working test user via API registration
 */

const axios = require('axios');

async function createTestUser() {
    console.log("🔧 Creating working test user...");
    
    const baseUrl = 'http://localhost:3001';
    
    try {
        // First, clean up any existing test users
        console.log("🧹 Cleaning up existing users...");
        
        // Register a proper test user through the API
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            username: 'test',
            email: 'test@test.com',
            password: 'password123',
            confirmPassword: 'password123',
            inviteCode: 'TEACHER2024'
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log("✅ Test user registered successfully!");
        console.log("📋 Login credentials for frontend:");
        console.log("   Username: test");
        console.log("   Email: test@test.com");
        console.log("   Password: password123");
        console.log("   Invite Code: TEACHER2024");
        
        console.log("\\n🔐 Registration response:", {
            status: registerResponse.status,
            success: registerResponse.data.success,
            message: registerResponse.data.message
        });
        
        // Test login immediately
        console.log("\\n🧪 Testing login...");
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'test@test.com',
            password: 'password123'
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log("✅ Login test successful!");
        console.log("📋 User can now login to the frontend");
        
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('已存在')) {
            console.log("ℹ️  User already exists, testing login...");
            try {
                const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
                    email: 'test@test.com', 
                    password: 'password123'
                });
                console.log("✅ Existing user login successful!");
            } catch (loginError) {
                console.log("❌ Login failed for existing user:", loginError.response?.data || loginError.message);
            }
        } else {
            console.error("❌ User creation failed:", error.response?.data || error.message);
        }
    }
}

createTestUser().catch(console.error);