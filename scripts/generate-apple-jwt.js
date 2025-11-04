#!/usr/bin/env node

/**
 * Apple Sign-In JWT Generator for Supabase
 * 
 * This script generates the JWT secret key required for Apple Sign-In configuration in Supabase.
 * You need to provide your Apple Developer credentials to generate the proper JWT token.
 * 
 * Usage:
 * 1. Install dependencies: npm install jsonwebtoken
 * 2. Run: node scripts/generate-apple-jwt.js
 * 3. Copy the generated JWT to your Supabase Apple provider configuration
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Configuration - Replace these with your actual Apple Developer values
const APPLE_CONFIG = {
  // Your Team ID from Apple Developer Console → Membership
  teamId: 'VJMCMD5NSH',
  
  // Your Services ID (e.g., com.henrymadeit.gofitai.signin)
  clientId: 'com.henrymadeit.gofitai.signin',
  
  // Your Key ID from Apple Developer Console → Keys
  keyId: '7LGAJP9C7W',
  
  // Path to your downloaded .p8 private key file
  privateKeyPath: './AuthKey_7LGAJP9C7W.p8'
};

function generateAppleJWT() {
  try {
    // Check if private key file exists
    if (!fs.existsSync(APPLE_CONFIG.privateKeyPath)) {
      console.error('❌ Private key file not found!');
      console.log('📁 Expected path:', path.resolve(APPLE_CONFIG.privateKeyPath));
      console.log('\n📋 Steps to fix:');
      console.log('1. Download your .p8 private key from Apple Developer Console');
      console.log('2. Place it in the project root directory');
      console.log('3. Update the privateKeyPath in this script');
      return;
    }

    // Validate configuration
    if (APPLE_CONFIG.teamId === 'YOUR_TEAM_ID_HERE' || 
        APPLE_CONFIG.keyId === 'YOUR_KEY_ID_HERE') {
      console.error('❌ Please update the configuration values in this script!');
      console.log('\n📋 Required values:');
      console.log('• teamId: Your 10-character Team ID from Apple Developer Console');
      console.log('• keyId: Your 10-character Key ID from Apple Developer Console');
      console.log('• clientId: Your Services ID (e.g., com.henrymadeit.gofitai.signin)');
      console.log('• privateKeyPath: Path to your .p8 private key file');
      return;
    }

    // Read the private key
    const privateKey = fs.readFileSync(APPLE_CONFIG.privateKeyPath, 'utf8');

    // JWT payload
    const payload = {
      iss: APPLE_CONFIG.teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (6 * 30 * 24 * 60 * 60), // 6 months
      aud: 'https://appleid.apple.com',
      sub: APPLE_CONFIG.clientId
    };

    // JWT header
    const header = {
      alg: 'ES256',
      kid: APPLE_CONFIG.keyId
    };

    // Generate JWT
    const token = jwt.sign(payload, privateKey, { 
      algorithm: 'ES256',
      header: header
    });

    console.log('✅ Apple JWT Generated Successfully!');
    console.log('\n🔑 Your Apple Sign-In JWT Secret Key:');
    console.log('─'.repeat(80));
    console.log(token);
    console.log('─'.repeat(80));
    
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the JWT token above');
    console.log('2. Go to Supabase Dashboard → Authentication → Providers → Apple');
    console.log('3. Paste the JWT in the "Secret Key (for OAuth)" field');
    console.log('4. Set Client ID to:', APPLE_CONFIG.clientId);
    console.log('5. Save the configuration');
    
    console.log('\n⚠️  Important Notes:');
    console.log('• This JWT expires in 6 months - you\'ll need to regenerate it');
    console.log('• Keep your .p8 private key file secure and never commit it to version control');
    console.log('• The Client ID should be your Services ID, not your app bundle ID');

  } catch (error) {
    console.error('❌ Error generating JWT:', error.message);
    
    if (error.message.includes('PEM')) {
      console.log('\n💡 Tip: Make sure your .p8 file is valid and properly formatted');
    }
  }
}

// Run the generator
console.log('🍎 Apple Sign-In JWT Generator for Supabase');
console.log('═'.repeat(50));
generateAppleJWT();

