/**
 * Development script to clear cached nutrition plans
 * This forces the frontend to regenerate nutrition plans with fresh calculations
 */

const { exec } = require('child_process');

console.log('🧹 Clearing nutrition plan cache...');

// Clear localStorage in browser
const clearScript = `
if (typeof window !== 'undefined' && window.localStorage) {
  window.localStorage.removeItem('nutrition_plans');
  window.localStorage.removeItem('deleted_default_plan');
  console.log('✅ Browser localStorage cleared');
}
`;

console.log('To clear the nutrition cache in your browser:');
console.log('1. Open Developer Tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Paste and run this code:');
console.log('');
console.log(clearScript);
console.log('');
console.log('4. Refresh the app');
console.log('');
console.log('This will force the app to regenerate nutrition plans with the correct calculations.');





