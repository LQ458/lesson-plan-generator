// Load environment variables
require('dotenv').config();
const { getToken } = require("next-auth/jwt");

// Mock request object to test NextAuth integration
function createMockRequest(cookies, environment = "production") {
  return {
    headers: {
      cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
    },
    cookies: cookies,
    url: '/server/test-auth',
    method: 'GET'
  };
}

async function testNextAuthIntegration() {
  console.log("🧪 Testing NextAuth Integration");
  console.log("================================");
  
  // Test with different cookie scenarios
  const testScenarios = [
    {
      name: "Development Cookie",
      cookies: {
        'next-auth.session-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzVlNzAyNTYxMjBhN2Q4YzY3ZTczY2QiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNzM0MTc5ODgxLCJleHAiOjE3MzQ3ODQ2ODF9.test'
      },
      environment: "development"
    },
    {
      name: "Production Cookie",
      cookies: {
        '__Secure-next-auth.session-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzVlNzAyNTYxMjBhN2Q4YzY3ZTczY2QiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNzM0MTc5ODgxLCJleHAiOjE3MzQ3ODQ2ODF9.test'
      },
      environment: "production"
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`Environment: ${scenario.environment}`);
    console.log(`Cookies: ${JSON.stringify(scenario.cookies)}`);
    
    const mockReq = createMockRequest(scenario.cookies, scenario.environment);
    
    try {
      // Set environment for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = scenario.environment;
      
      // Test getToken function
      console.log("🔍 Testing getToken...");
      
      const cookieName = scenario.environment === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token";
      
      const token = await getToken({
        req: mockReq,
        secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'test-secret',
        secureCookie: scenario.environment === "production",
        cookieName: cookieName
      });
      
      console.log(`✅ Token extraction result:`, {
        success: !!token,
        tokenData: token ? {
          sub: token.sub,
          username: token.username,
          exp: token.exp,
          iat: token.iat
        } : null
      });
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      
    } catch (error) {
      console.error(`❌ Error in ${scenario.name}:`, error.message);
      console.error(`Stack:`, error.stack);
    }
  }
  
  // Test environment configuration
  console.log("\n🔧 Environment Configuration:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("NEXTAUTH_SECRET set:", !!process.env.NEXTAUTH_SECRET);
  console.log("AUTH_SECRET set:", !!process.env.AUTH_SECRET);
  console.log("Secret length:", (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '').length);
  
  console.log("\n✨ Test completed!");
}

// Run the test
if (require.main === module) {
  testNextAuthIntegration().catch(console.error);
}

module.exports = { testNextAuthIntegration };