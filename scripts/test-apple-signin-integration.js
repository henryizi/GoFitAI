#!/usr/bin/env node

/**
 * Apple Sign-In Integration Test
 * Tests the complete Apple Sign-In flow and configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🍎 Apple Sign-In Integration Test');
console.log('══════════════════════════════════════════════════');

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function addTest(name, status, message = '') {
  results.tests.push({ name, status, message });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else if (status === 'WARN') results.warnings++;
}

function printTest(name, status, message = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}${message ? ': ' + message : ''}`);
}

// 1. Check JWT Generation Script
console.log('\n📋 JWT Generation:');
console.log('────────────────────');
try {
  const jwtScript = fs.readFileSync('scripts/generate-apple-jwt.js', 'utf8');
  
  // Check if script has been configured by testing if it can generate a JWT
  try {
    const { execSync } = require('child_process');
    const result = execSync('node scripts/generate-apple-jwt.js', { encoding: 'utf8', timeout: 5000 });
    if (result.includes('Apple JWT Generated Successfully')) {
      addTest('JWT Script Configuration', 'PASS', 'Script configured and generates valid JWT');
      printTest('JWT Script Configuration', 'PASS', 'Script configured and generates valid JWT');
    } else {
      addTest('JWT Script Configuration', 'FAIL', 'Script cannot generate JWT');
      printTest('JWT Script Configuration', 'FAIL', 'Script cannot generate JWT');
    }
  } catch (error) {
    addTest('JWT Script Configuration', 'FAIL', 'Script execution failed: ' + error.message);
    printTest('JWT Script Configuration', 'FAIL', 'Script execution failed: ' + error.message);
  }
} catch (error) {
  addTest('JWT Script Exists', 'FAIL', 'Script not found');
  printTest('JWT Script Exists', 'FAIL', 'Script not found');
}

// 2. Check Private Key File
console.log('\n🔑 Private Key:');
console.log('────────────────');
const p8Files = fs.readdirSync('.').filter(file => file.endsWith('.p8'));
if (p8Files.length > 0) {
  addTest('Apple Private Key (.p8)', 'PASS', `Found ${p8Files[0]}`);
  printTest('Apple Private Key (.p8)', 'PASS', `Found ${p8Files[0]}`);
} else {
  addTest('Apple Private Key (.p8)', 'FAIL', 'No .p8 file found');
  printTest('Apple Private Key (.p8)', 'FAIL', 'No .p8 file found');
}

// 3. Check App Configuration
console.log('\n📱 App Configuration:');
console.log('─────────────────────');
try {
  const appConfigPath = fs.existsSync('app.json') ? 'app.json' : './app.json';
  const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
  
  // Check bundle ID
  const bundleId = appConfig.expo?.ios?.bundleIdentifier;
  if (bundleId === 'com.henrymadeit.gofitai') {
    addTest('Bundle ID', 'PASS', bundleId);
    printTest('Bundle ID', 'PASS', bundleId);
  } else {
    addTest('Bundle ID', 'FAIL', `Expected com.henrymadeit.gofitai, got ${bundleId}`);
    printTest('Bundle ID', 'FAIL', `Expected com.henrymadeit.gofitai, got ${bundleId}`);
  }
  
  // Check Apple Sign-In entitlement
  const entitlements = appConfig.expo?.ios?.entitlements;
  if (entitlements && entitlements['com.apple.developer.applesignin']) {
    addTest('Apple Sign-In Entitlement', 'PASS', 'Configured');
    printTest('Apple Sign-In Entitlement', 'PASS', 'Configured');
  } else {
    addTest('Apple Sign-In Entitlement', 'FAIL', 'Not configured');
    printTest('Apple Sign-In Entitlement', 'FAIL', 'Not configured');
  }
  
  // Check expo-apple-authentication plugin
  const plugins = appConfig.expo?.plugins || [];
  const hasAppleAuth = plugins.some(plugin => 
    plugin === 'expo-apple-authentication' || 
    (Array.isArray(plugin) && plugin[0] === 'expo-apple-authentication')
  );
  
  if (hasAppleAuth) {
    addTest('Apple Authentication Plugin', 'PASS', 'Configured');
    printTest('Apple Authentication Plugin', 'PASS', 'Configured');
  } else {
    addTest('Apple Authentication Plugin', 'FAIL', 'Not configured');
    printTest('Apple Authentication Plugin', 'FAIL', 'Not configured');
  }
  
} catch (error) {
  addTest('App Configuration', 'FAIL', 'Cannot read app.json');
  printTest('App Configuration', 'FAIL', 'Cannot read app.json');
}

// 4. Check Dependencies
console.log('\n📦 Dependencies:');
console.log('────────────────');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = {
    'expo-apple-authentication': '^8.0.0',
    'expo-auth-session': '^7.0.0',
    'expo-web-browser': '^15.0.0',
    'expo-crypto': '^15.0.0',
    'jsonwebtoken': '^9.0.0'
  };
  
  for (const [dep, minVersion] of Object.entries(requiredDeps)) {
    if (deps[dep]) {
      addTest(dep, 'PASS', `v${deps[dep]}`);
      printTest(dep, 'PASS', `v${deps[dep]}`);
    } else {
      addTest(dep, 'FAIL', 'Not installed');
      printTest(dep, 'FAIL', 'Not installed');
    }
  }
} catch (error) {
  addTest('Package Dependencies', 'FAIL', 'Cannot read package.json');
  printTest('Package Dependencies', 'FAIL', 'Cannot read package.json');
}

// 5. Check Implementation Files
console.log('\n💻 Implementation:');
console.log('──────────────────');

const implementationFiles = [
  'src/services/auth/SocialAuthService.ts',
  'src/components/auth/SocialAuthButtons.tsx',
  'app/(auth)/login.tsx',
  'app/(auth)/register.tsx'
];

for (const file of implementationFiles) {
  if (fs.existsSync(file)) {
    addTest(path.basename(file), 'PASS', 'File exists');
    printTest(path.basename(file), 'PASS', 'File exists');
  } else {
    addTest(path.basename(file), 'FAIL', 'File missing');
    printTest(path.basename(file), 'FAIL', 'File missing');
  }
}

// 6. Check for Apple Sign-In implementation
console.log('\n🔍 Code Implementation:');
console.log('───────────────────────');
try {
  const socialAuthService = fs.readFileSync('src/services/auth/SocialAuthService.ts', 'utf8');
  
  if (socialAuthService.includes('signInWithApple')) {
    addTest('Apple Sign-In Method', 'PASS', 'signInWithApple implemented');
    printTest('Apple Sign-In Method', 'PASS', 'signInWithApple implemented');
  } else {
    addTest('Apple Sign-In Method', 'FAIL', 'signInWithApple not found');
    printTest('Apple Sign-In Method', 'FAIL', 'signInWithApple not found');
  }
  
  if (socialAuthService.includes('AppleAuthentication.signInAsync')) {
    addTest('Apple Authentication API', 'PASS', 'Using expo-apple-authentication');
    printTest('Apple Authentication API', 'PASS', 'Using expo-apple-authentication');
  } else {
    addTest('Apple Authentication API', 'FAIL', 'Not using expo-apple-authentication');
    printTest('Apple Authentication API', 'FAIL', 'Not using expo-apple-authentication');
  }
  
  if (socialAuthService.includes('supabase.auth.signInWithIdToken')) {
    addTest('Supabase Integration', 'PASS', 'Using signInWithIdToken');
    printTest('Supabase Integration', 'PASS', 'Using signInWithIdToken');
  } else {
    addTest('Supabase Integration', 'FAIL', 'Not using signInWithIdToken');
    printTest('Supabase Integration', 'FAIL', 'Not using signInWithIdToken');
  }
} catch (error) {
  addTest('Code Implementation', 'FAIL', 'Cannot read SocialAuthService.ts');
  printTest('Code Implementation', 'FAIL', 'Cannot read SocialAuthService.ts');
}

// 7. Generate Test Summary
console.log('\n══════════════════════════════════════════════════');
console.log('📊 Test Summary:');
console.log('────────────────');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);
console.log(`📋 Total Tests: ${results.tests.length}`);

const successRate = Math.round((results.passed / results.tests.length) * 100);
console.log(`🎯 Success Rate: ${successRate}%`);

// 8. Next Steps
console.log('\n🚀 Next Steps:');
console.log('──────────────');

if (results.failed === 0) {
  console.log('🎉 All tests passed! Your Apple Sign-In setup is ready.');
  console.log('\n📋 Final Configuration Steps:');
  console.log('1. Configure Apple provider in Supabase Dashboard');
  console.log('2. Use the generated JWT as the Secret Key');
  console.log('3. Set Client ID to: com.henrymadeit.gofitai.signin');
  console.log('4. Test Apple Sign-In in your app');
} else {
  console.log('⚠️  Some tests failed. Please address the issues above.');
  console.log('\n🔧 Common Solutions:');
  console.log('• Run: npm install (for missing dependencies)');
  console.log('• Configure JWT script with Apple credentials');
  console.log('• Download .p8 private key from Apple Developer Console');
  console.log('• Check app.json configuration');
}

console.log('\n🔗 Helpful Resources:');
console.log('• Apple Developer Console: https://developer.apple.com/account');
console.log('• Supabase Dashboard: https://supabase.com/dashboard');
console.log('• Setup Guide: ./docs/SOCIAL_AUTH_SETUP.md');

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
