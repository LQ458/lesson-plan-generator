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
  'http://localhost:3001/api/auth/verify',
  'http://localhost:3001/api/health',
  'http://localhost:3001/api/status'
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
  const localWorking = working.filter(r => r.url.includes('localhost'));
  
  if (working.length === 0) {
    console.log('❌ Local server is not responding');
    console.log('💡 Actions needed:');
    console.log('  1. Start your backend server locally: npm start or pnpm start');
    console.log('  2. Check if the server process is running');
    console.log('  3. Verify the server is listening on port 3001');
    console.log('  4. Check server logs for errors');
  } else {
    console.log('✅ Local server appears to be working');
    console.log('💡 Server is ready for nginx proxy configuration');
    console.log('  1. Configure nginx to proxy /api/* to http://localhost:3001');
    console.log('  2. Frontend will access API via relative URLs (/api/*)');
    console.log('  3. Check server logs for any errors');
  }
}

checkAllEndpoints().catch(console.error);