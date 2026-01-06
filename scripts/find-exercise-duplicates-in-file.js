#!/usr/bin/env node
/**
 * Find duplicate exercises in exerciseNames.ts file
 * Checks for exact duplicates and plural/singular forms
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/constants/exerciseNames.ts');

console.log('🔍 Finding duplicate exercises in exerciseNames.ts...\n');

const content = fs.readFileSync(filePath, 'utf8');

// Extract all exercise names
const exercises = [];
const nameRegex = /name:\s*"([^"]+)"/g;
let match;

while ((match = nameRegex.exec(content)) !== null) {
  exercises.push({
    name: match[1],
    index: match.index
  });
}

console.log(`Found ${exercises.length} exercises\n`);

// Normalize for comparison
function normalize(name) {
  return name.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
}

// Check if two names are essentially the same
function areDuplicates(name1, name2) {
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // Check singular/plural
  if (n1.endsWith('s') && !n2.endsWith('s')) {
    return n1 === n2 + 's' || n1 === n2 + 'es';
  }
  if (n2.endsWith('s') && !n1.endsWith('s')) {
    return n2 === n1 + 's' || n2 === n1 + 'es';
  }
  
  // Special cases
  const special = {
    'squat': 'squats',
    'squats': 'squat',
    'lunge': 'lunges',
    'lunges': 'lunge',
    'crunch': 'crunches',
    'crunches': 'crunch',
    'push up': 'push ups',
    'push ups': 'push up',
    'pull up': 'pull ups',
    'pull ups': 'pull up',
    'jumping jack': 'jumping jacks',
    'jumping jacks': 'jumping jack',
    'plank jack': 'plank jacks',
    'plank jacks': 'plank jack',
    'bear crawl': 'bear crawls',
    'bear crawls': 'bear crawl',
    'lateral shuffle': 'lateral shuffles',
    'lateral shuffles': 'lateral shuffle',
  };
  
  return special[n1] === n2 || special[n2] === n1;
}

// Find duplicates
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
    
    if (areDuplicates(current.name, other.name)) {
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

if (duplicates.length === 0) {
  console.log('✅ No duplicates found!');
} else {
  console.log(`❌ Found ${duplicates.length} duplicate groups:\n`);
  
  duplicates.forEach((dup, index) => {
    console.log(`${index + 1}. Duplicate Group:`);
    dup.group.forEach(ex => {
      const lineNum = content.substring(0, ex.index).split('\n').length;
      console.log(`   - "${ex.name}" (line ~${lineNum})`);
    });
    console.log('');
  });
  
  console.log('\n📋 Recommendations:\n');
  duplicates.forEach((dup, index) => {
    const group = dup.group;
    // Prefer singular, shorter
    const preferred = group.reduce((a, b) => {
      const aNorm = normalize(a.name);
      const bNorm = normalize(b.name);
      
      // Prefer singular
      if (!aNorm.endsWith('s') && bNorm.endsWith('s')) return a;
      if (aNorm.endsWith('s') && !bNorm.endsWith('s')) return b;
      
      // Prefer shorter
      return a.name.length <= b.name.length ? a : b;
    });
    
    const toRemove = group.filter(e => e.name !== preferred.name);
    
    console.log(`Group ${index + 1}:`);
    console.log(`  ✅ Keep: "${preferred.name}"`);
    toRemove.forEach(ex => {
      const lineNum = content.substring(0, ex.index).split('\n').length;
      console.log(`  ❌ Remove: "${ex.name}" (line ~${lineNum})`);
    });
    console.log('');
  });
}








