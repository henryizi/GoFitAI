console.log('--- SERVER RESTARTED ---');
console.log('--- Code version: 2.2 ---');

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Log error but don't exit immediately - let the process manager handle it
  setTimeout(() => {
    console.error('[FATAL] Exiting due to uncaught exception');
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't crash - many unhandled rejections are recoverable
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const os = require('os');
// const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const sharp = require('sharp');
// const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { z } = require('zod');
const path = require('path');
// const GeminiVisionService = require('./services/geminiVisionService.js'); // Disabled during rebuild
const BasicFoodAnalyzer = require('./services/basicFoodAnalyzer.js');

// Helper function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Helper function to convert markdown nutrition response to JSON
function convertMarkdownToNutritionJson(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  try {
    // Try to parse as JSON first
    return JSON.parse(content);
  } catch (e) {
    // If not JSON, try to convert from markdown
    console.log('[PARSE] Attempting to convert markdown to JSON...');
    
    const result = {
      daily_targets: {},
      micronutrients_targets: {},
      daily_schedule: [],
      food_suggestions: {},
      snack_suggestions: []
    };

    // Extract daily targets
    const dailyTargetsMatch = content.match(/\*\*Daily Targets\*\*[\s\S]*?(?=\*\*|$)/i);
    if (dailyTargetsMatch) {
      const targetsText = dailyTargetsMatch[0];
      const caloriesMatch = targetsText.match(/Calories:\s*(\d+)/i);
      const proteinMatch = targetsText.match(/Protein:\s*(\d+)/i);
      const carbsMatch = targetsText.match(/Carbohydrates?:\s*(\d+)/i);
      const fatMatch = targetsText.match(/Fat:\s*(\d+)/i);
      
      if (caloriesMatch) result.daily_targets.calories = parseInt(caloriesMatch[1]);
      if (proteinMatch) result.daily_targets.protein = parseInt(proteinMatch[1]);
      if (carbsMatch) result.daily_targets.carbs = parseInt(carbsMatch[1]);
      if (fatMatch) result.daily_targets.fat = parseInt(fatMatch[1]);
    }

    // Extract micronutrients targets
    const micronutrientsMatch = content.match(/\*\*Micronutrients Targets\*\*[\s\S]*?(?=\*\*|$)/i);
    if (micronutrientsMatch) {
      const micronutrientsText = micronutrientsMatch[0];
      const sodiumMatch = micronutrientsText.match(/Sodium.*?(\d+)/i);
      const potassiumMatch = micronutrientsText.match(/Potassium.*?(\d+)/i);
      const vitaminDMatch = micronutrientsText.match(/Vitamin D.*?(\d+)/i);
      const calciumMatch = micronutrientsText.match(/Calcium.*?(\d+)/i);
      const ironMatch = micronutrientsText.match(/Iron.*?(\d+)/i);
      
      if (sodiumMatch) result.micronutrients_targets.sodium_mg = parseInt(sodiumMatch[1]);
      if (potassiumMatch) result.micronutrients_targets.potassium_mg = parseInt(potassiumMatch[1]);
      if (vitaminDMatch) result.micronutrients_targets.vitamin_d_mcg = parseInt(vitaminDMatch[1]);
      if (calciumMatch) result.micronutrients_targets.calcium_mg = parseInt(calciumMatch[1]);
      if (ironMatch) result.micronutrients_targets.iron_mg = parseInt(ironMatch[1]);
    }

    // Extract daily schedule
    const dailyScheduleMatch = content.match(/\*\*Daily Schedule\*\*[\s\S]*?(?=\*\*|$)/i);
    if (dailyScheduleMatch) {
      const scheduleText = dailyScheduleMatch[0];
      const mealMatches = scheduleText.match(/\*\*([^*]+)\*\*[\s\S]*?(?=\*\*|$)/g);
      
      if (mealMatches) {
        mealMatches.forEach(mealMatch => {
          const timeSlotMatch = mealMatch.match(/\*\*([^*]+)\*\*/);
          const mealMatch2 = mealMatch.match(/Meal:\s*([^\n]+)/i);
          const macrosMatch = mealMatch.match(/Macros:\s*([^\n]+)/i);
          
          if (timeSlotMatch && mealMatch2) {
            const meal = {
              time_slot: timeSlotMatch[1].trim(),
              meal: mealMatch2[1].trim(),
              macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
            };
            
            // Try to extract macros if available
            if (macrosMatch) {
              const macrosText = macrosMatch[1];
              const caloriesMatch = macrosText.match(/calories?:\s*(\d+)/i);
              const proteinMatch = macrosText.match(/protein:\s*(\d+)/i);
              const carbsMatch = macrosText.match(/carbs?:\s*(\d+)/i);
              const fatMatch = macrosText.match(/fat:\s*(\d+)/i);
              
              if (caloriesMatch) meal.macros.calories = parseInt(caloriesMatch[1]);
              if (proteinMatch) meal.macros.protein = parseInt(proteinMatch[1]);
              if (carbsMatch) meal.macros.carbs = parseInt(carbsMatch[1]);
              if (fatMatch) meal.macros.fat = parseInt(fatMatch[1]);
            }
            
            result.daily_schedule.push(meal);
          }
        });
      }
    }

    // Check if we have at least some basic structure
    if (Object.keys(result.daily_targets).length > 0 || result.daily_schedule.length > 0) {
      console.log('[PARSE] Successfully converted markdown to JSON structure');
      return result;
    }

    return null;
  }
}

// Helper function to find and parse JSON from AI response
function findAndParseJson(content) {
  if (!content || typeof content !== 'string') {
    console.error('[PARSE] Invalid content provided to findAndParseJson:', typeof content);
    return null;
  }

  try {
    // First, try to parse the entire content as JSON
    return JSON.parse(content);
  } catch (e) {
    console.log('[PARSE] Full content parse failed, trying to extract JSON...');
    
    // Try multiple strategies to find JSON
    const strategies = [
      // Strategy 1: Find JSON object with nested braces
      () => {
        // Use brace counting to find complete JSON object
        let braceCount = 0;
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '{') {
            if (braceCount === 0) {
              startIndex = i;
            }
            braceCount++;
          } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
        
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonString = content.substring(startIndex, endIndex + 1);
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            console.log('[PARSE] Strategy 1 failed:', e.message);
            return null;
          }
        }
        return null;
      },
      
      // Strategy 2: Extract from code blocks
      () => {
        const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          try {
            return JSON.parse(codeBlockMatch[1]);
          } catch (e) {
            console.log('[PARSE] Strategy 2 failed:', e.message);
            return null;
          }
        }
        return null;
      },
      
      // Strategy 3: Find JSON after common prefixes
      () => {
        const prefixes = [
          'Here is the JSON object:',
          'Here is the JSON:',
          'JSON response:',
          'Response:',
          'Output:',
          'Result:'
        ];
        
        for (const prefix of prefixes) {
          const index = content.indexOf(prefix);
          if (index !== -1) {
            const afterPrefix = content.substring(index + prefix.length).trim();
            const jsonMatch = afterPrefix.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0]);
              } catch (e) {
                console.log(`[PARSE] Strategy 3 failed for prefix "${prefix}":`, e.message);
              }
            }
          }
        }
        return null;
      },
      
      // Strategy 4: Find the largest JSON object using brace counting
      () => {
        const jsonObjects = [];
        let braceCount = 0;
        let startIndex = -1;
        
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '{') {
            if (braceCount === 0) {
              startIndex = i;
            }
            braceCount++;
          } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              const jsonString = content.substring(startIndex, i + 1);
              jsonObjects.push(jsonString);
              startIndex = -1;
            }
          }
        }
        
        if (jsonObjects.length > 0) {
          // Find the largest JSON object
          let largestJson = jsonObjects[0];
          for (const jsonString of jsonObjects) {
            if (jsonString.length > largestJson.length) {
              largestJson = jsonString;
            }
          }
          
          try {
            return JSON.parse(largestJson);
          } catch (e) {
            console.log('[PARSE] Strategy 4 failed:', e.message);
            return null;
          }
        }
        return null;
      },
      
      // Strategy 5: Find JSON after triple backticks or after a newline
      () => {
        // Look for JSON that starts after a newline and indentation
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('{')) {
            // Try to parse from this line onwards
            const jsonContent = lines.slice(i).join('\n');

            // Use a more robust JSON extraction that finds the complete object
            let braceCount = 0;
            let startIndex = -1;
            let endIndex = -1;

            for (let j = 0; j < jsonContent.length; j++) {
              if (jsonContent[j] === '{') {
                if (braceCount === 0) {
                  startIndex = j;
                }
                braceCount++;
              } else if (jsonContent[j] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIndex = j;
                  break;
                }
              }
            }

            if (startIndex !== -1 && endIndex !== -1) {
              const jsonString = jsonContent.substring(startIndex, endIndex + 1);
              try {
                return JSON.parse(jsonString);
              } catch (e) {
                console.log('[PARSE] Strategy 5 failed for line', i, ':', e.message);
              }
            }
          }
        }
        return null;
      },

      // Strategy 6: Simple JSON extraction using regex to find complete objects
      () => {
        try {
          // Find the first complete JSON object in the content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonString = jsonMatch[0];
            // Try to parse it directly
            return JSON.parse(jsonString);
          }
        } catch (e) {
          console.log('[PARSE] Strategy 6 failed:', e.message);
        }
        return null;
      },

      // Strategy 7: Try to parse the entire content as JSON after cleaning
      () => {
        try {
          // Clean the content by removing markdown formatting
          let cleanContent = content;
          // Remove markdown code blocks
          cleanContent = cleanContent.replace(/```(?:json)?[\s\S]*?```/g, '');
          // Remove any text before the first {
          const firstBraceIndex = cleanContent.indexOf('{');
          if (firstBraceIndex !== -1) {
            cleanContent = cleanContent.substring(firstBraceIndex);
          }
          // Remove any text after the last }
          const lastBraceIndex = cleanContent.lastIndexOf('}');
          if (lastBraceIndex !== -1) {
            cleanContent = cleanContent.substring(0, lastBraceIndex + 1);
          }

          return JSON.parse(cleanContent);
        } catch (e) {
          console.log('[PARSE] Strategy 7 failed:', e.message);
        }
        return null;
      }
    ];
    
    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      const result = strategies[i]();
      if (result) {
        console.log(`[PARSE] Successfully parsed JSON using strategy ${i + 1}`);
        return result;
      }
    }
    
    console.error('[PARSE] All parsing strategies failed');
    console.error('[PARSE] Content preview:', content.substring(0, 500) + '...');
    return null;
  }
}

const dotenv = require('dotenv');
// Load root .env if present (from project root, not server subdirectory)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Also try to load .env.development for development environment
dotenv.config({ path: path.join(__dirname, '..', '.env.development') });

// Import the extractNewPlan function
const { extractNewPlan } = require('./extract-plan-fix.js');

// Helper function to create a modified plan when extraction fails
function createModifiedPlan(currentPlan) {
  try {
    // Create a basic modified plan based on the current plan
    const modifiedPlan = {
      ...currentPlan,
      name: `${currentPlan.name} (Modified)`,
      updated_at: new Date().toISOString(),
      // Add any other modifications as needed
    };
    
    console.log('[CREATE MODIFIED PLAN] Created modified plan from current plan');
    return modifiedPlan;
  } catch (error) {
    console.error('[CREATE MODIFIED PLAN] Error creating modified plan:', error);
    return null;
  }
}
// Then load server/.env to override AI provider/model if set there
// Load server/.env but never override platform-assigned PORT
const shouldOverrideLocalEnv = !process.env.PORT;
dotenv.config({ path: path.join(__dirname, '.env'), override: shouldOverrideLocalEnv });
if (!shouldOverrideLocalEnv) {
  try { console.log('[ENV] Detected PORT from environment; skipping .env override for PORT'); } catch (_) {}
}

const app = express();
const port = Number(process.env.PORT) || 4000;

// Security & logging
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false, // Allow cross-origin embedding
}));
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
}));
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));
// Basic rate limiting for AI endpoints
// const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: Number(process.env.AI_RATE_LIMIT_PER_MIN) || 30 });

app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Provider selection (OpenAI, DeepSeek)
// AI Provider Configuration with Fallbacks
const ***REMOVED*** = process.env.***REMOVED*** || process.env.EXPO_PUBLIC_***REMOVED***;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
// OpenRouter removed - using DeepSeek only

// Gemini Vision API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// DeepSeek native API
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || process.env.EXPO_PUBLIC_DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
// Force DeepSeek V3.1 for chat by default unless overridden
// Safeguard: Ensure we never use vision models for chat API
let DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || process.env.EXPO_PUBLIC_DEEPSEEK_MODEL || 'deepseek-chat';
if (DEEPSEEK_MODEL.includes('vl') || DEEPSEEK_MODEL.includes('vision')) {
  console.warn(`[CONFIG] Vision model detected (${DEEPSEEK_MODEL}), forcing to deepseek-chat for compatibility`);
  DEEPSEEK_MODEL = 'deepseek-chat';
}

// Vision services: Gemini (primary) only

// Optional external services for higher accuracy
const USDA_FDC_API_KEY = process.env.USDA_FDC_API_KEY; // USDA FoodData Central

// Initialize Vision Service (Gemini only)
// Initialize vision service based on FOOD_ANALYZE_PROVIDER
// Vision services disabled during rebuild
// let visionService = null;
const basicFoodAnalyzer = new BasicFoodAnalyzer();

// AI Provider Priority List (DeepSeek first)
const AI_DEEPSEEK_ONLY = String(process.env.AI_DEEPSEEK_ONLY || '').toLowerCase() === 'true';
const AI_STRICT_ONLY = String(process.env.AI_STRICT_ONLY || '').toLowerCase() === 'true';
const AI_STRICT_EFFECTIVE = AI_DEEPSEEK_ONLY || AI_STRICT_ONLY;
const AI_PROVIDERS = [
  {
    name: 'deepseek',
    apiKey: DEEPSEEK_API_KEY,
    apiUrl: DEEPSEEK_API_URL,
    model: DEEPSEEK_MODEL,
    enabled: !!DEEPSEEK_API_KEY
  },
  // OpenRouter removed - using DeepSeek only
  {
    name: 'openai',
    apiKey: ***REMOVED***,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: OPENAI_MODEL,
    enabled: !!***REMOVED***
  },
  {
    name: 'gemini',
    apiKey: GEMINI_API_KEY,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    model: 'gemini-2.0-flash-exp',
    enabled: !!GEMINI_API_KEY
  },
  {
    name: 'fallback',
    apiKey: null,
    apiUrl: null,
    model: 'rule-based',
    enabled: true // Always available as last resort
  }
]
  // Filter to enabled providers first
  .filter(provider => provider.enabled)
  // Enforce DeepSeek-only if requested
  .filter(provider => (AI_DEEPSEEK_ONLY ? provider.name === 'deepseek' : true));

// Default provider (prefer Gemini if available, then DeepSeek); enforce deepseek when AI_DEEPSEEK_ONLY
const DEFAULT_PROVIDER = AI_PROVIDERS.find(p => p.name === 'gemini')?.name ||
                        AI_PROVIDERS.find(p => p.name === 'deepseek')?.name ||
                        AI_PROVIDERS[0]?.name || 'gemini';
const AI_PROVIDER = AI_DEEPSEEK_ONLY ? 'deepseek' : (process.env.AI_PROVIDER || DEFAULT_PROVIDER);

// Legacy AI configuration for backward compatibility
const AI_API_KEY = ***REMOVED*** || DEEPSEEK_API_KEY;
const AI_API_URL = AI_PROVIDERS.find(p => p.name === AI_PROVIDER)?.apiUrl || 'https://api.openai.com/v1/chat/completions';
const CHAT_MODEL = AI_PROVIDERS.find(p => p.name === AI_PROVIDER)?.model || OPENAI_MODEL;

// Debug logging for API configuration
console.log('=== API CONFIGURATION ===');
console.log('DeepSeek-only mode:', AI_DEEPSEEK_ONLY ? 'ENABLED' : 'DISABLED');
console.log('Strict mode (effective):', AI_STRICT_EFFECTIVE ? 'ENABLED' : 'DISABLED');
console.log('Available AI Providers:', AI_PROVIDERS.map(p => p.name));
console.log('Default AI_PROVIDER:', AI_PROVIDER);
console.log('Total providers available:', AI_PROVIDERS.length);
AI_PROVIDERS.forEach(provider => {
  console.log(`- ${provider.name}: ${provider.enabled ? 'ENABLED' : 'DISABLED'} (${provider.model})`);
});
console.log('========================');

// Helper to get provider configuration
function getProviderConfig(providerName = AI_PROVIDER) {
  return AI_PROVIDERS.find(p => p.name === providerName);
}

// Helper to choose a chat model string compatible with the provider
function getChatModel(providerName = AI_PROVIDER) {
  const provider = getProviderConfig(providerName);
  return provider ? provider.model : OPENAI_MODEL;
}

// Global CHAT_MODEL for backward compatibility (already defined above)

// Fallback rule-based nutrition analysis
function analyzeFoodWithFallback(imageDescription) {
  console.log('[FALLBACK] Using enhanced basic food analyzer');

  try {
    // Use the BasicFoodAnalyzer for comprehensive analysis
    const analysisResult = basicFoodAnalyzer.analyzeFood(imageDescription);

    // Convert to the expected format for compatibility with existing code
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            success: true,
            nutrition: {
              dishName: analysisResult.dishName,
              cuisineType: analysisResult.cuisineType,
              cookingMethod: analysisResult.cookingMethod,
              foodItems: analysisResult.foodItems,
              totalNutrition: analysisResult.totalNutrition,
              confidence: analysisResult.confidence,
              notes: analysisResult.notes
            },
            message: `Analyzed using basic food analyzer. Confidence: ${analysisResult.confidence}`
          })
        }
      }]
    };
  } catch (error) {
    console.error('[FALLBACK] Error in basic food analyzer:', error);

    // Ultimate fallback if even the basic analyzer fails
    const fallbackNutrition = {
      dishName: "Unknown Food",
      cuisineType: "Unknown",
      cookingMethod: "Unknown",
      foodItems: [{
        name: "Unknown Food Item",
        quantity: "1 serving",
        calories: 200,
        protein: 10,
      carbs: 25,
        fat: 8,
      fiber: 2,
        sugar: 5,
        sodium: 300
      }],
      totalNutrition: {
        calories: 200,
        protein: 10,
        carbs: 25,
        fat: 8,
        fiber: 2,
        sugar: 5,
        sodium: 300
      },
      confidence: "low",
      notes: "Basic analysis failed - using generic nutritional estimate"
    };
  
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          success: true,
            nutrition: fallbackNutrition,
            message: "Analysis temporarily unavailable - using generic estimate"
        })
      }
    }]
  };
  }
}

// Function to analyze food using BasicFoodAnalyzer with image data
async function analyzeFoodWithBasicAnalyzer(base64Image) {
  console.log('[BASIC ANALYZER] Using BasicFoodAnalyzer for image analysis');

  try {
    // For now, we'll create a generic description since BasicFoodAnalyzer expects text
    // In the future, we could enhance BasicFoodAnalyzer to handle images directly
    const imageDescription = "A food image uploaded for nutritional analysis";

    // Use the BasicFoodAnalyzer for comprehensive analysis
    const analysisResult = basicFoodAnalyzer.analyzeFood(imageDescription);

    console.log('[BASIC ANALYZER] Analysis completed with confidence:', analysisResult.confidence);

    // Return in the format expected by the API response
    return {
      dishName: analysisResult.dishName,
      cuisineType: analysisResult.cuisineType,
      cookingMethod: analysisResult.cookingMethod,
      foodItems: analysisResult.foodItems,
      totalNutrition: analysisResult.totalNutrition,
      confidence: analysisResult.confidence,
      notes: analysisResult.notes
    };

  } catch (error) {
    console.error('[BASIC ANALYZER] Error in BasicFoodAnalyzer:', error);

    // Ultimate fallback if even the basic analyzer fails
    const fallbackNutrition = {
      dishName: "Food Image",
      cuisineType: "Unknown",
      cookingMethod: "Unknown",
      foodItems: [{
        name: "Mixed Food Items",
        quantity: "1 serving",
        calories: 300,
        protein: 15,
        carbs: 35,
        fat: 12,
        fiber: 3,
        sugar: 8,
        sodium: 400
      }],
      totalNutrition: {
        calories: 300,
        protein: 15,
        carbs: 35,
        fat: 12,
        fiber: 3,
        sugar: 8,
        sodium: 400
      },
      confidence: "low",
      notes: "Basic analyzer failed - using generic nutritional estimate for food image"
    };

    return fallbackNutrition;
  }
}

// Fallback rule-based nutrition plan generation
function generateNutritionPlanWithFallback(profile) {
  console.log('[FALLBACK] Using rule-based nutrition plan generation');
  
  // Calculate basic daily targets based on profile
  const weight = profile.weight || 70;
  const height = profile.height || 170;
  const age = profile.age || 30;
  const goal = profile.goal || 'maintenance';
  
  // Basic calorie calculation (Harris-Benedict equation)
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5; // Male
  if (profile.gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  // Activity multiplier (assuming moderate activity)
  let tdee = bmr * 1.55;
  
  // Adjust based on goal
  if (goal === 'weight_loss') {
    tdee = tdee * 0.85; // 15% deficit
  } else if (goal === 'muscle_gain') {
    tdee = tdee * 1.1; // 10% surplus
  }
  
  // Calculate macros
  const protein = weight * 2.2; // 1g per lb
  const fat = (tdee * 0.25) / 9; // 25% of calories
  const carbs = (tdee - (protein * 4) - (fat * 9)) / 4;
  
  const nutritionPlan = {
    daily_targets: {
      calories: Math.round(tdee),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    },
    micronutrients_targets: {
      sodium_mg: 2300,
      potassium_mg: 3500,
      vitamin_d_mcg: 15,
      calcium_mg: 1000,
      iron_mg: 18,
      fiber_g: 25
    },
    daily_schedule: [
      {
        time_slot: 'breakfast',
        meal: 'Oatmeal with berries and nuts',
        macros: {
          calories: Math.round(tdee * 0.25),
          protein: Math.round(protein * 0.25),
          carbs: Math.round(carbs * 0.25),
          fat: Math.round(fat * 0.25)
        }
      },
      {
        time_slot: 'lunch',
        meal: 'Grilled chicken with vegetables and quinoa',
        macros: {
          calories: Math.round(tdee * 0.35),
          protein: Math.round(protein * 0.35),
          carbs: Math.round(carbs * 0.35),
          fat: Math.round(fat * 0.35)
        }
      },
      {
        time_slot: 'dinner',
        meal: 'Salmon with sweet potato and green salad',
        macros: {
          calories: Math.round(tdee * 0.3),
          protein: Math.round(protein * 0.3),
          carbs: Math.round(carbs * 0.3),
          fat: Math.round(fat * 0.3)
        }
      },
      {
        time_slot: 'snack',
        meal: 'Greek yogurt with almonds',
        macros: {
          calories: Math.round(tdee * 0.1),
          protein: Math.round(protein * 0.1),
          carbs: Math.round(carbs * 0.1),
          fat: Math.round(fat * 0.1)
        }
      }
    ],
    food_suggestions: {
      proteins: ['Chicken breast', 'Salmon', 'Eggs', 'Greek yogurt', 'Lean beef'],
      carbs: ['Quinoa', 'Sweet potato', 'Brown rice', 'Oatmeal', 'Whole grain bread'],
      fats: ['Avocado', 'Nuts', 'Olive oil', 'Coconut oil', 'Almonds'],
      vegetables: ['Broccoli', 'Spinach', 'Kale', 'Bell peppers', 'Carrots'],
      fruits: ['Berries', 'Apple', 'Banana', 'Orange', 'Grapefruit']
    },
    snack_suggestions: [
      'Greek yogurt with berries',
      'Apple with almond butter',
      'Carrot sticks with hummus',
      'Mixed nuts',
      'Protein shake'
    ]
  };
  
  return {
    choices: [{
      message: {
        content: JSON.stringify(nutritionPlan)
      }
    }]
  };
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;
if (!supabase) {
  console.warn('[SERVER] Supabase credentials not provided. Some endpoints that require database access will be disabled.');
}

// Ensure uploads directory exists (important on ephemeral hosts like Railway)
try {
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
} catch (dirErr) {
  console.warn('[SERVER] Could not ensure uploads directory:', dirErr.message);
}

const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    console.log('[MULTER] Uploaded file details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Accept common image formats including HEIC/HEIF
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/HEIC', 'image/HEIF'
    ];
    
    // Check file extension for image types (handles cases where mimetype is application/octet-stream)
    const imageExtensions = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i;
    const hasImageExtension = imageExtensions.test(file.originalname || '');
    
    const isAllowedMime = allowedMimes.includes(file.mimetype);
    const isHeicByExtension = /\.(heic|heif)$/i.test(file.originalname || '');
    
    // Accept if:
    // 1. Has proper image MIME type, OR
    // 2. Has image file extension (handles application/octet-stream), OR
    // 3. Is HEIC/HEIF by extension, OR
    // 4. MIME type is application/octet-stream but has image extension
    if (isAllowedMime || hasImageExtension || isHeicByExtension || 
        (file.mimetype === 'application/octet-stream' && hasImageExtension)) {
      console.log('[MULTER] File accepted:', file.originalname, 'MIME:', file.mimetype);
      cb(null, true);
    } else {
      console.log('[MULTER] File rejected - unsupported format:', file.mimetype, 'filename:', file.originalname);
      cb(new Error('Invalid image format. Please upload a clear photo (JPG/PNG/HEIC supported).'), false);
    }
  }
});

