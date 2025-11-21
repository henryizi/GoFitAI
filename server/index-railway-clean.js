/**
 * GoFitAI Server - Clean Version for Railway
 * Optimized for Gemini-only food analysis
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// const os = require('os'); // Removed unused import
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const GeminiVisionService = require('./services/geminiVisionService');
const GeminiTextService = require('./services/geminiTextService');
const { composeEnhancedWorkoutPrompt, transformAIWorkoutResponse } = require('./services/aiWorkoutGenerator');

// Server Configuration
const app = express();
const PORT = process.env.PORT || 4000;

// Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('=== RAILWAY DEPLOYMENT - GEMINI ONLY - FORCE REDEPLOY ===');
console.log('🚀 NEW WORKOUT GENERATION SYSTEM ACTIVE');
console.log('📅 Generating 5 workout days instead of 3');
console.log('Port:', PORT);
console.log('Gemini API Key:', GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('Supabase URL:', SUPABASE_URL ? '✅ Configured' : '❌ Missing');
console.log('Supabase Key:', SUPABASE_KEY ? '✅ Configured' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

// Initialize Supabase client (guard missing envs)
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[RAILWAY] Supabase client initialized');
  } else {
    console.warn('[RAILWAY] Supabase not initialized - missing URL or KEY');
  }
} catch (e) {
  console.error('[RAILWAY] Failed to initialize Supabase client:', e?.message || e);
}

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueId);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Set Gemini model to 2.5 Flash for all services
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash';

// Initialize Gemini Vision Service
let geminiVisionService = null;
let geminiTextService = null;
try {
  if (GEMINI_API_KEY) {
    geminiVisionService = new GeminiVisionService(GEMINI_API_KEY);
    console.log('[RAILWAY] Gemini Vision Service initialized successfully');
    try {
      // Create a simple API key manager for the Railway deployment
    const simpleApiKeyManager = {
      getBestAvailableKey: () => GEMINI_API_KEY,
      getNextKey: () => GEMINI_API_KEY,
      recordUsage: () => ({ remaining: 100 })
    };
    geminiTextService = new GeminiTextService(simpleApiKeyManager);
      console.log('[RAILWAY] Gemini Text Service initialized successfully');
    } catch (e) {
      console.error('[RAILWAY] Failed to initialize Gemini Text Service:', e.message);
    }
  } else {
    console.error('[RAILWAY] GEMINI_API_KEY not found - food analysis disabled');
  }
} catch (error) {
  console.error('[RAILWAY] Failed to initialize Gemini Vision Service:', error.message);
}

// Version endpoint to verify deployment
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    hasProgressionRoutes: true,
    deployment: 'railway-clean'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!geminiVisionService,
      supabase: !!supabase
    }
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Railway server running - Gemini only mode',
    timestamp: new Date().toISOString()
  });
});

// ====================
// CLEAN FOOD ANALYSIS ENDPOINT - GEMINI ONLY
// ====================
app.post('/api/analyze-food', upload.single('foodImage'), async (req, res) => {
  console.log('[RAILWAY-FOOD] Clean food analysis endpoint called');
  
  try {
    // Check if Gemini Vision service is available
    if (!geminiVisionService) {
      console.error('[RAILWAY-FOOD] Gemini Vision service not available');
      return res.status(503).json({
        success: false,
        error: 'Food analysis service not available',
        message: 'Gemini Vision Service not initialized'
      });
    }

    // Check if image was uploaded
    if (!req.file) {
      console.log('[RAILWAY-FOOD] No image file provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided',
        message: 'Please upload a food image for analysis'
      });
    }

    console.log('[RAILWAY-FOOD] Processing uploaded image');
    console.log('[RAILWAY-FOOD] File info:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Read the uploaded image file
    const imageBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;

    console.log('[RAILWAY-FOOD] Image buffer size:', imageBuffer.length);
    console.log('[RAILWAY-FOOD] Starting Gemini-only analysis...');

    // Analyze the food image using Gemini Vision ONLY
    const analysisResult = await geminiVisionService.analyzeFoodImage(imageBuffer, mimeType);

    console.log('[RAILWAY-FOOD] ✅ Gemini analysis completed successfully');
    console.log('[RAILWAY-FOOD] Food identified:', analysisResult.foodName);
    console.log('[RAILWAY-FOOD] Confidence:', analysisResult.confidence);

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
      console.log('[RAILWAY-FOOD] Uploaded file cleaned up');
    } catch (cleanupError) {
      console.warn('[RAILWAY-FOOD] Failed to cleanup file:', cleanupError.message);
    }

    // Return the analysis results in clean format
    const response = {
      success: true,
      data: {
        foodName: analysisResult.foodName,
        confidence: analysisResult.confidence,
        estimatedServingSize: analysisResult.estimatedServingSize,
        nutrition: {
          calories: analysisResult.totalNutrition.calories,
          protein: analysisResult.totalNutrition.protein,
          carbohydrates: analysisResult.totalNutrition.carbohydrates,
          fat: analysisResult.totalNutrition.fat,
          fiber: analysisResult.totalNutrition.fiber,
          sugar: analysisResult.totalNutrition.sugar,
          sodium: analysisResult.totalNutrition.sodium
        },
        foodItems: analysisResult.foodItems,
        assumptions: analysisResult.assumptions,
        notes: analysisResult.notes,
        analysisProvider: 'gemini_vision_only', // Clear indicator
        timestamp: new Date().toISOString()
      },
      message: `Food analysis completed with ${analysisResult.confidence}% confidence using Gemini Vision`
    };

    console.log('[RAILWAY-FOOD] Response prepared successfully');
    res.json(response);

  } catch (error) {
    console.error('[RAILWAY-FOOD] Analysis failed:', error.message);
    console.error('[RAILWAY-FOOD] Error stack:', error.stack);

    // Clean up uploaded file in case of error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('[RAILWAY-FOOD] Uploaded file cleaned up after error');
      } catch (cleanupError) {
        console.warn('[RAILWAY-FOOD] Failed to cleanup file after error:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Food analysis failed',
      message: error.message,
      analysisProvider: 'gemini_vision_error',
      timestamp: new Date().toISOString()
    });
  }
});

// ====================
// WORKOUT PLAN GENERATION - GEMINI TEXT
// ====================

/**
 * Transforms GeminiTextService plan format to app's expected format
 */
// Helper functions for workout frequency formatting
function formatWorkoutFrequency(frequency) {
  if (!frequency) return '4-5';
  const freqStr = String(frequency);
  return freqStr.replace('_', '-');
}

function getMinFrequency(frequency) {
  const minMap = {
    '2_3': 2,
    '4_5': 4,
    '6': 6
  };
  return minMap[frequency] || 4;
}

function getMaxFrequency(frequency) {
  const maxMap = {
    '2_3': 3,
    '4_5': 5,
    '6': 6
  };
  return maxMap[frequency] || 5;
}

function getFrequencyExplanation(frequency) {
  const explanations = {
    '2_3': '- This is a LOW FREQUENCY plan (2-3 training days per week)\n- Example schedule: Monday (Upper Body), Wednesday (Lower Body), Friday (Full Body)\n- Include 4-5 rest days',
    '4_5': '- This is a MODERATE-HIGH FREQUENCY plan (4-5 training days per week)\n- Example schedule: Monday (Push), Tuesday (Pull), Wednesday (Legs), Thursday (Rest), Friday (Upper), Saturday (Lower), Sunday (Rest)\n- Include only 2-3 rest days',
    '6': '- This is a HIGH FREQUENCY plan (6 training days per week)\n- Example schedule: Monday through Saturday with training, only Sunday as rest\n- Include only 1 rest day'
  };
  return explanations[frequency] || explanations['4_5'];
}

