#!/usr/bin/env node
/**
 * Install missing dependencies if they're not available
 */

const { execSync } = require('child_process');

console.log('🔍 Checking and installing missing dependencies...');

const criticalDeps = [
  'openai'
];

let needsInstall = [];

criticalDeps.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep} - Already installed`);
  } catch (error) {
    console.log(`❌ ${dep} - Missing, will install`);
    needsInstall.push(dep);
  }
});

if (needsInstall.length > 0) {
  console.log(`📦 Installing missing packages: ${needsInstall.join(', ')}`);
  
  try {
    const installCmd = `pnpm add ${needsInstall.join(' ')}`;
    console.log(`Running: ${installCmd}`);
    execSync(installCmd, { stdio: 'inherit' });
    console.log('✅ Missing dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('🎉 All critical dependencies are available');
}

console.log('✅ Dependency check complete');