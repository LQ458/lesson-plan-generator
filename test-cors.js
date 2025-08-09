#!/usr/bin/env node

/**
 * Test CORS Configuration
 * Quick test to verify your current CORS setup
 */

require('dotenv').config({ path: './server/.env' });

console.log('🧪 Testing CORS Configuration');
console.log('============================\n');

console.log('📋 Environment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);
console.log('');

// Test the CORS logic from your server
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      "http://localhost:3000", 
      "http://localhost:3002",
      "https://bijielearn.com",
      "https://www.bijielearn.com",
      "https://api.bijielearn.com"
    ];

console.log('🔒 Parsed Allowed Origins:');
allowedOrigins.forEach((origin, index) => {
  console.log(`  ${index + 1}. "${origin}"`);
});
console.log('');

// Test specific origins
const testOrigins = [
  'https://bijielearn.com',
  'https://www.bijielearn.com',
  'https://api.bijielearn.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://unauthorized-site.com'
];

console.log('🧪 Testing Origins:');
testOrigins.forEach(testOrigin => {
  const isAllowed = allowedOrigins.includes(testOrigin);
  const status = isAllowed ? '✅ ALLOWED' : '❌ BLOCKED';
  console.log(`  ${status}: "${testOrigin}"`);
});

console.log('\n🔧 Recommendations:');

if (!process.env.ALLOWED_ORIGINS) {
  console.log('⚠️  ALLOWED_ORIGINS not set in environment, using defaults');
} else if (allowedOrigins.includes('https://bijielearn.com')) {
  console.log('✅ Your domain is in the allowed list');
} else {
  console.log('❌ Your domain is NOT in the allowed list');
}

// Check for common issues
const hasTrailingSlash = allowedOrigins.some(origin => origin.endsWith('/'));
if (hasTrailingSlash) {
  console.log('⚠️  Warning: Some origins have trailing slashes, remove them');
}

const hasSpaces = allowedOrigins.some(origin => origin !== origin.trim());
if (hasSpaces) {
  console.log('⚠️  Warning: Some origins have leading/trailing spaces');
}

console.log('\n💡 If CORS is still failing:');
console.log('1. Check your backend server logs for CORS messages');
console.log('2. Verify your frontend is making requests to the right port');
console.log('3. Ensure your backend server is actually running');
console.log('4. Check browser Network tab for the exact failing request URL');
console.log('5. Make sure cookies/credentials are being sent properly');