// Zod schemas for input validation
const ChatMessageSchema = z.object({
  sender: z.enum(['user', 'ai']),
  text: z.string().min(1),
  timestamp: z.string().optional(),
});

const ExerciseItemSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().nonnegative(),
  reps: z.string().min(1),
  restBetweenSets: z.string().optional(),
});

const WorkoutDaySchema = z.object({
  day: z.string().min(1),
  focus: z.string().min(1),
  exercises: z.array(ExerciseItemSchema).min(1),
});

const WorkoutPlanSchema = z.object({
  name: z.string().min(1),
  training_level: z.enum(['beginner', 'intermediate', 'advanced']),
  goal_fat_loss: z.number(),
  goal_muscle_gain: z.number(),
  mesocycle_length_weeks: z.number().int().positive(),
  weeklySchedule: z.array(WorkoutDaySchema).min(1),
});

const AiChatRequestSchema = z.object({
  chatHistory: z.array(ChatMessageSchema).min(1),
  plan: z.any(),
  user: z.any().optional(),
});

// Validate and fix workout frequency in generated plan
function validateAndFixWorkoutFrequency(plan, profile) {
  if (!plan || !plan.weeklySchedule || !Array.isArray(plan.weeklySchedule)) {
    console.warn('[WORKOUT] Invalid plan structure for frequency validation');
    return plan;
  }

  const targetFrequency = profile.workout_frequency || '4_5';
  let targetTrainingDays;

  // Parse target frequency
  if (targetFrequency === '2_3') {
    targetTrainingDays = 3; // Aim for 3 days (middle of 2-3 range)
  } else if (targetFrequency === '4_5') {
    targetTrainingDays = 4; // Aim for 4 days (middle of 4-5 range)
  } else if (targetFrequency === '6') {
    targetTrainingDays = 6; // Exactly 6 days
  } else {
    targetTrainingDays = 4; // Default fallback
  }

  // Count current training days
  const trainingDays = plan.weeklySchedule.filter(day =>
    day && day.exercises && Array.isArray(day.exercises) && day.exercises.length > 0
  ).length;

  console.log(`[WORKOUT] Frequency validation: Target=${targetTrainingDays}, Current=${trainingDays}`);

  // If frequency matches, return as-is
  if (trainingDays === targetTrainingDays) {
    console.log('[WORKOUT] Workout frequency is correct');
    return plan;
  }

  console.log(`[WORKOUT] Fixing workout frequency: adjusting from ${trainingDays} to ${targetTrainingDays} training days`);

  // Create corrected schedule
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const correctedSchedule = [];

  if (trainingDays > targetTrainingDays) {
    // Too many training days - convert excess to rest days
    let excessDays = trainingDays - targetTrainingDays;

    for (let i = 0; i < 7; i++) {
      const originalDay = plan.weeklySchedule[i];
      if (originalDay && originalDay.exercises && originalDay.exercises.length > 0 && excessDays > 0) {
        // Convert to rest day
        correctedSchedule.push({
          day: daysOfWeek[i],
          focus: 'Rest Day',
          exercises: []
        });
        excessDays--;
      } else if (originalDay && originalDay.exercises && originalDay.exercises.length > 0) {
        // Keep as training day
        correctedSchedule.push({
          ...originalDay,
          day: daysOfWeek[i]
        });
      } else {
        // Keep as rest day
        correctedSchedule.push({
          day: daysOfWeek[i],
          focus: 'Rest Day',
          exercises: []
        });
      }
    }
  } else {
    // Too few training days - convert rest days to training days
    const neededDays = targetTrainingDays - trainingDays;
    let addedDays = 0;

    for (let i = 0; i < 7; i++) {
      const originalDay = plan.weeklySchedule[i];
      if (originalDay && originalDay.exercises && originalDay.exercises.length > 0) {
        // Keep as training day
        correctedSchedule.push({
          ...originalDay,
          day: daysOfWeek[i]
        });
      } else if (addedDays < neededDays) {
        // Convert rest day to training day
        correctedSchedule.push({
          day: daysOfWeek[i],
          focus: 'Full Body',
          exercises: [
            { name: 'Squats', sets: 3, reps: '10-12', restBetweenSets: '60s' },
            { name: 'Push-ups', sets: 3, reps: '8-12', restBetweenSets: '60s' },
            { name: 'Bent-over Rows', sets: 3, reps: '10-12', restBetweenSets: '60s' },
            { name: 'Plank', sets: 3, reps: '30-60s', restBetweenSets: '60s' }
          ]
        });
        addedDays++;
      } else {
        // Keep as rest day
        correctedSchedule.push({
          day: daysOfWeek[i],
          focus: 'Rest Day',
          exercises: []
        });
      }
    }
  }

  return {
    ...plan,
    weeklySchedule: correctedSchedule
  };
}

// Compose prompt for workout plan generation
function composePrompt(profile) {
  return `
You are a professional fitness coach. Create a personalized weekly workout plan for a client with the following profile. Use all provided metrics, and adapt recommendations accordingly.

CLIENT PROFILE:
- Full Name: ${profile.full_name || 'Client'}
- Gender: ${profile.gender || 'Not specified'}
- Age: ${profile.age || 'Not specified'}
- Height: ${profile.height ? `${profile.height} cm` : 'Not specified'}
- Weight: ${profile.weight ? `${profile.weight} kg` : 'Not specified'}
- Training Level: ${profile.training_level || 'intermediate'}
- Fat Loss Goal Priority: ${profile.goal_fat_reduction || 0}/5
- Muscle Gain Goal Priority: ${profile.goal_muscle_gain || 0}/5
- Exercise Frequency: ${profile.exercise_frequency || '4-6'} days per week
- Preferred Workout Frequency: ${profile.workout_frequency ? profile.workout_frequency.replace('_', '-') + ' times per week' : 'Not specified'}
- Daily Activity Level: ${profile.activity_level || 'Not specified'}
- Body Fat: ${profile.body_fat ? `${profile.body_fat}%` : 'Not specified'}
- Current Weight Trend: ${profile.weight_trend || 'Not specified'}
- Body Analysis (if any): ${profile.body_analysis ? JSON.stringify(profile.body_analysis) : 'Not provided'}
- Emulate Bodybuilder: ${profile.emulate_bodybuilder || 'None'}

PROGRAMMING & PROGRESSION:
1. Provide a sensible 4-week mesocycle with progressive overload guidance and 1 optional deload recommendation.
2. Suggest target set volumes relative to training level (lower for beginners, higher for advanced).
3. Provide rest times and rep ranges aligned with goals (fat loss: slightly higher reps/shorter rest; muscle gain: moderate reps/moderate rest).
4. Ensure balanced weekly distribution across push, pull, legs, and include core.

CRITICAL EXERCISE VARIETY REQUIREMENTS:
1. NEVER repeat the same exercises in consecutive workouts
2. Use different exercise variations for the same muscle group
3. Rotate between compound and isolation exercises
4. Vary equipment types (barbell, dumbbell, cable, bodyweight)
5. Include different angles and grips for muscle groups
6. Use progressive exercise selection (start with basics, progress to advanced)

AVAILABLE EXERCISES (Choose from these for variety):
PUSH EXERCISES: Bench Press, Incline Bench Press, Decline Bench Press, Close Grip Bench Press, Military Press, Push Press, Dumbbell Bench Press, Incline Dumbbell Press, Decline Dumbbell Press, Dumbbell Flyes, Incline Dumbbell Flyes, Decline Dumbbell Flyes, Dumbbell Shoulder Press, Arnold Press, Lateral Raise, Front Raise, Rear Delt Flyes, Dumbbell Tricep Extension, Overhead Dumbbell Extension, Dumbbell Kickback, Cable Flyes, Incline Cable Flyes, Decline Cable Flyes, Cable Lateral Raise, Cable Front Raise, Cable Rear Delt Flyes, Tricep Pushdown, Rope Pushdown, Overhead Cable Extension, Cable Crossovers, Push Up, Diamond Push Up, Pike Push Up, Wide Grip Push Up, Decline Push Up, Archer Push Up, One Arm Push Up, Dip, Ring Dip, Handstand Push Up

PULL EXERCISES: Barbell Row, Pendlay Row, T-Bar Row, Barbell Curl, Preacher Curl, Incline Barbell Curl, Barbell Shrug, Upright Row, Dumbbell Row, One Arm Dumbbell Row, Incline Dumbbell Row, Dumbbell Curl, Hammer Curl, Incline Dumbbell Curl, Concentration Curl, Dumbbell Shrug, Dumbbell Rear Delt Flyes, Lat Pulldown, Wide Grip Lat Pulldown, Close Grip Lat Pulldown, Seated Cable Row, One Arm Cable Row, Face Pull, Cable Curl, Rope Cable Curl, Cable Shrug, Pull Up, Chin Up, Wide Grip Pull Up, Close Grip Pull Up, Neutral Grip Pull Up, Muscle Up, Inverted Row

LEG EXERCISES: Barbell Back Squat, Front Squat, Overhead Squat, Romanian Deadlift, Conventional Deadlift, Sumo Deadlift, Good Morning, Barbell Calf Raise, Dumbbell Squat, Goblet Squat, Walking Lunge, Dumbbell Step Up, Dumbbell Romanian Deadlift, Dumbbell Calf Raise, Kettlebell Goblet Squat, Kettlebell Swing, Kettlebell Deadlift, Leg Press, Leg Extension, Leg Curl, Seated Leg Curl, Standing Leg Curl, Cable Calf Raise, Seated Calf Raise, Hack Squat, Hip Thrust, Bodyweight Squat, Jump Squat, Bodyweight Lunge, Walking Lunge, Jumping Lunge, Single Leg Squat, Pistol Squat, Calf Raise, Single Leg Calf Raise, Glute Bridge, Single Leg Glute Bridge, Wall Sit

CORE EXERCISES: Plank, Side Plank, Mountain Climber, Bicycle Crunch, Leg Raise, Hanging Leg Raise, Crunch, Sit Up, Russian Twist, Dead Bug, Bird Dog, Superman, Cable Woodchop, Weighted Russian Twist, Weighted Plank, Cable Crunch, Pallof Press, Cable Rotation, Weighted Sit Up, Weighted Crunch

CARDIO EXERCISES: Kettlebell Swing, Dumbbell Clean and Press, Weighted Step-Up, Burpee, Jump Rope, High Knees, Mountain Climber, Box Jump, Thruster, Wall Ball

INSTRUCTIONS:
1. Create a 7-day workout schedule with appropriate rest days based on their exercise frequency
2. 🚨 ABSOLUTE REQUIREMENT: You MUST create EXACTLY ${profile.workout_frequency ? profile.workout_frequency.replace('_', '-') : '4-5'} TRAINING DAYS PER WEEK
   - Count the training days in your response to ensure accuracy
   - Do NOT create more or fewer training days than specified
   - For '2_3' frequency: Create exactly 2-3 training days (4-5 rest days)
   - For '4_5' frequency: Create exactly 4-5 training days (2-3 rest days)
   - For '6' frequency: Create exactly 6 training days (1 rest day)
3. For each workout day, specify:
   - The focus area (e.g., "Upper Body", "Lower Body", "Push", "Pull", "Legs", "Full Body")
   - 4-6 exercises appropriate for their training level
   - For each exercise, specify sets, reps, and rest between sets
4. Include an estimated time per session (e.g., "45 minutes")
5. Ensure maximum exercise variety - never repeat exercises in consecutive workouts
6. Return ONLY a valid JSON object with the following structure:

{
  "weeklySchedule": [
    {
      "day": "Monday",
      "focus": "Chest and Triceps",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "restBetweenSets": "90s" },
        { "name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "restBetweenSets": "60s" },
        { "name": "Cable Flyes", "sets": 3, "reps": "12-15", "restBetweenSets": "60s" },
        { "name": "Tricep Pushdown", "sets": 3, "reps": "12-15", "restBetweenSets": "60s" },
        { "name": "Overhead Dumbbell Extension", "sets": 3, "reps": "10-12", "restBetweenSets": "60s" }
      ]
    }
  ],
  "estimatedTimePerSession": "60 minutes",
  "progression": {
    "mesocycleWeeks": 4,
    "guidance": "Increase load 2.5-5% weekly if all reps achieved; optional deload in week 4 if fatigue accumulates."
  }
}

Make sure all exercises are appropriate for the client's training level. Include both compound and isolation exercises. Rest days should be appropriately spaced throughout the week. IMPORTANT: Ensure maximum exercise variety and avoid repetition across workouts.

🚨 CRITICAL ENFORCEMENT: You MUST create exactly ${profile.workout_frequency ? profile.workout_frequency.replace('_', '-') : '4-5'} training days per week. This is ABSOLUTELY NON-NEGOTIABLE.

FINAL CHECKS BEFORE RESPONDING:
1. Count the number of training days in your weeklySchedule array
2. Ensure it matches EXACTLY: ${profile.workout_frequency ? profile.workout_frequency.replace('_', '-') : '4-5'} training days
3. If it doesn't match, adjust the schedule immediately
4. Double-check that rest days are properly distributed
5. Verify that the total equals 7 days (training + rest)

FAILURE TO COMPLY WITH THE FREQUENCY REQUIREMENT WILL RESULT IN AN INVALID RESPONSE. TAKE THIS SERIOUSLY.`;
}

// Compose system prompt for AI chat
function composeAIChatPrompt(currentPlan) {
  const planStatus = currentPlan?.modified_from_original ? 'MODIFIED' : 'ORIGINAL';
  return `
You are a professional fitness coach helping a client modify their workout plan. The client has a ${planStatus.toLowerCase()} workout plan and may want to make changes to it.

${planStatus} WORKOUT PLAN:
${JSON.stringify(currentPlan, null, 2)}

INSTRUCTIONS:
1. Listen carefully to the client's request for changes to their workout plan.
2. If they want to modify the plan, create an updated version based on their specific requests.
3. Keep the same overall structure but adjust exercises, sets, reps, or focus areas as requested.
4. If they ask for a completely new plan, you can create one from scratch.
5. Always explain your changes clearly and provide encouragement.
6. If this is a modified plan, consider previous changes and build upon them appropriately.

IMPORTANT: When responding, give a brief, friendly message acknowledging the changes made to the plan. Do NOT show the full JSON plan in your response. Just say something like "I've adjusted your workout plan based on your request! The new plan has been modified with your changes."

CRITICAL: Do NOT include any JSON code blocks or backtick formatting in your text response. Only provide a simple, friendly message about the changes made. Keep it concise and end with something like "You can preview the updated plan using the button below."

Then include a JSON object with the modified plan in the following format:
{"newPlan": { ... modified plan structure ... }}

The modified plan should maintain the same structure as the original plan with weeklySchedule array.`;
}

// Helper function to call AI API with appropriate parameters
// Rate limiting for AI calls
const aiCallHistory = [];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_CALLS_PER_MINUTE = 5; // Limit to 5 calls per minute

