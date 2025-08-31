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

// Server Configuration
const app = express();
const PORT = process.env.PORT || 4000;

// Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('=== RAILWAY DEPLOYMENT - GEMINI ONLY ===');
console.log('Port:', PORT);
console.log('Gemini API Key:', GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('Supabase URL:', SUPABASE_URL ? '✅ Configured' : '❌ Missing');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
try {
  if (GEMINI_API_KEY) {
    geminiVisionService = new GeminiVisionService(GEMINI_API_KEY);
    console.log('[RAILWAY] Gemini Vision Service initialized successfully');
  } else {
    console.error('[RAILWAY] GEMINI_API_KEY not found - food analysis disabled');
  }
} catch (error) {
  console.error('[RAILWAY] Failed to initialize Gemini Vision Service:', error.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
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
  console.log('='.repeat(50));
});

module.exports = app;
// Force redeploy - Mon Sep  1 00:15:33 HKT 2025
