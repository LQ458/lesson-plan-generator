#!/usr/bin/env node
/**
 * Check if critical dependencies are available
 */

console.log('🔍 Checking critical dependencies...');

const dependencies = [
  'express',
  'openai',
  'winston',
  'mongoose'
];

let allOk = true;

dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep} - OK`);
  } catch (error) {
    console.error(`❌ ${dep} - MISSING: ${error.message}`);
    allOk = false;
  }
});

if (allOk) {
  console.log('🎉 All dependencies are available');
  process.exit(0);
} else {
  console.error('💥 Some dependencies are missing');
  process.exit(1);
}