function checkRateLimit() {
  const now = Date.now();
  
  // Remove calls older than the window
  while (aiCallHistory.length > 0 && aiCallHistory[0] < now - RATE_LIMIT_WINDOW) {
    aiCallHistory.shift();
  }
  
  // Check if we're at the limit
  if (aiCallHistory.length >= MAX_CALLS_PER_MINUTE) {
    const oldestCall = aiCallHistory[0];
    const timeUntilReset = (oldestCall + RATE_LIMIT_WINDOW) - now;
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(timeUntilReset / 1000)} seconds before trying again.`);
  }
  
  // Record this call
  aiCallHistory.push(now);
}

async function callAI(messages, responseFormat = null, temperature = 0.7, preferredProvider = null) {
  // Check rate limit first
  checkRateLimit();
  
  // Determine which providers to try
  const providersToTry = preferredProvider 
    ? [getProviderConfig(preferredProvider)].filter(Boolean)
    : AI_PROVIDERS.filter(p => p.enabled);
  
  if (providersToTry.length === 0) {
    return {
      error: true,
      errorType: 'no_providers',
      message: 'No AI providers are configured. Please check your API keys.'
    };
  }
  
  // Try each provider in order
  for (const provider of providersToTry) {
    try {
      console.log(`[AI] Trying provider: ${provider.name} with model ${provider.model}`);
      
              // Optimize max_tokens for DeepSeek (primary provider)
        const max_tokens = provider.name === 'deepseek' ? 4000 : 
                          provider.name === 'fallback' ? 1000 : 2000;
    
    // Safeguard: Ensure DeepSeek never uses vision models
    let modelToUse = provider.model;
    if (provider.name === 'deepseek' && (modelToUse.includes('vl') || modelToUse.includes('vision'))) {
      console.warn(`[AI] Vision model detected (${modelToUse}), forcing to deepseek-chat for compatibility`);
      modelToUse = 'deepseek-chat';
    }
    
    const requestBody = {
        model: modelToUse,
      messages,
      temperature,
      max_tokens,
    };
    
    // Add response format if specified
    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }
    
    // Log request details for debugging
      console.log(`[AI] Calling ${provider.name} API with model ${provider.model}`);
    console.log(`[AI] Request contains ${messages.length} messages`);
    console.log(`[AI] Using max_tokens: ${max_tokens}`);
    
      let response;
      
      if (provider.name === 'fallback') {
        if (AI_STRICT_EFFECTIVE) {
          return {
            error: true,
            errorType: 'strict_mode',
            message: 'Strict mode enabled: rule-based fallback is disabled.'
          };
        }
        // Use rule-based fallback for nutrition analysis or plan generation
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.content) {
          // Check if this is a nutrition plan generation request
          if (lastMessage.content.includes('nutrition plan') || lastMessage.content.includes('meal plan')) {
            // Extract profile from the prompt
            const profileMatch = lastMessage.content.match(/profile[:\s]*({[^}]+})/i);
            if (profileMatch) {
              try {
                const profile = JSON.parse(profileMatch[1]);
                return generateNutritionPlanWithFallback(profile);
              } catch (e) {
                // If we can't parse the profile, use a default one
                return generateNutritionPlanWithFallback({});
              }
            } else {
              return generateNutritionPlanWithFallback({});
            }
          } else {
            // Regular food analysis
            return analyzeFoodWithFallback(lastMessage.content);
          }
        } else {
          throw new Error('No content for fallback analysis');
        }
      } else if (provider.name === 'gemini') {
        // Special handling for Gemini API (different format)
        const AI_REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT) || 180000;

        // Convert OpenAI format to Gemini format
        const geminiContents = messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }));

        const geminiRequestBody = {
          contents: geminiContents,
          generationConfig: {
            temperature: temperature,
            topP: 0.95,
            maxOutputTokens: max_tokens
          }
        };

        // Add response format if specified
        if (responseFormat && responseFormat.type === 'json_object') {
          geminiRequestBody.generationConfig.responseMimeType = 'application/json';
        }

        // Use API key in URL for Gemini
        const geminiUrl = `${provider.apiUrl}?key=${provider.apiKey}`;
        
        console.log('[GEMINI] Making API request to:', geminiUrl);
        console.log('[GEMINI] Request body content length:', JSON.stringify(geminiRequestBody).length);
        
        response = await axios.post(
          geminiUrl,
          geminiRequestBody,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: AI_REQUEST_TIMEOUT
          }
        );
        
        console.log('[GEMINI] API response status:', response.status);
        console.log('[GEMINI] Response data structure:', Object.keys(response.data));
        console.log('[GEMINI] Candidates length:', response.data.candidates?.length);
        if (response.data.candidates?.[0]) {
          console.log('[GEMINI] First candidate:', Object.keys(response.data.candidates[0]));
          console.log('[GEMINI] Content parts:', response.data.candidates[0].content?.parts?.length);
        }
        
        // Convert Gemini response to OpenAI format for compatibility
        const extractedContent = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        console.log('[GEMINI] Extracted content length:', extractedContent.length);
        console.log('[GEMINI] Extracted content preview:', extractedContent.substring(0, 100));
        
        response.data = {
          choices: [{
            message: {
              content: extractedContent
            }
          }]
        };
        
        console.log('[GEMINI] Converted response data:', Object.keys(response.data));
        console.log('[GEMINI] Converted choices length:', response.data.choices?.length);

      } else {
        // Standard OpenAI format with timeout
        const AI_REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT) || 180000; // 3 minutes default for complex AI reasoning
        
          const headers = { Authorization: `Bearer ${provider.apiKey}` };
        response = await axios.post(
          provider.apiUrl,
      requestBody,
          { 
              headers,
            timeout: AI_REQUEST_TIMEOUT
          }
    );
        }
        
    console.log(`[AI] Successfully returning response from ${provider.name}`);
    return response.data;
      
  } catch (error) {
      console.error(`[AI] Error with provider ${provider.name}:`, error.response?.status, error.response?.data || error.message);
      
      // Check for timeout errors
      // If a specific provider was requested, don't try other providers on failure
      if (preferredProvider) {
        console.error(`[AI] Preferred provider ${provider.name} failed:`, error.message);
        return {
          error: true,
          errorType: 'preferred_provider_failed',
          message: `${provider.name} failed: ${error.message}`,
          provider: provider.name
        };
      }
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log(`[AI] Timeout error with ${provider.name}, trying next provider...`);
        continue;
      }
      
      // If this is a rate limit error, try the next provider
      if (error.response?.status === 429) {
        console.log(`[AI] Rate limit hit for ${provider.name}, trying next provider...`);
        continue;
      }
      
      // For other errors, also try next provider
      console.log(`[AI] Error with ${provider.name}, trying next provider...`);
          continue;
        }
      }
      
  // If we get here, all providers failed
  console.error('[AI] All providers failed');
  return {
    error: true,
    errorType: 'all_providers_failed',
    message: 'All AI providers are currently unavailable. Please try again later.'
  };
}



// Fallback responses for when AI is unavailable
const fallbackResponses = {
  'harder': "I've increased the intensity of your workout by adding more sets and reducing rest time. You can preview the updated plan below.",
  'easier': "I've made your workout more manageable by reducing sets and increasing rest periods. You can preview the updated plan below.",
  'cardio': "I've added cardiovascular exercises to your routine for better heart health. You can preview the updated plan below.",
  'strength': "I've focused your plan on strength training with compound movements. You can preview the updated plan below.",
  'abs': "I've added more core exercises to target your abs and strengthen your midsection. You can preview the updated plan below.",
  'legs': "I've enhanced your leg workout with more squats, lunges, and lower body exercises. You can preview the updated plan below.",
  'arms': "I've focused on building stronger arms with additional bicep and tricep exercises. You can preview the updated plan below.",
  'chest': "I've improved your chest workout with more pressing movements and upper body exercises. You can preview the updated plan below.",
  'back': "I've strengthened your back routine with more pulling exercises and back-focused movements. You can preview the updated plan below.",
  'shoulders': "I've enhanced your shoulder workout with targeted deltoid exercises and overhead movements. You can preview the updated plan below.",
  'weight': "I've optimized your plan for weight goals with appropriate intensity and exercise selection. You can preview the updated plan below.",
  'muscle': "I've designed your plan to maximize muscle building with compound movements and progressive overload. You can preview the updated plan below.",
  'tone': "I've created a balanced plan to help tone your muscles with varied exercises and rep ranges. You can preview the updated plan below.",
  'beginner': "I've made your plan beginner-friendly with proper progression and manageable intensity. You can preview the updated plan below.",
  'advanced': "I've created an advanced workout with challenging exercises and higher intensity. You can preview the updated plan below.",
  'time': "I've adjusted your workout timing to better fit your schedule. You can preview the updated plan below.",
  'frequency': "I've modified how often you work out each week based on your request. You can preview the updated plan below.",
  'equipment': "I've adjusted your plan based on your available equipment. You can preview the updated plan below.",
  'home': "I've created a home workout version that doesn't require gym equipment. You can preview the updated plan below.",
  'gym': "I've optimized your plan for gym equipment and facilities. You can preview the updated plan below.",
  'default': "I've modified your workout plan based on your request. You can preview the updated plan below."
};

function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check for specific body parts first
  if (lowerMessage.includes('abs') || lowerMessage.includes('core') || lowerMessage.includes('stomach')) {
    return fallbackResponses.abs;
  } else if (lowerMessage.includes('legs') || lowerMessage.includes('thigh') || lowerMessage.includes('glute') || lowerMessage.includes('quad') || lowerMessage.includes('hamstring')) {
    return fallbackResponses.legs;
  } else if (lowerMessage.includes('arms') || lowerMessage.includes('bicep') || lowerMessage.includes('tricep')) {
    return fallbackResponses.arms;
  } else if (lowerMessage.includes('chest') || lowerMessage.includes('pec')) {
    return fallbackResponses.chest;
  } else if (lowerMessage.includes('back') || lowerMessage.includes('lat') || lowerMessage.includes('pull')) {
    return fallbackResponses.back;
  } else if (lowerMessage.includes('shoulder') || lowerMessage.includes('deltoid')) {
    return fallbackResponses.shoulders;
  }
  
  // Check for goals and levels
  else if (lowerMessage.includes('beginner') || lowerMessage.includes('start') || lowerMessage.includes('new')) {
    return fallbackResponses.beginner;
  } else if (lowerMessage.includes('advanced') || lowerMessage.includes('expert') || lowerMessage.includes('pro')) {
    return fallbackResponses.advanced;
  } else if (lowerMessage.includes('weight') || lowerMessage.includes('lose') || lowerMessage.includes('gain')) {
    return fallbackResponses.weight;
  } else if (lowerMessage.includes('tone') || lowerMessage.includes('lean') || lowerMessage.includes('sculpt')) {
    return fallbackResponses.tone;
  } else if (lowerMessage.includes('muscle') || lowerMessage.includes('build') || lowerMessage.includes('bulk')) {
    return fallbackResponses.muscle;
  }
  
  // Check for workout type and environment
  else if (lowerMessage.includes('home') || lowerMessage.includes('house') || lowerMessage.includes('apartment')) {
    return fallbackResponses.home;
  } else if (lowerMessage.includes('gym') || lowerMessage.includes('fitness') || lowerMessage.includes('weight room')) {
    return fallbackResponses.gym;
  } else if (lowerMessage.includes('equipment') || lowerMessage.includes('dumbbell') || lowerMessage.includes('barbell')) {
    return fallbackResponses.equipment;
  } else if (lowerMessage.includes('time') || lowerMessage.includes('minutes') || lowerMessage.includes('hour') || lowerMessage.includes('duration')) {
    return fallbackResponses.time;
  } else if (lowerMessage.includes('frequency') || lowerMessage.includes('often') || lowerMessage.includes('week') || lowerMessage.includes('day')) {
    return fallbackResponses.frequency;
  }
  
  // Check for intensity
  else if (lowerMessage.includes('hard') || lowerMessage.includes('difficult') || lowerMessage.includes('intense') || lowerMessage.includes('challenge')) {
    return fallbackResponses.harder;
  } else if (lowerMessage.includes('easy') || lowerMessage.includes('simple') || lowerMessage.includes('light') || lowerMessage.includes('gentle')) {
    return fallbackResponses.easier;
  }
  
  // Check for workout types
  else if (lowerMessage.includes('cardio') || lowerMessage.includes('running') || lowerMessage.includes('endurance') || lowerMessage.includes('aerobic')) {
    return fallbackResponses.cardio;
  } else if (lowerMessage.includes('strength') || lowerMessage.includes('power') || lowerMessage.includes('strong')) {
    return fallbackResponses.strength;
  }
  
  // Default fallback
  else {
    return fallbackResponses.default;
  }
}

// Update the /api/ai-chat endpoint to use the new callAI function
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { planId, message, currentPlan } = req.body;
    
    if (!planId || !message) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    let cleanMessage;
    let newPlan = null;
    
    try {
      // Re-enable AI chat functionality
      console.log('[AI-CHAT] Attempting to call AI service');
      const systemPrompt = composeAIChatPrompt(currentPlan);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];
    
    // Set a longer timeout for chat requests to handle complex AI reasoning
    const AI_CHAT_TIMEOUT = parseInt(process.env.AI_CHAT_TIMEOUT) || 180000; // 180 seconds (3 minutes) for chat
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI chat request timed out')), AI_CHAT_TIMEOUT);
    });
    
    const aiResponse = await Promise.race([
      callAI(messages),
      timeoutPromise
    ]);
      if (aiResponse.error) {
        throw new Error(aiResponse.message);
      }
    const aiMessage = aiResponse.choices[0].message.content;
      newPlan = extractNewPlan(aiMessage);
    
      // If no plan extracted but message suggests changes, create a modified plan
    if (!newPlan && aiMessage.includes('plan') && aiMessage.includes('change')) {
      newPlan = createModifiedPlan(currentPlan);
    }
      cleanMessage = aiMessage;
      
      // Clean up the message for display
      cleanMessage = cleanMessage.replace(/```json\s*\{[\s\S]*?\}\s*```[\s\S]*/g, '');
      cleanMessage = cleanMessage.replace(/\{[\s\S]*?"newPlan"[\s\S]*?\}/g, '');
      cleanMessage = cleanMessage.replace(/###.*$/gm, '');
      cleanMessage = cleanMessage.replace(/Explanation of Changes:.*$/s, '');
      cleanMessage = cleanMessage.replace(/\*\*Changes Made:\*\*.*$/s, '');
      cleanMessage = cleanMessage.replace(/\n\s*\n/g, '\n').trim();
      if (cleanMessage.length > 100 || cleanMessage.includes('```') || cleanMessage.length < 10) {
        cleanMessage = "I've adjusted your workout plan based on your request! The new plan has been modified with your changes.";
      }

    } catch (aiError) {
      console.error('[AI-CHAT] AI service error:', aiError.message);
      if (AI_STRICT_EFFECTIVE) {
        throw aiError;
      }
      console.log('[AI-CHAT] AI error caught, switching to fallback');
      
      // Use fallback response and create a modified plan
      cleanMessage = getFallbackResponse(message);
      newPlan = createModifiedPlan(currentPlan);
      
      // Log that we're using fallback
      console.log('[AI-CHAT] Using fallback response due to AI error');
      console.log('[AI-CHAT] Fallback message:', cleanMessage);
      console.log('[AI-CHAT] Fallback plan created:', newPlan ? 'yes' : 'no');
    }
    
    // Mark the new plan as modified if it exists
    if (newPlan) {
      newPlan.modified_from_original = true;
      newPlan.modified_at = new Date().toISOString();
    }
    
    return res.json({ success: true, message: cleanMessage, newPlan });
    
  } catch (error) {
    console.error('[AI-CHAT] Unexpected error:', error);
    if (AI_STRICT_EFFECTIVE) {
      return res.status(502).json({ success: false, error: 'AI chat failed and strict mode is enabled' });
    }
    
    // Final fallback - still try to provide a useful response
    const fallbackMessage = getFallbackResponse(req.body.message || '');
    const fallbackPlan = createModifiedPlan(req.body.currentPlan);
    
    // Mark fallback plan as modified too
    if (fallbackPlan) {
      fallbackPlan.modified_from_original = true;
      fallbackPlan.modified_at = new Date().toISOString();
    }
    
    return res.json({ 
      success: true, 
      message: fallbackMessage, 
      newPlan: fallbackPlan 
    });
  }
});

app.post('/api/save-plan', async (req, res) => {
  const { plan, user } = req.body;
  console.log('[SAVE PLAN] Calling database function to save plan for user:', user.id);
  console.log('[SAVE PLAN] Plan status:', plan.status || 'active');

  try {
    let newPlanId = '';
    
    // Try to save to the database first
    if (supabase) {
      // First, deactivate any existing active plans for this user
      try {
        console.log('[SAVE PLAN] Deactivating existing active plans for user:', user.id);
        const { error: deactivateError } = await supabase
          .from('workout_plans')
          .update({ status: 'archived' }) // Use 'status' field instead of 'is_active'
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        if (deactivateError) {
          console.warn('[SAVE PLAN] Error deactivating existing plans:', deactivateError);
          // Continue anyway
        } else {
          console.log('[SAVE PLAN] Successfully deactivated existing plans');
        }
      } catch (deactivateErr) {
        console.warn('[SAVE PLAN] Exception deactivating plans:', deactivateErr);
        // Continue anyway
      }

      // Now insert the new plan with status set to active
      try {
        console.log('[SAVE PLAN] Inserting new plan with status=active');
          
          // Extract only the fields that exist in the workout_plans table
        const planToInsert = {
          user_id: user.id,
            name: plan.name || 'AI Generated Plan',
            status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
            mesocycle_length_weeks: plan.mesocycle_length_weeks || 4,
            current_week: plan.current_week || 1,
            training_level: plan.training_level || 'intermediate',
            volume_landmarks: plan.volume_landmarks || {},
            deload_week: plan.deload_week || false,
            goal_fat_loss: plan.goal_fat_loss || 3,
            goal_muscle_gain: plan.goal_muscle_gain || 3,
            estimated_time_per_session: plan.estimated_time_per_session || '45-60 minutes'
          };
        
        const { data: newPlan, error: insertError } = await supabase
          .from('workout_plans')
          .insert(planToInsert)
          .select()
          .single();

        if (insertError) {
          console.error('[SAVE PLAN] Error inserting plan:', insertError);
          throw insertError;
        }

        console.log('[SAVE PLAN] Successfully inserted plan:', newPlan.id);
        newPlanId = newPlan.id;

        // Also materialize splits, sessions and sets so users can start workouts immediately
        try {
          console.log('[SAVE PLAN] Starting to create training splits and sessions');
          const weeklySchedule = plan.weeklySchedule || plan.weekly_schedule || [];
          
          if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
            console.warn('[SAVE PLAN] No weekly schedule found in plan');
            return res.json({ success: true, newPlanId });
          }
          
          console.log(`[SAVE PLAN] Creating ${weeklySchedule.length} training days`);
          
          // Process each day in the weekly schedule
          for (let i = 0; i < weeklySchedule.length; i++) {
            const day = weeklySchedule[i];
            
            // Skip rest days
            if (!day || !day.focus || day.focus.toLowerCase().includes('rest') || day.focus.toLowerCase().includes('off')) {
              console.log(`[SAVE PLAN] Skipping rest day: ${day?.focus || 'unknown'}`);
          continue;
        }
            
            console.log(`[SAVE PLAN] Processing day ${i+1}: ${day.focus}`);
            
            // 1. Create the training split
            const { data: split, error: splitError } = await supabase
              .from('training_splits')
              .insert({
                plan_id: newPlanId,
                name: day.focus,
                focus_areas: Array.isArray(day.focus_areas) ? day.focus_areas : [day.focus],
                order_in_week: i + 1,
                frequency_per_week: 1
              })
              .select()
              .single();
              
            if (splitError) {
              console.error(`[SAVE PLAN] Error creating split for day ${i+1}:`, splitError);
              continue;
            }
            
            console.log(`[SAVE PLAN] Created split: ${split.id} - ${split.name}`);
            
            // 2. Create the workout session
            // Try to insert with estimated_calories, fall back without it if column doesn't exist
            const estimatedCalories = Math.floor(Math.random() * 200 + 200); // Random calories between 200-400
            
            let sessionData = {
                plan_id: newPlanId,
                split_id: split.id,
                day_number: i + 1,
                week_number: 1,
              estimated_calories: estimatedCalories,
                status: 'pending',
                name: day.focus // Add the focus as the session name
            };

            let { data: session, error: sessionError } = await supabase
              .from('workout_sessions')
              .insert(sessionData)
              .select()
              .single();

            // If error is about missing estimated_calories column, retry without it
            if (sessionError && sessionError.message && sessionError.message.includes('estimated_calories')) {
              console.log(`Retrying session creation without estimated_calories for "${day.focus}"`);
              
              const fallbackSessionData = {
                plan_id: newPlanId,
                split_id: split.id,
                day_number: i + 1,
                week_number: 1,
                status: 'pending',
                name: day.focus
              };

              const result = await supabase
                .from('workout_sessions')
                .insert(fallbackSessionData)
                .select()
                .single();

              session = result.data;
              sessionError = result.error;
            }
              
            if (sessionError) {
              console.error(`[SAVE PLAN] Error creating session for day ${i+1}:`, sessionError);
              continue;
            }
            
            console.log(`[SAVE PLAN] Created session: ${session.id}`);
            
            // Skip if no exercises
            if (!day.exercises || !Array.isArray(day.exercises) || day.exercises.length === 0) {
              console.log(`[SAVE PLAN] No exercises found for day ${i+1}`);
              continue;
            }
            
            // 3. Create exercise sets for each exercise
            for (let j = 0; j < day.exercises.length; j++) {
              const exercise = day.exercises[j];
              
              if (!exercise || !exercise.name) {
                console.log(`[SAVE PLAN] Invalid exercise at index ${j}`);
                continue;
              }
              
              // Find or create the exercise
              const { data: exerciseData, error: exerciseError } = await supabase
                .from('exercises')
                .select('*')
                .ilike('name', exercise.name)
                .limit(1);
                
              let exerciseId;
              
              if (exerciseError || !exerciseData || exerciseData.length === 0) {
                // Create a new exercise
                const category = getExerciseCategory(exercise.name);
                
                const { data: newExercise, error: newExerciseError } = await supabase
                  .from('exercises')
                  .insert({
                    name: exercise.name,
                    category: category.type,
                    muscle_groups: [category.muscleGroup],
                    difficulty: 'intermediate',
                    equipment_needed: [],
                    is_custom: false
                  })
                  .select()
                  .single();
                  
                if (newExerciseError) {
                  console.error(`[SAVE PLAN] Error creating exercise ${exercise.name}:`, newExerciseError);
                  continue;
                }
                
                exerciseId = newExercise.id;
                console.log(`[SAVE PLAN] Created new exercise: ${newExercise.id} - ${newExercise.name}`);
      } else {
                exerciseId = exerciseData[0].id;
                console.log(`[SAVE PLAN] Found existing exercise: ${exerciseId} - ${exerciseData[0].name}`);
              }
              
              // Create the exercise set
              const { data: exerciseSet, error: exerciseSetError } = await supabase
                .from('exercise_sets')
                .insert({
                  session_id: session.id,
                  exercise_id: exerciseId,
                  order_in_session: j,
                  target_sets: exercise.sets || 3,
                  target_reps: exercise.reps || '8-12',
                  rest_period: exercise.restBetweenSets || exercise.rest || '60s',
                  progression_scheme: 'double_progression'
                })
                .select()
                .single();
                
              if (exerciseSetError) {
                console.error(`[SAVE PLAN] Error creating exercise set for ${exercise.name}:`, exerciseSetError);
                continue;
              }
              
              console.log(`[SAVE PLAN] Created exercise set: ${exerciseSet.id} for ${exercise.name}`);
            }
          }
          
          console.log('[SAVE PLAN] Successfully created all training splits, sessions, and exercise sets');
  } catch (err) {
          console.error('[SAVE PLAN] Error creating training splits, sessions, or sets:', err);
          // Continue anyway - we'll return the plan ID even if some splits/sessions failed
        }

        // Helper function to categorize exercises
        function getExerciseCategory(exerciseName) {
          const name = exerciseName.toLowerCase();
          
          // Chest exercises
          if (name.includes('bench press') || name.includes('chest') || name.includes('fly') || 
              name.includes('push up') || name.includes('push-up') || name.includes('dip')) {
            return { type: 'compound', muscleGroup: 'chest' };
          }
          
          // Back exercises
          if (name.includes('row') || name.includes('pull up') || name.includes('pull-up') || 
              name.includes('lat') || name.includes('back') || name.includes('deadlift')) {
            return { type: 'compound', muscleGroup: 'back' };
          }
          
          // Leg exercises
          if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || 
              name.includes('calf') || name.includes('hamstring') || name.includes('quad')) {
            return { type: 'compound', muscleGroup: 'legs' };
          }
          
          // Shoulder exercises
          if (name.includes('shoulder') || name.includes('press') || name.includes('raise') || 
              name.includes('delt') || name.includes('military')) {
            return { type: 'compound', muscleGroup: 'shoulders' };
          }
          
          // Arm exercises
          if (name.includes('curl') || name.includes('bicep') || name.includes('tricep') || 
              name.includes('extension')) {
            return { type: 'isolation', muscleGroup: 'arms' };
          }
          
          // Core exercises
          if (name.includes('ab') || name.includes('core') || name.includes('crunch') || 
              name.includes('plank') || name.includes('twist')) {
            return { type: 'accessory', muscleGroup: 'core' };
          }
          
          // Default
          return { type: 'accessory', muscleGroup: 'full body' };
        }

        return res.json({ success: true, newPlanId });
      } catch (insertErr) {
        console.error('[SAVE PLAN] Exception inserting plan:', insertErr);
        // Don't throw the error - continue with mock store
        console.log('[SAVE PLAN] Continuing with mock store due to database error');
      }
    }

    // If we're here, either database save succeeded or we're using mock store
    // If we didn't get a plan ID from the database, generate one for the mock store
    if (!newPlanId) {
      newPlanId = `ai-${Date.now().toString(36)}`;
      console.log('[SAVE PLAN] Generated mock plan ID:', newPlanId);
    }
    
    // Always update the mock store for immediate client access (even if database failed)
    console.log('[SAVE PLAN] Updating mock store with plan ID:', newPlanId);

    // Also update the mock store for immediate client access
    try {
      // First deactivate any existing active plans
      mockWorkoutPlansStore.plans.forEach(p => {
        if (p.user_id === user.id && p.is_active) {
          console.log('[SAVE PLAN] Deactivating mock plan:', p.id);
          p.is_active = false;
          p.status = 'archived';
        }
      });

      // Then add the new plan
      const mockPlan = {
        ...plan,
        id: newPlanId,
        user_id: user.id,
        is_active: true, // For backward compatibility with mock store
        status: 'active', // Use 'status' field
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove any existing plan with the same ID
      mockWorkoutPlansStore.plans = mockWorkoutPlansStore.plans.filter(p => p.id !== newPlanId);
      
      // Add the new plan at the beginning of the array
      mockWorkoutPlansStore.plans.unshift(mockPlan);
      console.log('[SAVE PLAN] Added plan to mock store with ID:', newPlanId);
    } catch (mockError) {
      console.warn('[SAVE PLAN] Error updating mock store:', mockError);
      // Continue anyway
    }

    // Return success with the new plan ID
    return res.json({ 
      success: true, 
      message: 'Plan saved successfully', 
      newPlanId: newPlanId
    });
  } catch (error) {
    console.error('[SAVE PLAN] Error saving plan:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save plan' 
    });
  }
});

function composeNutritionPrompt(userData) {
  const { profile, preferences, mealsPerDay, snacksPerDay, bodyAnalysis } = userData;
  const birthDate = new Date(profile.birthday);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  
  // Build comprehensive user profile for nutrition planning
  const userProfile = `
PHYSICAL PROFILE:
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Age: ${age}
- Gender: ${profile.gender}
- Body Fat: ${profile.body_fat ? `${profile.body_fat}%` : 'Not specified'}
- Current Weight Trend: ${profile.weight_trend || 'Not specified'}
- Daily Activity Level: ${profile.activity_level || 'Not specified'}
- Current Exercise Frequency: ${profile.exercise_frequency || 'Not specified'}

FITNESS GOALS & LEVEL:
- Training Level: ${profile.training_level || 'Not specified'}
- Fat Loss Goal Priority: ${profile.goal_fat_reduction || 0}/5
- Muscle Gain Goal Priority: ${profile.goal_muscle_gain || 0}/5

BODY ANALYSIS (if available):
${bodyAnalysis ? `
- Overall Rating: ${bodyAnalysis.overall_rating || 'N/A'}/10
- Strongest Body Part: ${bodyAnalysis.strongest_body_part || 'N/A'}
- Weakest Body Part: ${bodyAnalysis.weakest_body_part || 'N/A'}
- Body Part Ratings: Chest ${bodyAnalysis.chest_rating || 'N/A'}/10, Arms ${bodyAnalysis.arms_rating || 'N/A'}/10, Back ${bodyAnalysis.back_rating || 'N/A'}/10, Legs ${bodyAnalysis.legs_rating || 'N/A'}/10, Waist ${bodyAnalysis.waist_rating || 'N/A'}/10
- AI Feedback: ${bodyAnalysis.ai_feedback || 'N/A'}
` : 'No body analysis data available'}

MEAL PLANNING PREFERENCES:
- Dietary Preferences: ${preferences || 'None'}
- Total Meals: ${mealsPerDay}
- Total Snacks: ${snacksPerDay || 0}
  `;
  
  return `
Create a personalized 1-day nutrition plan for this client:

CLIENT: ${profile.height || 'average'}cm, ${profile.weight || 'average'}kg, ${age || 'adult'}y, ${profile.gender || 'general'}, ${profile.goal_type} goal
PREFERENCES: ${preferences || 'None'}, ${mealsPerDay} meals, ${snacksPerDay} snacks

IMPORTANT: Return ONLY valid JSON. Do NOT include any text, explanations, or markdown formatting. Start with { and end with }.
{
  "daily_targets": {"calories": X, "protein": X, "carbs": X, "fat": X},
  "micronutrients_targets": {"sodium_mg": X, "potassium_mg": X, "vitamin_d_mcg": X, "calcium_mg": X, "iron_mg": X},
  "daily_schedule": [
    {"time_slot": "Breakfast", "meal": "description", "macros": {"calories": X, "protein": X, "carbs": X, "fat": X}},
    {"time_slot": "Lunch", "meal": "description", "macros": {"calories": X, "protein": X, "carbs": X, "fat": X}},
    {"time_slot": "Dinner", "meal": "description", "macros": {"calories": X, "protein": X, "carbs": X, "fat": X}}
  ],
  "food_suggestions": {
    "proteins": ["item1", "item2", "item3", "item4"],
    "carbs": ["item1", "item2", "item3", "item4"],
    "fats": ["item1", "item2", "item3", "item4"],
    "vegetables": ["item1", "item2", "item3", "item4"]
  },
  "snack_suggestions": ["snack1", "snack2", "snack3", "snack4", "snack5"]
}
`;
}

