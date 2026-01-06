#!/usr/bin/env node
/**
 * Script to find duplicate exercises in the database
 * Checks for plural/singular forms and other variations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Normalize name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Check if two names are essentially the same (singular/plural)
function areEssentiallySame(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Check if one is plural of the other
  if (n1.endsWith('s') && !n2.endsWith('s')) {
    return n1 === n2 + 's' || n1 === n2 + 'es';
  }
  if (n2.endsWith('s') && !n1.endsWith('s')) {
    return n2 === n1 + 's' || n2 === n1 + 'es';
  }
  
  // Special plural cases
  const specialCases = {
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
    'chin up': 'chin ups',
    'chin ups': 'chin up',
    'sit up': 'sit ups',
    'sit ups': 'sit up',
    'calf raise': 'calf raises',
    'calf raises': 'calf raise',
    'lateral raise': 'lateral raises',
    'lateral raises': 'lateral raise',
    'front raise': 'front raises',
    'front raises': 'front raise',
    'rear delt fly': 'rear delt flyes',
    'rear delt flyes': 'rear delt fly',
    'dumbbell fly': 'dumbbell flyes',
    'dumbbell flyes': 'dumbbell fly',
    'cable fly': 'cable flyes',
    'cable flyes': 'cable fly',
    'burpee': 'burpees',
    'burpees': 'burpee',
    'mountain climber': 'mountain climbers',
    'mountain climbers': 'mountain climber',
    'jumping jack': 'jumping jacks',
    'jumping jacks': 'jumping jack',
    'high knee': 'high knees',
    'high knees': 'high knee',
    'butt kicker': 'butt kickers',
    'butt kickers': 'butt kicker',
    'box jump': 'box jumps',
    'box jumps': 'box jump',
    'broad jump': 'broad jumps',
    'broad jumps': 'broad jump',
    'lateral bound': 'lateral bounds',
    'lateral bounds': 'lateral bound',
    'bear crawl': 'bear crawls',
    'bear crawls': 'bear crawl',
    'crab walk': 'crab walks',
    'crab walks': 'crab walk',
    'star jump': 'star jumps',
    'star jumps': 'star jump',
    'step up': 'step ups',
    'step ups': 'step up',
    'jump squat': 'jump squats',
    'jump squats': 'jump squat',
    'squat jump': 'squat jumps',
    'squat jumps': 'squat jump',
    'plank jack': 'plank jacks',
    'plank jacks': 'plank jack',
    'lateral shuffle': 'lateral shuffles',
    'lateral shuffles': 'lateral shuffle',
    'ankle hop': 'ankle hops',
    'ankle hops': 'ankle hop',
    'pogo jump': 'pogo jumps',
    'pogo jumps': 'pogo jump',
    'kettlebell swing': 'kettlebell swings',
    'kettlebell swings': 'kettlebell swing',
  };
  
  return specialCases[n1] === n2 || specialCases[n2] === n1;
}

async function findDuplicates() {
  console.log('🔍 Fetching exercises from database...\n');
  
  try {
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name, is_custom')
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching exercises:', error);
      return;
    }
    
    if (!exercises || exercises.length === 0) {
      console.log('⚠️ No exercises found in database');
      return;
    }
    
    console.log(`Found ${exercises.length} exercises in database\n`);
    
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
        
        if (areEssentiallySame(current.name, other.name)) {
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
      console.log('✅ No duplicates found in database!');
    } else {
      console.log(`❌ Found ${duplicates.length} duplicate groups:\n`);
      
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. Duplicate Group:`);
        dup.group.forEach(ex => {
          console.log(`   - "${ex.name}" (ID: ${ex.id}, Custom: ${ex.is_custom})`);
        });
        console.log('');
      });
      
      console.log('\n📋 Recommendations:\n');
      duplicates.forEach((dup, index) => {
        const group = dup.group;
        // Prefer singular, non-custom
        const preferred = group.reduce((a, b) => {
          const aNorm = normalizeName(a.name);
          const bNorm = normalizeName(b.name);
          
          // Prefer non-custom
          if (!a.is_custom && b.is_custom) return a;
          if (a.is_custom && !b.is_custom) return b;
          
          // Prefer singular
          if (!aNorm.endsWith('s') && bNorm.endsWith('s')) return a;
          if (aNorm.endsWith('s') && !bNorm.endsWith('s')) return b;
          
          // Prefer shorter
          return a.name.length <= b.name.length ? a : b;
        });
        
        const toRemove = group.filter(e => e.id !== preferred.id);
        
        console.log(`Group ${index + 1}:`);
        console.log(`  ✅ Keep: "${preferred.name}" (ID: ${preferred.id})`);
        toRemove.forEach(ex => {
          console.log(`  ❌ Remove: "${ex.name}" (ID: ${ex.id}, Custom: ${ex.is_custom})`);
        });
        console.log('');
      });
      
      // Generate SQL to fix
      console.log('\n📝 SQL to fix duplicates:\n');
      console.log('-- Remove duplicate exercises (keeping singular forms)\n');
      duplicates.forEach((dup) => {
        const preferred = dup.group.reduce((a, b) => {
          const aNorm = normalizeName(a.name);
          const bNorm = normalizeName(b.name);
          if (!a.is_custom && b.is_custom) return a;
          if (a.is_custom && !b.is_custom) return b;
          if (!aNorm.endsWith('s') && bNorm.endsWith('s')) return a;
          if (aNorm.endsWith('s') && !bNorm.endsWith('s')) return b;
          return a.name.length <= b.name.length ? a : b;
        });
        
        const toRemove = dup.group.filter(e => e.id !== preferred.id);
        toRemove.forEach(ex => {
          console.log(`DELETE FROM exercises WHERE id = '${ex.id}'; -- Removing "${ex.name}" (duplicate of "${preferred.name}")`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findDuplicates();