// Compose prompt for workout plan generation
function composePrompt(profile) {
  try {
    // Pre-calculate values to avoid template literal scope issues
    const workoutFreqText = profile.workout_frequency ? formatWorkoutFrequency(profile.workout_frequency) + ' times per week' : '4-5 times per week';
    const frequencyExplanation = getFrequencyExplanation(profile.workout_frequency);
    const minFrequency = getMinFrequency(profile.workout_frequency);
    const maxFrequency = getMaxFrequency(profile.workout_frequency);
    const frequencyDisplay = profile.workout_frequency ? formatWorkoutFrequency(profile.workout_frequency) : '4-5';
    
    // Debug logging
    console.log('[COMPOSE PROMPT] Values calculated:', {
      workoutFreqText,
      frequencyExplanation: frequencyExplanation.substring(0, 50) + '...',
      minFrequency,
      maxFrequency,
      frequencyDisplay,
      primary_goal: profile.primary_goal
    });
    
    // Build prompt using string concatenation to avoid template literal issues
    let prompt = 'You are a professional fitness coach. Create a personalized weekly workout plan for a client with the following profile. Focus on their primary fitness goal while considering their age, gender, training level, and preferred workout frequency.\n\n';
    
    prompt += 'CLIENT PROFILE:\n';
    prompt += '- Full Name: ' + (profile.full_name || 'Client') + '\n';
    prompt += '- Gender: ' + (profile.gender || 'Not specified') + '\n';
    prompt += '- Age: ' + (profile.age || 'Not specified') + '\n';
    prompt += '- Training Level: ' + (profile.training_level || 'intermediate') + '\n';
    prompt += '- Primary Goal: ' + (profile.primary_goal || 'general fitness') + '\n';
    prompt += '- Preferred Workout Frequency: ' + workoutFreqText + '\n\n';
    
    prompt += 'PROGRAMMING & PROGRESSION:\n';
    prompt += '1. Provide a sensible 4-week mesocycle with progressive overload guidance and 1 optional deload recommendation.\n';
    prompt += '2. Suggest target set volumes relative to training level (lower for beginners, higher for advanced).\n';
    prompt += '3. Tailor the workout plan to the client\'s primary goal:\n';
    prompt += '   - Muscle Gain: Focus on compound movements with moderate reps (8-12) and adequate rest (90-120s)\n';
    prompt += '   - Fat Loss: Include higher reps (12-15) with shorter rest periods (60-90s) and cardio elements\n';
    prompt += '   - Athletic Performance: Emphasize functional movements, power exercises, and sport-specific training\n';
    prompt += '   - General Fitness: Balanced approach with mix of strength and cardio elements\n\n';
    
    prompt += 'WORKOUT FREQUENCY: ' + frequencyExplanation + '\n';
    prompt += '- Target: ' + frequencyDisplay + ' training days per week\n';
    prompt += '- Minimum: ' + minFrequency + ' days per week\n';
    prompt += '- Maximum: ' + maxFrequency + ' days per week\n\n';
    
    prompt += 'RESPONSE FORMAT:\n';
    prompt += 'You must respond with a valid JSON object containing a structured workout plan. The format MUST be:\n\n';
    prompt += '{\n';
    prompt += '  "plan_name": "' + (profile.full_name || 'Client') + '\'s ' + (profile.primary_goal || 'Fitness').replace(/_/g, ' ') + ' Plan",\n';
    prompt += '  "weekly_schedule": [\n';
    prompt += '    {\n';
    prompt += '      "day": "Monday",\n';
    prompt += '      "focus": "Upper Body Strength",\n';
    prompt += '      "exercises": [\n';
    prompt += '        {\n';
    prompt += '          "name": "Exercise Name",\n';
    prompt += '          "sets": 3,\n';
    prompt += '          "reps": "8-12",\n';
    prompt += '          "rest": "90s",\n';
    prompt += '          "notes": "Focus on form"\n';
    prompt += '        }\n';
    prompt += '      ]\n';
    prompt += '    }\n';
    prompt += '  ],\n';
    prompt += '  "mesocycle_weeks": 4,\n';
    prompt += '  "deload_week": 5,\n';
    prompt += '  "progressive_overload": "Increase weight by 2.5-5% when you can complete all sets with good form"\n';
    prompt += '}\n\n';
    
    prompt += 'IMPORTANT REQUIREMENTS:\n';
    prompt += '1. Generate a complete 7-day weekly schedule with both training and rest days\n';
    prompt += '2. Exactly ' + frequencyDisplay + ' days MUST be training days with exercises\n';
    prompt += '3. Rest days should have "focus": "Rest Day" and empty exercises array\n';
    prompt += '4. Training days MUST include 4-8 exercises each\n';
    prompt += '5. Ensure the plan matches the client\'s primary goal: ' + (profile.primary_goal || 'general fitness') + '\n';
    prompt += '6. Return ONLY the JSON object, no additional text\n';
    
    console.log('[COMPOSE PROMPT] Prompt successfully generated, length:', prompt.length);
    return prompt;
    
  } catch (error) {
    console.error('[COMPOSE PROMPT] Error building prompt:', error);
    throw error;
  }
}

function transformGeminiPlanToAppFormat(plan, profileData) {
  console.log('[WORKOUT] Transforming enhanced plan format for app compatibility');
  console.log('[WORKOUT] Plan structure:', {
    hasWeeklySchedule: !!(plan.weeklySchedule || plan.weekly_schedule),
    scheduleLength: (plan.weeklySchedule || plan.weekly_schedule || []).length,
    hasUserProfile: !!plan.user_profile_summary,
    planName: plan.plan_name
  });
  
  // Handle both weeklySchedule (new format) and weekly_schedule (old format)
  const schedule = plan.weeklySchedule || plan.weekly_schedule || [];
  
  const weeklySchedule = schedule.map(day => {
    // Handle the enhanced format with warm_up, main_workout, cool_down
    let allExercises = [];
    
    if (day.warm_up || day.main_workout || day.cool_down) {
      // New enhanced format
      const warmUpExercises = (day.warm_up || []).map(ex => ({
        ...ex,
        category: 'warm_up',
        name: ex.exercise || ex.name || 'Warm-up Exercise'
      }));
      
      const mainExercises = (day.main_workout || []).map(ex => ({
        ...ex,
        category: 'main_workout',
        name: ex.exercise || ex.name || 'Main Exercise'
      }));
      
      const coolDownExercises = (day.cool_down || []).map(ex => ({
        ...ex,
        category: 'cool_down',
        name: ex.exercise || ex.name || 'Cool-down Exercise'
      }));
      
      allExercises = [...warmUpExercises, ...mainExercises, ...coolDownExercises];
    } else if (day.exercises) {
      // Legacy format
      allExercises = day.exercises.map(ex => ({
        ...ex,
        category: 'main_workout',
        name: ex.name || ex.exercise || 'Exercise'
      }));
    }

    // Transform exercises to app format
    const exercises = allExercises.map(exercise => ({
      name: exercise.name || 'Unknown Exercise',
      sets: exercise.sets || 3,
      reps: exercise.reps || '8-12',
      restBetweenSets: exercise.rest || exercise.rest_seconds || '60-90s',
      instructions: exercise.instructions || '',
      muscleGroups: exercise.muscle_groups || [],
      category: exercise.category || 'main_workout',
      duration: exercise.duration || null // For warm-up and cool-down exercises
    }));

    return {
      day: day.day_name || day.day || `Day ${day.day || 1}`,
      focus: day.focus || day.workout_type || 'Training',
      exercises: exercises,
      duration_minutes: day.duration_minutes || 60
    };
  });

  // Create a meaningful plan name if missing
  const createPlanName = (plan, profileData) => {
    if (plan.plan_name) return plan.plan_name;
    
    const goal = profileData.primaryGoal || profileData.primary_goal || 'fitness';
    const level = profileData.fitnessLevel || profileData.training_level || 'intermediate';
    const name = profileData.fullName || profileData.full_name || 'User';
    
    // Create a personalized plan name
    const goalMap = {
      'muscle_gain': 'Muscle Building',
      'weight_loss': 'Fat Loss', 
      'fat_loss': 'Fat Loss',
      'athletic_performance': 'Athletic Performance',
      'general_fitness': 'General Fitness',
      'strength': 'Strength Training',
      'endurance': 'Endurance Training'
    };
    
    const levelMap = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate', 
      'advanced': 'Advanced'
    };
    
    const goalName = goalMap[goal] || 'Custom';
    const levelName = levelMap[level] || 'Intermediate';
    
    return `${name}'s ${goalName} Plan (${levelName})`;
  };

  // Return in app's expected format with enhanced data
  return {
    name: createPlanName(plan, profileData),
    primaryGoal: profileData.primaryGoal || profileData.primary_goal || 'general_fitness', // ✅ ADD PRIMARY GOAL
    training_level: plan.target_level || profileData.fitnessLevel || profileData.training_level || 'intermediate',
    goal_fat_loss: profileData.fatLossGoal || profileData.goal_fat_reduction || 2,
    goal_muscle_gain: profileData.muscleGainGoal || profileData.goal_muscle_gain || 3,
    mesocycle_length_weeks: plan.duration_weeks || 4,
    weeklySchedule: weeklySchedule,
    user_profile_summary: plan.user_profile_summary || {
      name: profileData.fullName || profileData.full_name || 'User',
      training_level: profileData.fitnessLevel || profileData.training_level || 'intermediate',
      primary_goal: profileData.primaryGoal || profileData.primary_goal || 'general_fitness'
    },
    recommendations: {
      nutrition: typeof plan.nutrition_tips === 'string' ? [plan.nutrition_tips] : (plan.nutrition_tips || []),
      safety: plan.safety_guidelines || [],
      progression: plan.progression || plan.progression_plan || {}
    },
    estimatedTimePerSession: plan.estimatedTimePerSession || `${plan.sessions_per_week ? Math.round(60 * plan.sessions_per_week / 7) : 60} minutes`
  };
}

