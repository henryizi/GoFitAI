require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Load .env from root
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const GITHUB_URL = 'https://raw.githubusercontent.com/longhaul-fitness/exercises/main/strength.json';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseKey) throw new Error('Missing SUPABASE_SERVICE_KEY in .env');
const supabase = createClient(supabaseUrl, supabaseKey);

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
async function getGiphyGif(exerciseName) {
  if (!GIPHY_API_KEY) return null;
  try {
    const { data } = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: GIPHY_API_KEY,
        q: exerciseName,
        limit: 1,
        rating: 'pg',
      },
    });
    if (data.data && data.data.length) {
      return data.data[0].images.fixed_height.url;
    }
  } catch (error) {
    console.warn(`Giphy lookup failed for ${exerciseName}:`, error.message);
  }
  return null;
}

async function seedExercises() {
  try {
    console.log('Fetching exercise data from GitHub...');
    const { data: exercises } = await axios.get(GITHUB_URL);
    console.log(`Fetched ${exercises.length} valid exercises to process.`);

    // Filter exercises to those with a primary muscle group
    const filteredExercises = exercises.filter(ex => ex.primaryMuscles && ex.primaryMuscles.length > 0);

    const formattedExercises = [];
    for (const ex of filteredExercises) {
      // Use dataset GIF if available
      const datasetGif = ex.videos && ex.videos.length > 0 ? ex.videos[0] : null;
      // Fallback to Giphy for higher-quality animation
      const giphyGif = !datasetGif ? await getGiphyGif(ex.name) : null;
      const animationUrl = datasetGif || giphyGif || null;

      formattedExercises.push({
        name: ex.name,
        description: ex.steps.join('\n'),
        form_tips: [],
        muscle_groups: [...ex.primaryMuscles, ...(ex.secondaryMuscles || [])],
        category: categorizeExercise(ex.primaryMuscles[0], ex.name),
        difficulty: 'intermediate',
        equipment_needed: ['bodyweight'],
        rpe_recommendation: null,
        is_custom: false,
        animation_url: animationUrl,
      });
    }

    for (const exerciseData of formattedExercises) {
      // Check if exercise with this name already exists
      const { data: existing, error: findError } = await supabase
        .from('exercises')
        .select('id')
        .eq('name', exerciseData.name)
        .maybeSingle();

      if (findError) {
        console.error(`Error checking for exercise ${exerciseData.name}:`, findError);
        continue;
      }

      if (existing) {
        // If it exists, update it
        const { error: updateError } = await supabase
          .from('exercises')
          .update(exerciseData)
          .eq('id', existing.id);
        if (updateError) {
          console.error(`Error updating exercise ${exerciseData.name}:`, updateError);
        } else {
          console.log(`Updated: ${exerciseData.name}`);
        }
      } else {
        // If it does not exist, insert it
        const { error: insertError } = await supabase
          .from('exercises')
          .insert(exerciseData);
        if (insertError) {
          console.error(`Error inserting exercise ${exerciseData.name}:`, insertError);
        } else {
          console.log(`Inserted: ${exerciseData.name}`);
        }
      }
    }

    console.log('Finished seeding exercises.');
  } catch (error) {
    console.error('An error occurred during the seeding process:', error);
  }
}

function categorizeExercise(primaryMuscle, exerciseName = '') {
  if (!primaryMuscle) return 'accessory';
  
  const muscle = primaryMuscle.toLowerCase();
  const name = exerciseName.toLowerCase();
  
  // Compound exercises - multi-joint movements
  const compoundKeywords = [
    'squat', 'deadlift', 'press', 'row', 'pull-up', 'chin-up', 'dip',
    'lunge', 'clean', 'snatch', 'thruster', 'burpee', 'turkish get-up'
  ];
  
  // Check if it's a compound movement
  if (compoundKeywords.some(keyword => name.includes(keyword))) {
    return 'compound';
  }
  
  // Multi-muscle movements are typically compound
  const compoundMuscles = ['chest', 'back', 'shoulders', 'legs', 'quadriceps', 'hamstrings', 'glutes'];
  if (compoundMuscles.some(m => muscle.includes(m))) {
    return 'compound';
  }
  
  // Isolation exercises - single joint/muscle focus
  const isolationMuscles = ['biceps', 'triceps', 'calves', 'forearms'];
  if (isolationMuscles.some(m => muscle.includes(m))) {
    return 'isolation';
  }
  
  // Default to accessory for smaller muscle groups and core work
  return 'accessory';
}

seedExercises(); 