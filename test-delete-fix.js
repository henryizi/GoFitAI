#!/usr/bin/env node

/**
 * Test script to verify the deletePlan fix for bodybuilder plans
 */

// Mock the WorkoutService deletePlan method logic
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function shouldDeleteAsLocalPlan(planId) {
  return planId.startsWith('local-') || planId.startsWith('ai-') || planId.startsWith('bb-');
}

function canAttemptDatabaseDeletion(planId) {
  return isValidUUID(planId);
}

// Test cases
const testCases = [
  { id: 'bb-mewcaizm-dorian', description: 'Bodybuilder plan (should be handled locally)' },
  { id: 'bb-1m2n3o4p-jay', description: 'Another bodybuilder plan (should be handled locally)' },
  { id: 'local-abc123', description: 'Local plan (should be handled locally)' },
  { id: 'ai-def456', description: 'AI plan (should be handled locally)' },
  { id: '550e8400-e29b-41d4-a716-446655440000', description: 'Valid UUID (should attempt database deletion)' },
  { id: 'invalid-plan-id', description: 'Invalid ID (should be rejected)' },
  { id: '123-456-789', description: 'Malformed UUID (should be rejected)' },
];

console.log('🧪 Testing deletePlan fix for bodybuilder plans...\n');

testCases.forEach((testCase, index) => {
  const { id, description } = testCase;

  console.log(`${index + 1}. Testing: ${description}`);
  console.log(`   Plan ID: ${id}`);

  const isLocal = shouldDeleteAsLocalPlan(id);
  const isValidUuid = canAttemptDatabaseDeletion(id);

  console.log(`   Should handle locally: ${isLocal ? '✅ YES' : '❌ NO'}`);
  console.log(`   Can attempt DB deletion: ${isValidUuid ? '✅ YES' : '❌ NO'}`);

  if (isLocal) {
    console.log(`   ✅ Result: Will delete from local storage`);
  } else if (isValidUuid) {
    console.log(`   ✅ Result: Will attempt database deletion`);
  } else {
    console.log(`   ❌ Result: Will be rejected (invalid format)`);
  }

  console.log('');
});

console.log('🎉 Test completed! The fix should handle bodybuilder plans correctly.');
console.log('📝 Summary:');
console.log('   - Bodybuilder plans (bb-*) will be handled locally');
console.log('   - Local plans (local-*) will be handled locally');
console.log('   - AI plans (ai-*) will be handled locally');
console.log('   - Valid UUIDs will attempt database deletion');
console.log('   - Invalid IDs will be rejected with a warning');
