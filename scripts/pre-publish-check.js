#!/usr/bin/env node

/**
 * Pre-publish check script for GoFitAI
 * Verifies that the app is properly configured for production
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 GoFitAI Pre-Publish Check');
console.log('==============================\n');

// Check 1: Verify app.config.ts has correct Railway URL
const appConfigPath = path.join(__dirname, '..', 'app.config.ts');
const appConfig = fs.readFileSync(appConfigPath, 'utf8');

if (appConfig.includes('https://gofitai-production.up.railway.app')) {
  console.log('✅ App config has correct Railway URL');
} else {
  console.log('❌ App config missing Railway URL');
  process.exit(1);
}

// Check 2: Verify no localhost references in key files
const filesToCheck = [
  'src/config/environment.ts',
  'src/contexts/ServerStatusContext.tsx',
  'src/services/workout/WorkoutService.ts',
  'src/services/nutrition/NutritionService.ts',
  'app/(main)/workout/preview-plan.tsx',
  'app/(main)/nutrition/log-food.tsx'
];

let hasLocalhost = false;
for (const file of filesToCheck) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('localhost:4000') || content.includes('127.0.0.1:4000')) {
      console.log(`❌ ${file} still has localhost references`);
      hasLocalhost = true;
    }
  }
}

if (!hasLocalhost) {
  console.log('✅ No localhost references found in key files');
}

// Check 3: Verify Railway server is accessible
console.log('\n🌐 Testing Railway server connection...');
const https = require('https');

const serverUrl = 'https://gofitai-production.up.railway.app/api/health';
https.get(serverUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.status === 'healthy') {
        console.log('✅ Railway server is healthy and accessible');
        console.log(`   Server timestamp: ${response.timestamp}`);
        
        console.log('\n🎉 All checks passed! App is ready for publishing.');
        console.log('\n📱 Next steps:');
        console.log('1. Build for production: npx expo build');
        console.log('2. Test on device: npx expo start');
        console.log('3. Submit to app stores');
      } else {
        console.log('❌ Railway server returned unexpected response');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ Railway server returned invalid JSON');
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.log('❌ Cannot connect to Railway server:', error.message);
  process.exit(1);
});