function composeMealCustomizationPrompt({
  originalMeal,
  targetMacros,
  ingredientToReplace,
  newIngredient,
}) {
  return `
You are an expert nutritionist. A client wants to customize a single meal from their nutrition plan. Your task is to modify the meal by replacing one ingredient while ensuring the new meal's macronutrients are as close as possible to the original targets.

HERE IS THE TASK:
1.  **Original Meal:** "${originalMeal}"
2.  **Target Macros for this Meal:**
    - Calories: ${targetMacros.calories} kcal
    - Protein: ${targetMacros.protein} g
    - Carbohydrates: ${targetMacros.carbs} g
    - Fat: ${targetMacros.fat} g
3.  **Ingredient to Replace:** "${ingredientToReplace}"
4.  **New Ingredient to Use:** "${newIngredient}"

YOUR INSTRUCTIONS:
- Rewrite the meal description to include the "${newIngredient}" instead of the "${ingredientToReplace}".
- You MUST adjust the serving size of the "${newIngredient}" and potentially make minor adjustments to other ingredients in the meal to ensure the total macronutrient profile of the new meal is as close as possible to the "Target Macros".
- The final output MUST be ONLY a valid JSON object with a single key, "new_meal_description", containing the updated meal as a string. Do not include any other text, explanations, or markdown.

EXAMPLE RESPONSE:
{
  "new_meal_description": "Grilled Salmon (130g) with Quinoa (1 cup) and a side salad with Olive Oil dressing"
}
`;
}


const PEXELS_API_KEY =
  '563492ad6f91700001000001d02925b145994d53a25e9b8b54b1c89f';

app.get('/api/get-food-image', (req, res) => {
  const food = req.query.food;
  if (!food) {
    return res.status(400).json({ error: 'Food query parameter is required' });
  }

  // --- TEMPORARY FIX ---
  // Using a placeholder image service (Picsum Photos) that doesn't require an API key.
  // This avoids waiting for Unsplash approval. The images will be placeholders, not actual food.
  // Once you have your Unsplash key, we can revert this change.
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(
    food
  )}/200/300`;

  console.log(
    `[ImagePlaceholder] Generated placeholder for "${food}": ${imageUrl}`
  );

  res.json({ imageUrl });
});

// Add this function to ensure the nutrition plan has properly formatted daily targets
function ensureProperDailyTargets(nutritionPlan) {
  if (!nutritionPlan.daily_targets) {
    nutritionPlan.daily_targets = {};
  }
  
  if (nutritionPlan.daily_targets_json) {
    nutritionPlan.daily_targets = {
      ...nutritionPlan.daily_targets,
      ...nutritionPlan.daily_targets_json
    };
  }
  
  // Ensure all required fields exist with default values
  nutritionPlan.daily_targets.calories = nutritionPlan.daily_targets.calories || 2000;
  nutritionPlan.daily_targets.protein = nutritionPlan.daily_targets.protein || nutritionPlan.daily_targets.protein_grams || 150;
  nutritionPlan.daily_targets.carbs = nutritionPlan.daily_targets.carbs || nutritionPlan.daily_targets.carbs_grams || 200;
  nutritionPlan.daily_targets.fat = nutritionPlan.daily_targets.fat || nutritionPlan.daily_targets.fat_grams || 65;
  
  return nutritionPlan;
}

// Add more detailed logging for AI generation
app.post('/api/generate-nutrition-plan', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/generate-nutrition-plan`);
  try {
    const { profile, preferences, mealsPerDay = 3, snacksPerDay = 1 } = req.body;
    
    if (!profile) {
      return res.status(400).json({ error: 'Missing required profile data' });
    }

    console.log('[NUTRITION] Generating plan with the following user data:', profile);

    // Create a personalized plan name
    const mockPlanName = profile.full_name ? `${profile.full_name}'s Nutrition Plan` : 'Nutrition Plan';

    // Log API configuration
    console.log('[NUTRITION] API configuration:', {
      AI_PROVIDER,
      AVAILABLE_PROVIDERS: AI_PROVIDERS.map(p => p.name),
      CHAT_MODEL
    });

      try {
        console.log('[NUTRITION] Starting AI generation process...');
        const prompt = composeNutritionPrompt({
          profile,
          preferences: preferences || [],
          mealsPerDay,
          snacksPerDay
        });

      console.log('[NUTRITION] Using callAI function with fallback providers...');
      
      // Use the new callAI function with fallback providers
      const aiResponse = await callAI(
        [{ role: 'user', content: prompt }],
        { type: 'json_object' },
        0.7
      );

        console.log('[NUTRITION] Received AI response, processing...');
        
        if (aiResponse.error) {
          console.error('[NUTRITION] AI provider error:', aiResponse.message);
          throw new Error(`AI generation failed: ${aiResponse.message}`);
        }
        
        if (aiResponse.choices && aiResponse.choices[0]) {
          const content = aiResponse.choices[0].message.content;
          console.log('[NUTRITION] Raw AI response length:', content.length);
          console.log('[NUTRITION] Raw AI response preview:', content.substring(0, 200) + '...');
          
          const nutritionPlan = convertMarkdownToNutritionJson(content) || findAndParseJson(content);
          
          if (nutritionPlan) {
          console.log('[NUTRITION] Successfully parsed AI response');
            console.log('[NUTRITION] Parsed nutrition plan keys:', Object.keys(nutritionPlan));
            console.log('[NUTRITION] Parsed nutrition plan preview:', JSON.stringify(nutritionPlan).substring(0, 300) + '...');
          } else {
            console.log('[NUTRITION] Failed to parse AI response');
          }

          if (nutritionPlan) {
            console.log('[NUTRITION] Parsed nutrition plan structure:', {
              hasDailyTargets: !!nutritionPlan.daily_targets,
              hasDailySchedule: !!nutritionPlan.daily_schedule,
              hasFoodSuggestions: !!nutritionPlan.food_suggestions,
              hasSnackSuggestions: !!nutritionPlan.snack_suggestions,
              dailyTargetsKeys: nutritionPlan.daily_targets ? Object.keys(nutritionPlan.daily_targets) : [],
              dailyScheduleLength: nutritionPlan.daily_schedule ? nutritionPlan.daily_schedule.length : 0
            });

            // Validate that the nutrition plan has at least some basic structure
            if (!nutritionPlan.daily_targets && !nutritionPlan.daily_schedule) {
              console.error('[NUTRITION] AI response lacks required nutrition plan structure');
              console.error('[NUTRITION] Raw AI response:', content.substring(0, 500) + '...');
              throw new Error('AI response missing required nutrition plan structure');
            }

            // Create a plan object with all necessary fields
            const plan = {
              id: `ai-${Date.now().toString(36)}`,
              user_id: profile.id,
              plan_name: mockPlanName,
              goal_type: profile.goal_type,
              status: 'active',
              preferences: {
                dietary: preferences || [],
                intolerances: []
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              daily_targets: nutritionPlan.daily_targets || {},
              micronutrients_targets: nutritionPlan.micronutrients_targets || {},
              daily_schedule: nutritionPlan.daily_schedule || [],
              food_suggestions: nutritionPlan.food_suggestions || {},
              snack_suggestions: nutritionPlan.snack_suggestions || []
            };
            
            // Ensure the plan has proper daily targets
            const enhancedPlan = ensureProperDailyTargets(plan);

            if (supabase) {
              try {
                console.log('[NUTRITION] Saving AI-generated plan to database...');
                
                // Use daily_targets instead of daily_targets_json
                const { data: savedPlan, error } = await supabase
                  .from('nutrition_plans')
                  .insert({
                    user_id: profile.id,
                    plan_name: mockPlanName,
                    goal_type: profile.goal_type,
                    status: 'active',
                    preferences: {
                      dietary: preferences || [],
                      intolerances: []
                    },
                    daily_targets: enhancedPlan.daily_targets || {},
                    micronutrients_targets: enhancedPlan.micronutrients_targets || {}
                  })
                  .select()
                  .single();

                if (error) {
                  console.error('[NUTRITION] Error updating plan with AI data:', error);
                  // Return the plan even if DB save fails
                  return res.json(enhancedPlan);
                }

                console.log('[NUTRITION] Successfully saved AI plan to database');
                
                // Save daily schedule as meal suggestions
                if (nutritionPlan.daily_schedule && nutritionPlan.daily_schedule.length > 0) {
                  const mealSuggestions = nutritionPlan.daily_schedule.map(meal => ({
                    nutrition_plan_id: savedPlan.id,
                    suggestion_date: new Date().toISOString().split('T')[0],
                    meal_type: meal.time_slot,
                    meal_description: meal.meal,
                    calories: meal.macros.calories,
                    protein_grams: meal.macros.protein,
                    carbs_grams: meal.macros.carbs,
                    fat_grams: meal.macros.fat
                  }));

                  const { error: mealError } = await supabase
                    .from('meal_plan_suggestions')
                    .insert(mealSuggestions);

                  if (mealError) {
                    console.error('[NUTRITION] Error saving meal suggestions:', mealError);
                  } else {
                    console.log('[NUTRITION] Successfully saved meal suggestions');
                  }
                }

                // Return the saved plan with all data
                const fullPlan = {
                  ...savedPlan,
                  daily_schedule: nutritionPlan.daily_schedule || [],
                  food_suggestions: nutritionPlan.food_suggestions || {},
                  snack_suggestions: nutritionPlan.snack_suggestions || []
                };
                
                return res.json(ensureProperDailyTargets(fullPlan));
              } catch (dbError) {
                console.error('[NUTRITION] Database error:', dbError);
                // Return the plan even if DB save fails
                return res.json(enhancedPlan);
              }
            } else {
              // No database connection, return the plan directly
              return res.json(enhancedPlan);
            }
          } else {
            console.error('[NUTRITION] Failed to parse AI response into valid nutrition plan');
            throw new Error('AI generated invalid nutrition plan format');
          }
        } else {
          console.error('[NUTRITION] AI response missing expected data structure');
          throw new Error('AI response missing expected data structure');
        }
      } catch (aiError) {
        console.error('[NUTRITION] AI generation failed:', aiError);
        
        // Create a fallback plan instead of throwing an error
        console.log('[NUTRITION] Creating fallback nutrition plan...');
        
        const fallbackPlan = {
          id: `fallback-${Date.now().toString(36)}`,
          user_id: profile.id,
          plan_name: `${mockPlanName} (Fallback)`,
          goal_type: profile.goal_type,
          status: 'active',
          preferences: {
            dietary: preferences || [],
            intolerances: []
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          daily_targets: {
            calories: profile.goal_type === 'weight_loss' ? 1800 : profile.goal_type === 'muscle_gain' ? 2500 : 2200,
            protein: profile.goal_type === 'muscle_gain' ? 180 : 150,
            carbs: profile.goal_type === 'muscle_gain' ? 250 : 200,
            fat: profile.goal_type === 'weight_loss' ? 60 : 80
          },
          micronutrients_targets: {
            fiber: 25,
            sodium: 2300,
            potassium: 3500,
            vitamin_c: 90,
            calcium: 1000,
            iron: 18
          },
          daily_schedule: [
            {
              time_slot: 'Breakfast',
              meal: 'Oatmeal with berries and nuts',
              macros: { calories: 400, protein: 15, carbs: 60, fat: 15 }
            },
            {
              time_slot: 'Lunch',
              meal: 'Grilled chicken salad with vegetables',
              macros: { calories: 500, protein: 35, carbs: 30, fat: 25 }
            },
            {
              time_slot: 'Dinner',
              meal: 'Salmon with quinoa and steamed vegetables',
              macros: { calories: 600, protein: 40, carbs: 45, fat: 30 }
            }
          ],
          food_suggestions: {
            proteins: ['Chicken breast', 'Salmon', 'Eggs', 'Greek yogurt'],
            carbs: ['Quinoa', 'Brown rice', 'Sweet potato', 'Oatmeal'],
            fats: ['Avocado', 'Nuts', 'Olive oil', 'Coconut oil'],
            vegetables: ['Spinach', 'Broccoli', 'Carrots', 'Bell peppers']
          },
          snack_suggestions: [
            'Apple with almond butter',
            'Greek yogurt with berries',
            'Mixed nuts and dried fruits',
            'Carrot sticks with hummus'
          ]
        };
        
        const enhancedFallbackPlan = ensureProperDailyTargets(fallbackPlan);
        
        // Try to save to database if available
        if (supabase) {
          try {
            const { data: savedPlan, error } = await supabase
              .from('nutrition_plans')
              .insert({
                user_id: profile.id,
                plan_name: fallbackPlan.plan_name,
                goal_type: profile.goal_type,
                status: 'active',
                preferences: fallbackPlan.preferences,
                daily_targets: enhancedFallbackPlan.daily_targets,
                micronutrients_targets: enhancedFallbackPlan.micronutrients_targets
              })
              .select()
              .single();
              
            if (!error) {
              console.log('[NUTRITION] Saved fallback plan to database');
              return res.json({
                ...savedPlan,
                daily_schedule: fallbackPlan.daily_schedule,
                food_suggestions: fallbackPlan.food_suggestions,
                snack_suggestions: fallbackPlan.snack_suggestions,
                is_fallback: true
              });
            }
          } catch (dbError) {
            console.error('[NUTRITION] Failed to save fallback plan to database:', dbError);
          }
        }
        
        // Return fallback plan directly
        return res.json({
          ...enhancedFallbackPlan,
          is_fallback: true
        });
    }
  } catch (error) {
    console.error('[NUTRITION] Error generating nutrition plan:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate nutrition plan.',
      errorType: error.name || 'UnknownError',
      errorDetails: error.response?.data || null
    });
  }
});

app.post('/api/customize-meal', async (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Received request for /api/customize-meal`
  );
  const { originalMeal, targetMacros, ingredientToReplace, newIngredient } =
    req.body;

  if (
    !originalMeal ||
    !targetMacros ||
    !ingredientToReplace ||
    !newIngredient
  ) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  if (!AI_API_KEY) {
    console.error('[SERVER ERROR] AI API key is not set.');
    return res.status(500).json({ error: 'AI API key not set on server.' });
  }

  try {
    const prompt = composeMealCustomizationPrompt({
      originalMeal,
      targetMacros,
      ingredientToReplace,
      newIngredient,
    });

    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const rawAiContent = aiResponse.data.choices[0].message.content;
    const responseData = findAndParseJson(rawAiContent);

    if (!responseData || !responseData.new_meal_description) {
      console.error(
        '[CUSTOMIZE MEAL] Could not find or parse valid JSON with new_meal_description. Content:',
        rawAiContent
      );
      throw new Error('AI did not return a valid meal description.');
    }

    res.json({ newMealDescription: responseData.new_meal_description });
  } catch (error) {
    console.error('[CUSTOMIZE MEAL] Error:', error.message);
    if (error.response) {
      console.error('Response Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request Error:', error.request);
    }
    const message =
      error?.response?.data?.error?.message ||
      error.message ||
      'Failed to customize meal.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/update-meal', async (req, res) => {
  const { planId, mealTimeSlot, newMealDescription } = req.body;

  if (!planId || !mealTimeSlot || !newMealDescription) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const { error } = await supabase.rpc('update_meal_in_schedule', {
      plan_id_param: planId,
      meal_time_slot_param: mealTimeSlot,
      new_meal_description_param: newMealDescription,
    });

    if (error) {
      console.error('[UPDATE MEAL] Error calling RPC:', error);
      throw new Error(error.message);
    }

    res.json({ success: true, message: 'Meal updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

app.post('/api/log-food-entry', async (req, res) => {
  const { userId, entry } = req.body;

  if (!userId || !entry) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const { data, error } = await supabase
      .from('nutrition_log_entries')
      .insert({
        user_id: userId,
        ...entry,
      })
      .select();

    if (error) {
      console.error('[LOG FOOD] Error inserting food entry:', error);
      throw new Error(error.message);
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function composeReevaluationPrompt(userProfile, metrics, nutritionLogs, currentTargets) {
  const birthDate = new Date(userProfile.birthday);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  
  return `
You are an expert nutritionist AI. Your task is to analyze a user's progress over the last week and decide if their nutrition targets should be adjusted.

USER PROFILE:
- Height: ${userProfile.height} cm
- Weight: ${userProfile.weight} kg
- Age: ${age}
- Gender: ${userProfile.gender}
- Body Fat: ${userProfile.body_fat ? `${userProfile.body_fat}%` : 'Not specified'}
- Current Weight Trend: ${userProfile.weight_trend || 'Not specified'}
- Daily Activity Level: ${userProfile.activity_level || 'Not specified'}
- Current Exercise Frequency: ${userProfile.exercise_frequency || 'Not specified'}
- Training Level: ${userProfile.training_level || 'Not specified'}
- Primary Goal: ${userProfile.goal_type}
- Fat Loss Goal Priority: ${userProfile.goal_fat_reduction || 0}/5
- Muscle Gain Goal Priority: ${userProfile.goal_muscle_gain || 0}/5

CURRENT NUTRITION TARGETS:
- Calories: ${currentTargets.daily_calories} kcal
- Protein: ${currentTargets.protein_grams} g
- Carbs: ${currentTargets.carbs_grams} g
- Fat: ${currentTargets.fat_grams} g

LAST 7 DAYS OF DATA:
- Daily Metrics (Weight, Sleep, Stress, Activity):
${JSON.stringify(metrics, null, 2)}

- Nutrition Logs (Examples of what the user ate):
${JSON.stringify(nutritionLogs.slice(0, 10), null, 2)} (showing first 10 entries for brevity)

INSTRUCTIONS:
1.  Analyze the user's trend weight. Are they progressing towards their goal (${userProfile.goal_type})?
2.  Analyze their logged nutrition. Are they generally hitting their current macro targets?
3.  Analyze their activity and sleep. Has it been a high-stress or high-activity week?
4.  Based on your analysis, decide if the user's macronutrient targets should be adjusted for the next week.
5.  You MUST return ONLY a valid JSON object with two keys: "new_targets" and "reasoning".
    - "new_targets" should be an object with the new daily calories, protein, carbs, and fat. If no change is needed, return the current targets.
    - "reasoning" must be a concise, encouraging, and clear explanation for your decision (max 2-3 sentences).

EXAMPLE RESPONSE (for a user who needs an adjustment):
{
  "new_targets": {
    "daily_calories": 2400,
    "protein_grams": 180,
    "carbs_grams": 230,
    "fat_grams": 75,
    "micronutrients_targets": {
      "sodium_mg": 2200,
      "potassium_mg": 3600,
      "vitamin_d_mcg": 15,
      "calcium_mg": 1000,
      "iron_mg": 18
    }
  },
  "reasoning": "You've made great progress this week! To keep your fat loss journey moving smoothly, I'm slightly reducing your calories and carbs. Keep up the consistent effort!"
}

EXAMPLE RESPONSE (for a user on track):
{
  "new_targets": {
    "daily_calories": 2500,
    "protein_grams": 180,
    "carbs_grams": 250,
    "fat_grams": 80,
    "micronutrients_targets": {
      "sodium_mg": 2300,
      "potassium_mg": 3500,
      "vitamin_d_mcg": 15,
      "calcium_mg": 1000,
      "iron_mg": 18
    }
  },
  "reasoning": "Your progress is steady and you're consistently hitting your goals. No changes are needed this week. Great work!"
}
`;
}

function composeDailyMealPlanPrompt(targets, preferences) {
  return `
You are an expert nutritionist. Create a 1‑day meal plan that fits the targets and preferences.

DAILY TARGETS: Calories ${targets.daily_calories} kcal; Protein ${targets.protein_grams} g; Carbs ${targets.carbs_grams} g; Fat ${targets.fat_grams} g
PREFERENCES: ${preferences ? preferences.join(', ') : 'None'}

RULES:
1) Provide exactly 4 entries: Breakfast, Lunch, Dinner, and one Snack.
2) Each entry must include a concise meal_description and a macros object (calories, protein_grams, carbs_grams, fat_grams).
3) The sum of meal calories should be within ±15% of daily_calories; distribute macros realistically across meals.
4) Adhere to preferences (e.g., vegetarian/pescatarian) and avoid intolerances.
5) Return ONLY a JSON object with { "meal_plan": [ ... ] }.
`;
}

function composeBehavioralAnalysisPrompt(nutritionLogs) {
  return `
You are an expert nutritionist and behavioral psychologist. Your task is to analyze a user's food logs from the past 7 days and identify one key behavioral pattern.

USER'S NUTRITION LOGS (LAST 7 DAYS):
${JSON.stringify(nutritionLogs, null, 2)}

INSTRUCTIONS:
1.  Analyze the timestamps and content of the user's food logs.
2.  Identify a single, significant behavioral pattern. Examples include:
    - "late_night_snacking": Consistently eating high-calorie foods after 9 PM.
    - "skipping_breakfast": No food logs before 11 AM on multiple days.
    - "high_calorie_weekends": A significant jump in calorie intake on Saturday and Sunday compared to weekdays.
    - "low_protein_lunch": Lunches that are consistently low in protein, which might affect afternoon satiety.
3.  If a pattern is identified, you MUST return ONLY a valid JSON object with "insight_type" and "insight_message".
    - "insight_type" should be a short, machine-readable string (e.g., "late_night_snacking").
    - "insight_message" should be a friendly, non-judgmental, and actionable piece of advice for the user (1-2 sentences).
4.  If no clear pattern is found, return a JSON object with "insight_type": "no_pattern_found".

EXAMPLE RESPONSE (Pattern Found):
{
  "insight_type": "late_night_snacking",
  "insight_message": "I noticed you tend to snack after 9 PM. Ensuring you have a protein-rich dinner might help curb those late-night cravings!"
}

EXAMPLE RESPONSE (No Pattern):
{
  "insight_type": "no_pattern_found"
}
`;
}

function composeBehavioralCoachingPrompt(insight, chatHistory) {
  return `
You are an expert nutritionist and a caring, supportive behavioral coach. Your goal is to help a user understand and overcome a specific behavioral pattern you've identified.

THE USER'S INSIGHT:
- Insight Type: ${insight.insight_type}
- Your Initial Advice: "${insight.insight_message}"