app.post('/api/generate-workout-plan', async (req, res) => {
  console.log('[WORKOUT] /api/generate-workout-plan called');
  try {
    if (!geminiTextService) {
      console.error('[WORKOUT] Gemini Text service not available');
      return res.status(503).json({ success: false, error: 'Workout generation service not available' });
    }

    // Accept both 'profile' and 'userProfile' for backward compatibility
    const { profile, userProfile } = req.body || {};
    let profileData = userProfile || profile;
    
    if (!profileData) {
      return res.status(400).json({ success: false, error: 'Missing profile data' });
    }

    // 🔧 NORMALIZE PROFILE DATA: Handle different field name formats
    if (userProfile && !profile) {
      // If we received userProfile format, normalize to expected format
      profileData = {
        full_name: userProfile.fullName || userProfile.full_name || 'Client',
        gender: userProfile.gender || 'not_specified',
        age: userProfile.age || 25,
        height_cm: userProfile.height_cm || userProfile.heightCm,
        weight_kg: userProfile.weight_kg || userProfile.weightKg,
        training_level: userProfile.fitnessLevel || userProfile.training_level || 'intermediate',
        primary_goal: userProfile.primaryGoal || userProfile.primary_goal || 'general_fitness',
        workout_frequency: userProfile.workoutFrequency || userProfile.workout_frequency || '4_5',
        body_fat: userProfile.body_fat,
        activity_level: userProfile.activity_level || 'moderately_active',
        fitness_strategy: userProfile.fitness_strategy || 'general',
        goal_fat_reduction: userProfile.goal_fat_reduction || 1,
        goal_muscle_gain: userProfile.goal_muscle_gain || 1,
        exercise_frequency: userProfile.exercise_frequency || userProfile.workout_frequency || '4-5',
        weight_trend: userProfile.weight_trend || 'stable'
      };
      console.log('[WORKOUT] ✅ Normalized userProfile to standard format');
    }

    console.log('[WORKOUT] Normalized profile data:', {
      full_name: profileData.full_name,
      training_level: profileData.training_level,
      primary_goal: profileData.primary_goal,
      workout_frequency: profileData.workout_frequency,
      age: profileData.age,
    });

    try {
      console.log('[WORKOUT] Attempting Gemini AI workout plan generation');
      console.log('[WORKOUT] GeminiTextService available:', !!geminiTextService);

      if (!geminiTextService) {
        console.log('[WORKOUT] Gemini Text Service not available, using fallback');
        throw new Error('Gemini Text Service not available');
      }

      // Use ENHANCED prompt generation instead of old composePrompt
      console.log('[WORKOUT] 🚀 Using ENHANCED AI Workout Generator');
      console.log('[WORKOUT] Gemini Model:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');
      
      const enhancedPrompt = composeEnhancedWorkoutPrompt({
        gender: profileData.gender,
        primaryGoal: profileData.primary_goal,
        workoutFrequency: profileData.workout_frequency,
        trainingLevel: profileData.training_level,
        age: profileData.age,
        weight: profileData.weight_kg,
        height: profileData.height_cm,
        fullName: profileData.full_name
      });
      
      console.log('[WORKOUT] 📝 Enhanced prompt generated (' + enhancedPrompt.length + ' chars)');
      console.log('[WORKOUT] Prompt preview:', enhancedPrompt.substring(0, 300) + '...');

      const plan = await geminiTextService.generateWorkoutPlan(enhancedPrompt);
      console.log('[WORKOUT] Raw plan from Gemini:', JSON.stringify(plan, null, 2));

      // Transform to app format using enhanced transformer
      const transformedPlan = transformAIWorkoutResponse(plan, {
        trainingLevel: profileData.training_level,
        primaryGoal: profileData.primary_goal,
        workoutFrequency: profileData.workout_frequency,
        age: profileData.age,
        weight: profileData.weight_kg,
        height: profileData.height_cm,
        gender: profileData.gender,
        fullName: profileData.full_name
      });
      console.log('[WORKOUT] Transformed plan:', JSON.stringify(transformedPlan, null, 2));

      // Return in Railway format expected by client with proper system metadata
      return res.json({ 
        success: true, 
        workoutPlan: transformedPlan, 
        provider: 'gemini', 
        used_ai: true,
        system_info: {
          fallback_used: false,
          fallback_reason: null,
          ai_available: true
        }
      });
    } catch (aiError) {
      console.log('[WORKOUT] ❌ Gemini AI failed:', aiError.message);
      console.log('[WORKOUT] 🧮 Using rule-based fallback workout plan generation');

      // Generate rule-based fallback plan
      const fallbackPlan = generateRuleBasedWorkoutPlan(profileData);
      console.log('[WORKOUT] Generated fallback plan with', fallbackPlan.weekly_schedule?.length || 0, 'days');

      return res.json({
        success: true,
        workoutPlan: fallbackPlan,
        provider: 'rule_based_fallback',
        used_ai: false,
        note: 'AI generation failed, using rule-based fallback',
        system_info: {
          fallback_used: true,
          fallback_reason: 'ai_unavailable',
          ai_available: false
        }
      });
    }
  } catch (error) {
    console.error('[WORKOUT] Workout plan generation failed:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Workout plan generation failed' });
  }
});

// ====================
// NUTRITION PLAN GENERATION - MATHEMATICAL CALCULATION
// ====================

// Helper function to generate meal templates
function generateMealTemplates(dailyTargets, strategy = 'balanced', preferences = []) {
  const isVegetarian = preferences.includes('vegetarian');
  const isVegan = preferences.includes('vegan');
  const isKeto = preferences.includes('keto');
  const isPaleo = preferences.includes('paleo');
  
  const templates = {
    breakfast: isKeto ? 'Scrambled eggs with avocado and spinach' :
               isVegan ? 'Oatmeal with berries and nuts' :
               isVegetarian ? 'Greek yogurt with granola and fruit' :
               'Protein smoothie with banana and oats',
    lunch: isKeto ? 'Grilled chicken salad with olive oil' :
           isVegan ? 'Quinoa Buddha bowl with vegetables' :
           isVegetarian ? 'Vegetable stir-fry with tofu' :
           'Grilled chicken with sweet potato',
    dinner: isKeto ? 'Salmon with broccoli and butter' :
            isVegan ? 'Lentil curry with brown rice' :
            isVegetarian ? 'Pasta with marinara and vegetables' :
            'Lean beef with quinoa and vegetables',
    snack: isKeto ? 'Mixed nuts and cheese' :
           isVegan ? 'Apple with almond butter' :
           'Greek yogurt with berries'
  };
  
  return [
    { time_slot: 'Breakfast', calories: Math.round(dailyTargets.calories * 0.25), meal: templates.breakfast },
    { time_slot: 'Lunch', calories: Math.round(dailyTargets.calories * 0.35), meal: templates.lunch },
    { time_slot: 'Dinner', calories: Math.round(dailyTargets.calories * 0.30), meal: templates.dinner },
    { time_slot: 'Snack', calories: Math.round(dailyTargets.calories * 0.10), meal: templates.snack }
  ];
}

// Helper function to filter food suggestions
function filterFoodSuggestions(preferences = []) {
  const isVegetarian = preferences.includes('vegetarian');
  const isVegan = preferences.includes('vegan');
  
  const base = {
    protein_sources: isVegan ? ['tofu', 'tempeh', 'legumes', 'quinoa', 'nuts'] :
                     isVegetarian ? ['eggs', 'dairy', 'legumes', 'quinoa', 'nuts'] :
                     ['chicken', 'fish', 'lean beef', 'eggs', 'legumes'],
    carb_sources: ['oats', 'quinoa', 'sweet potato', 'brown rice', 'fruits'],
    fat_sources: ['avocado', 'nuts', 'olive oil', 'seeds'],
    vegetables: ['spinach', 'broccoli', 'bell peppers', 'carrots', 'tomatoes']
  };
  
  return { food_suggestions: base };
}

