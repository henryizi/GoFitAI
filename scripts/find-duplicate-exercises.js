#!/usr/bin/env node
/**
 * Script to find duplicate exercises with singular/plural forms
 * e.g., "Squat" and "Squats", "Lunge" and "Lunges"
 */

const fs = require('fs');
const path = require('path');

// Read exercise names from constants file
const exerciseNamesPath = path.join(__dirname, '../src/constants/exerciseNames.ts');
const sqlPath = path.join(__dirname, '../scripts/database/initial-exercises.sql');

console.log('🔍 Finding duplicate exercises (singular/plural forms)...\n');

// Function to normalize exercise name for comparison
function normalizeName(name) {
  return name.toLowerCase().trim();
}

// Function to check if two names are singular/plural variants
function areSingularPlural(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Check if one ends with 's' and the other doesn't
  if (n1.endsWith('s') && !n2.endsWith('s')) {
    return n1 === n2 + 's' || n1 === n2 + 'es';
  }
  if (n2.endsWith('s') && !n1.endsWith('s')) {
    return n2 === n1 + 's' || n2 === n1 + 'es';
  }
  
  // Check for special plural forms
  const specialPlurals = {
    'squat': 'squats',
    'lunge': 'lunges',
    'crunch': 'crunches',
    'push up': 'push ups',
    'pull up': 'pull ups',
    'chin up': 'chin ups',
    'sit up': 'sit ups',
    'calf raise': 'calf raises',
    'lateral raise': 'lateral raises',
    'front raise': 'front raises',
    'rear delt fly': 'rear delt flyes',
    'dumbbell fly': 'dumbbell flyes',
    'cable fly': 'cable flyes',
    'burpee': 'burpees',
    'mountain climber': 'mountain climbers',
    'jumping jack': 'jumping jacks',
    'high knee': 'high knees',
    'butt kicker': 'butt kickers',
    'box jump': 'box jumps',
    'broad jump': 'broad jumps',
    'lateral bound': 'lateral bounds',
    'bear crawl': 'bear crawls',
    'crab walk': 'crab walks',
    'star jump': 'star jumps',
    'step up': 'step ups',
    'jump squat': 'jump squats',
    'squat jump': 'squat jumps',
    'plank jack': 'plank jacks',
    'lateral shuffle': 'lateral shuffles',
    'ankle hop': 'ankle hops',
    'pogo jump': 'pogo jumps'
  };
  
  for (const [singular, plural] of Object.entries(specialPlurals)) {
    if ((n1 === singular && n2 === plural) || (n1 === plural && n2 === singular)) {
      return true;
    }
  }
  
  return false;
}

// Extract exercise names from TypeScript file
function extractFromTypeScript() {
  const content = fs.readFileSync(exerciseNamesPath, 'utf8');
  const exercises = [];
  
  // Match exercise name patterns: name: "Exercise Name"
  const nameRegex = /name:\s*"([^"]+)"/g;
  let match;
  
  while ((match = nameRegex.exec(content)) !== null) {
    exercises.push(match[1]);
  }
  
  return exercises;
}

// Extract exercise names from SQL file
function extractFromSQL() {
  const content = fs.readFileSync(sqlPath, 'utf8');
  const exercises = [];
  
  // Match exercise name patterns: ('Exercise Name', ...
  const nameRegex = /\('([^']+)',\s*'[^']+',/g;
  let match;
  
  while ((match = nameRegex.exec(content)) !== null) {
    exercises.push(match[1]);
  }
  
  return exercises;
}

// Find duplicates
function findDuplicates(exercises) {
  const duplicates = [];
  const processed = new Set();
  
  for (let i = 0; i < exercises.length; i++) {
    if (processed.has(i)) continue;
    
    const current = exercises[i];
    const matches = [current];
    
    for (let j = i + 1; j < exercises.length; j++) {
      if (processed.has(j)) continue;
      
      const other = exercises[j];
      
      // Check if they're the same (case-insensitive)
      if (normalizeName(current) === normalizeName(other)) {
        matches.push(other);
        processed.add(j);
      }
      // Check if they're singular/plural variants
      else if (areSingularPlural(current, other)) {
        matches.push(other);
        processed.add(j);
      }
    }
    
    if (matches.length > 1) {
      duplicates.push(matches);
      processed.add(i);
    }
  }
  
  return duplicates;
}

// Main execution
try {
  console.log('📂 Reading exercise files...\n');
  
  const tsExercises = extractFromTypeScript();
  const sqlExercises = extractFromSQL();
  const allExercises = [...new Set([...tsExercises, ...sqlExercises])];
  
  console.log(`Found ${allExercises.length} total exercises`);
  console.log(`  - From TypeScript: ${tsExercises.length}`);
  console.log(`  - From SQL: ${sqlExercises.length}\n`);
  
  console.log('🔍 Searching for duplicates...\n');
  
  const duplicates = findDuplicates(allExercises);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`❌ Found ${duplicates.length} duplicate groups:\n`);
    
    duplicates.forEach((group, index) => {
      console.log(`${index + 1}. ${group.join(' / ')}`);
    });
    
    console.log('\n📋 Summary:');
    console.log(`Total duplicate groups: ${duplicates.length}`);
    const totalDuplicates = duplicates.reduce((sum, group) => sum + group.length, 0);
    console.log(`Total duplicate entries: ${totalDuplicates}`);
    console.log(`Recommended to remove: ${totalDuplicates - duplicates.length} entries\n`);
    
    // Generate removal recommendations
    console.log('💡 Recommendations:');
    duplicates.forEach((group, index) => {
      // Prefer singular form, or the shorter name
      const preferred = group.reduce((a, b) => {
        const aNorm = normalizeName(a);
        const bNorm = normalizeName(b);
        // Prefer singular (no 's' at end)
        if (!aNorm.endsWith('s') && bNorm.endsWith('s')) return a;
        if (aNorm.endsWith('s') && !bNorm.endsWith('s')) return b;
        // If both singular or both plural, prefer shorter
        return a.length <= b.length ? a : b;
      });
      
      const toRemove = group.filter(e => e !== preferred);
      console.log(`\nGroup ${index + 1}:`);
      console.log(`  ✅ Keep: "${preferred}"`);
      toRemove.forEach(ex => {
        console.log(`  ❌ Remove: "${ex}"`);
      });
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
