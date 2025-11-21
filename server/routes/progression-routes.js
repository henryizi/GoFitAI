/**
 * ============================================================
 * PROGRESSION API ROUTES
 * ============================================================
 * API端点用于训练进度分析、停滞检测和进阶建议
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const progressionAnalysisService = require('../services/progressionAnalysisService');

// Debug: Log when routes file is loaded
console.log('[ProgressionRoutes] Routes file loaded and router created');

// Supabase client - initialized on first request
let supabase = null;
let isInitialized = false;

// Logging middleware - log ALL requests to progression router
router.use((req, res, next) => {
  console.log('[ProgressionRoutes] ===== REQUEST RECEIVED =====');
  console.log('[ProgressionRoutes] Method:', req.method);
  console.log('[ProgressionRoutes] Path:', req.path);
  console.log('[ProgressionRoutes] URL:', req.url);
  console.log('[ProgressionRoutes] Original URL:', req.originalUrl);
  console.log('[ProgressionRoutes] Base URL:', req.baseUrl);
  console.log('[ProgressionRoutes] ============================');
  next();
});

// Middleware to initialize service on first request
router.use((req, res, next) => {
  if (!isInitialized) {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[ProgressionRoutes] Initializing Supabase client');
    console.log('[ProgressionRoutes] URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('[ProgressionRoutes] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
    console.log('[ProgressionRoutes] SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('[ProgressionRoutes] EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('[ProgressionRoutes] Key exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[ProgressionRoutes] Missing Supabase credentials!');
      console.error('[ProgressionRoutes] Missing URL:', !supabaseUrl);
      console.error('[ProgressionRoutes] Missing Key:', !supabaseKey);
      console.error('[ProgressionRoutes] Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing database credentials',
        details: {
          urlMissing: !supabaseUrl,
          keyMissing: !supabaseKey,
          availableVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
        }
      });
    }
    
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      // Add retry logic at the client level
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'gofit-ai-server'
        }
      }
    });
    
    progressionAnalysisService.initialize(supabase);
    isInitialized = true;
    console.log('[ProgressionRoutes] Supabase client initialized successfully');
  }
  next();
});

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  console.log('[API] /progression/test - Route test endpoint hit');
  res.json({
    success: true,
    message: 'Progression routes are working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/progression/analyze
 * 第1步：分析用户的整体训练进度
 * 第2步：返回每个exercise的表现状态和metrics
 */
router.post('/analyze', async (req, res) => {
  try {
    console.log('[API] /progression/analyze - Request received');
    const { userId, lookbackDays = 30 } = req.body;

    if (!userId) {
      console.log('[API] /progression/analyze - Missing userId');
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    console.log('[API] /progression/analyze - Calling service for userId:', userId);
    // 第3步：调用分析服务
    const result = await progressionAnalysisService.analyzeProgress(userId, lookbackDays);

    console.log('[API] /progression/analyze - Success, returning results');
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] /progression/analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/progression/detect-plateaus
 * 第1步：检测停滞不前的exercises
 * 第2步：返回plateau列表和建议
 */
router.post('/detect-plateaus', async (req, res) => {
  try {
    console.log('[API] /progression/detect-plateaus - Request received');
    const { userId, plateauWeeks = 3 } = req.body;

    if (!userId) {
      console.log('[API] /progression/detect-plateaus - Missing userId');
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    console.log('[API] /progression/detect-plateaus - Calling service for userId:', userId);
    // 第3步：检测plateaus
    const result = await progressionAnalysisService.detectPlateaus(userId, plateauWeeks);

    console.log('[API] /progression/detect-plateaus - Success, returning results');
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] /progression/detect-plateaus error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/progression/recommendations
 * 第1步：生成progression recommendations
 * 第2步：基于当前表现提供具体的weight/rep/set建议
 */
router.post('/recommendations', async (req, res) => {
  try {
    console.log('[API] /progression/recommendations - Request received');
    const { userId } = req.body;

    if (!userId) {
      console.log('[API] /progression/recommendations - Missing userId');
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    console.log('[API] /progression/recommendations - Calling service for userId:', userId);
    // 第3步：生成recommendations
    const result = await progressionAnalysisService.generateRecommendations(userId);

    console.log('[API] /progression/recommendations - Success, returning results');
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] /progression/recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/progression/sync-history
 * 第1步：手动触发同步exercise history
 * 第2步：从workout_sessions提取数据到exercise_history表
 */
router.post('/sync-history', async (req, res) => {
  try {
    const { userId, lookbackDays = 90 } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // 第3步：同步历史记录
    const result = await progressionAnalysisService.syncExerciseHistory(userId, lookbackDays);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] /progression/sync-history error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/progression/settings/:userId
 * 第1步：获取用户的progression settings
 */
router.get('/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // 第2步：获取或创建settings
    const settings = await progressionAnalysisService.getOrCreateSettings(userId);

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('[API] /progression/settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/progression/settings
 * 第1步：更新用户的progression settings
 */
router.put('/settings', async (req, res) => {
  try {
    const { userId, settings } = req.body;

    if (!userId || !settings) {
      return res.status(400).json({
        success: false,
        error: 'userId and settings are required',
      });
    }

    // 第2步：更新settings
    const { data, error } = await supabase
      .from('progression_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    console.error('[API] /progression/settings PUT error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Catch-all route for unmatched paths within progression router
router.use((req, res) => {
  console.error('[ProgressionRoutes] Unmatched route in progression router:', req.method, req.path);
  console.error('[ProgressionRoutes] Full URL:', req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Progression route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'POST /api/progression/analyze',
      'POST /api/progression/detect-plateaus',
      'POST /api/progression/recommendations',
      'POST /api/progression/sync-history',
      'GET /api/progression/settings/:userId',
      'PUT /api/progression/settings',
      'GET /api/progression/test'
    ]
  });
});

module.exports = router;



