#!/usr/bin/env node

/**
 * Cleanup script for workout data corruption issues
 * This script helps fix common data structure problems that can cause plan deletion issues
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 GoFitAI Data Cleanup Utility');
console.log('===================================');

// Simulate AsyncStorage data validation for React Native
function validatePlanObject(plan) {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, reason: 'Not an object' };
  }
  
  if (Array.isArray(plan)) {
    return { valid: false, reason: 'Is an array instead of object' };
  }
  
  if (!plan.id && !plan.name) {
    return { valid: false, reason: 'Missing both id and name' };
  }
  
  return { valid: true };
}

function normalizePlan(plan) {
  return {
    id: plan.id || `temp-${Date.now()}-${Math.random()}`,
    name: plan.name || 'Untitled Plan',
    user_id: plan.user_id || '',
    status: plan.status || 'inactive',
    created_at: plan.created_at || new Date().toISOString(),
    updated_at: plan.updated_at || new Date().toISOString(),
    current_week: plan.current_week || 1,
    mesocycle_length_weeks: plan.mesocycle_length_weeks || 4,
    deload_week: plan.deload_week || false,
    training_level: plan.training_level || 'beginner',
    goal_muscle_gain: plan.goal_muscle_gain || 1,
    goal_fat_loss: plan.goal_fat_loss || 1,
    weekly_schedule: Array.isArray(plan.weekly_schedule) ? plan.weekly_schedule : [],
    is_active: plan.is_active || plan.status === 'active'
  };
}

function cleanupPlansArray(plans) {
  if (!Array.isArray(plans)) {
    console.log('⚠️  Plans data is not an array, attempting to fix...');
    if (plans && typeof plans === 'object') {
      plans = plans.plans || plans.data || [plans];
    } else {
      return [];
    }
  }
  
  const validPlans = [];
  const invalidPlans = [];
  
  for (const plan of plans) {
    const validation = validatePlanObject(plan);
    if (validation.valid) {
      validPlans.push(normalizePlan(plan));
    } else {
      invalidPlans.push({ plan, reason: validation.reason });
    }
  }
  
  if (invalidPlans.length > 0) {
    console.log(`❌ Found ${invalidPlans.length} invalid plan(s):`);
    invalidPlans.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.reason}: ${JSON.stringify(item.plan)}`);
    });
  }
  
  // Remove duplicates
  const seen = new Set();
  const uniquePlans = validPlans.filter(plan => {
    const key = `${plan.id}-${plan.name}`;
    if (seen.has(key)) {
      console.log(`🔄 Removing duplicate: ${plan.name} (${plan.id})`);
      return false;
    }
    seen.add(key);
    return true;
  });
  
  console.log(`✅ Cleaned up: ${plans.length} → ${uniquePlans.length} valid plans`);
  return uniquePlans;
}

// Test function for validation
function runTests() {
  console.log('\n🧪 Running validation tests...');
  
  const testCases = [
    { name: 'Valid plan', data: { id: '123', name: 'Test Plan' }, shouldPass: true },
    { name: 'Empty array', data: [], shouldPass: false },
    { name: 'Array instead of object', data: [1, 2, 3], shouldPass: false },
    { name: 'Null', data: null, shouldPass: false },
    { name: 'String', data: 'not an object', shouldPass: false },
    { name: 'Object without id/name', data: { status: 'active' }, shouldPass: false },
    { name: 'Object with name only', data: { name: 'Test' }, shouldPass: true },
    { name: 'Object with id only', data: { id: 'test-123' }, shouldPass: true },
  ];
  
  let passed = 0;
  for (const test of testCases) {
    const result = validatePlanObject(test.data);
    const success = result.valid === test.shouldPass;
    console.log(`   ${success ? '✅' : '❌'} ${test.name}: ${result.valid ? 'valid' : result.reason}`);
    if (success) passed++;
  }
  
  console.log(`\n📊 Tests: ${passed}/${testCases.length} passed`);
  
  // Test array cleanup
  console.log('\n🧪 Testing array cleanup...');
  const corruptedData = [
    { id: '1', name: 'Valid Plan' },
    [],  // Invalid: empty array
    { name: 'Name Only Plan' },  // Valid
    null,  // Invalid: null
    'string',  // Invalid: string
    { id: '2', name: 'Another Valid Plan' },
    { id: '1', name: 'Valid Plan' },  // Duplicate
  ];
  
  const cleaned = cleanupPlansArray(corruptedData);
  console.log(`   Input: ${corruptedData.length} items`);
  console.log(`   Output: ${cleaned.length} valid plans`);
}

// Main execution
if (require.main === module) {
  runTests();
  console.log('\n✨ Cleanup utility ready!');
  console.log('💡 This validation logic has been integrated into the workout plans screen.');
  console.log('🔧 The app will now automatically clean up corrupted data on load.');
}

module.exports = {
  validatePlanObject,
  normalizePlan,
  cleanupPlansArray
};