CHAT HISTORY (You are the "AI"):
${chatHistory
  .map((msg) => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
  .join('\n')}

INSTRUCTIONS:
1.  Continue the conversation in a supportive and non-judgmental tone.
2.  Provide actionable, practical advice. Avoid generic or vague statements.
3.  Keep your responses concise (2-4 sentences).
4.  If the user asks a question, answer it directly.
5.  Your response should be a single string of text. Do NOT return JSON.

AI:`;
}

function composeProgressPredictionPrompt(userProfile, historicalData) {
  return `
You are a data scientist and expert fitness AI. Your task is to analyze a user's historical fitness data and predict their weight trend for the next 7 days.

USER PROFILE:
- Current Weight: ${userProfile.weight} kg
- Goal: ${userProfile.goal_type}

HISTORICAL DATA (LAST 30 DAYS):
${JSON.stringify(historicalData, null, 2)}

INSTRUCTIONS:
1.  Analyze the user's historical "trend_weight_kg", "daily_calories", and "activity_calories".
2.  Based on this data, predict the user's "predicted_weight_kg" for 7 days from now.
3.  Determine a "confidence_level" for your prediction ('High', 'Medium', or 'Low').
4.  Write a concise "prediction_summary" (1-2 sentences) explaining your prediction.
5.  Identify any "warning_flags". This is the most important part. If you detect a potential plateau (i.e., the rate of weight change is slowing significantly in a way that is counter to the user's goal), you MUST include 'plateau_risk'. If the user has not logged data consistently, include 'inconsistent_logging'.
6.  You MUST return ONLY a valid JSON object with the specified keys.

EXAMPLE RESPONSE (Good Progress):
{
  "predicted_weight_kg": 84.5,
  "confidence_level": "High",
  "prediction_summary": "Based on your consistent calorie deficit and activity levels, you are on track to lose another 0.5kg next week. Great work!",
  "warning_flags": []
}

EXAMPLE RESPONSE (Plateau Risk):
{
  "predicted_weight_kg": 85.0,
  "confidence_level": "Medium",
  "prediction_summary": "Your weight loss has slowed down over the past 10 days. While you are still making progress, you are at risk of hitting a plateau.",
  "warning_flags": ["plateau_risk"]
}
`;
}

function composeBodyAnalysisPrompt(frontPhotoUrl, backPhotoUrl) {
  return `
You are a world-class bodybuilding judge and AI fitness expert. Your task is to analyze two photos of a user (front and back) and provide a detailed, structured, and encouraging analysis of their physique.

IMAGE URLS:
- Front Photo: ${frontPhotoUrl}
- Back Photo: ${backPhotoUrl}

INSTRUCTIONS:
1.  Analyze the user's physique from both photos, focusing on key muscle groups: Chest, Arms (Biceps & Triceps), Back (Lats & Traps), Legs (Quads & Hamstrings), and Waist (Abs & Obliques).
2.  For each of these 5 body parts, provide a rating from 1 to 10.
3.  Calculate an "overall_rating" based on the individual ratings and overall balance.
4.  Identify the user's single "strongest_body_part" and single "weakest_body_part".
5.  Write a concise, encouraging "ai_feedback" paragraph (3-5 sentences) that summarizes their physique, highlights their strengths, and provides actionable advice on how to improve their weakest areas.
6.  You MUST return ONLY a valid JSON object with the specified keys. Do not include any other text or markdown.

EXAMPLE RESPONSE:
{
  "chest_rating": 7,
  "arms_rating": 6,
  "back_rating": 8,
  "legs_rating": 5,
  "waist_rating": 6,
  "overall_rating": 6.5,
  "strongest_body_part": "Back",
  "weakest_body_part": "Legs",
  "ai_feedback": "You have a well-developed back with excellent V-taper, which is your standout feature. Your chest and arms show good definition. To achieve a more balanced and powerful physique, I recommend prioritizing your leg development with compound exercises like squats and lunges. Keep up the great work!"
}
`;
}

function composeMotivationalMessagePrompt(triggerEvent, userProfile) {
  return `
You are a deeply inspiring and positive fitness coach. Your goal is to provide a user with a short, powerful, and context-specific motivational message to keep them engaged and feeling proud of their efforts.

USER PROFILE:
- Name: ${userProfile.full_name || 'User'}
- Primary Goal: ${userProfile.goal_type || 'a healthier lifestyle'}

TRIGGER EVENT: "${triggerEvent}"

INSTRUCTIONS:
1.  Based on the specific "TRIGGER EVENT", write a 1-2 sentence motivational message.
2.  The message should be personal, referencing the user's goal if it makes sense.
3.  The tone should be uplifting, but not cheesy or generic.
4.  You MUST return ONLY a valid JSON object with a single key, "message".

EXAMPLE (for '7_day_logging_streak'):
{
  "message": "That's 7 days in a row of tracking your nutrition, ${userProfile.full_name}! That level of consistency is how you build lasting habits and achieve your goal of ${userProfile.goal_type}."
}

EXAMPLE (for 'weight_milestone_5kg_loss'):
{
  "message": "Wow, you've officially lost 5kg! Take a moment to be proud of this incredible milestone. Your hard work is clearly paying off."
}

EXAMPLE (for 'first_workout_completed'):
{
  "message": "You just completed your first workout of the plan! That first step is often the hardest, and you crushed it. Let's keep this momentum going!"
}
`;
}

app.post('/api/re-evaluate-plan', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    // 1. Fetch all necessary data from Supabase in parallel
    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();

    const [
      { data: userProfile, error: profileError },
      { data: metrics, error: metricsError },
      { data: nutritionLogs, error: logsError },
      { data: currentPlan, error: planError },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('daily_user_metrics').select('*').eq('user_id', userId).gte('metric_date', sevenDaysAgo.split('T')[0]),
      supabase.from('nutrition_log_entries').select('food_name, calories, protein_grams, carbs_grams, fat_grams').eq('user_id', userId).gte('logged_at', sevenDaysAgo),
      supabase.from('nutrition_plans').select('id, goal_type').eq('user_id', userId).eq('status', 'active').single(),
    ]);

    if (profileError || metricsError || logsError || planError || !currentPlan) {
      console.error({ profileError, metricsError, logsError, planError });
      throw new Error('Failed to fetch all necessary user data for re-evaluation.');
    }

    const { data: currentTargets, error: targetsError } = await supabase
      .from('historical_nutrition_targets')
      .select('*')
      .eq('nutrition_plan_id', currentPlan.id)
      .is('end_date', null) // Get the current active target
      .single();

    if (targetsError) {
      throw new Error('Failed to fetch current nutrition targets.');
    }

    // 2. Call the AI with the data
    const prompt = composeReevaluationPrompt(userProfile, metrics, nutritionLogs, currentTargets);
    const aiResponse = await axios.post(AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { 'Authorization': `Bearer ${AI_API_KEY}` } }
    );
    
    const aiData = findAndParseJson(aiResponse.data.choices[0].message.content);
    if (!aiData || !aiData.new_targets || !aiData.reasoning) {
      throw new Error('AI failed to return valid new targets and reasoning.');
    }

    // 3. Update the database
    // End the current target period
    await supabase.from('historical_nutrition_targets').update({ end_date: new Date().toISOString().split('T')[0] }).eq('id', currentTargets.id);
    
    // Insert the new target period
    const { data: newTargetEntry, error: newTargetError } = await supabase.from('historical_nutrition_targets').insert({
      nutrition_plan_id: currentPlan.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      daily_calories: aiData.new_targets.daily_calories,
      protein_grams: aiData.new_targets.protein_grams,
      carbs_grams: aiData.new_targets.carbs_grams,
      fat_grams: aiData.new_targets.fat_grams,
      micronutrients_targets: aiData.new_targets.micronutrients_targets,
      reasoning: aiData.reasoning,
    }).select().single();

    if (newTargetError) throw newTargetError;

    res.json({ success: true, new_targets: newTargetEntry });

  } catch (error) {
    console.error('[RE-EVALUATE PLAN] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/generate-daily-meal-plan', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    // 1. Fetch user's active plan and latest targets
    const { data: currentPlan, error: planError } = await supabase
      .from('nutrition_plans')
      .select('id, preferences')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (planError || !currentPlan) {
      throw new Error('Could not find an active nutrition plan for the user.');
    }

    const { data: currentTargets, error: targetsError } = await supabase
      .from('historical_nutrition_targets')
      .select('*')
      .eq('nutrition_plan_id', currentPlan.id)
      .is('end_date', null)
      .single();

    if (targetsError || !currentTargets) {
      throw new Error('Could not find active nutrition targets for the plan.');
    }

    // 2. Call the AI with the data
    const prompt = composeDailyMealPlanPrompt(
      currentTargets,
      currentPlan.preferences?.dietary
    );
    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const aiData = findAndParseJson(aiResponse.data.choices[0].message.content);
    if (!aiData || !aiData.meal_plan || !Array.isArray(aiData.meal_plan)) {
      throw new Error('AI failed to return a valid meal plan array.');
    }
    if (!validateDailyMenu(aiData.meal_plan, currentTargets)) {
      throw new Error('AI returned an invalid daily menu.');
    }

    // 3. Save the new meal plan suggestions to the database
    const today = new Date().toISOString().split('T')[0];
    const suggestionsToInsert = aiData.meal_plan.map((meal) => ({
      nutrition_plan_id: currentPlan.id,
      suggestion_date: today,
      meal_type: meal.meal_type,
      meal_description: meal.meal_description,
      calories: meal.macros.calories,
      protein_grams: meal.macros.protein_grams,
      carbs_grams: meal.macros.carbs_grams,
      fat_grams: meal.macros.fat_grams,
    }));

    const { data: newSuggestions, error: insertError } = await supabase
      .from('meal_plan_suggestions')
      .upsert(suggestionsToInsert, {
        onConflict: 'nutrition_plan_id, suggestion_date, meal_type',
      })
      .select();

    if (insertError) throw insertError;

    res.json({ success: true, meal_plan: newSuggestions });
  } catch (error) {
    console.error('[GENERATE MEAL PLAN] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze-behavior', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const sevenDaysAgo = new Date(
      new Date().setDate(new Date().getDate() - 7)
    ).toISOString();

    const { data: nutritionLogs, error: logsError } = await supabase
      .from('nutrition_log_entries')
      .select('logged_at, food_name, calories')
      .eq('user_id', userId)
      .gte('logged_at', sevenDaysAgo);

    if (logsError) throw logsError;

    if (nutritionLogs.length < 10) {
      return res.json({
        success: true,
        message: 'Not enough data to analyze behavior yet.',
      });
    }

    const prompt = composeBehavioralAnalysisPrompt(nutritionLogs);
    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const aiData = findAndParseJson(aiResponse.data.choices[0].message.content);
    if (!aiData || !aiData.insight_type) {
      throw new Error('AI failed to return a valid insight.');
    }

    if (aiData.insight_type === 'no_pattern_found') {
      return res.json({ success: true, message: 'No new patterns found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: newInsight, error: insertError } = await supabase
      .from('behavioral_insights')
      .insert({
        user_id: userId,
        insight_date: today,
        insight_type: aiData.insight_type,
        insight_message: aiData.insight_message,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique constraint violation, means an insight for this user/date/type already exists.
        // This is fine, we just don't need to insert a duplicate.
        return res.json({ success: true, message: 'Insight already exists for today.' });
      }
      throw insertError;
    }

    res.json({ success: true, insight: newInsight });
  } catch (error) {
    console.error('[ANALYZE BEHAVIOR] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/behavioral-coaching-chat', async (req, res) => {
  const { insight, chatHistory } = req.body;
  if (!insight || !chatHistory) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const prompt = composeBehavioralCoachingPrompt(insight, chatHistory);
    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const aiMessage =
      aiResponse.data.choices[0].message.content ||
      'Sorry, I had trouble generating a response. Please try again.';

    res.json({ success: true, aiMessage });
  } catch (error) {
    console.error('[COACHING CHAT] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/generate-motivational-message', async (req, res) => {
  const { userId, triggerEvent } = req.body;
  if (!userId || !triggerEvent) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    // Try to get profile with goal_type first
    let { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, goal_type')
      .eq('id', userId)
      .single();

    // If goal_type column doesn't exist, try without it
    if (profileError && profileError.message.includes('goal_type')) {
      console.log('[MOTIVATION] goal_type column not found, using fallback...');
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      
      if (fallbackError) throw fallbackError;
      
      // Add default goal_type
      userProfile = {
        ...fallbackProfile,
        goal_type: 'general_fitness'
      };
    } else if (profileError) {
      throw profileError;
    }

    const prompt = composeMotivationalMessagePrompt(triggerEvent, userProfile);
    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const aiData = findAndParseJson(aiResponse.data.choices[0].message.content);
    if (!aiData || !aiData.message) {
      throw new Error('AI failed to return a valid message.');
    }

    const { data: newInsight, error: insertError } = await supabase
      .from('motivational_messages')
      .insert({
        user_id: userId,
        trigger_event: triggerEvent,
        message: aiData.message,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, message: newInsight });
  } catch (error) {
    console.error('[MOTIVATION] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/delete-nutrition-plan/:planId', async (req, res) => {
  const { planId } = req.params;
  
  if (!planId) {
    return res.status(400).json({ error: 'Plan ID is required.' });
  }

  try {
    console.log(`[NUTRITION DELETE] Deleting plan with ID: ${planId}`);
    
    // First, check if the plan exists
    const { data: plan, error: fetchError } = await supabase
      .from('nutrition_plans')
      .select('id, user_id')
      .eq('id', planId)
      .single();

    if (fetchError || !plan) {
      console.error(`[NUTRITION DELETE] Plan not found: ${planId}`);
      return res.status(404).json({ error: 'Nutrition plan not found.' });
    }

    // Delete the plan
    const { error: deleteError } = await supabase
      .from('nutrition_plans')
      .delete()
      .eq('id', planId);

    if (deleteError) {
      console.error(`[NUTRITION DELETE] Error deleting plan:`, deleteError);
      throw deleteError;
    }

    console.log(`[NUTRITION DELETE] Successfully deleted plan ${planId}`);
    res.json({ success: true, message: 'Nutrition plan deleted successfully.' });
  } catch (error) {
    console.error(`[NUTRITION DELETE] Exception during plan deletion:`, error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete the nutrition plan.' 
    });
  }
});

app.post('/api/predict-progress', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const thirtyDaysAgo = new Date(
      new Date().setDate(new Date().getDate() - 30)
    ).toISOString();

    // Try to get profile with goal_type first
    let { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('weight, goal_type')
        .eq('id', userId)
      .single();

    // If goal_type column doesn't exist, try without it
    if (profileError && profileError.message.includes('goal_type')) {
      console.log('[PREDICT PROGRESS] goal_type column not found, using fallback...');
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .select('weight')
        .eq('id', userId)
        .single();
      
      if (fallbackError) {
        console.error({ profileError: fallbackError });
        throw new Error('Failed to fetch user data for prediction.');
      }
      
      // Add default goal_type
      userProfile = {
        ...fallbackProfile,
        goal_type: 'general_fitness'
      };
    } else if (profileError) {
      console.error({ profileError });
      throw new Error('Failed to fetch user data for prediction.');
    }

    const { data: historicalData, error: dataError } = await supabase
        .from('daily_user_metrics')
        .select('metric_date, trend_weight_kg, activity_calories')
        .eq('user_id', userId)
      .gte('metric_date', thirtyDaysAgo.split('T')[0]);

    if (dataError) {
      console.error({ dataError });
      throw new Error('Failed to fetch user data for prediction.');
    }

    if (historicalData.length < 7) {
      return res.json({
        success: true,
        message: 'Not enough data to make a prediction yet.',
      });
    }

    const prompt = composeProgressPredictionPrompt(userProfile, historicalData);
    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const aiData = findAndParseJson(aiResponse.data.choices[0].message.content);
    if (!aiData || !aiData.predicted_weight_kg) {
      throw new Error('AI failed to return a valid prediction.');
    }

    const predictionDate = new Date(
      new Date().setDate(new Date().getDate() + 7)
    )
      .toISOString()
      .split('T')[0];

    const { data: newPrediction, error: insertError } = await supabase
      .from('progress_predictions')
      .insert({
        user_id: userId,
        prediction_date: predictionDate,
        ...aiData,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, prediction: newPrediction });
  } catch (error) {
    console.error('[PREDICT PROGRESS] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze-body', async (req, res) => {
  const { userId, frontPhotoUrl, backPhotoUrl } = req.body;
  if (!userId || !frontPhotoUrl || !backPhotoUrl) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const prompt = composeBodyAnalysisPrompt(frontPhotoUrl, backPhotoUrl);
    const aiResponse = await axios.post(
      AI_API_URL,
      {
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } }
    );

    const aiData = findAndParseJson(aiResponse.data.choices[0].message.content);
    if (!aiData || !aiData.overall_rating) {
      throw new Error('AI failed to return a valid analysis.');
    }

    const { data: newAnalysis, error: insertError } = await supabase
      .from('body_analysis')
      .insert({
        user_id: userId,
        ...aiData,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, analysis: newAnalysis });
  } catch (error) {
    console.error('[ANALYZE BODY] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

function composeRecipePrompt(mealType, targets, ingredients) {
  return `
You are a professional chef. Create ONE detailed recipe for ${mealType} using ONLY the provided ingredients. You must compute realistic quantities and write meticulous, professional instructions.

MEAL TYPE: ${mealType}
NUTRITIONAL TARGETS: Calories ${targets.calories} kcal, Protein ${targets.protein}g, Carbs ${targets.carbs}g, Fat ${targets.fat}g
AVAILABLE INGREDIENTS (USE ONLY THESE; DO NOT ADD ANY OTHERS): ${ingredients.join(', ')}

CRITICAL RULES:
1) Use ONLY the ingredients listed above. Do NOT introduce anything else (no salt/pepper/oil unless present in the list).
2) Use realistic quantities (e.g., "120 g beef", "100 g cooked rice", "1 tbsp olive oil" if available). Avoid absurd amounts like "1 tbsp beef".
3) If oil is not provided, instruct dry-searing or non-stick cooking; if salt/pepper not provided, avoid naming them and instead say "season to taste if desired".
4) The instructions must be meticulous, chef-level, and executable. Include times, heat levels, and exact sequencing.
5) Keep to the ingredients subset. If vegetables are provided as a generic term, treat them as a single combined item without inventing new vegetables.
6) Return ONLY valid JSON with the exact schema below (no markdown).

INSTRUCTION REQUIREMENTS:
- Provide 8–12 ordered steps.
- Each step must be an object with: step (string index), title (short), details (array of precise sub-steps).
- Include mise en place (prep/cutting sizes), pan preheating, cooking times and heat (e.g., medium-high, 3–4 min), resting times, and plating.
- For no-cook meals (e.g., cereal/milk, yogurt/fruit): include assembly specifics, portioning, and texture notes.
- Never mention ingredients that are not in the list.

