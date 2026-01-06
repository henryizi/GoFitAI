#!/usr/bin/env node
/**
 * Comprehensive script to find ALL duplicate exercises including:
 * - Singular/plural forms
 * - Hyphen vs space variations
 * - Case variations
 */

const fs = require('fs');
const path = require('path');

const exerciseNamesPath = path.join(__dirname, '../src/constants/exerciseNames.ts');
const sqlPath = path.join(__dirname, '../scripts/database/initial-exercises.sql');

console.log('🔍 Finding ALL duplicate exercises...\n');

// Normalize name for comparison (lowercase, remove hyphens/spaces, remove punctuation)
function normalizeForComparison(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')  // Replace hyphens/underscores with spaces
    .replace(/\s+/g, ' ')  // Normalize multiple spaces
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

// Check if two names are essentially the same
function areEssentiallySame(name1, name2) {
  const n1 = normalizeForComparison(name1);
  const n2 = normalizeForComparison(name2);
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Check singular/plural
  if (n1.endsWith('s') && !n2.endsWith('s')) {
    return n1 === n2 + 's' || n1 === n2 + 'es';
  }
  if (n2.endsWith('s') && !n1.endsWith('s')) {
    return n2 === n1 + 's' || n2 === n1 + 'es';
  }
  
  // Check special plural forms
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

// Extract exercise names
function extractFromTypeScript() {
  const content = fs.readFileSync(exerciseNamesPath, 'utf8');
  const exercises = [];
  const nameRegex = /name:\s*"([^"]+)"/g;
  let match;
  
  while ((match = nameRegex.exec(content)) !== null) {
    exercises.push(match[1]);
  }
  
  return exercises;
}

function extractFromSQL() {
  const content = fs.readFileSync(sqlPath, 'utf8');
  const exercises = [];
  const nameRegex = /\('([^']+)',\s*'[^']+',/g;
  let match;
  
  while ((match = nameRegex.exec(content)) !== null) {
    exercises.push(match[1]);
  }
  
  return exercises;
}

// Find all duplicates
function findDuplicates(exercises) {
  const duplicates = [];
  const processed = new Set();
  
  for (let i = 0; i < exercises.length; i++) {
    if (processed.has(i)) continue;
    
    const current = exercises[i];
    const matches = [current];
    const matchIndices = [i];
    
    for (let j = i + 1; j < exercises.length; j++) {
      if (processed.has(j)) continue;
      
      const other = exercises[j];
      
      if (areEssentiallySame(current, other)) {
        matches.push(other);
        matchIndices.push(j);
        processed.add(j);
      }
    }
    
    if (matches.length > 1) {
      duplicates.push({
        group: matches,
        indices: matchIndices
      });
      processed.add(i);
    }
  }
  
  return duplicates;
}

// Main
try {
  const tsExercises = extractFromTypeScript();
  const sqlExercises = extractFromSQL();
  const allExercises = [...new Set([...tsExercises, ...sqlExercises])];
  
  console.log(`Found ${allExercises.length} total exercises`);
  console.log(`  - From TypeScript: ${tsExercises.length}`);
  console.log(`  - From SQL: ${sqlExercises.length}\n`);
  
  const duplicates = findDuplicates(allExercises);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`❌ Found ${duplicates.length} duplicate groups:\n`);
    
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ${dup.group.join(' / ')}`);
    });
    
    console.log('\n📋 Recommendations:\n');
    duplicates.forEach((dup, index) => {
      const group = dup.group;
      // Prefer singular, shorter, no hyphens
      const preferred = group.reduce((a, b) => {
        const aNorm = normalizeForComparison(a);
        const bNorm = normalizeForComparison(b);
        
        // Prefer singular
        if (!aNorm.endsWith('s') && bNorm.endsWith('s')) return a;
        if (aNorm.endsWith('s') && !bNorm.endsWith('s')) return b;
        
        // Prefer no hyphens
        if (!a.includes('-') && b.includes('-')) return a;
        if (a.includes('-') && !b.includes('-')) return b;
        
        // Prefer shorter
        return a.length <= b.length ? a : b;
      });
      
      const toRemove = group.filter(e => e !== preferred);
      
      console.log(`Group ${index + 1}:`);
      console.log(`  ✅ Keep: "${preferred}"`);
      toRemove.forEach(ex => {
        const source = tsExercises.includes(ex) ? 'TypeScript' : 'SQL';
        console.log(`  ❌ Remove: "${ex}" (from ${source})`);
      });
      console.log('');
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
