import { DeepSeekService } from '../src/services/ai/deepseek';

async function testTomPlatzWorkout() {
  console.log('\n🧪 TESTING TOM PLATZ STATIC WORKOUT TEMPLATE\n');
  
  try {
    const plan = await DeepSeekService.generateWorkoutPlan({
      height: 175,
      weight: 75,
      age: 25,
      gender: 'male',
      fatLossGoal: 2,
      muscleGainGoal: 4,
      trainingLevel: 'intermediate',
      availableEquipment: ['Dumbbell', 'Barbell', 'Cable Machine', 'Plate'],
      emulateBodybuilder: 'platz' // Tom Platz ID from UI
    });
    
    console.log('✅ SUCCESS: Generated Tom Platz workout plan');
    console.log('\n📋 WORKOUT OVERVIEW:');
    console.log(`   Plan Name: ${plan.name}`);
    console.log(`   Days: ${plan.weeklySchedule.length}`);
    console.log(`   Training Level: ${plan.training_level}`);
    console.log(`   Muscle Gain Goal: ${plan.goal_muscle_gain}/5`);
    console.log(`   Fat Loss Goal: ${plan.goal_fat_loss}/5`);
    
    console.log('\n🏋️‍♂️ DAILY BREAKDOWN:');
    plan.weeklySchedule.forEach((day, index) => {
      console.log(`\n   ${day.day}: ${day.focus}`);
      console.log(`      Exercises: ${day.exercises.length}`);
      
      // Show first 3 exercises as sample
      day.exercises.slice(0, 3).forEach(exercise => {
        console.log(`         • ${exercise.name}: ${exercise.sets} sets × ${exercise.reps} reps`);
      });
      
      if (day.exercises.length > 3) {
        console.log(`         ... and ${day.exercises.length - 3} more exercises`);
      }
    });
    
    console.log('\n🎯 VERIFICATION:');
    const legDay = plan.weeklySchedule.find(day => 
      day.focus.toLowerCase().includes('leg')
    );
    
    if (legDay) {
      const squats = legDay.exercises.find(ex => 
        ex.name.toLowerCase().includes('squat')
      );
      
      if (squats) {
        console.log(`   ✅ Found legendary squats: ${squats.sets} sets × ${squats.reps} reps`);
      } else {
        console.log(`   ❌ Missing squats on leg day!`);
      }
    } else {
      console.log(`   ❌ No leg day found!`);
    }
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  }
}

testTomPlatzWorkout();