app.post('/api/generate-nutrition-plan', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/generate-nutrition-plan`);
  try {
    const { profile, preferences, mealsPerDay = 3, snacksPerDay = 1 } = req.body;

    if (!profile) {
      return res.status(400).json({ error: 'Missing required profile data' });
    }

    console.log('[NUTRITION] Generating plan with mathematical calculations (no AI)');

    // Create a personalized plan name
    const mockPlanName = profile.full_name ? `${profile.full_name}'s Nutrition Plan` : 'Nutrition Plan';

    // Calculate BMR using Henry/Oxford equation (metric)
    let age;
    if (profile.age) {
      age = profile.age;
    } else if (profile.birthday) {
      const birthDate = new Date(profile.birthday);
      age = new Date().getFullYear() - birthDate.getFullYear();
    } else {
      age = 30; // Default fallback
    }
    const weight = profile.weight;
    const height = profile.height;
    const gender = (profile.gender || 'female').toLowerCase();

    let bmr;
    if (gender === 'male') {
      if (age >= 18 && age <= 30) {
        bmr = 14.4 * weight + 3.13 * height + 113;
      } else if (age >= 30 && age <= 60) {
        bmr = 11.4 * weight + 5.41 * height - 137;
      } else { // 60+
        bmr = 11.4 * weight + 5.41 * height - 256;
      }
    } else {
      if (age >= 18 && age <= 30) {
        bmr = 10.4 * weight + 6.15 * height - 282;
      } else if (age >= 30 && age <= 60) {
        bmr = 8.18 * weight + 5.02 * height - 11.6;
      } else { // 60+
        bmr = 8.52 * weight + 4.21 * height + 10.7;
      }
    }

    // Activity level multipliers for TDEE calculation
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    };

    const activityLevel = profile.activity_level || 'moderately_active';
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

    // Caloric adjustment based on fitness strategy
    let dailyCalories;
    const strategy = profile.fitness_strategy || profile.goal_type || 'maintenance';
    
    switch (strategy) {
      case 'weight_loss':
      case 'fat_loss':
        dailyCalories = Math.round(tdee * 0.85); // 15% deficit
        break;
      case 'weight_gain':
      case 'muscle_gain':
        dailyCalories = Math.round(tdee * 1.15); // 15% surplus
        break;
      case 'maintenance':
      default:
        dailyCalories = Math.round(tdee);
        break;
    }

    // Macro distribution based on strategy
    let proteinRatio, carbRatio, fatRatio;
    
    if (preferences && preferences.includes('keto')) {
      proteinRatio = 0.25;
      carbRatio = 0.05;
      fatRatio = 0.70;
    } else if (strategy === 'muscle_gain') {
      proteinRatio = 0.30;
      carbRatio = 0.45;
      fatRatio = 0.25;
    } else if (strategy === 'weight_loss') {
      proteinRatio = 0.35;
      carbRatio = 0.35;
      fatRatio = 0.30;
    } else {
      proteinRatio = 0.25;
      carbRatio = 0.45;
      fatRatio = 0.30;
    }

    const proteinGrams = Math.round((dailyCalories * proteinRatio) / 4);
    const carbGrams = Math.round((dailyCalories * carbRatio) / 4);
    const fatGrams = Math.round((dailyCalories * fatRatio) / 9);

    const metabolicCalculations = {
      bmr_kcal_day: Math.round(bmr),
      tdee_kcal_day: Math.round(tdee),
      activity_level: activityLevel,
      strategy: strategy,
      caloric_adjustment: strategy === 'weight_loss' ? '-15%' : 
                          strategy === 'weight_gain' ? '+15%' : '0%'
    };

    const dailyTargets = {
      calories: dailyCalories,
      protein_grams: proteinGrams,
      carbs_grams: carbGrams,
      fat_grams: fatGrams,
      fiber_grams: Math.round(dailyCalories / 100), // 1g per 100 calories
      water_liters: Math.round((weight * 35) / 1000 * 10) / 10 // 35ml per kg body weight
    };

    const micronutrientsTargets = {
      vitamin_c_mg: gender === 'male' ? 90 : 75,
      vitamin_d_iu: 600,
      calcium_mg: age < 50 ? 1000 : 1200,
      iron_mg: gender === 'male' ? 8 : (age < 50 ? 18 : 8),
      magnesium_mg: gender === 'male' ? 400 : 310,
      zinc_mg: gender === 'male' ? 11 : 8
    };

    // Try to save to database if configured
    let savedToDatabase = false;
    let planId = null;
    
    if (supabase) {
      try {
        const nutritionPlanData = {
          user_id: profile.user_id || profile.id,
          plan_name: mockPlanName,
          goal_type: profile.goal_type || strategy,
          status: 'active',
          preferences: {
            dietary: preferences || [],
            intolerances: []
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          daily_calories: dailyCalories,
          protein_grams: proteinGrams,
          carbs_grams: carbGrams,
          fat_grams: fatGrams,
          fiber_grams: dailyTargets.fiber_grams,
          water_liters: dailyTargets.water_liters,
          metabolic_calculations: metabolicCalculations,
          micronutrients_targets: micronutrientsTargets,
          // ❌ REMOVED: daily_schedule - nutrition plans should only contain targets, not specific meals
          ...filterFoodSuggestions(preferences || [])
        };

        const { data: insertedPlan, error } = await supabase
          .from('nutrition_plans')
          .insert(nutritionPlanData)
          .select()
          .single();

        if (error) {
          console.error('[NUTRITION] Database insert error:', error);
        } else {
          console.log('[NUTRITION] Successfully saved to database with ID:', insertedPlan.id);
          savedToDatabase = true;
          planId = insertedPlan.id;
        }
      } catch (dbError) {
        console.error('[NUTRITION] Database error:', dbError);
      }
    }

    // Fallback: Generate a unique ID for the plan if database save failed
    if (!planId) {
      planId = `traditional-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
    }

    // Return nutrition plan with traditional calculations - TARGETS ONLY, NO SPECIFIC MEALS
    return res.json({
      success: true,
      message: savedToDatabase ? 'Nutrition plan generated and saved successfully' : 
               'Nutrition plan generated with mathematical calculations. Database not configured - set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY for persistence.',
      saved_to_database: savedToDatabase,
      id: planId,
      plan_name: mockPlanName,
      user_id: profile.user_id || profile.id,
      goal_type: profile.goal_type,
      status: 'active',
      preferences: {
        dietary: preferences || [],
        intolerances: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metabolic_calculations: metabolicCalculations,
      daily_targets: dailyTargets,
      micronutrients_targets: micronutrientsTargets,
      // ❌ REMOVED: daily_schedule - nutrition plans should only contain targets, not specific meals
      ...filterFoodSuggestions(preferences || [])
    });
  } catch (error) {
    console.error('[NUTRITION] Error generating nutrition plan:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate nutrition plan.',
      errorType: error.name || 'UnknownError',
      errorDetails: error.response?.data || null
    });
  }
});

// Basic endpoints for app functionality
app.get('/api/workouts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/log-food-entry', async (req, res) => {
  try {
    const { userId, entry } = req.body;

    if (!userId || !entry) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const { data, error } = await supabase
      .from('nutrition_log_entries')
      .insert({
        user_id: userId,
        ...entry,
      })
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ====================
// DAILY METRICS LOGGING
// ====================

// Helper function to calculate habit score
async function calculateHabitScore(userId, date) {
  try {
    let totalScore = 0;

    // 1. Nutrition Score (40 points max)
    // Check if any food was logged for the day
    const { data: nutritionLogs } = await supabase
      .from('nutrition_log_entries')
      .select('id, calories, protein_grams, carbs_grams, fat_grams')
      .eq('user_id', userId)
      .gte('logged_at', `${date}T00:00:00`)
      .lte('logged_at', `${date}T23:59:59`);

    if (nutritionLogs && nutritionLogs.length > 0) {
      totalScore += 15; // Food logged: 15 points

      // Calculate macro compliance and quality
      let totalCalories = 0;
      let totalProtein = 0;
      let totalQuality = 0;

      nutritionLogs.forEach(entry => {
        totalCalories += entry.calories || 0;
        totalProtein += entry.protein_grams || 0;

        // Calculate quality score for each entry
        const proteinG = Number(entry.protein_grams || 0);
        const carbsG = Number(entry.carbs_grams || 0);
        const fatG = Number(entry.fat_grams || 0);
        const calsFromMacros = proteinG * 4 + carbsG * 4 + fatG * 9;
        const entryCalories = Number(entry.calories || calsFromMacros || 0);
        const safeTotal = Math.max(entryCalories, 1);
        
        const proteinShare = Math.min((proteinG * 4) / safeTotal, 0.4) / 0.4;
        const fatShare = (fatG * 9) / safeTotal;
        const fatPenalty = Math.max(0, fatShare - 0.45) / 0.35;
        const entryScore = Math.max(0, Math.min(10, Math.round((proteinShare * 7 + (1 - fatPenalty) * 3))));
        
        totalQuality += entryScore;
      });

      // Get user's nutrition targets
      const { data: nutritionPlan } = await supabase
        .from('nutrition_plans')
        .select('daily_calories, protein_grams')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (nutritionPlan) {
        const targetCalories = nutritionPlan.daily_calories || 2000;
        const targetProtein = nutritionPlan.protein_grams || 150;

        // Calculate compliance (how close to targets)
        const calorieCompliance = Math.max(0, 1 - Math.abs(totalCalories - targetCalories) / targetCalories);
        const proteinCompliance = Math.min(1, totalProtein / targetProtein);
        const macroCompliance = (calorieCompliance + proteinCompliance) / 2;
        
        totalScore += Math.round(macroCompliance * 15); // Macro compliance: 15 points
      }

      // Average quality score
      const qualityScore = nutritionLogs.length > 0 ? totalQuality / nutritionLogs.length / 10 : 0;
      totalScore += Math.round(qualityScore * 10); // Quality: 10 points
    }

    // 2. Weight Tracking Score (20 points max)
    const { data: todayMetric } = await supabase
      .from('daily_user_metrics')
      .select('weight_kg')
      .eq('user_id', userId)
      .eq('metric_date', date)
      .single();

    if (todayMetric?.weight_kg) {
      totalScore += 15; // Weight logged: 15 points

      // Calculate streak for bonus
      const { data: recentMetrics } = await supabase
        .from('daily_user_metrics')
        .select('metric_date')
        .eq('user_id', userId)
        .not('weight_kg', 'is', null)
        .order('metric_date', { ascending: false })
        .limit(30);

      if (recentMetrics) {
        const byDate = new Set(recentMetrics.map(m => m.metric_date));
        let streakDays = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(date);
          d.setDate(d.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          if (byDate.has(key)) streakDays += 1; else break;
        }
        
        if (streakDays >= 7) {
          totalScore += 5; // Streak bonus: 5 points
        }
      }
    }

    // 3. Workout Score (30 points max)
    const { data: todayWorkouts } = await supabase
      .from('workout_sessions')
      .select('id, status')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    if (todayWorkouts?.some(w => w.status === 'completed')) {
      totalScore += 25; // Workout completed: 25 points

      // Calculate weekly consistency
      const weekAgo = new Date(date);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data: weeklyWorkouts } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', `${weekAgoStr}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`);

      if ((weeklyWorkouts?.length || 0) >= 3) {
        totalScore += 5; // Consistency bonus: 5 points
      }
    }

    // 4. Wellness Score (10 points max)
    if (todayMetric?.sleep_hours) {
      totalScore += 5; // Sleep logged: 5 points
    }
    if (todayMetric?.stress_level) {
      totalScore += 5; // Stress logged: 5 points
    }

    return Math.min(100, totalScore); // Cap at 100
  } catch (error) {
    console.error('[calculateHabitScore] Error:', error);
    return 0;
  }
}

/**
 * Generate a mathematical meal plan based on target macros (no AI)
 * Distributes calories and macros across meals using predefined templates
 */
function generateMathematicalMealPlan(targets, dietaryPreferences = []) {
  console.log('[MEAL PLAN] generateMathematicalMealPlan called with targets:', targets);
  
  const totalCalories = targets.daily_calories;
  const totalProtein = targets.protein_grams;
  const totalCarbs = targets.carbs_grams;
  const totalFat = targets.fat_grams;

  // Validate that all required values are present and are numbers
  if (!totalCalories || typeof totalCalories !== 'number' || totalCalories <= 0) {
    throw new Error(`Invalid calories target: ${totalCalories}`);
  }
  if (!totalProtein || typeof totalProtein !== 'number' || totalProtein <= 0) {
    throw new Error(`Invalid protein target: ${totalProtein}`);
  }
  if (!totalCarbs || typeof totalCarbs !== 'number' || totalCarbs <= 0) {
    throw new Error(`Invalid carbs target: ${totalCarbs}`);
  }
  if (!totalFat || typeof totalFat !== 'number' || totalFat <= 0) {
    throw new Error(`Invalid fat target: ${totalFat}`);
  }

  // Meal distribution percentages (breakfast, lunch, dinner, snack)
  const mealDistribution = {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
    lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.30 },
    dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
    snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 }
  };
  
  // Predefined meal templates
  const mealTemplates = {
    breakfast: {
      standard: {
        name: "Protein Oatmeal Bowl",
        prep_time: 5,
        cook_time: 10,
        ingredients: ["Rolled oats", "Protein powder", "Banana", "Almond butter", "Milk"],
        instructions: ["Cook oats with milk", "Mix in protein powder", "Top with banana and almond butter"]
      },
      vegetarian: {
        name: "Greek Yogurt Parfait",
        prep_time: 5,
        cook_time: 0,
        ingredients: ["Greek yogurt", "Granola", "Mixed berries", "Honey", "Chia seeds"],
        instructions: ["Layer yogurt with granola", "Add berries and honey", "Sprinkle chia seeds"]
      },
      vegan: {
        name: "Plant Protein Smoothie Bowl",
        prep_time: 10,
        cook_time: 0,
        ingredients: ["Plant protein powder", "Oat milk", "Frozen berries", "Banana", "Granola"],
        instructions: ["Blend protein, milk, and fruits", "Pour into bowl", "Top with granola"]
      }
    },
    lunch: {
      standard: {
        name: "Grilled Chicken Salad",
        prep_time: 15,
        cook_time: 20,
        ingredients: ["Chicken breast", "Mixed greens", "Quinoa", "Avocado", "Olive oil dressing"],
        instructions: ["Grill chicken breast", "Cook quinoa", "Assemble salad with all ingredients"]
      },
      vegetarian: {
        name: "Quinoa Buddha Bowl",
        prep_time: 10,
        cook_time: 25,
        ingredients: ["Quinoa", "Chickpeas", "Roasted vegetables", "Tahini", "Mixed greens"],
        instructions: ["Cook quinoa", "Roast vegetables", "Assemble bowl with tahini dressing"]
      },
      vegan: {
        name: "Lentil Power Bowl",
        prep_time: 15,
        cook_time: 30,
        ingredients: ["Red lentils", "Brown rice", "Steamed broccoli", "Nutritional yeast", "Hemp seeds"],
        instructions: ["Cook lentils and rice", "Steam broccoli", "Combine with nutritional yeast"]
      }
    },
    dinner: {
      standard: {
        name: "Baked Salmon with Vegetables",
        prep_time: 10,
        cook_time: 25,
        ingredients: ["Salmon fillet", "Sweet potato", "Asparagus", "Olive oil", "Herbs"],
        instructions: ["Bake salmon at 400°F", "Roast sweet potato and asparagus", "Season with herbs"]
      },
      vegetarian: {
        name: "Stuffed Bell Peppers",
        prep_time: 20,
        cook_time: 35,
        ingredients: ["Bell peppers", "Brown rice", "Black beans", "Cheese", "Tomato sauce"],
        instructions: ["Stuff peppers with rice and beans", "Top with cheese", "Bake until tender"]
      },
      vegan: {
        name: "Chickpea Curry",
        prep_time: 15,
        cook_time: 25,
        ingredients: ["Chickpeas", "Coconut milk", "Tomatoes", "Spinach", "Curry spices"],
        instructions: ["Sauté spices", "Add chickpeas and tomatoes", "Simmer with coconut milk"]
      }
    },
    snack: {
      standard: {
        name: "Protein Smoothie",
        prep_time: 5,
        cook_time: 0,
        ingredients: ["Protein powder", "Banana", "Berries", "Milk", "Ice"],
        instructions: ["Blend all ingredients", "Serve immediately"]
      },
      vegetarian: {
        name: "Trail Mix",
        prep_time: 2,
        cook_time: 0,
        ingredients: ["Mixed nuts", "Dried fruit", "Dark chocolate chips"],
        instructions: ["Mix all ingredients in bowl"]
      },
      vegan: {
        name: "Apple with Almond Butter",
        prep_time: 2,
        cook_time: 0,
        ingredients: ["Apple", "Almond butter", "Cinnamon"],
        instructions: ["Slice apple", "Serve with almond butter", "Sprinkle cinnamon"]
      }
    }
  };

  // Determine dietary preference category
  let preferenceCategory = 'standard';
  if (dietaryPreferences.includes('vegetarian') || dietaryPreferences.includes('plant_based')) {
    preferenceCategory = 'vegetarian';
  }
  if (dietaryPreferences.includes('vegan')) {
    preferenceCategory = 'vegan';
  }

  const meals = [];

  // Generate each meal
  Object.keys(mealDistribution).forEach(mealType => {
    const distribution = mealDistribution[mealType];
    const template = mealTemplates[mealType][preferenceCategory];
    
    const mealCalories = Math.round(totalCalories * distribution.calories);
    const mealProtein = Math.round(totalProtein * distribution.protein);
    const mealCarbs = Math.round(totalCarbs * distribution.carbs);
    const mealFat = Math.round(totalFat * distribution.fat);

    meals.push({
      meal_type: mealType,
      recipe_name: template.name,
      prep_time: template.prep_time,
      cook_time: template.cook_time,
      servings: 1,
      ingredients: template.ingredients,
      instructions: template.instructions,
      macros: {
        calories: mealCalories,
        protein_grams: mealProtein,
        carbs_grams: mealCarbs,
        fat_grams: mealFat
      },
      nutrition: {
        calories: mealCalories,
        protein: mealProtein,
        carbohydrates: mealCarbs,
        fat: mealFat
      }
    });
  });

  console.log('[MEAL PLAN] Generated mathematical meal plan with', meals.length, 'meals');
  return meals;
}

app.post('/api/generate-daily-meal-plan', async (req, res) => {
  console.log('[MEAL PLAN] Received request for user:', req.body.userId);
  const { userId } = req.body;
  
  if (!userId) {
    console.log('[MEAL PLAN] Missing userId in request');
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Handle guest users and invalid UUIDs without hitting the database
  const guestUsers = ['guest-user', 'test-user-with-no-plan'];
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
  
  if (guestUsers.includes(userId) || !isValidUUID) {
    console.log(`[MEAL PLAN] Guest/invalid user detected ('${userId}'), serving default plan.`);
    const defaultTargets = {
      daily_calories: 2000,
      protein_grams: 150,
      carbs_grams: 200,
      fat_grams: 67
    };
    const mealPlan = generateMathematicalMealPlan(defaultTargets, []);
    return res.json({
      success: true,
      meal_plan: mealPlan,
      method: 'mathematical',
      aiProvider: 'none',
      message: 'Generated default meal plan for guest user.'
    });
  }

  try {
    // Check if Supabase is configured
    console.log('[MEAL PLAN] Checking Supabase configuration:', !!supabase);
    if (!supabase) {
      console.log('[MEAL PLAN] Supabase not configured, generating default meal plan');
      
      // Use standard nutritional targets for an average adult
      const defaultTargets = {
        daily_calories: 2000,
        protein_grams: 150,
        carbs_grams: 200,
        fat_grams: 67
      };
      
      const mealPlan = generateMathematicalMealPlan(defaultTargets, []);
      
      return res.json({
        success: true,
        meal_plan: mealPlan,
        method: 'mathematical',
        aiProvider: 'none',
        message: 'Generated default meal plan. Database not configured.'
      });
    }

    // 1. Fetch user's most recent active nutrition plan
    const { data: currentPlan, error: planError } = await supabase
      .from('nutrition_plans')
      .select('id, preferences, daily_targets')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !currentPlan) {
      console.log('[MEAL PLAN] No nutrition plan found for user, generating default meal plan.');
      
      // Use standard nutritional targets for an average adult
      const defaultTargets = {
        daily_calories: 2000,
        protein_grams: 150,
        carbs_grams: 200,
        fat_grams: 67
      };
      
      const mealPlan = generateMathematicalMealPlan(defaultTargets, []);
      
      return res.json({
        success: true,
        meal_plan: mealPlan,
        method: 'mathematical',
        aiProvider: 'none',
        message: 'Generated default meal plan. Please create a nutrition plan for personalized meals.'
      });
    }

    // 2. Get nutrition targets
    let currentTargets = null;
    
    // Try to get targets from historical_nutrition_targets first
    const { data: historicalTargets, error: targetsError } = await supabase
      .from('historical_nutrition_targets')
      .select('*')
      .eq('nutrition_plan_id', currentPlan.id)
      .is('end_date', null)
      .single();

    if (!targetsError && historicalTargets) {
      currentTargets = historicalTargets;
    } else if (currentPlan) {
      // Use targets from nutrition_plans, with safe access
      // CHECK 1: Look for a 'daily_targets' object
      // CHECK 2: Look for top-level calorie properties
      const targetsSource = currentPlan.daily_targets || currentPlan;
      currentTargets = {
        daily_calories: targetsSource.daily_calories || targetsSource.calories,
        protein_grams: targetsSource.protein_grams || targetsSource.protein,
        carbs_grams: targetsSource.carbs_grams || targetsSource.carbs,
        fat_grams: targetsSource.fat_grams || targetsSource.fat
      };
    }

    // Validate targets and fallback to a default plan if they are incomplete or invalid
    if (
        !currentTargets ||
        !currentTargets.daily_calories ||
        !currentTargets.protein_grams ||
        !currentTargets.carbs_grams ||
        !currentTargets.fat_grams
    ) {
        console.log('[MEAL PLAN] Invalid or incomplete targets found, using default mathematical plan.');
        const defaultTargets = { daily_calories: 2000, protein_grams: 150, carbs_grams: 200, fat_grams: 67 };
        mealPlan = generateMathematicalMealPlan(defaultTargets, currentPlan?.preferences?.dietary || []);
        method = 'mathematical';
    } else {
      // All targets are valid, proceed with generation
      console.log('[MEAL PLAN] Valid targets found. Attempting AI generation.');
      
      if (GEMINI_API_KEY && geminiTextService) {
        try {
          console.log('[MEAL PLAN] 🤖 Attempting Gemini AI meal plan generation');
          
          const prompt = `You are a world-class chef and nutritionist. Create a complete, creative daily meal plan that meets these nutritional targets exactly.

DAILY NUTRITIONAL TARGETS:
- Total Calories: ${currentTargets.daily_calories} kcal
- Protein: ${currentTargets.protein_grams}g
- Carbohydrates: ${currentTargets.carbs_grams}g
- Fat: ${currentTargets.fat_grams}g

DIETARY PREFERENCES: ${currentPlan.preferences?.dietary?.length > 0 ? currentPlan.preferences.dietary.join(', ') : 'No specific restrictions'}

MEAL DISTRIBUTION:
- Breakfast: ~25% of daily calories (${Math.round(currentTargets.daily_calories * 0.25)} kcal)
- Lunch: ~35% of daily calories (${Math.round(currentTargets.daily_calories * 0.35)} kcal)
- Dinner: ~30% of daily calories (${Math.round(currentTargets.daily_calories * 0.30)} kcal)
- Snack: ~10% of daily calories (${Math.round(currentTargets.daily_calories * 0.10)} kcal)

Create 4 diverse, delicious meals that together meet the exact nutritional targets above.

Respond with a JSON array in this exact format:
[
  {
    "meal_type": "breakfast",
    "recipe_name": "Creative meal name",
    "prep_time": 15,
    "cook_time": 10,
    "servings": 1,
    "ingredients": ["1 cup oats", "1/2 cup blueberries", "1 tbsp almond butter"],
    "instructions": ["Cook oats with water", "Add blueberries and almond butter", "Mix well and serve"],
    "macros": {
      "calories": ${Math.round(currentTargets.daily_calories * 0.25)},
      "protein": ${Math.round(currentTargets.protein_grams * 0.25)},
      "carbs": ${Math.round(currentTargets.carbs_grams * 0.25)},
      "fat": ${Math.round(currentTargets.fat_grams * 0.25)}
    }
  }
]`;

          const response = await geminiTextService.generateText(prompt);
          
          if (response && response.trim()) {
            // Extract JSON from response
            const jsonMatch = response.match(/\[\s*{[\s\S]*}\s*\]/);
            if (jsonMatch) {
              try {
                const parsedPlan = JSON.parse(jsonMatch[0]);
                
                if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
                  // Validate the AI response before using it
                  const validMeals = parsedPlan.filter(
                    (meal) =>
                      meal &&
                      meal.recipe_name &&
                      meal.macros &&
                      typeof meal.macros.calories === 'number'
                  );

                  if (validMeals.length === parsedPlan.length) {
                    // All meals are valid, proceed
                    mealPlan = validMeals.map((meal) => ({
                      ...meal,
                      // Create a consistent, safe nutrition object
                      nutrition: {
                        calories: meal.macros.calories || 0,
                        protein: meal.macros.protein || 0,
                        carbohydrates: meal.macros.carbs || 0,
                        fat: meal.macros.fat || 0,
                      },
                    }));
                    method = 'ai';
                    aiProvider = 'gemini';
                    console.log('[MEAL PLAN] ✅ Successfully generated and validated Gemini AI meal plan');
                  } else {
                    console.log('[MEAL PLAN] ⚠️ Gemini response contained invalid/incomplete meal objects, falling back.');
                  }
                }
              } catch (parseError) {
                console.log('[MEAL PLAN] ❌ Failed to parse JSON from Gemini response:', parseError.message);
              }
            }
          }
        } catch (aiError) {
          console.log('[MEAL PLAN] ❌ Gemini AI generation failed:', aiError.message);
        }
      }

      // Fallback to mathematical generation if AI failed or wasn't used
      if (!mealPlan || mealPlan.length === 0) {
        console.log('[MEAL PLAN] 🧮 Using mathematical meal plan generation as fallback');
        try {
          const mealPlanMath = generateMathematicalMealPlan(currentTargets, currentPlan.preferences?.dietary || []);
          if (!mealPlanMath || mealPlanMath.length === 0) {
            return res.status(500).json({ error: 'Failed to generate mathematical meal plan.' });
          }
          // Standardize the output to include the 'nutrition' object
          mealPlan = mealPlanMath.map(meal => ({
            ...meal,
            nutrition: {
              calories: meal.macros.calories || 0,
              protein: meal.macros.protein_grams || 0,
              carbohydrates: meal.macros.carbs_grams || 0,
              fat: meal.macros.fat_grams || 0,
            },
          }));
          method = 'mathematical';
        } catch (mathError) {
          console.error('[DAILY MEAL PLAN] Error during mathematical meal generation fallback:', mathError);
          return res.status(500).json({ success: false, error: mathError.message });
        }
      }
    }

    if (!mealPlan || !Array.isArray(mealPlan) || mealPlan.length === 0) {
      throw new Error('Failed to generate valid meal plan');
    }

    console.log('[MEAL PLAN] ✅ Generated meal plan successfully');
    
    res.json({
      success: true,
      mealPlan: mealPlan, // Use the correct variable name
      method: method,
      aiProvider: aiProvider,
    });

  } catch (error) {
    console.error('[DAILY MEAL PLAN] Error generating daily meal plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate meal plan'
    });
  }
});

app.post('/api/log-daily-metric', async (req, res) => {
  const { userId, metricDate, metrics } = req.body;

  if (!userId || !metricDate || !metrics) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    let trendWeight = null;

    if (metrics.weight_kg) {
      // Calculate trend weight if a new weight is provided
      const fourteenDaysAgo = new Date(
        new Date().setDate(new Date().getDate() - 14)
      )
        .toISOString()
        .split('T')[0];

      const { data: recentMetrics, error: recentMetricsError } =
        await supabase
          .from('daily_user_metrics')
          .select('weight_kg')
          .eq('user_id', userId)
          .gte('metric_date', fourteenDaysAgo)
          .order('metric_date', { ascending: false });

      if (recentMetricsError) {
        console.error(
          '[LOG METRIC] Error fetching recent metrics for trend weight:',
          recentMetricsError
        );
        // Don't block logging if this fails, just skip trend weight
      } else {
        const weights = recentMetrics.map((m) => m.weight_kg);
        weights.unshift(parseFloat(metrics.weight_kg)); // Add today's weight to the front
        
        // Use last 7 available weights for moving average
        const weightsForAverage = weights.slice(0, 7);
        if (weightsForAverage.length > 0) {
          const sum = weightsForAverage.reduce((acc, w) => acc + w, 0);
          trendWeight = (sum / weightsForAverage.length).toFixed(2);
        }
      }
    }

    // Calculate habit score after logging metrics
    let habitScore = null;
    try {
      habitScore = await calculateHabitScore(userId, metricDate);
    } catch (habitError) {
      console.error('[LOG METRIC] Error calculating habit score:', habitError);
      // Don't block metric logging if habit score calculation fails
    }

    const { data, error } = await supabase
      .from('daily_user_metrics')
      .upsert(
        {
          user_id: userId,
          metric_date: metricDate,
          ...metrics,
          ...(trendWeight && { trend_weight_kg: trendWeight }),
          ...(habitScore !== null && { habit_score: habitScore }),
        },
        { onConflict: 'user_id, metric_date' }
      )
      .select();

    if (error) {
      console.error('[LOG METRIC] Error upserting metric:', error);
      throw new Error(error.message);
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rule-based fallback workout plan generator
function generateRuleBasedWorkoutPlan(profileData) {
  console.log('[WORKOUT] Generating rule-based workout plan for:', profileData.primary_goal || 'general_fitness');

  const fitnessLevel = profileData.training_level || 'intermediate';
  const primaryGoal = profileData.primary_goal || 'general_fitness';
  const workoutFrequency = profileData.workout_frequency || '4_5';

  // Determine number of days per week
  let daysPerWeek;
  if (workoutFrequency === '1') {
    daysPerWeek = 1;
  } else if (workoutFrequency === '2_3') {
    daysPerWeek = Math.random() < 0.5 ? 2 : 3;
  } else if (workoutFrequency === '4_5') {
    daysPerWeek = Math.random() < 0.5 ? 4 : 5;
  } else if (workoutFrequency === '6') {
    daysPerWeek = 6;
  } else if (workoutFrequency === '7') {
    daysPerWeek = 7;
  } else {
    daysPerWeek = parseInt(workoutFrequency) || 4;
  }

  const sessionDuration = 45;
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weeklySchedule = [];

  // Basic workout templates based on goals
  const templates = {
    muscle_gain: [
      { day_name: 'Push Day', focus: 'Chest, Shoulders, Triceps', exercises: ['Bench Press', 'Overhead Press', 'Tricep Dips', 'Push-ups'] },
      { day_name: 'Pull Day', focus: 'Back, Biceps', exercises: ['Pull-ups', 'Bent-over Rows', 'Bicep Curls', 'Face Pulls'] },
      { day_name: 'Legs Day', focus: 'Quads, Hamstrings, Glutes', exercises: ['Squats', 'Romanian Deadlifts', 'Lunges', 'Calf Raises'] },
      { day_name: 'Push Day', focus: 'Chest, Shoulders, Triceps', exercises: ['Incline Bench Press', 'Lateral Raises', 'Tricep Extensions', 'Push-ups'] },
      { day_name: 'Pull Day', focus: 'Back, Biceps', exercises: ['Lat Pulldowns', 'Barbell Rows', 'Hammer Curls', 'Shrugs'] }
    ],
    fat_loss: [
      { day_name: 'Full Body HIIT', focus: 'Full Body Circuit', exercises: ['Burpees', 'Mountain Climbers', 'Jump Squats', 'Push-ups', 'Plank'] },
      { day_name: 'Strength Circuit', focus: 'Mixed Circuit', exercises: ['Squats', 'Push-ups', 'Bent-over Rows', 'Overhead Press', 'Plank'] },
      { day_name: 'Cardio Focus', focus: 'Cardio and Core', exercises: ['High Knees', 'Jumping Jacks', 'Bicycle Crunches', 'Russian Twists', 'Plank'] },
      { day_name: 'Full Body Circuit', focus: 'Full Body Circuit', exercises: ['Lunges', 'Push-ups', 'Pull-ups', 'Deadlifts', 'Plank'] }
    ],
    general_fitness: [
      { day_name: 'Upper Body', focus: 'Chest, Back, Shoulders', exercises: ['Push-ups', 'Bent-over Rows', 'Overhead Press', 'Plank'] },
      { day_name: 'Lower Body', focus: 'Legs and Core', exercises: ['Squats', 'Lunges', 'Calf Raises', 'Plank'] },
      { day_name: 'Full Body', focus: 'Mixed Full Body', exercises: ['Burpees', 'Mountain Climbers', 'Push-ups', 'Squats'] },
      { day_name: 'Upper Body', focus: 'Chest, Back, Arms', exercises: ['Push-ups', 'Superman', 'Shoulder Taps', 'Plank'] },
      { day_name: 'Lower Body', focus: 'Legs and Core', exercises: ['Lunges', 'Glute Bridges', 'Calf Raises', 'Russian Twists'] }
    ],
    athletic_performance: [
      { day_name: 'Functional Training', focus: 'Functional Movements', exercises: ['Squats', 'Push-ups', 'Pull-ups', 'Lunges', 'Plank'] },
      { day_name: 'Power Development', focus: 'Power and Speed', exercises: ['Jump Squats', 'Push-ups', 'Burpees', 'Mountain Climbers'] },
      { day_name: 'Core and Stability', focus: 'Core and Balance', exercises: ['Plank Variations', 'Russian Twists', 'Dead Bugs', 'Bird Dogs'] },
      { day_name: 'Full Body Athletic', focus: 'Athletic Conditioning', exercises: ['Burpees', 'Jump Lunges', 'Push-ups', 'Mountain Climbers'] }
    ]
  };

  const goalTemplates = templates[primaryGoal] || templates.general_fitness;

  // Create weekly schedule with selected templates
  for (let i = 0; i < Math.min(daysPerWeek, goalTemplates.length); i++) {
    const template = goalTemplates[i];
    const sets = fitnessLevel === 'beginner' ? 2 : fitnessLevel === 'advanced' ? 4 : 3;
    const reps = primaryGoal === 'strength' ? '4-6' : primaryGoal === 'endurance' ? '15-20' : '8-12';
    const restSeconds = primaryGoal === 'strength' ? 120 : primaryGoal === 'fat_loss' ? 45 : 75;

    weeklySchedule.push({
      day: i + 1,
      day_name: template.day_name,
      focus: template.focus,
      workout_type: template.focus,
      duration_minutes: sessionDuration,
      warm_up: [
        { exercise: 'Light Cardio', duration: '5 minutes', instructions: 'Easy pace to elevate heart rate' },
        { exercise: 'Dynamic Stretches', duration: '3 minutes', instructions: 'Arm circles, leg swings, torso twists' }
      ],
      main_workout: template.exercises.map(exercise => ({
        exercise: exercise,
        sets: sets,
        reps: reps,
        rest_seconds: restSeconds,
        instructions: `Perform ${exercise.toLowerCase()} with proper form`,
        modifications: fitnessLevel === 'beginner' ? 'Use lighter weight or modifications as needed' : 'Focus on progressive overload'
      })),
      cool_down: [
        { exercise: 'Static Stretching', duration: '5 minutes', instructions: 'Stretch major muscle groups worked' }
      ]
    });
  }

  return {
    plan_name: `Rule-based ${primaryGoal.replace('_', ' ')} Plan`,
    primary_goal: primaryGoal,
    workout_frequency: workoutFrequency,
    weekly_schedule: weeklySchedule,
    created_at: new Date().toISOString(),
    source: 'rule_based_fallback',
    duration_weeks: 4,
    sessions_per_week: daysPerWeek,
    target_level: fitnessLevel,
    progression_plan: {
      week_1: 'Focus on form and consistency',
      week_2: 'Increase weight or reps gradually',
      week_3: 'Add complexity and intensity',
      week_4: 'Peak performance and assess progress'
    },
    nutrition_tips: [
      'Stay hydrated throughout your workouts',
      'Eat a balanced meal 1-2 hours before exercising',
      'Include protein in your post-workout nutrition',
      'Listen to your body and adjust as needed'
    ],
    safety_guidelines: [
      'Always warm up before exercising',
      'Stop if you feel pain (not to be confused with normal muscle fatigue)',
      'Use proper form to prevent injury',
      'Progress gradually to avoid overtraining',
      'Consult a healthcare provider before starting new exercise programs'
    ],
    equipment_needed: ['Basic fitness equipment'],
    estimated_results: 'Consistent training will show results in 4-6 weeks'
  };
}

// ===================
// PROGRESSION ANALYSIS ROUTES
// ===================
try {
  console.log('[ROUTES] Attempting to load progression routes...');
  const progressionRoutes = require('./routes/progression-routes');
  console.log('[ROUTES] Routes module loaded, type:', typeof progressionRoutes);
  console.log('[ROUTES] Routes is function:', typeof progressionRoutes === 'function');
  console.log('[ROUTES] Routes is object:', typeof progressionRoutes === 'object');
  
  if (!progressionRoutes) {
    throw new Error('Progression routes module is null or undefined');
  }
  
  app.use('/api/progression', progressionRoutes);
  console.log('[ROUTES] ✓ Progression analysis routes registered at /api/progression');
  console.log('[ROUTES] Available endpoints:');
  console.log('  - POST /api/progression/analyze');
  console.log('  - POST /api/progression/detect-plateaus');
  console.log('  - POST /api/progression/recommendations');
  console.log('  - GET /api/progression/test');
  
  // Verify routes are actually registered by checking Express router stack
  setTimeout(() => {
    const routes = app._router?.stack || [];
    const progressionLayers = routes.filter(layer => {
      const regexp = layer?.regexp?.toString() || '';
      return regexp.includes('progression') || regexp.includes('/api/progression');
    });
    console.log('[ROUTES] Route verification (after registration):');
    console.log('[ROUTES] Total middleware layers:', routes.length);
    console.log('[ROUTES] Progression layers found:', progressionLayers.length);
    if (progressionLayers.length > 0) {
      progressionLayers.forEach((layer, idx) => {
        console.log(`[ROUTES]   Layer ${idx + 1}:`, {
          regexp: layer?.regexp?.toString().substring(0, 100),
          name: layer?.name,
          route: !!layer?.route
        });
      });
    } else {
      console.error('[ROUTES] ⚠️  WARNING: No progression layers found in router stack!');
    }
  }, 100);
} catch (error) {
  console.error('[ROUTES] ✗ ERROR: Failed to load progression routes:', error);
  console.error('[ROUTES] Error message:', error.message);
  console.error('[ROUTES] Error stack:', error.stack);
  // Don't exit - let server start so we can debug other routes
  // But log a clear warning
  console.error('[ROUTES] ⚠️  WARNING: Progression routes will not be available!');
}

// Route listing endpoint for debugging (before catch-all)
app.get('/api/routes', (req, res) => {
  const routes = app._router?.stack || [];
  const routeInfo = routes
    .filter(layer => layer?.route || layer?.name === 'router')
    .map(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        return {
          method: methods,
          path: layer.route.path,
          type: 'route'
        };
      } else if (layer.name === 'router') {
        const regexp = layer.regexp?.toString() || '';
        return {
          method: 'ALL',
          path: regexp.substring(0, 100),
          type: 'router',
          name: layer.name
        };
      }
      return null;
    })
    .filter(Boolean);
  
  res.json({
    success: true,
    totalRoutes: routeInfo.length,
    routes: routeInfo,
    progressionRoutes: routeInfo.filter(r => 
      r.path?.includes('progression') || r.path?.includes('/api/progression')
    )
  });
});

// Catch-all for undefined routes (must be last)
// Only match if no other route matched
app.use((req, res, next) => {
  // Skip if this is a progression route (should have been handled above)
  if (req.path.startsWith('/api/progression')) {
    console.error('[CATCH-ALL] Progression route reached catch-all - routes may not be registered!');
    console.error('[CATCH-ALL] Path:', req.path);
    console.error('[CATCH-ALL] Method:', req.method);
  }
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'This endpoint does not exist on the Railway server',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 RAILWAY SERVER STARTED`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🤖 AI Provider: Gemini Vision Only`);
  console.log(`⚡ No DeepSeek or external API calls`);
  console.log(`🔗 Food Analysis: /api/analyze-food`);
  console.log(`💚 Health Check: /api/health`);
  console.log(`📋 Progress: /api/log-daily-metric`);
  console.log(`📈 Progression: /api/progression/*`);
  console.log(`🔍 Route Debug: /api/routes`);
  console.log(`🔄 Server version: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
});

module.exports = app;
