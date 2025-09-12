/**
 * SnapBodyAI Server - Clean Version for Railway
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

// Server Configuration
const app = express();
const PORT = process.env.PORT || 4000;

// Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('=== RAILWAY DEPLOYMENT - GEMINI ONLY ===');
console.log('Port:', PORT);
console.log('Gemini API Key:', GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('Supabase URL:', SUPABASE_URL ? '✅ Configured' : '❌ Missing');
console.log('Supabase Key:', SUPABASE_KEY ? '✅ Configured' : '❌ Missing');

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

// Initialize Gemini Vision Service
let geminiVisionService = null;
let geminiTextService = null;
try {
  if (GEMINI_API_KEY) {
    geminiVisionService = new GeminiVisionService(GEMINI_API_KEY);
    console.log('[RAILWAY] Gemini Vision Service initialized successfully');
    try {
      geminiTextService = new GeminiTextService(GEMINI_API_KEY);
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
app.post('/api/generate-workout-plan', async (req, res) => {
  console.log('[WORKOUT] /api/generate-workout-plan called');
  try {
    if (!geminiTextService) {
      console.error('[WORKOUT] Gemini Text service not available');
      return res.status(503).json({ success: false, error: 'Workout generation service not available' });
    }

    // Accept both 'profile' and 'userProfile' for backward compatibility
    const { profile, userProfile } = req.body || {};
    const profileData = userProfile || profile;
    if (!profileData) {
      return res.status(400).json({ success: false, error: 'Missing profile data' });
    }

    console.log('[WORKOUT] Generating plan with profile:', {
      level: profileData.fitnessLevel,
      goal: profileData.primaryGoal,
      workoutFrequency: profileData.workoutFrequency,
      age: profileData.age,
    });

    // Optional preferences (daysPerWeek/sessionDuration derived as needed inside service)
    const preferences = {};
    const plan = await geminiTextService.generateWorkoutPlan(profileData, preferences);

    // Return in Railway format expected by client
    return res.json({ success: true, workoutPlan: plan });
  } catch (error) {
    console.error('[WORKOUT] Workout plan generation failed:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Workout plan generation failed' });
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

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'This endpoint does not exist on the Railway server'
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
  console.log('='.repeat(50));
});

module.exports = app;