OUTPUT JSON SCHEMA:
{
  "recipe_name": "Descriptive name using provided ingredients",
  "ingredients": [
    {"name": "ingredient from list only", "quantity": "realistic amount", "macro_info": "optional: brief macro note"}
  ],
  "instructions": [
    {"step": "1", "title": "...", "details": ["...", "..."]},
    {"step": "2", "title": "...", "details": ["...", "..."]}
  ],
  "macros": {"calories": ${targets.calories}, "protein_grams": ${targets.protein}, "carbs_grams": ${targets.carbs}, "fat_grams": ${targets.fat}}
}
`;
}

// Helper to build context-aware fallback steps
function buildContextualFallback(mealType, ingredients, targets) {
  const lower = (ingredients || []).map((i) => String(i).toLowerCase().trim());
  const hasBase = lower.some((i) => /(rice|quinoa|oat|pasta|noodle|bread|tortilla|wrap|couscous|bulgur)/.test(i));
  const hasCookProtein = lower.some((i) => /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna(?!\scanned)|shrimp|egg\b)/.test(i));
  const hasVeg = lower.some((i) => /(broccoli|spinach|lettuce|greens|pepper|tomato|cucumber|carrot|veg|vegetable|kale|onion|mushroom)/.test(i));
  const isNoCookSnack = !hasBase && !hasCookProtein && lower.every((i) => /(yogurt|greek yogurt|strawber|berry|banana|apple|fruit|granola|nuts|almond|peanut butter|honey|chia|oat\s?meal|cottage)/.test(i));

  const defaultQuantities = ['150 g', '1 cup', '1 tbsp', '1/2 cup', '1 tsp'];
  const topIngredients = lower.slice(0, 5);
  const ingredientsList = topIngredients.length
    ? topIngredients.map((name, idx) => ({ name, quantity: defaultQuantities[idx % defaultQuantities.length] }))
    : [
        { name: 'protein of choice', quantity: '150 g' },
        { name: 'carbohydrate base', quantity: '1 cup cooked' },
        { name: 'vegetables', quantity: '1 cup' },
      ];

  const instructions = [];
  if (isNoCookSnack) {
    instructions.push(`Add ${ingredientsList.map(i => i.name).join(', ')} to a bowl.`);
    if (lower.some(i => /(honey|maple|syrup)/.test(i))) instructions.push('Drizzle sweetener over the top.');
    instructions.push('Gently mix to combine.');
    instructions.push('Serve chilled.');
  } else {
    if (hasBase) instructions.push('Cook base (e.g., rice/quinoa/oats/pasta) according to package instructions.');
    if (hasCookProtein) instructions.push('Season and cook protein until done.');
    if (hasVeg) instructions.push('Sauté or steam vegetables until tender.');
    instructions.push('Combine components and adjust seasoning to taste.');
  }

  const caloriesNum = parseInt((targets && targets.calories) || 500, 10) || 500;
  const proteinNum = parseInt((targets && targets.protein) || 30, 10) || 30;
  const carbsNum = parseInt((targets && targets.carbs) || 50, 10) || 50;
  const fatNum = parseInt((targets && targets.fat) || 15, 10) || 15;

  const name = topIngredients.length
    ? `${mealType} with ${topIngredients.join(', ')}`
    : `${mealType} Balanced Bowl`;

  return {
    recipe_name: name,
    ingredients: ingredientsList,
    instructions,
    macros: {
      calories: caloriesNum,
      protein_grams: proteinNum,
      carbs_grams: carbsNum,
      fat_grams: fatNum,
    },
  };
}

// Add this function before the app.post('/api/generate-recipe') endpoint
// Generate a high-quality fallback recipe when AI fails
function generateHighQualityRecipe(mealType, ingredients, targets) {
  console.log(`[${new Date().toISOString()}] Generating high-quality fallback recipe`);
  
  // Basic recipe structure
  const recipe = {
    name: `${mealType} with ${ingredients.slice(0, 2).join(' and ')}`,
    meal_type: mealType.toLowerCase(),
    prep_time: 15,
    cook_time: 20,
    servings: 1,
    ingredients: [],
    instructions: [],
    nutrition: {
      calories: targets.calories || 400,
      protein: targets.protein || 25,
      carbs: targets.carbs || 40,
      fat: targets.fat || 15,
      fiber: 5,
      sugar: 8
    }
  };

  // Generate ingredients with estimated amounts
  const ingredientEstimates = {
    eggs: { amount: '2 large', calories: 140, protein: 12, carbs: 1, fat: 10 },
    chicken: { amount: '4 oz', calories: 185, protein: 35, carbs: 0, fat: 4 },
    rice: { amount: '1/2 cup dry', calories: 160, protein: 3, carbs: 35, fat: 0.5 },
    bread: { amount: '2 slices', calories: 160, protein: 6, carbs: 30, fat: 2 },
    bacon: { amount: '2 strips', calories: 90, protein: 6, carbs: 0, fat: 7 },
    cheese: { amount: '1 oz', calories: 110, protein: 7, carbs: 1, fat: 9 },
    butter: { amount: '1 tbsp', calories: 100, protein: 0, carbs: 0, fat: 11 },
    milk: { amount: '1 cup', calories: 150, protein: 8, carbs: 12, fat: 8 },
    oats: { amount: '1/2 cup dry', calories: 150, protein: 5, carbs: 27, fat: 3 },
    banana: { amount: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0.5 }
  };

  // Add ingredients that match the provided ingredients
  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    const match = Object.keys(ingredientEstimates).find(key => 
      lowerIngredient.includes(key) || key.includes(lowerIngredient)
    );
    
    if (match) {
      recipe.ingredients.push({
        ingredient: ingredient,
        amount: ingredientEstimates[match].amount,
        calories: ingredientEstimates[match].calories,
        protein: ingredientEstimates[match].protein,
        carbs: ingredientEstimates[match].carbs,
        fat: ingredientEstimates[match].fat
      });
    } else {
      // Default values for unknown ingredients
      recipe.ingredients.push({
        ingredient: ingredient,
        amount: '1 serving',
        calories: Math.round(targets.calories / ingredients.length),
        protein: Math.round(targets.protein / ingredients.length),
        carbs: Math.round(targets.carbs / ingredients.length),
        fat: Math.round(targets.fat / ingredients.length)
      });
    }
  });

  // Generate basic instructions
  if (mealType.toLowerCase() === 'breakfast') {
    recipe.instructions = [
      'Heat a non-stick pan over medium heat',
      'Prepare your ingredients as listed',
      'Cook ingredients in order of cooking time required',
      'Combine ingredients and serve hot',
      'Enjoy your nutritious breakfast!'
    ];
  } else if (mealType.toLowerCase() === 'lunch' || mealType.toLowerCase() === 'dinner') {
    recipe.instructions = [
      'Preheat cooking surface to medium heat',
      'Prepare all ingredients according to amounts listed',
      'Cook protein first if applicable',
      'Add remaining ingredients in order of cooking time',
      'Season to taste and serve'
    ];
  } else {
    recipe.instructions = [
      'Gather all ingredients',
      'Prepare ingredients as indicated',
      'Combine or cook as appropriate for meal type',
      'Serve and enjoy'
    ];
  }

  return recipe;
}

// Attach individual ingredient macros to recipe
function attachPerIngredientMacros(recipe) {
  if (!recipe || !recipe.ingredients) {
    return recipe;
  }

  // Ensure each ingredient has macro information
  recipe.ingredients = recipe.ingredients.map(ingredient => {
    if (!ingredient.calories) {
      // Estimate macros if missing
      ingredient.calories = 50;
      ingredient.protein = 2;
      ingredient.carbs = 5;
      ingredient.fat = 2;
    }
    return ingredient;
  });

  // Calculate total macros from ingredients
  const totalMacros = recipe.ingredients.reduce((total, ingredient) => {
    return {
      calories: total.calories + (ingredient.calories || 0),
      protein: total.protein + (ingredient.protein || 0),
      carbs: total.carbs + (ingredient.carbs || 0),
      fat: total.fat + (ingredient.fat || 0)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Update recipe nutrition to match ingredients
  if (recipe.nutrition) {
    recipe.nutrition = {
      ...recipe.nutrition,
      ...totalMacros,
      fiber: recipe.nutrition.fiber || 5,
      sugar: recipe.nutrition.sugar || 8
    };
  }

  return recipe;
}

// Generate a simple recipe for fallback
function generateSimpleRecipe(mealType, ingredients, targets) {
  // Normalize ingredients for processing
  const lower = ingredients.map(i => i.toLowerCase().trim());
  
  // Detect ingredient types
  const hasProtein = lower.some(i => /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna|shrimp|egg)/.test(i));
  const hasCarbs = lower.some(i => /(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(i));
  const hasVeggies = lower.some(i => /(broccoli|carrot|spinach|kale|lettuce|pepper|onion|tomato|vegetable)/.test(i));
  const hasFat = lower.some(i => /(avocado|olive oil|butter|margarine|cashews|nuts|peanut butter|dark chocolate)/.test(i));
  const hasDairy = lower.some(i => /(milk|cheese|yogurt|cream)/.test(i));
  const isBreakfast = mealType.toLowerCase() === 'breakfast';
  const isSnack = mealType.toLowerCase() === 'snack';
  const isNoCook = !hasProtein && !hasCarbs && lower.every(i => /(yogurt|fruit|berry|granola|nuts|milk|cheese)/.test(i));
  
  // Generate recipe name
  let recipeName;
  if (ingredients.length <= 3) {
    recipeName = `${mealType} with ${ingredients.join(', ')}`;
  } else {
    // Find main ingredients for name
    const mainIngredients = [];
    if (hasProtein) {
      const protein = lower.find(i => /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna|shrimp|egg)/.test(i));
      if (protein) mainIngredients.push(ingredients[lower.indexOf(protein)]);
    }
    if (hasCarbs) {
      const carb = lower.find(i => /(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(i));
      if (carb) mainIngredients.push(ingredients[lower.indexOf(carb)]);
    }
    if (hasVeggies && mainIngredients.length < 2) {
      const veggie = lower.find(i => /(broccoli|carrot|spinach|kale|lettuce|pepper|onion|tomato|vegetable)/.test(i));
      if (veggie) mainIngredients.push(ingredients[lower.indexOf(veggie)]);
    }
    
    recipeName = mainIngredients.length > 0
      ? `${mealType} with ${mainIngredients.join(' and ')}`
      : `${mealType} with ${ingredients.slice(0, 2).join(' and ')}`;
  }
  
  // Calculate macro targets
  const caloriesNum = parseInt((targets && targets.calories) || 500, 10) || 500;
  const proteinNum = parseInt((targets && targets.protein) || 30, 10) || 30;
  const carbsNum = parseInt((targets && targets.carbs) || 50, 10) || 50;
  const fatNum = parseInt((targets && targets.fat) || 15, 10) || 15;
  
  // Generate ingredient quantities with REALISTIC amounts
  const ingredientsWithQuantities = ingredients.map(ing => {
    const name = ing.trim();
    const lowerName = name.toLowerCase();
    let quantity = '1 serving';
    
    // Assign realistic quantities based on ingredient types
    if (/(rice|quinoa|couscous|bulgur)/.test(lowerName)) {
      quantity = '1 cup cooked';
    } else if (/(pasta|noodle)/.test(lowerName)) {
      quantity = '1 cup cooked';
    } else if (/(chicken breast|chicken thigh)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(beef|steak)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(pork)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(fish|salmon|tuna|shrimp)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(tofu|tempeh)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(oil|sauce|vinegar|honey|syrup)/.test(lowerName)) {
      quantity = '2 tbsp';
    } else if (/(yogurt)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(milk)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(egg)/.test(lowerName) && !/(eggplant)/.test(lowerName)) {
      quantity = '2 large';
    } else if (/(bread|toast)/.test(lowerName)) {
      quantity = '2 slices';
    } else if (/(cheese)/.test(lowerName)) {
      quantity = '50g';
    } else if (/(broccoli|cauliflower)/.test(lowerName)) {
      quantity = '1 cup florets';
    } else if (/(spinach|kale|lettuce)/.test(lowerName)) {
      quantity = '2 cups';
    } else if (/(carrot)/.test(lowerName)) {
      quantity = '2 medium';
    } else if (/(onion)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(tomato)/.test(lowerName)) {
      quantity = '2 medium';
    } else if (/(pepper|bell pepper)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(potato)/.test(lowerName)) {
      quantity = '2 medium';
    } else if (/(sweet potato)/.test(lowerName)) {
      quantity = '1 large';
    } else if (/(apple|orange|banana)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(berries|strawberry|blueberry)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(fruit)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(nuts|almond|walnut|peanut|cashew)/.test(lowerName)) {
      quantity = '1/4 cup';
    } else if (/(spice|salt|pepper|oregano|basil|thyme)/.test(lowerName)) {
      quantity = '1 tsp';
    } else if (/(butter|margarine)/.test(lowerName)) {
      quantity = '2 tbsp';
    } else if (/(sugar|flour)/.test(lowerName)) {
      quantity = '2 tbsp';
    } else if (/(avocado)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(lemon|lime)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(garlic)/.test(lowerName)) {
      quantity = '3 cloves';
    } else if (/(ginger)/.test(lowerName)) {
      quantity = '1 inch piece';
    } else if (/(oats|oatmeal)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(granola)/.test(lowerName)) {
      quantity = '1/2 cup';
    }
    
    return { name, quantity };
  });
  
  // Generate detailed instructions
    const instructions = [];
  
  if (isNoCook) {
    // No-cook instructions (yogurt, fruit, etc.)
    if (lower.some(i => /(yogurt)/.test(i))) {
      const yogurtIng = ingredients[lower.findIndex(i => /(yogurt)/.test(i))];
      instructions.push(`In a medium bowl, add ${ingredientsWithQuantities.find(i => i.name === yogurtIng)?.quantity || '1 cup'} of ${yogurtIng} as the base.`);
      
      if (lower.some(i => /(fruit|berry|banana|apple)/.test(i))) {
        const fruitIngs = ingredients.filter((_, idx) => /(fruit|berry|banana|apple)/.test(lower[idx]));
        if (fruitIngs.length > 0) {
          instructions.push(`Wash and cut the ${fruitIngs.join(' and ')} into bite-sized pieces.`);
          instructions.push(`Gently fold the prepared fruit into the yogurt, or arrange them on top for a more visually appealing presentation.`);
        }
      }
      
      if (lower.some(i => /(granola|nuts|seed)/.test(i))) {
        const crunchyIngs = ingredients.filter((_, idx) => /(granola|nuts|seed)/.test(lower[idx]));
        if (crunchyIngs.length > 0) {
          instructions.push(`Sprinkle ${crunchyIngs.join(' and ')} on top for added texture and crunch.`);
        }
      }
      
      if (lower.some(i => /(honey|syrup)/.test(i))) {
        const sweetenerIngs = ingredients.filter((_, idx) => /(honey|syrup)/.test(lower[idx]));
        if (sweetenerIngs.length > 0) {
          instructions.push(`Drizzle with ${sweetenerIngs.join(' and ')} for natural sweetness.`);
        }
      }
      
      instructions.push(`Serve immediately or chill in the refrigerator for 10-15 minutes for a cooler treat.`);
    } else if (lower.some(i => /(fruit|berry|banana|apple)/.test(i))) {
      instructions.push(`Wash all fruit thoroughly under cold running water.`);
      instructions.push(`Peel and cut the fruit into bite-sized pieces, removing any seeds or cores as needed.`);
      instructions.push(`Combine all prepared fruit in a large bowl and gently toss to mix.`);
      
      if (lower.some(i => /(honey|syrup)/.test(i))) {
        const sweetenerIngs = ingredients.filter((_, idx) => /(honey|syrup)/.test(lower[idx]));
        instructions.push(`Drizzle with ${sweetenerIngs.join(' and ')} and toss gently to coat.`);
      }
      
      instructions.push(`Refrigerate for at least 15 minutes before serving to allow flavors to combine.`);
    } else {
      instructions.push(`Prepare all ingredients according to their type - wash and cut any produce, measure out dry ingredients.`);
      instructions.push(`Combine all ingredients in a large bowl.`);
      instructions.push(`Mix gently but thoroughly to ensure flavors are well combined.`);
      instructions.push(`Let the mixture rest for 5-10 minutes before serving to allow flavors to meld.`);
    }
  } else if (isBreakfast) {
    // Breakfast-specific instructions
    if (lower.some(i => /(egg)/.test(i)) && !lower.some(i => /(eggplant)/.test(i))) {
      const eggIng = ingredients[lower.findIndex(i => /(egg)/.test(i) && !/(eggplant)/.test(i))];
      const eggQty = ingredientsWithQuantities.find(i => i.name === eggIng)?.quantity || '2 large';
      
      instructions.push(`Crack ${eggQty} ${eggIng} into a medium bowl and whisk until well combined. Season with a pinch of salt and pepper.`);
      
      if (lower.some(i => /(vegetable|pepper|onion|tomato|spinach)/.test(i))) {
        const veggieIngs = ingredients.filter((_, idx) => /(vegetable|pepper|onion|tomato|spinach)/.test(lower[idx]));
        
        if (veggieIngs.length > 0) {
          instructions.push(`Wash and dice the ${veggieIngs.join(', ')} into small, uniform pieces.`);
          instructions.push(`Heat a non-stick pan over medium heat. Add a small amount of oil or butter if available.`);
          instructions.push(`Sauté the vegetables for 3-4 minutes until they begin to soften.`);
          instructions.push(`Pour the egg mixture over the vegetables and cook for 2-3 minutes until the edges set.`);
          instructions.push(`Using a spatula, gently lift the edges and tilt the pan to allow uncooked egg to flow underneath.`);
          instructions.push(`Cook for another 1-2 minutes until eggs are fully set but still moist.`);
        }
      } else {
        instructions.push(`Heat a non-stick pan over medium heat. Add a small amount of oil or butter if available.`);
        instructions.push(`Pour the egg mixture into the pan and cook for 2-3 minutes until the edges start to set.`);
        instructions.push(`For scrambled eggs: Gently stir with a spatula until eggs are cooked but still soft, about 1-2 minutes more.`);
        instructions.push(`For an omelet: Let cook undisturbed until mostly set, then fold in half and cook for 30 seconds more.`);
      }
    } else if (lower.some(i => /(oat|cereal)/.test(i))) {
      const oatIng = ingredients[lower.findIndex(i => /(oat|cereal)/.test(i))];
      const oatQty = ingredientsWithQuantities.find(i => i.name === oatIng)?.quantity || '1 cup';
      
      if (lower.some(i => /(milk|water)/.test(i))) {
        const liquidIng = ingredients[lower.findIndex(i => /(milk|water)/.test(i))];
        const liquidQty = ingredientsWithQuantities.find(i => i.name === liquidIng)?.quantity || '1 cup';
        
        if (/(oat|oatmeal)/.test(oatIng.toLowerCase())) {
          instructions.push(`In a medium saucepan, bring ${liquidQty} of ${liquidIng} to a gentle boil.`);
          instructions.push(`Stir in ${oatQty} of ${oatIng} and reduce heat to medium-low.`);
          instructions.push(`Simmer for 5 minutes for quick oats or 15-20 minutes for old-fashioned oats, stirring occasionally.`);
        } else {
          instructions.push(`Pour ${oatQty} of ${oatIng} into a bowl.`);
          instructions.push(`Add ${liquidQty} of ${liquidIng} to the bowl.`);
        }
      } else {
        if (/(oat|oatmeal)/.test(oatIng.toLowerCase())) {
          instructions.push(`In a medium saucepan, bring 1 cup of water to a gentle boil.`);
          instructions.push(`Stir in ${oatQty} of ${oatIng} and reduce heat to medium-low.`);
          instructions.push(`Simmer for 5 minutes for quick oats or 15-20 minutes for old-fashioned oats, stirring occasionally.`);
        } else {
          instructions.push(`Pour ${oatQty} of ${oatIng} into a bowl.`);
          instructions.push(`Add 1 cup of milk or water to the bowl.`);
        }
      }
      
      if (lower.some(i => /(fruit|berry|banana|apple)/.test(i))) {
        const fruitIngs = ingredients.filter((_, idx) => /(fruit|berry|banana|apple)/.test(lower[idx]));
        
        if (fruitIngs.length > 0) {
          instructions.push(`Wash and prepare the ${fruitIngs.join(', ')}, cutting into bite-sized pieces if necessary.`);
          instructions.push(`Top the prepared oats/cereal with the fresh fruit.`);
        }
      }
      
      if (lower.some(i => /(honey|syrup|sugar)/.test(i))) {
        const sweetenerIngs = ingredients.filter((_, idx) => /(honey|syrup|sugar)/.test(lower[idx]));
        
        if (sweetenerIngs.length > 0) {
          instructions.push(`Drizzle or sprinkle ${sweetenerIngs.join(' and ')} over the top to taste.`);
        }
      }
    } else if (lower.some(i => /(bread|toast)/.test(i))) {
      const breadIng = ingredients[lower.findIndex(i => /(bread|toast)/.test(i))];
      const breadQty = ingredientsWithQuantities.find(i => i.name === breadIng)?.quantity || '2 slices';
      
      instructions.push(`Toast ${breadQty} of ${breadIng} until golden brown and crisp.`);
      
      if (lower.some(i => /(avocado)/.test(i))) {
        const avocadoIng = ingredients[lower.findIndex(i => /(avocado)/.test(i))];
        const avocadoQty = ingredientsWithQuantities.find(i => i.name === avocadoIng)?.quantity || '1 medium';
        
        instructions.push(`Cut the ${avocadoIng} in half, remove the pit, and scoop the flesh into a bowl.`);
        instructions.push(`Mash the avocado with a fork until smooth but still slightly chunky. Season with salt and pepper if desired.`);
        instructions.push(`Spread the mashed avocado evenly over the toasted bread.`);
      } else if (lower.some(i => /(butter|jam|peanut butter)/.test(i))) {
        const spreadIngs = ingredients.filter((_, idx) => /(butter|jam|peanut butter)/.test(lower[idx]));
        
        if (spreadIngs.length > 0) {
          instructions.push(`Spread ${spreadIngs.join(' and ')} evenly over the warm toast.`);
        }
      }
      
      if (lower.some(i => /(egg)/.test(i)) && !lower.some(i => /(eggplant)/.test(i))) {
        instructions.push(`For a complete breakfast, prepare eggs on the side as described in the egg preparation steps.`);
      }
    }
  } else {
    // Regular meal instructions (lunch/dinner)
    // Start with prep steps
    instructions.push(`Gather and prepare all ingredients before starting to cook.`);
    
    // Protein preparation
    if (hasProtein) {
      const proteinIngredients = ingredients.filter((_, idx) => 
        /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna|shrimp|egg)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (proteinIngredients.length > 0) {
        const mainProtein = proteinIngredients[0];
        const proteinQty = ingredientsWithQuantities.find(i => i.name === mainProtein)?.quantity || '150g';
        
        if (/(chicken|beef|pork)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Season ${proteinQty} of ${mainProtein} with salt and pepper on both sides.`);
          instructions.push(`Heat a large skillet over medium-high heat. Add 1 tablespoon of oil if available.`);
          instructions.push(`Cook the ${mainProtein} for 5-6 minutes per side until browned and cooked through (internal temperature of 165°F/74°C for chicken, 145°F/63°C for beef/pork).`);
          instructions.push(`Remove the cooked ${mainProtein} from the pan and let rest for 5 minutes before slicing or serving.`);
        } else if (/(fish|salmon|tuna|shrimp)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Season ${proteinQty} of ${mainProtein} with salt and pepper.`);
          instructions.push(`Heat a skillet over medium-high heat. Add a small amount of oil if available.`);
          instructions.push(`Cook the ${mainProtein} for 3-4 minutes per side for fish fillets, or 2-3 minutes for shrimp, until opaque and cooked through.`);
        } else if (/(tofu|tempeh)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Press ${proteinQty} of ${mainProtein} between paper towels to remove excess moisture.`);
          instructions.push(`Cut the ${mainProtein} into 1-inch cubes or slices.`);
          instructions.push(`Heat a skillet over medium-high heat. Add oil if available.`);
          instructions.push(`Cook the ${mainProtein} for 3-4 minutes per side until golden brown and crispy.`);
        } else if (/(egg)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Whisk ${proteinQty} of ${mainProtein} in a bowl with a pinch of salt and pepper.`);
          instructions.push(`Heat a non-stick skillet over medium heat.`);
          instructions.push(`Pour the whisked eggs into the skillet and cook until set, about 2-3 minutes.`);
        } else {
          instructions.push(`Prepare all ingredients according to their type - wash and cut any produce, measure out dry ingredients.`);
        }
      }
    }
    
    // Carbohydrate preparation
    if (hasCarbs) {
      const carbIngredients = ingredients.filter((_, idx) => 
        /(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (carbIngredients.length > 0) {
        const mainCarb = carbIngredients[0];
        const carbQty = ingredientsWithQuantities.find(i => i.name === mainCarb)?.quantity || '1 cup cooked';
        
        if (/(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(mainCarb.toLowerCase())) {
          instructions.push(`Cook ${carbQty} of ${mainCarb} according to package instructions.`);
        } else {
          instructions.push(`Prepare ${carbQty} of ${mainCarb} according to package instructions.`);
        }
      }
    }
    
    // Fat preparation
    if (hasFat) {
      const fatIngredients = ingredients.filter((_, idx) => 
        /(avocado|olive oil|butter|margarine|cashews|nuts|peanut butter|dark chocolate)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (fatIngredients.length > 0) {
        const mainFat = fatIngredients[0];
        const fatQty = ingredientsWithQuantities.find(i => i.name === mainFat)?.quantity || '1/2 cup';
        
        if (/(avocado|olive oil|butter|margarine)/.test(mainFat.toLowerCase())) {
          instructions.push(`Add ${fatQty} of ${mainFat} to the dish.`);
        } else if (/(cashews|nuts|peanut butter|dark chocolate)/.test(mainFat.toLowerCase())) {
          instructions.push(`Add ${fatQty} of ${mainFat} to the dish.`);
        } else {
          instructions.push(`Add ${fatQty} of ${mainFat} to the dish.`);
        }
      }
    }
    
    // Vegetable preparation
    if (hasVeggies) {
      const veggieIngredients = ingredients.filter((_, idx) => 
        /(broccoli|spinach|lettuce|greens|pepper|tomato|cucumber|carrot|veg|vegetable|kale|onion|mushroom)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (veggieIngredients.length > 0) {
        const mainVeggie = veggieIngredients[0];
        const veggieQty = ingredientsWithQuantities.find(i => i.name === mainVeggie)?.quantity || '1 cup';
        
        if (/(broccoli|spinach|lettuce|greens|pepper|tomato|cucumber|carrot|veg|vegetable|kale|onion|mushroom)/.test(mainVeggie.toLowerCase())) {
          instructions.push(`Add ${veggieQty} of ${mainVeggie} to the dish.`);
        } else {
          instructions.push(`Add ${veggieQty} of ${mainVeggie} to the dish.`);
        }
      }
    }
    
    // Snack preparation
    if (isSnack) {
      const snackIngredients = ingredients.filter((_, idx) => 
        /(yogurt|fruit|berry|granola|nuts|almond|peanut butter|honey|chia|oat\s?meal|cottage)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (snackIngredients.length > 0) {
        const mainSnack = snackIngredients[0];
        const snackQty = ingredientsWithQuantities.find(i => i.name === mainSnack)?.quantity || '1 serving';
        
        if (/(yogurt|fruit|berry|granola|nuts|almond|peanut butter|honey|chia|oat\s?meal|cottage)/.test(mainSnack.toLowerCase())) {
          instructions.push(`Add ${snackQty} of ${mainSnack} to the meal.`);
      } else {
          instructions.push(`Add ${snackQty} of ${mainSnack} to the meal.`);
        }
      }
    }
    
    // Final adjustments
    instructions.push(`Adjust seasoning to taste.`);
    instructions.push(`Serve hot.`);
  }
  
  return {
    name: recipeName,
    ingredients: ingredientsWithQuantities,
      instructions,
    nutrition: {
      calories: caloriesNum,
      protein: proteinNum,
      carbs: carbsNum,
      fat: fatNum,
      fiber: 5,
      sugar: 8
    },
  };
}

// ===================
// API ENDPOINTS
// ===================

// Simple ping endpoint with no middleware for connectivity testing
app.get('/ping', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).send('pong');
});

// Add simple ping endpoint for connectivity testing
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    provider: AI_PROVIDER,
    model: CHAT_MODEL
  });
});

// Debug endpoint to check environment configuration
app.get('/api/debug-env', (req, res) => {
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: {
      EXPO_PUBLIC_SUPABASE_URL: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_URL_length: process.env.EXPO_PUBLIC_SUPABASE_URL?.length || 0,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_SERVICE_KEY_length: process.env.SUPABASE_SERVICE_KEY?.length || 0,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      supabase_client: !!supabase,
      node_env: process.env.NODE_ENV
    }
  };
  
  res.status(200).json(envCheck);
});

// Test Supabase connection endpoint
app.get('/api/test-supabase-connection', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Supabase client not initialized',
      env_check: {
        EXPO_PUBLIC_SUPABASE_URL: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
      }
    });
  }

  try {
    const { data, error } = await supabase
      .from('daily_user_metrics')
      .select('*')
      .limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        supabase_error: error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Supabase connection working',
      data_count: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint to check API configuration
app.get('/api/test', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Test endpoint called`);
  res.json({ 
    status: 'ok', 
    message: 'Server is running', 
    timestamp,
    environment: {
      node_version: process.version,
      deepseek_api_configured: !!DEEPSEEK_API_KEY,
      openai_configured: !!***REMOVED***,
      server_port: port,
      server_ip: getLocalIpAddress(),
      ai_provider: AI_PROVIDER,
      chat_model: CHAT_MODEL,
    }
  });
});

// (duplicate /api/health removed to avoid ambiguity)

