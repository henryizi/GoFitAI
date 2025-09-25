const GeminiTextService = require('./services/geminiTextService.js');

async function testGemini() {
  try {
    const service = new GeminiTextService('AIzaSyA4MvRwO2jzzyXC9s14GltLzpGH-A7RpRg');
    console.log('Service created successfully');

    const testProfile = {
      full_name: 'Test User',
      gender: 'male',
      age: 30,
      training_level: 'intermediate',
      primary_goal: 'muscle_gain',
      workout_frequency: 4
    };

    const result = await service.generateWorkoutPlan(testProfile, {});
    console.log('Result:', !!result);
    console.log('Has weekly_schedule:', !!(result && result.weekly_schedule));
    if (result && result.weekly_schedule) {
      console.log('Schedule length:', result.weekly_schedule.length);
    }
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Error stack:', error.stack);
  }
}

testGemini();


