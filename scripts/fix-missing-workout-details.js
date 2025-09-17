#!/usr/bin/env node

/**
 * Fix Missing Workout Details Script
 * 
 * This script addresses the issue where workout history details disappear
 * after deleting the original workout plan. It populates missing exercises_data
 * from existing exercise_sets records before they get deleted.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingWorkoutDetails() {
  console.log('🔧 Starting to fix missing workout details...\n');
  
  try {
    // Step 1: Find workout_history records with missing exercises_data
    console.log('📋 Step 1: Finding records with missing exercises_data...');
    
    const { data: historyRecords, error: historyError } = await supabase
      .from('workout_history')
      .select('id, session_id, plan_id, plan_name, session_name, week_number, day_number, completed_at, exercises_data')
      .or('exercises_data.is.null,exercises_data.eq.{}');
    
    if (historyError) {
      console.error('❌ Error fetching workout history:', historyError);
      return;
    }
    
    if (!historyRecords || historyRecords.length === 0) {
      console.log('✅ No records found with missing exercises_data. All good!');
      return;
    }
    
    console.log(`📊 Found ${historyRecords.length} records with missing exercises_data`);
    
    // Step 2: For each record, try to reconstruct exercises_data
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const record of historyRecords) {
      console.log(`\n🔍 Processing record ${record.id}...`);
      console.log(`   Plan: ${record.plan_name || 'Unknown'}`);
      console.log(`   Session: ${record.session_name || 'Unknown'}`);
      console.log(`   Completed: ${record.completed_at}`);
      
      let exercisesData = null;
      
      // Try to get data from exercise_sets if session_id exists
      if (record.session_id) {
        console.log(`   🔗 Trying to fetch from exercise_sets using session_id...`);
        
        const { data: setsData, error: setsError } = await supabase
          .from('exercise_sets')
          .select(`
            id,
            exercise_id,
            actual_reps,
            actual_weight,
            rpe,
            completed_at,
            notes,
            exercises:exercise_id (
              id,
              name,
              muscle_groups,
              equipment_needed
            )
          `)
          .eq('session_id', record.session_id)
          .order('completed_at', { ascending: true });
        
        if (setsError) {
          console.log(`   ⚠️  Error fetching exercise sets: ${setsError.message}`);
        } else if (setsData && setsData.length > 0) {
          console.log(`   ✅ Found ${setsData.length} exercise sets`);
          
          // Group sets by exercise
          const exerciseGroups = {};
          setsData.forEach(set => {
            const exerciseId = set.exercise_id;
            if (!exerciseGroups[exerciseId]) {
              exerciseGroups[exerciseId] = {
                exercise_id: exerciseId,
                exercise_name: set.exercises?.name || 'Unknown Exercise',
                muscle_groups: set.exercises?.muscle_groups || [],
                equipment_needed: set.exercises?.equipment_needed || [],
                logs: []
              };
            }
            
            exerciseGroups[exerciseId].logs.push({
              id: set.id,
              actual_reps: set.actual_reps,
              actual_weight: set.actual_weight,
              rpe: set.rpe,
              completed_at: set.completed_at,
              notes: set.notes
            });
          });
          
          exercisesData = {
            exercises: Object.values(exerciseGroups),
            session_info: {
              plan_name: record.plan_name,
              session_name: record.session_name,
              week_number: record.week_number,
              day_number: record.day_number,
              reconstructed: true,
              reconstructed_at: new Date().toISOString()
            }
          };
          
          console.log(`   📊 Reconstructed data for ${Object.keys(exerciseGroups).length} exercises`);
        }
      }
      
      // If we couldn't get real data, create placeholder data
      if (!exercisesData && record.plan_name) {
        console.log(`   🔄 Creating placeholder data...`);
        
        exercisesData = {
          exercises: [],
          session_info: {
            plan_name: record.plan_name,
            session_name: record.session_name || `Week ${record.week_number || '?'} Day ${record.day_number || '?'}`,
            week_number: record.week_number,
            day_number: record.day_number,
            placeholder: true,
            note: 'Original exercise data was lost when the plan was deleted. This is a placeholder entry.',
            reconstructed_at: new Date().toISOString()
          }
        };
      }
      
      // Update the record with exercises_data
      if (exercisesData) {
        const { error: updateError } = await supabase
          .from('workout_history')
          .update({ exercises_data: exercisesData })
          .eq('id', record.id);
        
        if (updateError) {
          console.log(`   ❌ Error updating record: ${updateError.message}`);
          skippedCount++;
        } else {
          console.log(`   ✅ Successfully updated record with exercises_data`);
          fixedCount++;
        }
      } else {
        console.log(`   ⚠️  Could not reconstruct data for this record`);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} records`);
    console.log(`   ⚠️  Skipped: ${skippedCount} records`);
    console.log(`   📝 Total processed: ${historyRecords.length} records`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 Workout details should now be visible in your workout history!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixMissingWorkoutDetails();














