#!/usr/bin/env node

/**
 * CORS Debug Helper
 * Run this to test your CORS configuration
 */

console.log('🚑 CORS Debug Helper');
console.log('====================\n');

// Load environment variables
require('dotenv').config({ path: './server/.env' });

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      "http://localhost:3000", 
      "http://localhost:3002",
      "https://bijielearn.com",
      "https://www.bijielearn.com",
      "https://api.bijielearn.com"
    ];

console.log('📋 Current Configuration:');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Raw ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);
console.log(`Parsed origins (${allowedOrigins.length}):`, allowedOrigins);
console.log('');

// Test your specific case
const testOrigin = 'https://bijielearn.com';
const isAllowed = allowedOrigins.includes(testOrigin);

console.log('🧪 Testing Your Domain:');
console.log(`Origin: ${testOrigin}`);
console.log(`Status: ${isAllowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
console.log('');

if (isAllowed) {
  console.log('✅ Configuration looks correct!');
  console.log('');
  console.log('🔧 If you\'re still seeing CORS errors:');
  console.log('1. Restart your backend server');
  console.log('2. Check browser DevTools Network tab for exact failing URLs');
  console.log('3. Look at your server logs for CORS messages');
  console.log('4. Verify your frontend is making requests to the right domain/port');
  console.log('5. Check if your production server environment variables are set correctly');
  console.log('');
  console.log('💡 Common issues:');
  console.log('- Frontend making requests to wrong port (3001 vs 3000)');
  console.log('- Production server not loading environment variables');
  console.log('- Authentication cookies not being sent with requests');
  console.log('- Server not actually running on the expected domain');
} else {
  console.log('❌ Your domain is not in the allowed origins!');
  console.log('');
  console.log('🔧 Fix by adding your domain to ALLOWED_ORIGINS in server/.env:');
  console.log('ALLOWED_ORIGINS=https://bijielearn.com,https://www.bijielearn.com,https://api.bijielearn.com,http://localhost:3000');
}

console.log('\n🔍 Next Steps:');
console.log('1. Run your backend server');
console.log('2. Check the console output for "🔒 CORS允许的域名:" message');
console.log('3. Look for "✅ CORS allowed" or "🚫 CORS blocked" messages when requests are made');
console.log('4. If you see blocked requests, compare the origin in the log with your allowed origins list');