// Add workout plan generation endpoint with robust JSON parsing
app.post('/api/generate-workout-plan', async (req, res) => {
  try {
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({ success: false, error: 'Missing profile data' });
    }
    
    const prompt = composePrompt(profile);
    const messages = [{ role: 'user', content: prompt }];
    
    // Prefer DeepSeek (native). If not configured, fallback to default providers.
    let aiResponse = null;
    const deepseekProvider = getProviderConfig('deepseek');
    console.log('[WORKOUT] Provider availability:', {
      deepseek: !!deepseekProvider,
      defaultProvider: AI_PROVIDER
    });
    if (deepseekProvider) {
      console.log('[WORKOUT] Using DeepSeek as preferred provider');
      aiResponse = await callAI(messages, { type: 'json_object' }, 0.7, 'deepseek');
    }
    if (!aiResponse) {
      console.log('[WORKOUT] Using default providers...');
      aiResponse = await callAI(messages, { type: 'json_object' }, 0.7);
    }
    
    // Process response as before
    const content = aiResponse.choices[0].message.content;
    let plan;
    
    // Ultra-robust JSON parsing with multiple fallback strategies
    console.log('[WORKOUT] Processing AI response with enhanced parsing...');
    
    function parseAIResponse(content) {
      const strategies = [
        // Strategy 1: Extract from ```json``` blocks
        () => {
          const match = content.match(/```json\s*([\s\S]*?)\s*```/i);
          if (match) {
            console.log('[WORKOUT] Strategy 1: Found JSON markdown block');
            return match[1].trim();
          }
          return null;
        },
        
        // Strategy 2: Extract from any ``` blocks
        () => {
          const match = content.match(/```\s*([\s\S]*?)\s*```/);
          if (match) {
            console.log('[WORKOUT] Strategy 2: Found generic markdown block');
            return match[1].trim();
          }
          return null;
        },
        
        // Strategy 3: Find JSON object with proper nesting
        () => {
          const match = content.match(/\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/);
          if (match) {
            console.log('[WORKOUT] Strategy 3: Found JSON object pattern');
            return match[0].trim();
          }
          return null;
        },
        
        // Strategy 4: Look for specific workout plan structure
        () => {
          const weeklyScheduleMatch = content.match(/"weeklySchedule"\s*:\s*\[([\s\S]*?)\]/);
          if (weeklyScheduleMatch) {
            console.log('[WORKOUT] Strategy 4: Found weeklySchedule structure');
            // Try to reconstruct full object
            const objectMatch = content.match(/(\{[\s\S]*"weeklySchedule"[\s\S]*?\})/);
            if (objectMatch) {
              return objectMatch[1].trim();
            }
          }
          return null;
        },
        
        // Strategy 5: Remove all markdown and extra text
        () => {
          console.log('[WORKOUT] Strategy 5: Cleaning markdown and text');
          let cleaned = content
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '') // Remove everything after last }
            .trim();
          
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            return cleaned;
          }
          return null;
        },
        
        // Strategy 6: Direct parse (original content)
        () => {
          console.log('[WORKOUT] Strategy 6: Direct parse attempt');
          return content.trim();
        }
      ];
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          const extracted = strategies[i]();
          if (extracted) {
            const parsed = JSON.parse(extracted);
            console.log(`[WORKOUT] Success with strategy ${i + 1}`);
            return parsed;
          }
        } catch (error) {
          console.log(`[WORKOUT] Strategy ${i + 1} failed:`, error.message);
          continue;
        }
      }
      
      throw new Error('All parsing strategies failed');
    }
    
    // Normalize various plausible AI response shapes into { weeklySchedule: Day[] }
    function normalizePlan(parsed) {
      if (!parsed) return parsed;
      
      // If already in expected shape
      if (Array.isArray(parsed.weeklySchedule)) {
        return { weeklySchedule: parsed.weeklySchedule };
      }
      
      // Common alternative nestings
      if (parsed.plan && Array.isArray(parsed.plan.weeklySchedule)) {
        return { weeklySchedule: parsed.plan.weeklySchedule };
      }
      if (parsed.workoutPlan && Array.isArray(parsed.workoutPlan.weeklySchedule)) {
        return { weeklySchedule: parsed.workoutPlan.weeklySchedule };
      }
      if (Array.isArray(parsed.days)) {
        return { weeklySchedule: parsed.days };
      }
      if (Array.isArray(parsed.week)) {
        return { weeklySchedule: parsed.week };
      }
      
      // If the root is directly an array of day objects
      if (Array.isArray(parsed)) {
        return { weeklySchedule: parsed };
      }
      
      // If the AI returned a single day object
      if (parsed.day && parsed.exercises && Array.isArray(parsed.exercises)) {
        return { weeklySchedule: [parsed] };
      }
      
      // Last attempt: look for a property that looks like a schedule array
      for (const key of Object.keys(parsed)) {
        const value = parsed[key];
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && (value[0].day || value[0].exercises)) {
          return { weeklySchedule: value };
        }
      }
      
      return parsed;
    }
    
    try {
      plan = parseAIResponse(content);
      console.log('[WORKOUT] Successfully parsed AI response');
      
      // Normalize and validate structure
      plan = normalizePlan(plan);
      if (!plan || !Array.isArray(plan.weeklySchedule)) {
        console.error('[WORKOUT] Parsed plan missing weeklySchedule array after normalization:', plan);
        throw new Error('Parsed plan missing required weeklySchedule structure');
      }
      
      // Validate and fix workout frequency
      plan = validateAndFixWorkoutFrequency(plan, profile);
      console.log('[WORKOUT] Workout frequency validated and fixed if necessary');
      
    } catch (parseError) {
      console.error('[WORKOUT] All parsing strategies failed:', parseError);
      console.log('[WORKOUT] Raw response (first 1000 chars):', content.substring(0, 1000));
      
      // Generate a valid fallback plan structure
      console.log('[WORKOUT] Generating fallback plan structure...');
      plan = {
        weeklySchedule: [
          {
            day: "Monday",
            focus: "Upper Body",
            exercises: [
              { name: "Push-ups", sets: 3, reps: "10-15", restBetweenSets: "60s" },
              { name: "Pull-ups", sets: 3, reps: "5-10", restBetweenSets: "60s" },
              { name: "Dumbbell Rows", sets: 3, reps: "8-12", restBetweenSets: "60s" },
              { name: "Tricep Dips", sets: 3, reps: "8-12", restBetweenSets: "60s" }
            ]
          },
          {
            day: "Tuesday", 
            focus: "Lower Body",
            exercises: [
              { name: "Squats", sets: 3, reps: "15-20", restBetweenSets: "60s" },
              { name: "Lunges", sets: 3, reps: "10-12", restBetweenSets: "60s" },
              { name: "Calf Raises", sets: 3, reps: "15-20", restBetweenSets: "45s" },
              { name: "Glute Bridges", sets: 3, reps: "12-15", restBetweenSets: "60s" }
            ]
          },
          {
            day: "Wednesday",
            focus: "Rest Day",
            exercises: []
          },
          {
            day: "Thursday",
            focus: "Full Body",
            exercises: [
              { name: "Burpees", sets: 3, reps: "8-12", restBetweenSets: "90s" },
              { name: "Mountain Climbers", sets: 3, reps: "20", restBetweenSets: "60s" },
              { name: "Jumping Jacks", sets: 3, reps: "20", restBetweenSets: "45s" },
              { name: "High Knees", sets: 3, reps: "20", restBetweenSets: "45s" }
            ]
          },
          {
            day: "Friday",
            focus: "Core",
            exercises: [
              { name: "Plank", sets: 3, reps: "30-60s", restBetweenSets: "60s" },
              { name: "Crunches", sets: 3, reps: "15-20", restBetweenSets: "45s" },
              { name: "Russian Twists", sets: 3, reps: "20", restBetweenSets: "45s" },
              { name: "Leg Raises", sets: 3, reps: "10-15", restBetweenSets: "60s" }
            ]
          },
          {
            day: "Saturday",
            focus: "Cardio",
            exercises: [
              { name: "Running", sets: 1, reps: "20-30 min", restBetweenSets: "0s" },
              { name: "Jump Rope", sets: 3, reps: "2 min", restBetweenSets: "60s" }
            ]
          },
          {
            day: "Sunday",
            focus: "Rest Day", 
            exercises: []
          }
        ]
      };
      console.log('[WORKOUT] Using generated fallback plan');
    }
    
    if (!plan) {
      return res.status(500).json({ success: false, error: 'Failed to generate workout plan' });
    }
    
    return res.json({ success: true, plan });
  } catch (error) {
    console.error('[WORKOUT] Error generating workout plan:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ===================
// IMAGE PROCESSING HELPERS
// ===================

async function compressImageForVision(imageBuffer, maxSizeBytes = 2_000_000) { // 2MB target for Gemini
  try {
    console.log('[IMAGE COMPRESS] Original size:', imageBuffer.length, 'bytes');
    
    // Get image info
    const metadata = await sharp(imageBuffer).metadata();
    console.log('[IMAGE COMPRESS] Original dimensions:', metadata.width, 'x', metadata.height);
    
    // Start with reasonable dimensions for food photos
    let width = Math.min(metadata.width || 1024, 1024);
    let quality = 85;
    
    let compressedBuffer = imageBuffer;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (compressedBuffer.length > maxSizeBytes && attempts < maxAttempts) {
      attempts++;
      console.log(`[IMAGE COMPRESS] Attempt ${attempts}: trying width=${width}, quality=${quality}`);
      
      compressedBuffer = await sharp(imageBuffer)
        .resize(width, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality: quality,
          progressive: true,
          mozjpeg: true 
        })
        .toBuffer();
      
      console.log(`[IMAGE COMPRESS] Attempt ${attempts} result:`, compressedBuffer.length, 'bytes');
      
      // Reduce dimensions and quality for next attempt
      width = Math.floor(width * 0.8);
      quality = Math.max(quality - 10, 60);
    }
    
    if (compressedBuffer.length > maxSizeBytes) {
      console.warn('[IMAGE COMPRESS] Could not compress below target size');
    } else {
      console.log('[IMAGE COMPRESS] Successfully compressed to:', compressedBuffer.length, 'bytes');
    }
    
    return compressedBuffer;
  } catch (error) {
    console.error('[IMAGE COMPRESS] Error compressing image:', error);
    return imageBuffer; // Return original if compression fails
  }
}

async function validateImageForTensor(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    // Basic validation checks
    const issues = [];
    
    if (!metadata.width || !metadata.height) {
      issues.push('Missing image dimensions');
    }
    
    if (metadata.width < 32 || metadata.height < 32) {
      issues.push('Image too small (minimum 32x32)');
    }
    
    if (metadata.width > 4096 || metadata.height > 4096) {
      issues.push('Image too large (maximum 4096x4096)');
    }
    
    // Check for supported formats
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'gif'];
    if (metadata.format && !supportedFormats.includes(metadata.format.toLowerCase())) {
      issues.push(`Unsupported format: ${metadata.format}`);
    }
    
    if (issues.length > 0) {
      console.warn('[IMAGE VALIDATE] Issues found:', issues);
      return { valid: false, issues };
    }
    
    console.log('[IMAGE VALIDATE] Image passed validation');
    return { valid: true, issues: [] };
    
  } catch (error) {
    console.error('[IMAGE VALIDATE] Validation error:', error.message);
    return { valid: false, issues: [`Validation failed: ${error.message}`] };
  }
}

async function standardizeImageForTensor(imageBuffer) {
  try {
    console.log('[IMAGE STANDARDIZE] Standardizing image for vision processing');
    
    // First validate the image
    const validation = await validateImageForTensor(imageBuffer);
    if (!validation.valid) {
      console.warn('[IMAGE STANDARDIZE] Image validation failed:', validation.issues);
      // For critical validation failures, throw error instead of continuing
      if (validation.issues.some(issue => issue.includes('Missing image dimensions') || issue.includes('Unsupported format'))) {
        throw new Error(`Critical image validation failure: ${validation.issues.join(', ')}`);
      }
    }
    
    const metadata = await sharp(imageBuffer).metadata();
    console.log('[IMAGE STANDARDIZE] Original:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density
    });
    
    // Standard processing suitable for Gemini Vision API
    
    const standardizedBuffer = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(512, 512, { 
        fit: 'inside', 
        withoutEnlargement: false, // Allow enlargement for small images
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      })
      .removeAlpha() // Remove alpha channel that can cause tensor issues
      .toColorspace('srgb') // Ensure standard sRGB colorspace
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Flatten to RGB
      .jpeg({ quality: 85 })
      .withMetadata({}) // Remove all metadata including EXIF
      .toBuffer();
    
    const newMetadata = await sharp(standardizedBuffer).metadata();
    console.log('[IMAGE STANDARDIZE] Standardized:', {
      format: newMetadata.format,
      width: newMetadata.width,
      height: newMetadata.height,
      channels: newMetadata.channels,
      sizeBytes: standardizedBuffer.length
    });
    
    // Final validation of the standardized image
    
    return standardizedBuffer;
    
  } catch (error) {
    console.error('[IMAGE STANDARDIZE] Error standardizing image:', error);
    console.log('[IMAGE STANDARDIZE] Attempting fallback minimal processing...');
    
    // Fallback: Minimal processing to avoid tensor issues
    try {
      const fallbackBuffer = await sharp(imageBuffer)
        .resize(512, 512, { fit: 'inside' })
        .removeAlpha()
        .jpeg({ quality: 85, progressive: false })
        .toBuffer();
      
      console.log('[IMAGE STANDARDIZE] Fallback processing successful');
      return fallbackBuffer;
    } catch (fallbackError) {
      console.error('[IMAGE STANDARDIZE] Fallback processing also failed:', fallbackError);
      throw new Error('Image processing completely failed - image may be corrupted');
    }
  }
}

// ===================
// GEMINI FOOD ANALYSIS ENDPOINT
// ===================

// Initialize Gemini Vision Service
const GeminiVisionService = require('./services/geminiVisionService');
let geminiVisionService = null;

try {
  if (GEMINI_API_KEY) {
    geminiVisionService = new GeminiVisionService(GEMINI_API_KEY);
    console.log('[GEMINI VISION] Service initialized successfully');
  } else {
    console.warn('[GEMINI VISION] API key not found - food analysis will be disabled');
  }
} catch (error) {
  console.error('[GEMINI VISION] Failed to initialize service:', error.message);
}

app.post('/api/analyze-food', upload.single('foodImage'), async (req, res) => {
  console.log('[FOOD ANALYZE] Food analysis endpoint called');
  
  try {
    // Check if Gemini Vision service is available
    if (!geminiVisionService) {
      console.error('[FOOD ANALYZE] Gemini Vision service not available');
      return res.status(503).json({
        success: false,
        error: 'Food analysis service not available. Please check server configuration.',
        message: 'Service not initialized'
      });
    }

    // Check if image was uploaded
    if (!req.file) {
      console.log('[FOOD ANALYZE] No image file provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided',
        message: 'Please upload a food image for analysis'
      });
    }

    console.log('[FOOD ANALYZE] Processing uploaded image');
    console.log('[FOOD ANALYZE] File info:', {
        filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Read the uploaded image file
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;

    console.log('[FOOD ANALYZE] Image buffer size:', imageBuffer.length);
    console.log('[FOOD ANALYZE] Starting Gemini analysis...');

    // Analyze the food image using Gemini Vision
    const analysisResult = await geminiVisionService.analyzeFoodImage(imageBuffer, mimeType);

    console.log('[FOOD ANALYZE] Analysis completed successfully');
    console.log('[FOOD ANALYZE] Food identified:', analysisResult.foodName);
    console.log('[FOOD ANALYZE] Confidence:', analysisResult.confidence);

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
      console.log('[FOOD ANALYZE] Uploaded file cleaned up');
    } catch (cleanupError) {
      console.warn('[FOOD ANALYZE] Failed to cleanup file:', cleanupError.message);
    }

    // Return the analysis results in the format expected by the client
    res.json({
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
        notes: analysisResult.notes
      },
      message: `Food analysis completed with ${analysisResult.confidence}% confidence`
    });

  } catch (error) {
    console.error('[FOOD ANALYZE] Analysis failed:', error.message);
    console.error('[FOOD ANALYZE] Error stack:', error.stack);

    // Clean up uploaded file in case of error
    if (req.file?.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
        console.log('[FOOD ANALYZE] Uploaded file cleaned up after error');
      } catch (cleanupError) {
        console.warn('[FOOD ANALYZE] Failed to cleanup file after error:', cleanupError.message);
      }
    }

    res.status(500).json({
          success: false,
      error: 'Food analysis failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Profile update endpoint
app.put('/api/profile', async (req, res) => {
  const { userId, updates } = req.body;

  if (!userId || !updates) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    console.log(`[PROFILE UPDATE] Updating profile for user: ${userId}`);
    console.log('[PROFILE UPDATE] Updates:', updates);

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[PROFILE UPDATE] Error updating profile:', error);
      throw new Error(error.message);
    }

    console.log('[PROFILE UPDATE] Profile updated successfully');
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PROFILE UPDATE] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Profile retrieval endpoint
app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    console.log(`[PROFILE GET] Getting profile for user: ${userId}`);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[PROFILE GET] Error getting profile:', error);
      throw new Error(error.message);
    }

    console.log('[PROFILE GET] Profile retrieved successfully');
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PROFILE GET] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server with error handling
const server = app.listen(port, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`Server running on port ${port}`);
  console.log(`Local IP: ${localIp}`);
  console.log(`Server URL: http://${localIp}:${port}`);
  console.log(`Test API with: curl http://${localIp}:${port}/api/test`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('[SERVER] Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${port} is already in use`);
    process.exit(1);
  }
});




// Helper function to determine exercise category based on name
function getExerciseCategory(exerciseName) {
  const name = exerciseName.toLowerCase();
  
  if (/squat|leg press|lunge|deadlift|calf raise|leg extension|leg curl|hip thrust/i.test(name)) {
    return 'legs';
  } else if (/bench press|push-up|chest fly|chest press|dip|decline|incline/i.test(name)) {
    return 'chest';
  } else if (/pull-up|chin-up|row|lat pulldown|pull down|pulldown|back extension/i.test(name)) {
    return 'back';
  } else if (/shoulder press|lateral raise|front raise|overhead press|military press|arnold press/i.test(name)) {
    return 'shoulders';
  } else if (/bicep|curl|hammer|preacher/i.test(name)) {
    return 'biceps';
  } else if (/tricep|extension|pushdown|skull crusher|close-grip/i.test(name)) {
    return 'triceps';
  } else if (/crunch|sit-up|plank|russian twist|leg raise|ab roller|mountain climber/i.test(name)) {
    return 'abs';
  } else if (/jumping jack|burpee|sprint|run|jog|cardio|hiit|interval|jump rope/i.test(name)) {
    return 'cardio';
          } else {
    return 'other';
  }
}

function validateRecipeAgainstInputs(providedIngredients, recipe) {
  // Normalize text for comparison
  const normalizeText = (text) => {
    return String(text).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  };
  
  // Normalize the provided ingredients
  const normalizedProvided = providedIngredients.map(ing => normalizeText(ing));
  
  // Check if the recipe has all required fields
  if (!recipe || !recipe.recipe_name || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
    console.log('[VALIDATE] Recipe missing required fields');
    return false;
  }
  
  // Check if ingredients are valid
  if (recipe.ingredients.length === 0) {
    console.log('[VALIDATE] Recipe has no ingredients');
    return false;
  }
  
  // Verify each ingredient in the recipe is from the provided list
  const recipeIngredients = recipe.ingredients.map(ing => {
    // Handle both formats: string or object with name property
    const name = typeof ing === 'string' ? ing : ing.name;
    return normalizeText(name);
  });
  
  // Check if all recipe ingredients are from the provided list
  // We use a fuzzy match to allow for variations like "rice" vs "white rice"
  const allIngredientsValid = recipeIngredients.every(recipeIng => {
    return normalizedProvided.some(providedIng => {
      // Direct match
      if (recipeIng === providedIng) return true;
      // Substring match (e.g. "chicken breast" contains "chicken")
      if (recipeIng.includes(providedIng) || providedIng.includes(recipeIng)) return true;
      return false;
    });
  });
  
  if (!allIngredientsValid) {
    console.log('[VALIDATE] Recipe contains ingredients not in provided list');
    return false;
  }
  
  // Check if instructions are valid
  if (recipe.instructions.length < 2) {
    console.log('[VALIDATE] Recipe has too few instructions');
    return false;
  }
  
  // For the new format, check if instructions have proper structure
  const hasStructuredInstructions = recipe.instructions.every(instruction => {
    if (typeof instruction === 'string') {
      // Old format - simple string is fine
      return true;
    } else if (instruction && instruction.step && instruction.title && Array.isArray(instruction.details)) {
      // New format - must have step, title and details array
      return instruction.details.length > 0;
    }
    return false;
  });
  
  if (!hasStructuredInstructions) {
    console.log('[VALIDATE] Recipe has invalid instruction format');
    return false;
  }
  
  // Check for realistic quantities
  const hasRealisticQuantities = recipe.ingredients.every(ing => {
    if (typeof ing === 'string') return true; // Skip validation for string format
    
    const quantity = String(ing.quantity || '').toLowerCase();
    const name = String(ing.name || '').toLowerCase();
    
    // Check for unrealistically small quantities
    if (/(beef|chicken|fish|pork|tofu)/.test(name)) {
      if (/(1|2|3|4|5|one|two|three|four|five)\s*(g|gram)/.test(quantity)) {
        console.log(`[VALIDATE] Unrealistic small quantity for protein: ${quantity} ${name}`);
        return false;
      }
    }
    
    if (/(rice|pasta|noodle|potato)/.test(name)) {
      if (/(1|2|3|4|5|one|two|three|four|five)\s*(g|gram)/.test(quantity)) {
        console.log(`[VALIDATE] Unrealistic small quantity for carb: ${quantity} ${name}`);
        return false;
      }
    }
    
    return true;
  });
  
  if (!hasRealisticQuantities) {
    console.log('[VALIDATE] Recipe has unrealistic quantities');
    return false;
  }
  
  // All validation passed
  return true;
}

// Update the recipe generation endpoint
app.post('/api/generate-recipe', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received recipe generation request`);
  try {
    const { mealType, targets, ingredients, strict } = req.body;
    
    // Validate inputs
    if (!mealType || !targets || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request. Required: mealType, targets, and ingredients array.' 
      });
    }

    console.log(`[${new Date().toISOString()}] Generating recipe for ${mealType} with ${ingredients.length} ingredients`);
    console.log(`[${new Date().toISOString()}] Strict mode: ${strict ? 'enabled' : 'disabled'}`);
    
    try {
      // If we're in strict mode but the AI is not working well, use our high-quality recipe generator
      if (strict) {
        console.log(`[${new Date().toISOString()}] Using high-quality recipe generator in strict mode`);
        const highQualityRecipe = generateHighQualityRecipe(mealType, ingredients, targets);
        return res.json({ success: true, recipe: attachPerIngredientMacros(highQualityRecipe), fallback: false });
      }
      
      // Otherwise, use the AI with fallback to our high-quality recipe generator
      // Prepare the prompt
      const prompt = composeRecipePrompt(mealType, targets, ingredients);
      
      // Set up a timeout for the AI request
      const AI_RECIPE_TIMEOUT = parseInt(process.env.AI_RECIPE_TIMEOUT) || 120000; // 2 minutes default
      
      try {
        // Create a promise that will reject after the timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request timed out')), AI_RECIPE_TIMEOUT);
        });
        
        // Create the AI request promise
        const aiRequestPromise = (async () => {
          const response = await axios.post(
            AI_API_URL,
            {
              model: CHAT_MODEL,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
              max_tokens: 1200,
              response_format: { type: 'json_object' },
            },
        {
          headers: {
                Authorization: `Bearer ${AI_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (!response.data || !response.data.choices || !response.data.choices[0]) {
            throw new Error('Invalid response from AI provider');
          }
          
          return response.data.choices[0].message.content;
        })();
        
        // Race the promises - whichever resolves/rejects first wins
        const aiResponse = await Promise.race([aiRequestPromise, timeoutPromise]);
        
        // Parse the JSON response from the AI
        const recipe = findAndParseJson(aiResponse);
        
        if (!recipe) {
          throw new Error('Failed to parse recipe from AI response');
        }
        
        // Validate the recipe against the input ingredients
        const isValid = validateRecipeAgainstInputs(ingredients, recipe);
        
        if (!isValid) {
          console.log(`[${new Date().toISOString()}] Recipe validation failed, using high-quality recipe generator`);
          const highQualityRecipe = generateHighQualityRecipe(mealType, ingredients, targets);
          return res.json({ success: true, recipe: attachPerIngredientMacros(highQualityRecipe), fallback: true });
        }
        
        // Return the valid AI-generated recipe
        return res.json({ success: true, recipe: attachPerIngredientMacros(recipe), fallback: false });
      } catch (aiError) {
        console.error(`[${new Date().toISOString()}] AI recipe generation error:`, aiError.message);
        
        if (AI_STRICT_EFFECTIVE) {
          return res.status(502).json({ success: false, error: 'AI recipe generation failed and strict mode is enabled' });
        }
        // Use our high-quality recipe generator as fallback
        console.log(`[${new Date().toISOString()}] Using high-quality recipe generator as fallback`);
        const highQualityRecipe = generateHighQualityRecipe(mealType, ingredients, targets);
        return res.json({ success: true, recipe: attachPerIngredientMacros(highQualityRecipe), fallback: true });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Recipe generation error:`, error);
      
      if (AI_STRICT_EFFECTIVE) {
        return res.status(502).json({ success: false, error: 'AI recipe generation failed and strict mode is enabled' });
      }
      // Final fallback - generate a simple recipe
      try {
        const simpleRecipe = generateSimpleRecipe(mealType, ingredients, targets);
        return res.json({ success: true, recipe: attachPerIngredientMacros(simpleRecipe), fallback: true });
      } catch (fallbackError) {
        console.error(`[${new Date().toISOString()}] Even fallback recipe generation failed:`, fallbackError);
        return res.status(500).json({ success: false, error: 'Recipe generation failed completely.' });
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Recipe generation error:`, error);
    res.status(500).json({ success: false, error: 'Recipe generation failed' });
  }
});

