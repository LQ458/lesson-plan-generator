// Load environment variables
require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testJWTGeneration() {
  console.log("🧪 Testing JWT Generation and Verification");
  console.log("==========================================");
  
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  console.log("Secret available:", !!secret);
  console.log("Secret length:", secret?.length || 0);
  
  // Test JWT generation (similar to NextAuth's custom encode/decode)
  const testPayload = {
    sub: "675e7025612a7d8c67e73cd",
    username: "testuser",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };
  
  try {
    console.log("\n🔧 Generating JWT token...");
    const token = jwt.sign(testPayload, secret, { algorithm: 'HS256' });
    console.log("✅ Token generated successfully");
    console.log("Token length:", token.length);
    console.log("Token preview:", token.substring(0, 50) + '...');
    
    console.log("\n🔍 Verifying JWT token...");
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    console.log("✅ Token verified successfully");
    console.log("Decoded payload:", {
      sub: decoded.sub,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
      isExpired: decoded.exp < Math.floor(Date.now() / 1000)
    });
    
    // Test NextAuth getToken with real JWT
    console.log("\n🧪 Testing NextAuth getToken with real JWT...");
    const { getToken } = require("next-auth/jwt");
    
    const mockReq = {
      headers: {
        cookie: `next-auth.session-token=${token}`
      },
      cookies: {
        'next-auth.session-token': token
      },
      url: '/server/test-auth',
      method: 'GET'
    };
    
    const nextAuthToken = await getToken({
      req: mockReq,
      secret: secret,
      secureCookie: false,
      cookieName: "next-auth.session-token"
    });
    
    if (nextAuthToken) {
      console.log("✅ NextAuth getToken success");
      console.log("NextAuth token data:", {
        sub: nextAuthToken.sub,
        username: nextAuthToken.username,
        exp: nextAuthToken.exp,
        iat: nextAuthToken.iat
      });
    } else {
      console.log("❌ NextAuth getToken failed");
    }
    
    // Test production cookie name
    console.log("\n🧪 Testing production cookie name...");
    const prodMockReq = {
      headers: {
        cookie: `__Secure-next-auth.session-token=${token}`
      },
      cookies: {
        '__Secure-next-auth.session-token': token
      },
      url: '/server/test-auth',
      method: 'GET'
    };
    
    const prodToken = await getToken({
      req: prodMockReq,
      secret: secret,
      secureCookie: true,
      cookieName: "__Secure-next-auth.session-token"
    });
    
    if (prodToken) {
      console.log("✅ Production NextAuth getToken success");
      console.log("Production token data:", {
        sub: prodToken.sub,
        username: prodToken.username,
        exp: prodToken.exp,
        iat: prodToken.iat
      });
    } else {
      console.log("❌ Production NextAuth getToken failed");
    }
    
  } catch (error) {
    console.error("❌ JWT test failed:", error.message);
    console.error("Stack:", error.stack);
  }
  
  console.log("\n✨ JWT test completed!");
}

// Run the test
if (require.main === module) {
  testJWTGeneration().catch(console.error);
}

module.exports = { testJWTGeneration };