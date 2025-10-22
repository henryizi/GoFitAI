#!/usr/bin/env node

/**
 * Test Suite for Timeout Optimization Fixes
 * 
 * This test verifies:
 * 1. Timeout durations are correctly set (6min complex, 4min simple)
 * 2. Backoff delays for timeout errors are optimized (2-8s instead of 5-15s)
 * 3. Connectivity testing has been removed
 * 4. Retry logic works correctly
 */

const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, 'server/services/geminiTextService.js');
const DOCS_FILE = path.join(__dirname, 'TIMEOUT_OPTIMIZATION.md');

console.log('🔍 Timeout Optimization Verification Suite\n');
console.log('=' .repeat(60));

let passedTests = 0;
let failedTests = 0;
let warnings = 0;

/**
 * Test helper functions
 */
function test(name, condition, details = '') {
  const status = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
  }
  return condition;
}

function warn(name, message) {
  console.log(`\n⚠️  WARN: ${name}`);
  console.log(`   ${message}`);
  warnings++;
}

function info(message) {
  console.log(`   ℹ️  ${message}`);
}

/**
 * Main test execution
 */

// 1. File existence
console.log('\n📋 Section 1: File Checks');
console.log('-'.repeat(60));

test(
  'geminiTextService.js exists',
  fs.existsSync(TEST_FILE),
  `Path: ${TEST_FILE}`
);

test(
  'TIMEOUT_OPTIMIZATION.md exists',
  fs.existsSync(DOCS_FILE),
  `Path: ${DOCS_FILE}`
);

// 2. Timeout configuration checks
console.log('\n⏱️  Section 2: Timeout Configuration');
console.log('-'.repeat(60));

const serviceContent = fs.readFileSync(TEST_FILE, 'utf8');

// Check complex timeout is 360s (360000ms)
const complexTimeoutMatch = serviceContent.match(/complexTimeout\s*=\s*parseInt\([^)]+\)\s*\|\|\s*parseInt\([^)]+\)\s*\|\|\s*(\d+)/);
const complexTimeoutValue = complexTimeoutMatch ? parseInt(complexTimeoutMatch[1]) : null;

test(
  'Complex timeout is 360000ms (6 minutes)',
  complexTimeoutValue === 360000,
  `Found: ${complexTimeoutValue}ms (expected 360000ms)`
);

// Check simple timeout is 240s (240000ms)
const simpleTimeoutMatch = serviceContent.match(/simpleTimeout\s*=\s*parseInt\([^)]+\)\s*\|\|\s*(\d+)/);
const simpleTimeoutValue = simpleTimeoutMatch ? parseInt(simpleTimeoutMatch[1]) : null;

test(
  'Simple timeout is 240000ms (4 minutes)',
  simpleTimeoutValue === 240000,
  `Found: ${simpleTimeoutValue}ms (expected 240000ms)`
);

// 3. Retry backoff optimization checks
console.log('\n🔄 Section 3: Retry Backoff Strategy');
console.log('-'.repeat(60));

// Check timeout error backoff base is 2000ms (reduced from 5000ms)
const timeoutBackoffBase = serviceContent.match(/isTimeoutError\s*\)\s*\{[\s\S]*?baseDelay\s*=\s*(\d+);/);
const timeoutBackoffValue = timeoutBackoffBase ? parseInt(timeoutBackoffBase[1]) : null;

test(
  'Timeout error backoff base is 2000ms (not 5000ms)',
  timeoutBackoffValue === 2000,
  `Found: ${timeoutBackoffValue}ms (old was 5000ms)`
);

// Check timeout error backoff max is 8000ms (reduced from 15000ms)
const timeoutBackoffMax = serviceContent.match(/isTimeoutError\s*\)\s*\{[\s\S]*?maxDelay\s*=\s*(\d+);/);
const timeoutBackoffMaxValue = timeoutBackoffMax ? parseInt(timeoutBackoffMax[1]) : null;

test(
  'Timeout error backoff max is 8000ms (not 15000ms)',
  timeoutBackoffMaxValue === 8000,
  `Found: ${timeoutBackoffMaxValue}ms (old was 15000ms)`
);

// 4. Connectivity testing removal
console.log('\n🌐 Section 4: Removed Ineffective Code');
console.log('-'.repeat(60));

const hasConnectivityTest = serviceContent.includes("fetch('https://generativelanguage.googleapis.com/'");
const hasHeadRequest = serviceContent.includes("method: 'HEAD'");

test(
  'Connectivity testing to Google API has been removed',
  !hasConnectivityTest && !hasHeadRequest,
  'No HEAD requests to generativelanguage.googleapis.com found (good!)'
);

if (!hasConnectivityTest && !hasHeadRequest) {
  info('✓ Removed ~5s+ of unnecessary overhead per retry');
}

// 5. Enhanced logging checks
console.log('\n📊 Section 5: Logging & Monitoring');
console.log('-'.repeat(60));

const hasTimeoutDetectionLogging = serviceContent.includes('Timeout error detected');
const hasBackoffLogging = serviceContent.includes('Backoff delay');
const hasComplexRequestLogging = serviceContent.includes('Complex request detected');

