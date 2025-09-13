// Load environment variables
require('dotenv').config();
const { getToken } = require("next-auth/jwt");

async function testDetailedJWT() {
  console.log("🔍 Detailed NextAuth getToken Test");
  console.log("==================================");
  
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  console.log("Secret available:", !!secret);
  console.log("Secret:", secret);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  // Create a simple test JWT using NextAuth's expected format
  const jwt = require('jsonwebtoken');
  const testPayload = {
    sub: "675e7025612a7d8c67e73cd",
    username: "testuser",
    email: "test@example.com",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    jti: "test-jti-" + Math.random().toString(36)
  };
  
  console.log("\n🔧 Creating test JWT token...");
  const testToken = jwt.sign(testPayload, secret, { algorithm: 'HS256' });
  console.log("Test token created, length:", testToken.length);
  
  // Test different request configurations
  const testConfigurations = [
    {
      name: "Basic HTTP Cookie",
      req: {
        headers: {
          cookie: `next-auth.session-token=${testToken}`
        },
        cookies: {
          'next-auth.session-token': testToken
        }
      },
      options: {
        req: null, // Will be set
        secret: secret,
        secureCookie: false
      }
    },
    {
      name: "Secure HTTPS Cookie",
      req: {
        headers: {
          cookie: `__Secure-next-auth.session-token=${testToken}`
        },
        cookies: {
          '__Secure-next-auth.session-token': testToken
        }
      },
      options: {
        req: null, // Will be set
        secret: secret,
        secureCookie: true,
        cookieName: "__Secure-next-auth.session-token"
      }
    },
    {
      name: "Explicit Cookie Name",
      req: {
        headers: {
          cookie: `my-custom-session=${testToken}`
        },
        cookies: {
          'my-custom-session': testToken
        }
      },
      options: {
        req: null, // Will be set
        secret: secret,
        secureCookie: false,
        cookieName: "my-custom-session"
      }
    }
  ];
  
  for (const config of testConfigurations) {
    console.log(`\n📋 Testing: ${config.name}`);
    console.log("Request cookies:", Object.keys(config.req.cookies));
    console.log("Cookie header:", config.req.headers.cookie?.substring(0, 100) + '...');
    
    config.options.req = config.req;
    
    try {
      console.log("getToken options:", {
        hasReq: !!config.options.req,
        hasSecret: !!config.options.secret,
        secureCookie: config.options.secureCookie,
        cookieName: config.options.cookieName || 'default'
      });
      
      const token = await getToken(config.options);
      
      if (token) {
        console.log("✅ SUCCESS - Token extracted");
        console.log("Token data:", {
          sub: token.sub,
          username: token.username,
          email: token.email,
          exp: token.exp,
          iat: token.iat,
          jti: token.jti
        });
      } else {
        console.log("❌ FAILED - No token extracted");
      }
      
    } catch (error) {
      console.error("❌ ERROR:", error.message);
      console.error("Error name:", error.name);
      if (error.code) console.error("Error code:", error.code);
    }
  }
  
  console.log("\n✨ Detailed test completed!");
}

// Run the test
if (require.main === module) {
  testDetailedJWT().catch(console.error);
}

module.exports = { testDetailedJWT };