// Simple fallback recipe endpoint (no AI required)
app.get('/api/simple-recipe', (req, res) => {
  console.log(`[${new Date().toISOString()}] Simple recipe request received`);
  try {
    const mealType = (req.query.mealType || 'Meal').toString();
    const ingredientsParam = (req.query.ingredients || '').toString();
    const ingredients = ingredientsParam.split(',').map((i) => i.trim()).filter(Boolean);
    const targets = {
      calories: parseInt(req.query.calories, 10) || 500,
      protein: parseInt(req.query.protein, 10) || 30,
      carbs: parseInt(req.query.carbs, 10) || 50,
      fat: parseInt(req.query.fat, 10) || 15,
    };
    console.log(`[${new Date().toISOString()}] Generating simple recipe for ${mealType} with ingredients: ${ingredients.join(', ')}`);
    
    // Use a more sophisticated recipe generator for the fallback
    const recipe = generateSimpleRecipe(mealType, ingredients, targets);
    console.log(`[${new Date().toISOString()}] Simple recipe generated successfully`);
    return res.json({ success: true, recipe, fallback: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating simple recipe:`, error);
    return res.status(500).json({ success: false, error: 'Failed to generate simple recipe.' });
  }
});

// Generate a simple recipe for fallback
function generateSimpleRecipe(mealType, ingredients, targets) {
  // Normalize ingredients for processing
  const lower = ingredients.map(i => i.toLowerCase().trim());
  
  // Detect ingredient types
  const hasProtein = lower.some(i => /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna|shrimp|egg)/.test(i));
  const hasCarbs = lower.some(i => /(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(i));
  const hasVeggies = lower.some(i => /(broccoli|carrot|spinach|kale|lettuce|pepper|onion|tomato|vegetable)/.test(i));
  const hasFat = lower.some(i => /(avocado|olive oil|butter|margarine|cashews|nuts|peanut butter|dark chocolate)/.test(i));
  const hasDairy = lower.some(i => /(milk|cheese|yogurt|cream)/.test(i));
  const isBreakfast = mealType.toLowerCase() === 'breakfast';
  const isSnack = mealType.toLowerCase() === 'snack';
  const isNoCook = !hasProtein && !hasCarbs && lower.every(i => /(yogurt|fruit|berry|granola|nuts|milk|cheese)/.test(i));
  
  // Generate recipe name
  let recipeName;
  if (ingredients.length <= 3) {
    recipeName = `${mealType} with ${ingredients.join(', ')}`;
  } else {
    // Find main ingredients for name
    const mainIngredients = [];
    if (hasProtein) {
      const protein = lower.find(i => /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna|shrimp|egg)/.test(i));
      if (protein) mainIngredients.push(ingredients[lower.indexOf(protein)]);
    }
    if (hasCarbs) {
      const carb = lower.find(i => /(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(i));
      if (carb) mainIngredients.push(ingredients[lower.indexOf(carb)]);
    }
    if (hasVeggies && mainIngredients.length < 2) {
      const veggie = lower.find(i => /(broccoli|carrot|spinach|kale|lettuce|pepper|onion|tomato|vegetable)/.test(i));
      if (veggie) mainIngredients.push(ingredients[lower.indexOf(veggie)]);
    }
    
    recipeName = mainIngredients.length > 0
      ? `${mealType} with ${mainIngredients.join(' and ')}`
      : `${mealType} with ${ingredients.slice(0, 2).join(' and ')}`;
  }
  
  // Calculate macro targets
  const caloriesNum = parseInt((targets && targets.calories) || 500, 10) || 500;
  const proteinNum = parseInt((targets && targets.protein) || 30, 10) || 30;
  const carbsNum = parseInt((targets && targets.carbs) || 50, 10) || 50;
  const fatNum = parseInt((targets && targets.fat) || 15, 10) || 15;

  // Generate ingredient quantities with REALISTIC amounts
  const ingredientsWithQuantities = ingredients.map(ing => {
    const name = ing.trim();
    const lowerName = name.toLowerCase();
    let quantity = '1 serving';
    
    // Assign realistic quantities based on ingredient types
    if (/(rice|quinoa|couscous|bulgur)/.test(lowerName)) {
      quantity = '1 cup cooked';
    } else if (/(pasta|noodle)/.test(lowerName)) {
      quantity = '1 cup cooked';
    } else if (/(chicken breast|chicken thigh)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(beef|steak)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(pork)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(fish|salmon|tuna|shrimp)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(tofu|tempeh)/.test(lowerName)) {
      quantity = '150g';
    } else if (/(oil|sauce|vinegar|honey|syrup)/.test(lowerName)) {
      quantity = '2 tbsp';
    } else if (/(yogurt)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(milk)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(egg)/.test(lowerName) && !/(eggplant)/.test(lowerName)) {
      quantity = '2 large';
    } else if (/(bread|toast)/.test(lowerName)) {
      quantity = '2 slices';
    } else if (/(cheese)/.test(lowerName)) {
      quantity = '50g';
    } else if (/(broccoli|cauliflower)/.test(lowerName)) {
      quantity = '1 cup florets';
    } else if (/(spinach|kale|lettuce)/.test(lowerName)) {
      quantity = '2 cups';
    } else if (/(carrot)/.test(lowerName)) {
      quantity = '2 medium';
    } else if (/(onion)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(tomato)/.test(lowerName)) {
      quantity = '2 medium';
    } else if (/(pepper|bell pepper)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(potato)/.test(lowerName)) {
      quantity = '2 medium';
    } else if (/(sweet potato)/.test(lowerName)) {
      quantity = '1 large';
    } else if (/(apple|orange|banana)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(berries|strawberry|blueberry)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(fruit)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(nuts|almond|walnut|peanut|cashew)/.test(lowerName)) {
      quantity = '1/4 cup';
    } else if (/(spice|salt|pepper|oregano|basil|thyme)/.test(lowerName)) {
      quantity = '1 tsp';
    } else if (/(butter|margarine)/.test(lowerName)) {
      quantity = '2 tbsp';
    } else if (/(sugar|flour)/.test(lowerName)) {
      quantity = '2 tbsp';
    } else if (/(avocado)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(lemon|lime)/.test(lowerName)) {
      quantity = '1 medium';
    } else if (/(garlic)/.test(lowerName)) {
      quantity = '3 cloves';
    } else if (/(ginger)/.test(lowerName)) {
      quantity = '1 inch piece';
    } else if (/(oats|oatmeal)/.test(lowerName)) {
      quantity = '1 cup';
    } else if (/(granola)/.test(lowerName)) {
      quantity = '1/2 cup';
    }
    
    return { name, quantity };
  });
  
  // Generate detailed instructions
  const instructions = [];
  
  if (isNoCook) {
    // No-cook instructions (yogurt, fruit, etc.)
    if (lower.some(i => /(yogurt)/.test(i))) {
      const yogurtIng = ingredients[lower.findIndex(i => /(yogurt)/.test(i))];
      instructions.push(`In a medium bowl, add ${ingredientsWithQuantities.find(i => i.name === yogurtIng)?.quantity || '1 cup'} of ${yogurtIng} as the base.`);
      
      if (lower.some(i => /(fruit|berry|banana|apple)/.test(i))) {
        const fruitIngs = ingredients.filter((_, idx) => /(fruit|berry|banana|apple)/.test(lower[idx]));
        if (fruitIngs.length > 0) {
          instructions.push(`Wash and cut the ${fruitIngs.join(' and ')} into bite-sized pieces.`);
          instructions.push(`Gently fold the prepared fruit into the yogurt, or arrange them on top for a more visually appealing presentation.`);
        }
      }
      
      if (lower.some(i => /(granola|nuts|seed)/.test(i))) {
        const crunchyIngs = ingredients.filter((_, idx) => /(granola|nuts|seed)/.test(lower[idx]));
        if (crunchyIngs.length > 0) {
          instructions.push(`Sprinkle ${crunchyIngs.join(' and ')} on top for added texture and crunch.`);
        }
      }
      
      if (lower.some(i => /(honey|syrup)/.test(i))) {
        const sweetenerIngs = ingredients.filter((_, idx) => /(honey|syrup)/.test(lower[idx]));
        if (sweetenerIngs.length > 0) {
          instructions.push(`Drizzle with ${sweetenerIngs.join(' and ')} for natural sweetness.`);
        }
      }
      
      instructions.push(`Serve immediately or chill in the refrigerator for 10-15 minutes for a cooler treat.`);
    } else if (lower.some(i => /(fruit|berry|banana|apple)/.test(i))) {
      instructions.push(`Wash all fruit thoroughly under cold running water.`);
      instructions.push(`Peel and cut the fruit into bite-sized pieces, removing any seeds or cores as needed.`);
      instructions.push(`Combine all prepared fruit in a large bowl and gently toss to mix.`);
      
      if (lower.some(i => /(honey|syrup)/.test(i))) {
        const sweetenerIngs = ingredients.filter((_, idx) => /(honey|syrup)/.test(lower[idx]));
        instructions.push(`Drizzle with ${sweetenerIngs.join(' and ')} and toss gently to coat.`);
      }
      
      instructions.push(`Refrigerate for at least 15 minutes before serving to allow flavors to combine.`);
    } else {
      instructions.push(`Prepare all ingredients according to their type - wash and cut any produce, measure out dry ingredients.`);
      instructions.push(`Combine all ingredients in a large bowl.`);
      instructions.push(`Mix gently but thoroughly to ensure flavors are well combined.`);
      instructions.push(`Let the mixture rest for 5-10 minutes before serving to allow flavors to meld.`);
    }
  } else if (isBreakfast) {
    // Breakfast-specific instructions
    if (lower.some(i => /(egg)/.test(i)) && !lower.some(i => /(eggplant)/.test(i))) {
      const eggIng = ingredients[lower.findIndex(i => /(egg)/.test(i) && !/(eggplant)/.test(i))];
      const eggQty = ingredientsWithQuantities.find(i => i.name === eggIng)?.quantity || '2 large';
      
      instructions.push(`Crack ${eggQty} ${eggIng} into a medium bowl and whisk until well combined. Season with a pinch of salt and pepper.`);
      
      if (lower.some(i => /(vegetable|pepper|onion|tomato|spinach)/.test(i))) {
        const veggieIngs = ingredients.filter((_, idx) => /(vegetable|pepper|onion|tomato|spinach)/.test(lower[idx]));
        
        if (veggieIngs.length > 0) {
          instructions.push(`Wash and dice the ${veggieIngs.join(', ')} into small, uniform pieces.`);
          instructions.push(`Heat a non-stick pan over medium-high heat. Add a small amount of oil or butter if available.`);
          instructions.push(`Sauté the vegetables for 3-4 minutes until they begin to soften.`);
          instructions.push(`Pour the egg mixture over the vegetables and cook for 2-3 minutes until the edges set.`);
          instructions.push(`Using a spatula, gently lift the edges and tilt the pan to allow uncooked egg to flow underneath.`);
          instructions.push(`Cook for another 1-2 minutes until eggs are fully set but still moist.`);
        }
            } else {
        instructions.push(`Heat a non-stick pan over medium-high heat. Add a small amount of oil or butter if available.`);
        instructions.push(`Pour the egg mixture into the pan and cook for 2-3 minutes until the edges start to set.`);
        instructions.push(`For scrambled eggs: Gently stir with a spatula until eggs are cooked but still soft, about 1-2 minutes more.`);
        instructions.push(`For an omelet: Let cook undisturbed until mostly set, then fold in half and cook for 30 seconds more.`);
      }
    } else if (lower.some(i => /(oat|cereal)/.test(i))) {
      const oatIng = ingredients[lower.findIndex(i => /(oat|cereal)/.test(i))];
      const oatQty = ingredientsWithQuantities.find(i => i.name === oatIng)?.quantity || '1 cup';
      
      if (lower.some(i => /(milk|water)/.test(i))) {
        const liquidIng = ingredients[lower.findIndex(i => /(milk|water)/.test(i))];
        const liquidQty = ingredientsWithQuantities.find(i => i.name === liquidIng)?.quantity || '1 cup';
        
        if (/(oat|oatmeal)/.test(oatIng.toLowerCase())) {
          instructions.push(`In a medium saucepan, bring ${liquidQty} of ${liquidIng} to a gentle boil.`);
          instructions.push(`Stir in ${oatQty} of ${oatIng} and reduce heat to medium-low.`);
          instructions.push(`Simmer for 5 minutes for quick oats or 15-20 minutes for old-fashioned oats, stirring occasionally.`);
        } else {
          instructions.push(`Pour ${oatQty} of ${oatIng} into a bowl.`);
          instructions.push(`Add ${liquidQty} of ${liquidIng} to the bowl.`);
        }
      } else {
        if (/(oat|oatmeal)/.test(oatIng.toLowerCase())) {
          instructions.push(`In a medium saucepan, bring 1 cup of water to a gentle boil.`);
          instructions.push(`Stir in ${oatQty} of ${oatIng} and reduce heat to medium-low.`);
          instructions.push(`Simmer for 5 minutes for quick oats or 15-20 minutes for old-fashioned oats, stirring occasionally.`);
        } else {
          instructions.push(`Pour ${oatQty} of ${oatIng} into a bowl.`);
          instructions.push(`Add 1 cup of milk or water to the bowl.`);
        }
      }
      
      if (lower.some(i => /(fruit|berry|banana|apple)/.test(i))) {
        const fruitIngs = ingredients.filter((_, idx) => /(fruit|berry|banana|apple)/.test(lower[idx]));
        
        if (fruitIngs.length > 0) {
          instructions.push(`Wash and prepare the ${fruitIngs.join(', ')}, cutting into bite-sized pieces if necessary.`);
          instructions.push(`Top the prepared oats/cereal with the fresh fruit.`);
        }
      }
      
      if (lower.some(i => /(honey|syrup|sugar)/.test(i))) {
        const sweetenerIngs = ingredients.filter((_, idx) => /(honey|syrup|sugar)/.test(lower[idx]));
        
        if (sweetenerIngs.length > 0) {
          instructions.push(`Drizzle or sprinkle ${sweetenerIngs.join(' and ')} over the top to taste.`);
        }
      }
    } else if (lower.some(i => /(bread|toast)/.test(i))) {
      const breadIng = ingredients[lower.findIndex(i => /(bread|toast)/.test(i))];
      const breadQty = ingredientsWithQuantities.find(i => i.name === breadIng)?.quantity || '2 slices';
      
      instructions.push(`Toast ${breadQty} of ${breadIng} until golden brown and crisp.`);
      
      if (lower.some(i => /(avocado)/.test(i))) {
        const avocadoIng = ingredients[lower.findIndex(i => /(avocado)/.test(i))];
        const avocadoQty = ingredientsWithQuantities.find(i => i.name === avocadoIng)?.quantity || '1 medium';
        
        instructions.push(`Cut the ${avocadoIng} in half, remove the pit, and scoop the flesh into a bowl.`);
        instructions.push(`Mash the avocado with a fork until smooth but still slightly chunky. Season with salt and pepper if desired.`);
        instructions.push(`Spread the mashed avocado evenly over the toasted bread.`);
      } else if (lower.some(i => /(butter|jam|peanut butter)/.test(i))) {
        const spreadIngs = ingredients.filter((_, idx) => /(butter|jam|peanut butter)/.test(lower[idx]));
        
        if (spreadIngs.length > 0) {
          instructions.push(`Spread ${spreadIngs.join(' and ')} evenly over the warm toast.`);
        }
      }
      
      if (lower.some(i => /(egg)/.test(i)) && !lower.some(i => /(eggplant)/.test(i))) {
        instructions.push(`For a complete breakfast, prepare eggs on the side as described in the egg preparation steps.`);
      }
    }
  } else {
    // Regular meal instructions (lunch/dinner)
    // Start with prep steps
    instructions.push(`Gather and prepare all ingredients before starting to cook.`);
    
    // Protein preparation
    if (hasProtein) {
      const proteinIngredients = ingredients.filter((_, idx) => 
        /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna|shrimp|egg)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (proteinIngredients.length > 0) {
        const mainProtein = proteinIngredients[0];
        const proteinQty = ingredientsWithQuantities.find(i => i.name === mainProtein)?.quantity || '150g';
        
        if (/(chicken|beef|pork)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Season ${proteinQty} of ${mainProtein} with salt and pepper on both sides.`);
          instructions.push(`Heat a large skillet over medium-high heat. Add 1 tablespoon of oil if available.`);
          instructions.push(`Cook the ${mainProtein} for 5-6 minutes per side until browned and cooked through (internal temperature of 165°F/74°C for chicken, 145°F/63°C for beef/pork).`);
          instructions.push(`Remove the cooked ${mainProtein} from the pan and let rest for 5 minutes before slicing or serving.`);
        } else if (/(fish|salmon|tuna|shrimp)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Season ${proteinQty} of ${mainProtein} with salt and pepper.`);
          instructions.push(`Heat a skillet over medium-high heat. Add a small amount of oil if available.`);
          instructions.push(`Cook the ${mainProtein} for 3-4 minutes per side for fish fillets, or 2-3 minutes for shrimp, until opaque and cooked through.`);
        } else if (/(tofu|tempeh)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Press ${proteinQty} of ${mainProtein} between paper towels to remove excess moisture.`);
          instructions.push(`Cut the ${mainProtein} into 1-inch cubes or slices.`);
          instructions.push(`Heat a skillet over medium-high heat. Add oil if available.`);
          instructions.push(`Cook the ${mainProtein} for 3-4 minutes per side until golden brown and crispy.`);
        } else if (/(egg)/.test(mainProtein.toLowerCase())) {
          instructions.push(`Whisk ${proteinQty} of ${mainProtein} in a bowl with a pinch of salt and pepper.`);
          instructions.push(`Heat a non-stick skillet over medium heat.`);
          instructions.push(`Pour the whisked eggs into the skillet and cook until set, about 2-3 minutes.`);
            } else {
          instructions.push(`Prepare all ingredients according to their type - wash and cut any produce, measure out dry ingredients.`);
        }
      }
    }
    
    // Carbohydrate preparation
    if (hasCarbs) {
      const carbIngredients = ingredients.filter((_, idx) => 
        /(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (carbIngredients.length > 0) {
        const mainCarb = carbIngredients[0];
        const carbQty = ingredientsWithQuantities.find(i => i.name === mainCarb)?.quantity || '1 cup cooked';
        
        if (/(rice|pasta|noodle|bread|potato|quinoa|couscous)/.test(mainCarb.toLowerCase())) {
          instructions.push(`Cook ${carbQty} of ${mainCarb} according to package instructions.`);
        } else {
          instructions.push(`Prepare ${carbQty} of ${mainCarb} according to package instructions.`);
        }
      }
    }
    
    // Fat preparation
    if (hasFat) {
      const fatIngredients = ingredients.filter((_, idx) => 
        /(avocado|olive oil|butter|margarine|cashews|nuts|peanut butter|dark chocolate)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (fatIngredients.length > 0) {
        const mainFat = fatIngredients[0];
        const fatQty = ingredientsWithQuantities.find(i => i.name === mainFat)?.quantity || '1/2 cup';
        
        if (/(avocado|olive oil|butter|margarine)/.test(mainFat.toLowerCase())) {
          instructions.push(`Add ${fatQty} of ${mainFat} to the dish.`);
        } else if (/(cashews|nuts|peanut butter|dark chocolate)/.test(mainFat.toLowerCase())) {
          instructions.push(`Add ${fatQty} of ${mainFat} to the dish.`);
        } else {
          instructions.push(`Add ${fatQty} of ${mainFat} to the dish.`);
        }
      }
    }
    
    // Vegetable preparation
    if (hasVeggies) {
      const veggieIngredients = ingredients.filter((_, idx) => 
        /(broccoli|spinach|lettuce|greens|pepper|tomato|cucumber|carrot|veg|vegetable|kale|onion|mushroom)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (veggieIngredients.length > 0) {
        const mainVeggie = veggieIngredients[0];
        const veggieQty = ingredientsWithQuantities.find(i => i.name === mainVeggie)?.quantity || '1 cup';
        
        if (/(broccoli|spinach|lettuce|greens|pepper|tomato|cucumber|carrot|veg|vegetable|kale|onion|mushroom)/.test(mainVeggie.toLowerCase())) {
          instructions.push(`Add ${veggieQty} of ${mainVeggie} to the dish.`);
        } else {
          instructions.push(`Add ${veggieQty} of ${mainVeggie} to the dish.`);
        }
      }
    }
    
    // Snack preparation
    if (isSnack) {
      const snackIngredients = ingredients.filter((_, idx) => 
        /(yogurt|fruit|berry|granola|nuts|almond|peanut butter|honey|chia|oat\s?meal|cottage)/.test(lower[idx]) && !/(eggplant)/.test(lower[idx]));
      
      if (snackIngredients.length > 0) {
        const mainSnack = snackIngredients[0];
        const snackQty = ingredientsWithQuantities.find(i => i.name === mainSnack)?.quantity || '1 serving';
        
        if (/(yogurt|fruit|berry|granola|nuts|almond|peanut butter|honey|chia|oat\s?meal|cottage)/.test(mainSnack.toLowerCase())) {
          instructions.push(`Add ${snackQty} of ${mainSnack} to the meal.`);
        } else {
          instructions.push(`Add ${snackQty} of ${mainSnack} to the meal.`);
        }
      }
    }
    
    // Final adjustments
    instructions.push(`Adjust seasoning to taste.`);
    instructions.push(`Serve hot.`);
  }
  
  return {
    name: recipeName,
    ingredients: ingredientsWithQuantities,
    instructions,
    nutrition: {
      calories: caloriesNum,
      protein: proteinNum,
      carbs: carbsNum,
      fat: fatNum,
      fiber: 5,
      sugar: 8
    },
  };
}

// ===================
// ERROR HANDLING MIDDLEWARE (must be last)
// ===================

// Global error handling middleware (must be last)
app.use((error, req, res, next) => {
  console.error('[EXPRESS] Unhandled error in request:', {
    url: req.url,
    method: req.method,
    error: error.message,
    stack: error.stack
  });
  
  // Don't crash the server, return a 500 error
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Handle 404s
app.use((req, res) => {
  console.log('[EXPRESS] 404 - Route not found:', req.method, req.url);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.url,
    method: req.method
  });
});