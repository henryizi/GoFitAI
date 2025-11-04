#!/usr/bin/env node

/**
 * Simple Apple Sign-In JWT Generator
 * 
 * This script generates the JWT secret key for Supabase Apple Sign-In
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

console.log('🍎 Apple Sign-In JWT Generator (Simple)');
console.log('═══════════════════════════════════════');
console.log('');

// Your Apple credentials
const TEAM_ID = 'VJMCMD5NSH';
const KEY_ID = '7LGAJP9C7W';
const SERVICES_ID = 'com.henrymadeit.gofitai.signin';

// Look for the .p8 file
const possibleKeyFiles = [
  `AuthKey_${KEY_ID}.p8`,
  `AuthKey_7LGAJP9C7W.p8`,
  'apple-private-key.p8',
  'apple_private_key.p8'
];

console.log('📋 Configuration:');
console.log(`✅ Team ID: ${TEAM_ID}`);
console.log(`✅ Key ID: ${KEY_ID}`);
console.log(`✅ Services ID: ${SERVICES_ID}`);
console.log('');

console.log('🔍 Looking for Apple Private Key (.p8 file)...');

let privateKeyPath = null;
let privateKeyContent = null;

// Check for .p8 file in project root
for (const filename of possibleKeyFiles) {
  const filePath = path.join(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    privateKeyPath = filePath;
    console.log(`✅ Found private key: ${filename}`);
    break;
  }
}

if (!privateKeyPath) {
  console.log('❌ Apple Private Key (.p8) not found!');
  console.log('');
  console.log('📥 Please download your .p8 file from Apple Developer Console:');
  console.log('   1. Go to: https://developer.apple.com/account/resources/authkeys/list');
  console.log(`   2. Find your key: ${KEY_ID}`);
  console.log('   3. Download the .p8 file');
  console.log('   4. Save it in your project root as: AuthKey_7LGAJP9C7W.p8');
  console.log('');
  console.log('💡 Expected file location:');
  console.log(`   ${path.join(process.cwd(), 'AuthKey_7LGAJP9C7W.p8')}`);
  console.log('');
  process.exit(1);
}

try {
  // Read the private key
  privateKeyContent = fs.readFileSync(privateKeyPath, 'utf8');
  console.log('✅ Private key loaded successfully');
  console.log('');
} catch (error) {
  console.log('❌ Error reading private key file:', error.message);
  process.exit(1);
}

try {
  // Generate JWT
  console.log('🔐 Generating JWT...');
  
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + (6 * 30 * 24 * 60 * 60), // 6 months
    aud: 'https://appleid.apple.com',
    sub: SERVICES_ID
  };
  
  const token = jwt.sign(payload, privateKeyContent, {
    algorithm: 'ES256',
    keyid: KEY_ID,
    header: {
      alg: 'ES256',
      kid: KEY_ID
    }
  });
  
  console.log('✅ JWT Generated Successfully!');
  console.log('');
  console.log('🔑 Your Apple Sign-In JWT Secret:');
  console.log('═══════════════════════════════════════');
  console.log(token);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('');
  console.log('1️⃣ Copy the JWT above');
  console.log('2️⃣ Go to your Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT/auth/providers');
  console.log('');
  console.log('3️⃣ Configure Apple Provider:');
  console.log('   • Enable Apple provider');
  console.log(`   • Client ID: ${SERVICES_ID}`);
  console.log('   • Client Secret: [PASTE THE JWT ABOVE]');
  console.log('');
  console.log('4️⃣ Test your setup:');
  console.log('   node scripts/test-apple-setup.js');
  console.log('');
  console.log('🎉 Apple Sign-In setup complete!');
  
} catch (error) {
  console.log('❌ Error generating JWT:', error.message);
  console.log('');
  console.log('🔧 Common issues:');
  console.log('   • Make sure the .p8 file is valid');
  console.log('   • Check that the Key ID matches your Apple Developer key');
  console.log('   • Ensure the private key format is correct');
  process.exit(1);
}
/**
 * Simple Apple Sign-In JWT Generator
 * 
 * This script generates the JWT secret key for Supabase Apple Sign-In
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

console.log('🍎 Apple Sign-In JWT Generator (Simple)');
console.log('═══════════════════════════════════════');
console.log('');

// Your Apple credentials
const TEAM_ID = 'VJMCMD5NSH';
const KEY_ID = '7LGAJP9C7W';
const SERVICES_ID = 'com.henrymadeit.gofitai.signin';

// Look for the .p8 file
const possibleKeyFiles = [
  `AuthKey_${KEY_ID}.p8`,
  `AuthKey_7LGAJP9C7W.p8`,
  'apple-private-key.p8',
  'apple_private_key.p8'
];

console.log('📋 Configuration:');
console.log(`✅ Team ID: ${TEAM_ID}`);
console.log(`✅ Key ID: ${KEY_ID}`);
console.log(`✅ Services ID: ${SERVICES_ID}`);
console.log('');

console.log('🔍 Looking for Apple Private Key (.p8 file)...');

let privateKeyPath = null;
let privateKeyContent = null;

// Check for .p8 file in project root
for (const filename of possibleKeyFiles) {
  const filePath = path.join(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    privateKeyPath = filePath;
    console.log(`✅ Found private key: ${filename}`);
    break;
  }
}

if (!privateKeyPath) {
  console.log('❌ Apple Private Key (.p8) not found!');
  console.log('');
  console.log('📥 Please download your .p8 file from Apple Developer Console:');
  console.log('   1. Go to: https://developer.apple.com/account/resources/authkeys/list');
  console.log(`   2. Find your key: ${KEY_ID}`);
  console.log('   3. Download the .p8 file');
  console.log('   4. Save it in your project root as: AuthKey_7LGAJP9C7W.p8');
  console.log('');
  console.log('💡 Expected file location:');
  console.log(`   ${path.join(process.cwd(), 'AuthKey_7LGAJP9C7W.p8')}`);
  console.log('');
  process.exit(1);
}

try {
  // Read the private key
  privateKeyContent = fs.readFileSync(privateKeyPath, 'utf8');
  console.log('✅ Private key loaded successfully');
  console.log('');
} catch (error) {
  console.log('❌ Error reading private key file:', error.message);
  process.exit(1);
}

try {
  // Generate JWT
  console.log('🔐 Generating JWT...');
  
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + (6 * 30 * 24 * 60 * 60), // 6 months
    aud: 'https://appleid.apple.com',
    sub: SERVICES_ID
  };
  
  const token = jwt.sign(payload, privateKeyContent, {
    algorithm: 'ES256',
    keyid: KEY_ID,
    header: {
      alg: 'ES256',
      kid: KEY_ID
    }
  });
  
  console.log('✅ JWT Generated Successfully!');
  console.log('');
  console.log('🔑 Your Apple Sign-In JWT Secret:');
  console.log('═══════════════════════════════════════');
  console.log(token);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('');
  console.log('1️⃣ Copy the JWT above');
  console.log('2️⃣ Go to your Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT/auth/providers');
  console.log('');
  console.log('3️⃣ Configure Apple Provider:');
  console.log('   • Enable Apple provider');
  console.log(`   • Client ID: ${SERVICES_ID}`);
  console.log('   • Client Secret: [PASTE THE JWT ABOVE]');
  console.log('');
  console.log('4️⃣ Test your setup:');
  console.log('   node scripts/test-apple-setup.js');
  console.log('');
  console.log('🎉 Apple Sign-In setup complete!');
  
} catch (error) {
  console.log('❌ Error generating JWT:', error.message);
  console.log('');
  console.log('🔧 Common issues:');
  console.log('   • Make sure the .p8 file is valid');
  console.log('   • Check that the Key ID matches your Apple Developer key');
  console.log('   • Ensure the private key format is correct');
  process.exit(1);
}









