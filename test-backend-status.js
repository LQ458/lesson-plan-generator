#!/usr/bin/env node

/**
 * Backend Status Checker
 * Tests if your backend server is actually running and accessible
 */

const https = require('https');
const http = require('http');

console.log('🔍 Backend Status Checker');
console.log('=========================\n');

// Test endpoints to check
const endpoints = [
  'https://api.bijielearn.com/api/auth/verify',
  'https://api.bijielearn.com/api/auth/verify-invite',
  'https://api.bijielearn.com',
  'http://localhost:3001/api/auth/verify' // Local fallback
];

function testEndpoint(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    console.log(`🧪 Testing: ${url}`);
    
    const req = client.get(url, (res) => {
      console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`  Headers: ${JSON.stringify(res.headers, null, 2)}`);
      resolve({
        url,
        status: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers,
        success: true
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ❌ Error: ${error.message}`);
      resolve({
        url,
        error: error.message,
        success: false
      });
    });
    
    req.setTimeout(10000, () => {
      console.log(`  ⏰ Timeout after 10 seconds`);
      req.destroy();
      resolve({
        url,
        error: 'Timeout',
        success: false
      });
    });
  });
}

async function checkAllEndpoints() {
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log('===========');
  
  const working = results.filter(r => r.success);
  const failing = results.filter(r => !r.success);
  
  if (working.length > 0) {
    console.log('\n✅ Working endpoints:');
    working.forEach(r => {
      console.log(`  - ${r.url} (${r.status})`);
    });
  }
  
  if (failing.length > 0) {
    console.log('\n❌ Failing endpoints:');
    failing.forEach(r => {
      console.log(`  - ${r.url} (${r.error})`);
    });
  }
  
  // Diagnosis
  console.log('\n🔧 Diagnosis:');
  const productionFailing = failing.filter(r => r.url.includes('api.bijielearn.com'));
  const localWorking = working.filter(r => r.url.includes('localhost'));
  
  if (productionFailing.length > 0 && localWorking.length > 0) {
    console.log('❌ Production server is down, but local server works');
    console.log('💡 Actions needed:');
    console.log('  1. Start your production server');
    console.log('  2. Check server deployment status');
    console.log('  3. Verify DNS settings for api.bijielearn.com');
    console.log('  4. Check reverse proxy/load balancer configuration');
  } else if (productionFailing.length > 0) {
    console.log('❌ Production server is not accessible');
    console.log('💡 Actions needed:');
    console.log('  1. Deploy your backend to production');
    console.log('  2. Configure DNS for api.bijielearn.com');
    console.log('  3. Set up reverse proxy/load balancer');
    console.log('  4. Ensure firewall allows traffic on the correct port');
  } else if (working.length === 0) {
    console.log('❌ No servers are responding');
    console.log('💡 Actions needed:');
    console.log('  1. Start your backend server locally: npm start or pnpm start');
    console.log('  2. Check if the server process is running');
    console.log('  3. Verify the server is listening on the correct port');
  } else {
    console.log('✅ Servers appear to be working');
    console.log('💡 If you still see CORS errors:');
    console.log('  1. Check browser cache/hard refresh');
    console.log('  2. Verify environment variables are loaded correctly');
    console.log('  3. Check server logs for CORS messages');
  }
}

checkAllEndpoints().catch(console.error);