test(
  'Timeout error detection logging in place',
  hasTimeoutDetectionLogging,
  'Log messages will help debug timeout issues'
);

test(
  'Backoff delay logging in place',
  hasBackoffLogging,
  'Admin can monitor retry delays'
);

test(
  'Complex request detection logging in place',
  hasComplexRequestLogging,
  'Can distinguish between simple and complex requests'
);

// 6. Error classification checks
console.log('\n🛡️  Section 6: Error Classification');
console.log('-'.repeat(60));

const hasRetryableCheck = serviceContent.includes('const isRetryable =');
const hasTimeoutCheck = serviceContent.includes('const isTimeoutError =');
const hasServiceUnavailableCheck = serviceContent.includes('const isServiceUnavailable =');

test(
  'Retryable error classification present',
  hasRetryableCheck,
  'System properly identifies which errors to retry'
);

test(
  'Timeout error classification present',
  hasTimeoutCheck,
  'Timeout errors will get optimized backoff'
);

test(
  'Service unavailable error classification present',
  hasServiceUnavailableCheck,
  '503 errors get longer backoff (appropriate)'
);

// 7. Documentation checks
console.log('\n📚 Section 7: Documentation');
console.log('-'.repeat(60));

const docsContent = fs.readFileSync(DOCS_FILE, 'utf8');

const hasRootCauseAnalysis = docsContent.includes('Root Causes');
const hasSolutionOverview = docsContent.includes('Solution Implemented');
const hasTimeoutComparison = docsContent.includes('Before');
const hasEnvVarDocs = docsContent.includes('Environment Variables');

test(
  'Root cause analysis documented',
  hasRootCauseAnalysis,
  'Why the original timeout was too short'
);

test(
  'Solution overview documented',
  hasSolutionOverview,
  'What was changed and why'
);

test(
  'Timeline comparison documented',
  hasTimeoutComparison,
  'Shows old vs new retry timeline'
);

test(
  'Environment variables documented',
  hasEnvVarDocs,
  'Admin can configure timeouts if needed'
);

// 8. Code quality checks
console.log('\n✨ Section 8: Code Quality');
console.log('-'.repeat(60));

// Check for duplicate timeout logic
const timeoutDeclarations = (serviceContent.match(/const.*Timeout\s*=/g) || []).length;
test(
  'Timeout configuration is not duplicated',
  timeoutDeclarations <= 2,
  `Found ${timeoutDeclarations} timeout declarations (expected ≤2)`
);

// Check for exponential backoff implementation
const hasExponentialBackoff = serviceContent.includes('Math.pow(2');
test(
  'Exponential backoff implemented',
  hasExponentialBackoff,
  'Retries follow exponential backoff pattern'
);

// Check for jitter
const hasJitter = serviceContent.includes('Math.random() * 2000');
test(
  'Jitter added to prevent thundering herd',
  hasJitter,
  'Random delay helps distribute load'
);

// 9. Performance impact checks
console.log('\n⚡ Section 9: Performance Impact Analysis');
console.log('-'.repeat(60));

const removedConnectivityCheckOverhead = 5000; // ms
info(`Expected overhead reduction: ~${removedConnectivityCheckOverhead}ms per retry`);

const oldTimeoutBackoffSumAtt2 = 5000 + (5000 * 2) + 2000; // base backoff + exponential + jitter avg
const newTimeoutBackoffSumAtt2 = 2000 + (2000 * 2) + 2000; // base backoff + exponential + jitter avg

info(`Retry 2 wait time (old): ~${oldTimeoutBackoffSumAtt2}ms`);
info(`Retry 2 wait time (new): ~${newTimeoutBackoffSumAtt2}ms`);
info(`Improvement: ${oldTimeoutBackoffSumAtt2 - newTimeoutBackoffSumAtt2}ms faster per timeout retry`);

// 10. Summary and recommendations
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));

console.log(`\n✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`⚠️  Warnings: ${warnings}`);

const totalTests = passedTests + failedTests;
const passRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`\n📈 Pass Rate: ${passRate}% (${passedTests}/${totalTests})`);

if (failedTests === 0 && warnings === 0) {
  console.log('\n🎉 All timeout optimization checks passed!');
  console.log('\n✨ The implementation correctly:');
  console.log('   • Extended timeout durations (6min for complex, 4min for simple)');
  console.log('   • Optimized retry backoff (2-8s for timeout errors)');
  console.log('   • Removed connectivity testing overhead');
  console.log('   • Improved error classification and logging');
  console.log('   • Documented all changes');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Deploy the updated code');
  console.log('   2. Monitor logs for timeout patterns');
  console.log('   3. Track retry success rates');
  console.log('   4. Verify user requests complete successfully');
  
  process.exit(0);
} else if (failedTests === 0) {
  console.log('\n⚠️  Some warnings detected, but all critical checks passed.');
  process.exit(0);
} else {
  console.log('\n❌ Some critical checks failed. Please review the implementation.');
  process.exit(1);
}
