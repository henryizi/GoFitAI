
console.log('--- SERVER RESTARTED ---');
console.log('--- Code version: 4.0.1 - Gemini-Only-Clean: AI generation with mathematical fallback ---');

// Load environment variables
require('dotenv').config();

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
const GeminiVisionService = require('./services/geminiVisionService.js');
const BasicFoodAnalyzer = require('./services/basicFoodAnalyzer.js');
const GeminiTextService = require('./services/geminiTextService.js');

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

// Generate rule-based workout plan as fallback when AI fails
function generateRuleBasedWorkoutPlan(userProfile) {
  console.log('[WORKOUT] Generating rule-based workout plan for:', userProfile.primary_goal);
  
  const planName = `${userProfile.primary_goal?.replace(/_/g, ' ')?.toUpperCase() || 'General Fitness'} Workout Plan`;
  const frequency = userProfile.workout_frequency || '3-4';
  
  // Base template that works for most fitness goals
  const baseWorkouts = {
    muscle_gain: {
      plan_name: "Muscle Building Workout Plan",
      weekly_schedule: [
        {
          day: "Monday",
          focus: "Upper Body - Push",
          exercises: [
            { name: "Push-ups", sets: 4, reps: "8-12", restBetweenSets: "90s" },
            { name: "Dumbbell Bench Press", sets: 4, reps: "8-12", restBetweenSets: "90s" },
            { name: "Overhead Press", sets: 3, reps: "8-10", restBetweenSets: "90s" },
            { name: "Tricep Dips", sets: 3, reps: "10-15", restBetweenSets: "60s" }
          ]
        },
        {
          day: "Tuesday", 
          focus: "Lower Body - Legs",
          exercises: [
            { name: "Squats", sets: 4, reps: "8-12", restBetweenSets: "2min" },
            { name: "Deadlifts", sets: 4, reps: "6-8", restBetweenSets: "2min" },
            { name: "Lunges", sets: 3, reps: "12-15", restBetweenSets: "90s" },
            { name: "Calf Raises", sets: 3, reps: "15-20", restBetweenSets: "60s" }
          ]
        },
        {
          day: "Wednesday", focus: "Rest Day", exercises: []
        },
        {
          day: "Thursday",
          focus: "Upper Body - Pull",
          exercises: [
            { name: "Pull-ups", sets: 4, reps: "6-10", restBetweenSets: "90s" },
            { name: "Dumbbell Rows", sets: 4, reps: "8-12", restBetweenSets: "90s" },
            { name: "Bicep Curls", sets: 3, reps: "10-15", restBetweenSets: "60s" },
            { name: "Face Pulls", sets: 3, reps: "12-15", restBetweenSets: "60s" }
          ]
        },
        {
          day: "Friday",
          focus: "Core & Conditioning",
          exercises: [
            { name: "Plank", sets: 3, reps: "45-90s", restBetweenSets: "60s" },
            { name: "Russian Twists", sets: 3, reps: "20-30", restBetweenSets: "45s" },
            { name: "Mountain Climbers", sets: 3, reps: "30s", restBetweenSets: "60s" },
            { name: "Burpees", sets: 3, reps: "8-12", restBetweenSets: "90s" }
          ]
        },
        { day: "Saturday", focus: "Rest Day", exercises: [] },
        { day: "Sunday", focus: "Rest Day", exercises: [] }
      ]
    },
    weight_loss: {
      plan_name: "Weight Loss Workout Plan",
      weekly_schedule: [
        {
          day: "Monday",
          focus: "Full Body Circuit",
          exercises: [
            { name: "Burpees", sets: 4, reps: "10-15", restBetweenSets: "60s" },
            { name: "Jump Squats", sets: 4, reps: "15-20", restBetweenSets: "45s" },
            { name: "Push-ups", sets: 3, reps: "10-15", restBetweenSets: "45s" },
            { name: "Mountain Climbers", sets: 3, reps: "30s", restBetweenSets: "30s" }
          ]
        },
        {
          day: "Tuesday",
          focus: "Cardio & Core",
          exercises: [
            { name: "Running", sets: 1, reps: "25-35 min", restBetweenSets: "0s" },
            { name: "Plank", sets: 3, reps: "30-60s", restBetweenSets: "45s" },
            { name: "Bicycle Crunches", sets: 3, reps: "20-30", restBetweenSets: "30s" },
            { name: "Jump Rope", sets: 3, reps: "2-3 min", restBetweenSets: "60s" }
          ]
        },
        {
          day: "Wednesday", focus: "Active Recovery", exercises: [
            { name: "Walking", sets: 1, reps: "30-45 min", restBetweenSets: "0s" },
            { name: "Stretching", sets: 1, reps: "15 min", restBetweenSets: "0s" }
          ]
        },
        {
          day: "Thursday",
          focus: "Strength Training",
          exercises: [
            { name: "Squats", sets: 3, reps: "12-20", restBetweenSets: "60s" },
            { name: "Push-ups", sets: 3, reps: "10-15", restBetweenSets: "60s" },
            { name: "Lunges", sets: 3, reps: "12-16", restBetweenSets: "60s" },
            { name: "Plank to Downward Dog", sets: 3, reps: "10-15", restBetweenSets: "45s" }
          ]
        },
        {
          day: "Friday",
          focus: "HIIT Cardio",
          exercises: [
            { name: "High Knees", sets: 4, reps: "30s", restBetweenSets: "30s" },
            { name: "Jumping Jacks", sets: 4, reps: "30s", restBetweenSets: "30s" },
            { name: "Burpees", sets: 3, reps: "30s", restBetweenSets: "60s" },
            { name: "Sprint Intervals", sets: 6, reps: "30s", restBetweenSets: "90s" }
          ]
        },
        { day: "Saturday", focus: "Rest Day", exercises: [] },
        { day: "Sunday", focus: "Rest Day", exercises: [] }
      ]
    }
  };
  
  // Default general fitness plan
  const defaultPlan = {
    plan_name: "General Fitness Workout Plan",
    weekly_schedule: [
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
      { day: "Wednesday", focus: "Rest Day", exercises: [] },
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
      { day: "Saturday", focus: "Rest Day", exercises: [] },
      { day: "Sunday", focus: "Rest Day", exercises: [] }
    ]
  };

  // Select appropriate plan based on user's goal
  let selectedPlan = defaultPlan;
  if (userProfile.primary_goal && baseWorkouts[userProfile.primary_goal]) {
    selectedPlan = baseWorkouts[userProfile.primary_goal];
  }

  return {
    ...selectedPlan,
    plan_name: planName,
    primary_goal: userProfile.primary_goal || "general_fitness",
    workout_frequency: frequency,
    created_at: new Date().toISOString(),
    source: 'rule_based_fallback'
  };
}

// Enhanced fallback nutrition analysis
function getFallbackNutrition(description) {
  const food = description.toLowerCase().trim();
  
  // Common food database with realistic nutrition values
  const foodDatabase = {
    'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19 },
    'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14 },
    'orange': { calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12 },
    'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
    'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
    'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    'salad': { calories: 20, protein: 2, carbs: 4, fat: 0.2, fiber: 1.5, sugar: 2 },
    'pizza': { calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.5, sugar: 3.5 },
    'burger': { calories: 354, protein: 17, carbs: 30, fat: 17, fiber: 2, sugar: 6 },
    'sandwich': { calories: 250, protein: 12, carbs: 35, fat: 8, fiber: 3, sugar: 5 },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.8 },
    'bread': { calories: 79, protein: 3.1, carbs: 15, fat: 1, fiber: 1.2, sugar: 1.5 },
    'milk': { calories: 103, protein: 8, carbs: 12, fat: 2.4, fiber: 0, sugar: 12 },
    'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2 },
    'eggs': { calories: 74, protein: 6.3, carbs: 0.4, fat: 5, fiber: 0, sugar: 0.4 },
    'steak': { calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0 },
    'fish': { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    'vegetables': { calories: 25, protein: 2, carbs: 5, fat: 0.2, fiber: 2, sugar: 2 },
    'fruits': { calories: 60, protein: 0.5, carbs: 15, fat: 0.2, fiber: 2.5, sugar: 12 }
  };
  
  // Try to find exact match first
  if (foodDatabase[food]) {
    return {
      food_name: description,
      calories: foodDatabase[food].calories,
      protein: foodDatabase[food].protein,
      carbs: foodDatabase[food].carbs,
      fat: foodDatabase[food].fat,
      fiber: foodDatabase[food].fiber,
      sugar: foodDatabase[food].sugar,
      assumptions: "Based on standard serving size",
      confidence: "medium"
    };
  }
  
  // Try partial matches
  for (const [key, nutrition] of Object.entries(foodDatabase)) {
    if (food.includes(key) || key.includes(food)) {
      return {
        food_name: description,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        sugar: nutrition.sugar,
        assumptions: `Estimated based on similar food: ${key}`,
        confidence: "low"
      };
    }
  }
  
  // Generic fallback for unknown foods
  return {
    food_name: description,
    calories: 200,
    protein: 10,
    carbs: 25,
    fat: 8,
    fiber: 3,
    sugar: 5,
    assumptions: "Generic estimate for unknown food item",
    confidence: "low"
  };
}

/**
 * Calculate goal-adjusted calories based on fitness strategy
 * 
 * Fitness Strategy Calorie Adjustments:
 * - bulk: +400 calories (aggressive muscle gain)
 * - cut: -400 calories (fat loss while preserving muscle)
 * - maintenance: 0 calories (maintain current physique)
 * - recomp: 0 calories (body recomposition at maintenance)
 * - maingaining: +150 calories (slow, lean gains)
 * 
 * Safety minimum of 1200 calories always applied
 */
function calculateGoalCalories(
  tdee, 
  fitnessStrategy = 'maintenance', // Fitness strategy: 'bulk', 'cut', 'maintenance', 'recomp', 'maingaining'
  goalMuscleGain = 0,              // Legacy parameter - kept for backward compatibility
  userWeight = 70,                 // user's current weight in kg
  currentBodyFat = 20              // user's current body fat percentage
) {
  let adjustment = 0;
  let adjustmentReason = '';
  
  // Strategy-based calorie adjustments
  const strategyAdjustments = {
    bulk: { calories: 400, description: 'Aggressive muscle building' },
    cut: { calories: -400, description: 'Fat loss while preserving muscle' },
    fat_loss: { calories: -400, description: 'Fat loss while preserving muscle' }, // Support fat_loss alias
    weight_loss: { calories: -400, description: 'Fat loss while preserving muscle' }, // Support weight_loss alias
    muscle_gain: { calories: 400, description: 'Aggressive muscle building' }, // Support muscle_gain alias
    weight_gain: { calories: 400, description: 'Aggressive muscle building' }, // Support weight_gain alias
    maintenance: { calories: 0, description: 'Maintain current physique' },
    recomp: { calories: 0, description: 'Body recomposition' },
    maingaining: { calories: 150, description: 'Slow, lean muscle gains' }
  };
  
  // Get adjustment for the selected strategy
  const strategy = strategyAdjustments[fitnessStrategy] || strategyAdjustments.maintenance;
  adjustment = strategy.calories;
  
  // Build explanation based on strategy
  if (adjustment === 0) {
    adjustmentReason = `${strategy.description}: Eating at maintenance calories`;
  } else if (adjustment > 0) {
    adjustmentReason = `${strategy.description}: ${adjustment} cal surplus for controlled growth`;
  } else {
    adjustmentReason = `${strategy.description}: ${Math.abs(adjustment)} cal deficit for fat loss`;
  }

  // Calculate goal calories with safety minimum
  const rawGoalCalories = tdee + adjustment;
  const goalCalories = Math.max(1200, rawGoalCalories); // Safety minimum of 1200 calories
  
  // Update reason if safety minimum was applied
  if (rawGoalCalories < 1200) {
    adjustmentReason += ` (adjusted to 1200 minimum for safety)`;
  }

  return { goalCalories, adjustment, adjustmentReason };
}

/**
 * Get macronutrient ratios based on fitness strategy
 * Returns protein, carbs, and fat percentages that sum to 100%
 */
function getMacroRatiosForStrategy(fitnessStrategy = 'maintenance') {
  const macroRatios = {
    bulk: { protein: 25, carbs: 45, fat: 30 },           // High carbs for energy, moderate protein
    cut: { protein: 35, carbs: 25, fat: 40 },            // Very high protein, lower carbs, higher fat for satiety
    fat_loss: { protein: 35, carbs: 25, fat: 40 },       // Same as cut - fat loss strategy
    weight_loss: { protein: 35, carbs: 25, fat: 40 },    // Same as cut - weight loss strategy
    muscle_gain: { protein: 25, carbs: 45, fat: 30 },    // Same as bulk - muscle gain strategy
    weight_gain: { protein: 25, carbs: 45, fat: 30 },    // Same as bulk - weight gain strategy
    maintenance: { protein: 30, carbs: 35, fat: 35 },    // Balanced approach
    recomp: { protein: 35, carbs: 35, fat: 30 },         // High protein for muscle building while in deficit
    maingaining: { protein: 30, carbs: 40, fat: 30 }     // Moderate protein, good carbs for performance
  };
  
  return macroRatios[fitnessStrategy] || macroRatios.maintenance;
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
// AI configuration - using Gemini only

// Gemini Vision API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';

// Warn if keys are missing
if (!GEMINI_API_KEY) {
  console.warn('[CONFIG] GEMINI_API_KEY is not set. Gemini provider will be disabled.');
}

// Vision services: Gemini (primary) only

// Optional external services for higher accuracy
const USDA_FDC_API_KEY = process.env.USDA_FDC_API_KEY; // USDA FoodData Central

// Initialize Vision Service (Gemini only)
// Initialize vision service based on FOOD_ANALYZE_PROVIDER
let visionService = null;
const FOOD_ANALYZE_PROVIDER = process.env.FOOD_ANALYZE_PROVIDER || 'gemini';

if (FOOD_ANALYZE_PROVIDER === 'gemini' && GEMINI_API_KEY) {
  console.log('[VISION SERVICE] Initializing Gemini Vision Service');
  try {
    visionService = new GeminiVisionService(GEMINI_API_KEY);
  } catch (error) {
    console.error('[VISION SERVICE] Failed to initialize Gemini Vision Service:', error.message);
    visionService = null;
  }
} else if (FOOD_ANALYZE_PROVIDER === 'cloudflare' && process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) {
  console.log('[VISION SERVICE] Initializing Cloudflare Vision Service');
  try {
    const VisionService = require('./services/visionService.js');
    visionService = new VisionService();
  } catch (error) {
    console.error('[VISION SERVICE] Failed to initialize Cloudflare Vision Service:', error.message);
    visionService = null;
  }
} else {
  console.log('[VISION SERVICE] No vision service configured, using fallback only');
  console.log('[VISION SERVICE] FOOD_ANALYZE_PROVIDER:', FOOD_ANALYZE_PROVIDER);
  console.log('[VISION SERVICE] GEMINI_API_KEY configured:', !!GEMINI_API_KEY);
  console.log('[VISION SERVICE] CF_ACCOUNT_ID configured:', !!process.env.CF_ACCOUNT_ID);
}
const basicFoodAnalyzer = new BasicFoodAnalyzer();

// Initialize AI services for recipe generation
let geminiTextService = null;

// Initialize Gemini Text service
if (GEMINI_API_KEY) {
  console.log('[AI SERVICE] Initializing Gemini Text Service');
  try {
    geminiTextService = new GeminiTextService(GEMINI_API_KEY);
  } catch (error) {
    console.error('[AI SERVICE] Failed to initialize Gemini Text Service:', error.message);
    geminiTextService = null;
  }
} else {
  console.log('[AI SERVICE] Gemini API key not configured');
  geminiTextService = null;
}

// AI Provider Priority List (Gemini only)
const AI_PROVIDERS = [
  {
    name: 'gemini',
    apiKey: GEMINI_API_KEY,
    apiUrl: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    model: GEMINI_MODEL,
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
  .filter(provider => provider.enabled);

// Validate provider configurations
function isValidUrl(string) {
  if (!string) return false;
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

AI_PROVIDERS.forEach(provider => {
  if (provider.apiUrl && !isValidUrl(provider.apiUrl)) {
    console.error(`[CONFIG] Invalid apiUrl for provider "${provider.name}": "${provider.apiUrl}". Disabling this provider.`);
    provider.enabled = false;
  }
});

// Default provider (Gemini only)
const DEFAULT_PROVIDER = AI_PROVIDERS.find(p => p.name === 'gemini')?.name ||
                        AI_PROVIDERS[0]?.name || 'gemini';
const AI_PROVIDER = process.env.AI_PROVIDER || DEFAULT_PROVIDER;
const AI_STRICT_EFFECTIVE = process.env.AI_STRICT_MODE === 'true';

// Legacy AI configuration for backward compatibility
const AI_API_KEY = GEMINI_API_KEY;
const AI_API_URL = AI_PROVIDERS.find(p => p.name === AI_PROVIDER)?.apiUrl;
const CHAT_MODEL = AI_PROVIDERS.find(p => p.name === AI_PROVIDER)?.model || GEMINI_MODEL;

// Debug logging for API configuration
console.log('=== AI CONFIGURATION ===');
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

// Fallback functions removed - errors will be returned instead

// BasicFoodAnalyzer function removed - errors will be returned instead

// Nutrition plan fallback function removed - errors will be returned instead

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
You are a professional fitness coach. Create a personalized weekly workout plan for a client with the following profile. Focus on their primary fitness goal while considering their age, gender, training level, and preferred workout frequency.

CLIENT PROFILE:
- Full Name: ${profile.full_name || 'Client'}
- Gender: ${profile.gender || 'Not specified'}
- Age: ${profile.age || 'Not specified'}
- Training Level: ${profile.training_level || 'intermediate'}
- Primary Goal: ${profile.primary_goal || 'general fitness'}
- Preferred Workout Frequency: ${profile.workout_frequency ? profile.workout_frequency.replace('_', '-') + ' times per week' : '4-5 times per week'}

PROGRAMMING & PROGRESSION:
1. Provide a sensible 4-week mesocycle with progressive overload guidance and 1 optional deload recommendation.
2. Suggest target set volumes relative to training level (lower for beginners, higher for advanced).
3. Tailor the workout plan to the client's primary goal:
   - Muscle Gain: Focus on compound movements with moderate reps (8-12) and adequate rest (90-120s)
   - Fat Loss: Include higher reps (12-15) with shorter rest periods (60-90s) and cardio elements
   - Athletic Performance: Emphasize functional movements, power exercises, and sport-specific training
   - General Fitness: Balanced approach with mix of strength and cardio elements
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

async function callAI(messages, responseFormat = null, temperature = 0.7, preferredProvider = null, maxTokensOverride = null) {
  // Check rate limit first
  checkRateLimit();
  
  // Determine which providers to try
  let providersToTry = preferredProvider
    ? [getProviderConfig(preferredProvider)].filter(Boolean)
    : AI_PROVIDERS.filter(p => p.enabled);

  // If no preferred provider, prioritize the configured AI_PROVIDER
  if (!preferredProvider && providersToTry.length > 1) {
    const configuredProvider = providersToTry.find(p => p.name === AI_PROVIDER);
    console.log(`[AI] AI_PROVIDER: ${AI_PROVIDER}, configuredProvider: ${configuredProvider?.name}, providersToTry before: ${providersToTry.map(p => p.name).join(', ')}`);
    if (configuredProvider) {
      // Move the configured provider to the front
      providersToTry = [
        configuredProvider,
        ...providersToTry.filter(p => p.name !== AI_PROVIDER)
      ];
      console.log(`[AI] providersToTry after prioritization: ${providersToTry.map(p => p.name).join(', ')}`);
    }
  }
  
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
      
      // Use maxTokensOverride if provided, otherwise use provider-specific defaults
      const max_tokens = maxTokensOverride ||
                        (provider.name === 'gemini' ? 4000 :
                         provider.name === 'fallback' ? 1000 : 2000);
    
    let modelToUse = provider.model;
    
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
          } else if (lastMessage.content.includes('workout plan')) {
            // This is a workout plan request, which the fallback provider doesn't support.
            // Return an error to trigger the rule-based fallback in the endpoint.
            return {
              error: true,
              errorType: 'unsupported_request',
              message: 'Fallback provider does not support workout plan generation.'
            };
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
            maxOutputTokens: Math.max(max_tokens, 8000) // Ensure at least 8000 tokens for complex tasks
          }
        };

        // Add response format if specified
        if (responseFormat && responseFormat.type === 'json_object') {
          geminiRequestBody.generationConfig.responseMimeType = 'application/json';
          console.log('[AI] JSON response format requested for Gemini - setting responseMimeType');
        }

        console.log('[GEMINI] Request body:', JSON.stringify(geminiRequestBody, null, 2));
        console.log('[GEMINI] Max output tokens set to:', geminiRequestBody.generationConfig.maxOutputTokens);

        // Use API key in URL for Gemini
        const geminiUrl = `${provider.apiUrl}?key=${provider.apiKey}`;
        console.log('[GEMINI] Calling URL:', geminiUrl.replace(provider.apiKey, '[API_KEY]'));
        
        try {
        response = await axios.post(
          geminiUrl,
          geminiRequestBody,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: AI_REQUEST_TIMEOUT
          }
        );

          console.log('[GEMINI] Response status:', response.status);
          console.log('[GEMINI] Response headers:', response.headers);
        
        // Convert Gemini response to OpenAI format for compatibility
          console.log('[GEMINI] Full API response:', JSON.stringify(response.data, null, 2));
          const geminiContent = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('[GEMINI] Extracted content:', geminiContent);

        response.data = {
          choices: [{
            message: {
                content: geminiContent || 'No response generated'
            }
          }]
        };
        } catch (geminiError) {
          console.error('[GEMINI] API call failed:', geminiError.message);

          if (geminiError.response) {
            console.error('[GEMINI] Response status:', geminiError.response.status);
            console.error('[GEMINI] Response data:', JSON.stringify(geminiError.response.data, null, 2));

            // Provide specific guidance based on error type
            if (geminiError.response.status === 400) {
              console.error('[GEMINI] 💡 400 Bad Request - Check API key validity and request format');
              console.error('[GEMINI] 💡 Possible causes: Invalid API key, malformed request, or model unavailable');
            } else if (geminiError.response.status === 403) {
              console.error('[GEMINI] 💡 403 Forbidden - API key may be invalid, expired, or lack permissions');
              console.error('[GEMINI] 💡 Check your Gemini API key in Railway environment variables');
            } else if (geminiError.response.status === 429) {
              console.error('[GEMINI] 💡 429 Rate Limit - Too many requests or quota exceeded');
              console.error('[GEMINI] 💡 Wait a few minutes and try again, or check your billing/quota');
            } else if (geminiError.response.status >= 500) {
              console.error('[GEMINI] 💡 5xx Server Error - Google API server issues');
              console.error('[GEMINI] 💡 This is usually temporary - try again later');
            }
          } else if (geminiError.code === 'ECONNREFUSED') {
            console.error('[GEMINI] 💡 Connection refused - Network connectivity issues');
            console.error('[GEMINI] 💡 Check if Railway can reach Google APIs (may be network restrictions)');
          } else if (geminiError.code === 'ETIMEDOUT') {
            console.error('[GEMINI] 💡 Connection timeout - Network or API performance issues');
            console.error('[GEMINI] 💡 Try increasing AI_REQUEST_TIMEOUT in Railway variables');
          } else if (geminiError.code === 'ENOTFOUND') {
            console.error('[GEMINI] 💡 DNS resolution failed - Network configuration issues');
            console.error('[GEMINI] 💡 Check Railway network settings');
          }

          throw geminiError; // Re-throw to be handled by outer catch
        }

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
    
    return response.data;
      
  } catch (error) {
      console.error(`[AI] Error with provider ${provider.name}:`, error.message);
      
      if (preferredProvider) {
        return {
          error: true,
          errorType: 'preferred_provider_failed',
          message: `${provider.name} failed: ${error.message}`,
          provider: provider.name
        };
      }
      
      console.log(`[AI] Trying next provider...`);
          continue;
        }
      }
      
  // If we get here, all providers failed
  console.error('[AI] All providers failed');
  console.error('[AI] 🚨 CRITICAL: No AI providers are working!');
  console.error('[AI] 💡 Troubleshooting steps:');
  console.error('[AI]    1. Check Railway environment variables: GEMINI_API_KEY, AI_PROVIDER');
  console.error('[AI]    2. Verify API keys are valid and have proper permissions');
  console.error('[AI]    3. Test connectivity: node diagnose-railway-gemini.js');
  console.error('[AI]    4. Check Railway logs for detailed error messages');
  console.error('[AI]    5. Ensure Railway can reach external APIs (network restrictions)');

  return {
    error: true,
    errorType: 'all_providers_failed',
    message: 'All AI providers are currently unavailable. Please try again later.',
    troubleshooting: 'Check Railway environment variables and API key validity.'
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

// Legacy AI prompt function removed - nutrition plan generation now uses mathematical calculations only

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
function ensureProperDailyTargets(nutritionPlan, calculatedTargets = null) {
  if (!nutritionPlan.daily_targets) {
    nutritionPlan.daily_targets = {};
  }
  
  if (nutritionPlan.daily_targets_json) {
    nutritionPlan.daily_targets = {
      ...nutritionPlan.daily_targets,
      ...nutritionPlan.daily_targets_json
    };
  }
  
  // If calculated targets are provided, use them instead of defaults or AI values
  if (calculatedTargets) {
    console.log('[NUTRITION] Enforcing calculated targets:', calculatedTargets);
    nutritionPlan.daily_targets.calories = calculatedTargets.calories;
    nutritionPlan.daily_targets.protein = calculatedTargets.protein;
    nutritionPlan.daily_targets.carbs = calculatedTargets.carbs;
    nutritionPlan.daily_targets.fat = calculatedTargets.fat;
  } else {
    // Fallback to defaults only if no calculated targets provided
  nutritionPlan.daily_targets.calories = nutritionPlan.daily_targets.calories || 2000;
  nutritionPlan.daily_targets.protein = nutritionPlan.daily_targets.protein || nutritionPlan.daily_targets.protein_grams || 150;
  nutritionPlan.daily_targets.carbs = nutritionPlan.daily_targets.carbs || nutritionPlan.daily_targets.carbs_grams || 200;
  nutritionPlan.daily_targets.fat = nutritionPlan.daily_targets.fat || nutritionPlan.daily_targets.fat_grams || 65;
  }
  
  return nutritionPlan;
}

// Meal template generator function
function generateMealTemplates(dailyTargets, fitnessStrategy, preferences) {
  console.log('[MEAL TEMPLATES] Generating meals for strategy:', fitnessStrategy, 'with preferences:', preferences);

  // Define meal templates for different fitness strategies with dietary tags
  const mealTemplates = {
    fat_loss: {
      breakfast: [
        { meal: "Protein oatmeal with berries", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Greek yogurt parfait with nuts", protein_focus: true, carb_timing: "low", tags: ["vegetarian"] },
        { meal: "Egg white omelet with spinach", protein_focus: true, carb_timing: "low", tags: ["vegetarian"] },
        { meal: "Protein smoothie bowl", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian", "vegan"] },
        { meal: "Tofu scramble with vegetables", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free"] },
        { meal: "Chia seed pudding with berries", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ],
      lunch: [
        { meal: "Grilled chicken salad with quinoa", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Turkey breast with sweet potato", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Tuna salad with mixed greens", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Lean beef stir-fry with vegetables", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Lentil salad with quinoa", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Chickpea curry with brown rice", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ],
      dinner: [
        { meal: "Baked salmon with broccoli", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Grilled chicken with asparagus", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "White fish with zucchini", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Turkey stir-fry with cauliflower", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Grilled tempeh with steamed vegetables", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Black bean bowl with roasted vegetables", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ]
    },
    muscle_gain: {
      breakfast: [
        { meal: "Large oatmeal with protein powder", protein_focus: true, carb_timing: "high", tags: ["vegetarian"] },
        { meal: "Protein pancakes with fruit", protein_focus: true, carb_timing: "high", tags: ["vegetarian"] },
        { meal: "Egg sandwich on whole grain bread", protein_focus: true, carb_timing: "high", tags: ["vegetarian"] },
        { meal: "Greek yogurt with granola", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Vegan protein smoothie with oats", protein_focus: true, carb_timing: "high", tags: ["vegan", "vegetarian", "dairy_free"] },
        { meal: "Tofu scramble with whole grain toast", protein_focus: true, carb_timing: "high", tags: ["vegan", "vegetarian", "dairy_free"] }
      ],
      lunch: [
        { meal: "Chicken breast with brown rice", protein_focus: true, carb_timing: "high", tags: ["dairy_free", "gluten_free"] },
        { meal: "Salmon with sweet potato", protein_focus: true, carb_timing: "high", tags: ["dairy_free", "gluten_free"] },
        { meal: "Beef with quinoa", protein_focus: true, carb_timing: "high", tags: ["dairy_free", "gluten_free"] },
        { meal: "Turkey with whole grain pasta", protein_focus: true, carb_timing: "high", tags: [] },
        { meal: "Lentil and quinoa power bowl", protein_focus: true, carb_timing: "high", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Chickpea and rice protein plate", protein_focus: true, carb_timing: "high", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ],
      dinner: [
        { meal: "Large salmon portion with rice", protein_focus: true, carb_timing: "high", tags: ["dairy_free", "gluten_free"] },
        { meal: "Chicken thighs with potatoes", protein_focus: true, carb_timing: "high", tags: ["dairy_free", "gluten_free"] },
        { meal: "Beef stir-fry with noodles", protein_focus: true, carb_timing: "high", tags: ["dairy_free"] },
        { meal: "Tuna with sweet potato", protein_focus: true, carb_timing: "high", tags: ["dairy_free", "gluten_free"] },
        { meal: "Tempeh with quinoa and vegetables", protein_focus: true, carb_timing: "high", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Large tofu stir-fry with brown rice", protein_focus: true, carb_timing: "high", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ]
    },
    maintenance: {
      breakfast: [
        { meal: "Oatmeal with protein powder and fruit", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Greek yogurt with honey and nuts", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Scrambled eggs with toast", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Smoothie with protein and banana", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Vegan protein bowl with fruits", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free"] },
        { meal: "Almond butter toast with hemp seeds", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free"] }
      ],
      lunch: [
        { meal: "Grilled chicken with quinoa", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Fish with brown rice", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Turkey sandwich on whole grain", protein_focus: true, carb_timing: "moderate", tags: [] },
        { meal: "Lean beef with sweet potato", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Buddha bowl with tahini dressing", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Quinoa salad with mixed beans", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ],
      dinner: [
        { meal: "Salmon with vegetables and rice", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Chicken breast with broccoli", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Pork tenderloin with potatoes", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Fish with quinoa", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Stuffed bell peppers with lentils", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Eggplant and chickpea curry", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ]
    },
    recomp: {
      breakfast: [
        { meal: "Protein oatmeal with berries", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Greek yogurt with fruit", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Egg white omelet with veggies", protein_focus: true, carb_timing: "low", tags: ["vegetarian"] },
        { meal: "Protein smoothie", protein_focus: true, carb_timing: "moderate", tags: ["vegetarian"] },
        { meal: "Chia pudding with protein powder", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Tofu scramble with spinach", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ],
      lunch: [
        { meal: "Chicken salad with quinoa", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Turkey with sweet potato", protein_focus: true, carb_timing: "moderate", tags: ["dairy_free", "gluten_free"] },
        { meal: "Tuna with mixed greens", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Lean beef with vegetables", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Tempeh salad with vegetables", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Lentil soup with vegetables", protein_focus: true, carb_timing: "moderate", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ],
      dinner: [
        { meal: "Salmon with broccoli", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Chicken with asparagus", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "White fish with zucchini", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Turkey with cauliflower", protein_focus: true, carb_timing: "low", tags: ["dairy_free", "gluten_free"] },
        { meal: "Roasted tofu with mixed vegetables", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
        { meal: "Mushroom and bean stir-fry", protein_focus: true, carb_timing: "low", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
      ]
    }
  };

  // Get templates for the current strategy, fallback to maintenance
  const strategyTemplates = mealTemplates[fitnessStrategy] || mealTemplates.maintenance;

  // Filter meals based on dietary preferences
  const filterMealsByPreferences = (meals, preferences) => {
    if (!preferences || preferences.length === 0) {
      return meals;
    }

    return meals.filter(meal => {
      // Check if meal satisfies all dietary preferences
      return preferences.every(pref => {
        if (meal.tags.includes(pref)) {
          return true;
        }
        // If preference is not in tags, check if meal is compatible
        if (pref === 'vegetarian') {
          // Exclude meals with meat/fish
          const meatTerms = ['chicken', 'turkey', 'beef', 'pork', 'salmon', 'fish', 'tuna'];
          return !meatTerms.some(term => meal.meal.toLowerCase().includes(term));
        }
        if (pref === 'vegan') {
          // Exclude meals with any animal products
          const animalTerms = ['chicken', 'turkey', 'beef', 'pork', 'salmon', 'fish', 'tuna', 'egg', 'yogurt', 'honey'];
          return !animalTerms.some(term => meal.meal.toLowerCase().includes(term));
        }
        if (pref === 'dairy_free') {
          // Exclude meals with dairy
          const dairyTerms = ['yogurt', 'cheese', 'milk', 'cream'];
          return !dairyTerms.some(term => meal.meal.toLowerCase().includes(term));
        }
        if (pref === 'gluten_free') {
          // Exclude meals with gluten
          const glutenTerms = ['bread', 'pasta', 'noodles', 'toast', 'sandwich'];
          return !glutenTerms.some(term => meal.meal.toLowerCase().includes(term));
        }
        return true;
      });
    });
  };

  // Filter meals for each time slot
  const filteredBreakfast = filterMealsByPreferences(strategyTemplates.breakfast, preferences);
  const filteredLunch = filterMealsByPreferences(strategyTemplates.lunch, preferences);
  const filteredDinner = filterMealsByPreferences(strategyTemplates.dinner, preferences);

  // Select random meals from filtered arrays, fallback to original if no matches
  const getRandomMeal = (mealArray, fallbackArray) => {
    const arrayToUse = mealArray.length > 0 ? mealArray : fallbackArray;
    return arrayToUse[Math.floor(Math.random() * arrayToUse.length)];
  };

  const breakfast = getRandomMeal(filteredBreakfast, strategyTemplates.breakfast);
  const lunch = getRandomMeal(filteredLunch, strategyTemplates.lunch);
  const dinner = getRandomMeal(filteredDinner, strategyTemplates.dinner);

  // Generate meal schedule with calculated macros
  const schedule = [
    {
      time_slot: "Breakfast",
      meal: breakfast.meal,
      macros: {
        calories: Math.round(dailyTargets.calories * 0.25),
        protein: Math.round(dailyTargets.protein * 0.25),
        carbs: Math.round(dailyTargets.carbs * 0.25),
        fat: Math.round(dailyTargets.fat * 0.25)
      }
    },
    {
      time_slot: "Lunch",
      meal: lunch.meal,
      macros: {
        calories: Math.round(dailyTargets.calories * 0.35),
        protein: Math.round(dailyTargets.protein * 0.35),
        carbs: Math.round(dailyTargets.carbs * 0.35),
        fat: Math.round(dailyTargets.fat * 0.35)
      }
    },
    {
      time_slot: "Dinner",
      meal: dinner.meal,
      macros: {
        calories: Math.round(dailyTargets.calories * 0.4),
        protein: Math.round(dailyTargets.protein * 0.4),
        carbs: Math.round(dailyTargets.carbs * 0.4),
        fat: Math.round(dailyTargets.fat * 0.4)
      }
    }
  ];

  console.log('[MEAL TEMPLATES] Generated schedule:', schedule.map(s => `${s.time_slot}: ${s.meal}`));
  return schedule;
}

// Function to filter food suggestions based on dietary preferences
function filterFoodSuggestions(preferences) {
  try {
  
  const allSuggestions = {
    proteins: [
      { name: "Chicken breast", tags: ["dairy_free", "gluten_free"] },
      { name: "Salmon", tags: ["dairy_free", "gluten_free"] },
      { name: "Greek yogurt", tags: ["vegetarian"] },
      { name: "Eggs", tags: ["vegetarian", "dairy_free", "gluten_free"] },
      { name: "Turkey breast", tags: ["dairy_free", "gluten_free"] },
      { name: "Tuna", tags: ["dairy_free", "gluten_free"] },
      { name: "Lean beef", tags: ["dairy_free", "gluten_free"] },
      { name: "Tofu", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Tempeh", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Lentils", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Chickpeas", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Black beans", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Protein powder", tags: ["vegetarian"] },
      { name: "Cottage cheese", tags: ["vegetarian"] }
    ],
    carbs: [
      { name: "Brown rice", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Sweet potatoes", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Quinoa", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Oats", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Whole grain bread", tags: ["vegan", "vegetarian", "dairy_free"] },
      { name: "Whole grain pasta", tags: ["vegan", "vegetarian", "dairy_free"] },
      { name: "Potatoes", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Bananas", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Berries", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Rice cakes", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
    ],
    fats: [
      { name: "Avocado", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Olive oil", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Nuts", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Seeds", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Nut butter", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Coconut oil", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Tahini", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Flaxseeds", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Chia seeds", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
    ],
    vegetables: [
      { name: "Broccoli", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Spinach", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Bell peppers", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Kale", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Asparagus", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Zucchini", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Cauliflower", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Brussels sprouts", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Carrots", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
      { name: "Mushrooms", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] }
    ]
  };

  const allSnacks = [
    { name: "Protein shake", tags: ["vegetarian"] },
    { name: "Apple with peanut butter", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
    { name: "Greek yogurt", tags: ["vegetarian"] },
    { name: "Mixed nuts", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
    { name: "Protein bar", tags: ["vegetarian"] },
    { name: "Hummus with vegetables", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
    { name: "Rice cakes with almond butter", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
    { name: "Trail mix", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
    { name: "Edamame", tags: ["vegan", "vegetarian", "dairy_free", "gluten_free"] },
    { name: "Cottage cheese with fruit", tags: ["vegetarian", "gluten_free"] },
    { name: "Hard-boiled eggs", tags: ["vegetarian", "dairy_free", "gluten_free"] },
    { name: "Smoothie bowl", tags: ["vegetarian", "dairy_free", "gluten_free"] }
  ];

  // Filter function for food items
  const filterByPreferences = (items, preferences) => {
    if (!preferences || preferences.length === 0) {
      return items.slice(0, 3); // Return first 3 if no preferences
    }

    const filtered = items.filter(item => {
      // Safety check for item structure
      if (!item || !item.name || !item.tags) {
        return false;
      }
      
      return preferences.every(pref => {
        if (item.tags.includes(pref)) {
          return true;
        }
        // Additional filtering for items that don't have explicit tags
        const itemName = item.name.toLowerCase();
        if (pref === 'vegetarian') {
          const meatTerms = ['chicken', 'turkey', 'beef', 'salmon', 'tuna', 'fish'];
          return !meatTerms.some(term => itemName.includes(term));
        }
        if (pref === 'vegan') {
          const animalTerms = ['chicken', 'turkey', 'beef', 'salmon', 'tuna', 'fish', 'yogurt', 'cheese', 'egg'];
          return !animalTerms.some(term => itemName.includes(term));
        }
        if (pref === 'dairy_free') {
          const dairyTerms = ['yogurt', 'cheese', 'milk', 'cottage cheese'];
          return !dairyTerms.some(term => itemName.includes(term));
        }
        if (pref === 'gluten_free') {
          const glutenTerms = ['bread', 'pasta', 'bar']; // protein bars often contain gluten
          return !glutenTerms.some(term => itemName.includes(term));
        }
        return true;
      });
    });

    // Return filtered items, or fallback to all items if no matches
    const result = filtered.length > 0 ? filtered.slice(0, 3) : items.slice(0, 3);
    return result.map(item => item && item.name ? item.name : 'Unknown').filter(name => name !== 'Unknown');
  };

  const result = {
    food_suggestions: {
      proteins: filterByPreferences(allSuggestions.proteins, preferences),
      carbs: filterByPreferences(allSuggestions.carbs, preferences),
      fats: filterByPreferences(allSuggestions.fats, preferences),
      vegetables: filterByPreferences(allSuggestions.vegetables, preferences)
    },
    snack_suggestions: filterByPreferences(allSnacks, preferences)
  };
  
    return result;
  
  } catch (error) {
    console.error('[FOOD SUGGESTIONS] Error in filterFoodSuggestions:', error);
    console.error('[FOOD SUGGESTIONS] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Generate a personalized meal plan using Gemini AI
 */
async function generateGeminiMealPlan(targets, dietaryPreferences = []) {
  console.log('[GEMINI MEAL PLAN] Starting AI generation with targets:', targets);
  console.log('[GEMINI MEAL PLAN] Dietary preferences:', dietaryPreferences);

  try {
    // Create a comprehensive prompt for creative meal plan generation
    const prompt = `You are a world-class chef and nutritionist. Create a complete, creative daily meal plan that meets these nutritional targets. Be innovative and create delicious, varied meals from global cuisines without being restricted to specific ingredients.

DAILY NUTRITIONAL TARGETS:
- Total Calories: ${targets.daily_calories} kcal
- Protein: ${targets.protein_grams}g
- Carbohydrates: ${targets.carbs_grams}g
- Fat: ${targets.fat_grams}g

DIETARY PREFERENCES: ${dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') : 'No specific restrictions'}

CREATIVITY GUIDELINES:
- Draw inspiration from global cuisines (Italian, Asian, Mediterranean, Mexican, Indian, etc.)
- Create restaurant-quality meals that people actually want to eat
- Use fresh, whole foods and interesting flavor combinations
- Don't limit yourself to basic ingredients - be creative and diverse
- Each meal should be unique and exciting
- Focus on nutrition density and taste appeal

MEAL DISTRIBUTION:
- Breakfast: ~25% of daily calories (${Math.round(targets.daily_calories * 0.25)} kcal)
- Lunch: ~35% of daily calories (${Math.round(targets.daily_calories * 0.35)} kcal)
- Dinner: ~30% of daily calories (${Math.round(targets.daily_calories * 0.30)} kcal)
- Snack: ~10% of daily calories (${Math.round(targets.daily_calories * 0.10)} kcal)

Create 4 diverse, delicious meals that together meet the exact nutritional targets above.

Respond with a JSON array in this exact format:
[
  {
    "meal_type": "breakfast",
    "recipe_name": "Creative meal name",
    "prep_time": 15,
    "cook_time": 10,
    "servings": 1,
    "ingredients": [
      "1 cup oats",
      "1/2 cup blueberries",
      "1 tbsp almond butter"
    ],
    "instructions": [
      "Cook oats with water",
      "Add blueberries and almond butter",
      "Mix well and serve"
    ],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.25)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.25)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.30)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.25)}
    }
  },
  {
    "meal_type": "lunch",
    "recipe_name": "Creative meal name",
    "prep_time": 20,
    "cook_time": 15,
    "servings": 1,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.35)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.35)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.35)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.30)}
    }
  },
  {
    "meal_type": "dinner",
    "recipe_name": "Creative meal name",
    "prep_time": 25,
    "cook_time": 20,
    "servings": 1,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.30)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.30)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.25)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.35)}
    }
  },
  {
    "meal_type": "snack",
    "recipe_name": "Creative snack name",
    "prep_time": 5,
    "cook_time": 0,
    "servings": 1,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.10)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.10)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.10)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.10)}
    }
  }
]

REQUIREMENTS:
1. Create EXCITING, restaurant-quality meals from diverse global cuisines
2. Use creative ingredients and flavor combinations - don't be boring!
3. Each meal should be completely different in style and cuisine
4. Ensure nutritional targets are met as closely as possible
5. Provide realistic but interesting ingredients and detailed cooking instructions
6. Consider dietary preferences: ${dietaryPreferences.join(', ') || 'none'}
7. Make meals practical for home cooking but impressive in taste
8. Focus on meals that are Instagram-worthy and crave-able
9. Respond ONLY with valid JSON, no additional text

INSPIRATION EXAMPLES:
- Breakfast: Korean-style avocado toast, Mediterranean shakshuka, Japanese tamago bowl
- Lunch: Thai curry bowl, Mexican quinoa salad, Italian grain bowl
- Dinner: Moroccan tagine, Indian curry, Mediterranean fish, Asian stir-fry
- Snack: Greek yogurt parfait, energy balls, hummus plate, fruit and nut mix

Generate a complete, nutritionally balanced daily meal plan now!`;

    // Call Gemini AI using the working generateText method
    const text = await geminiTextService.generateText(prompt);

    console.log('[GEMINI MEAL PLAN] Raw response length:', text.length);
    console.log('[GEMINI MEAL PLAN] Response preview:', text.substring(0, 200) + '...');

    // Parse the JSON response
    let mealPlan;
    try {
      // Clean up the response
      let cleanResponse = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON array
      const jsonStart = cleanResponse.indexOf('[');
      const jsonEnd = cleanResponse.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      mealPlan = JSON.parse(cleanResponse);
      
      // Validate the structure
      if (!Array.isArray(mealPlan) || mealPlan.length === 0) {
        throw new Error('Invalid meal plan structure - not an array or empty');
      }
      
      // Validate each meal
      for (const meal of mealPlan) {
        if (!meal.meal_type || !meal.recipe_name || !meal.macros) {
          throw new Error(`Invalid meal structure: ${JSON.stringify(meal)}`);
        }
        
        // Ensure required macro fields exist
        if (typeof meal.macros.calories !== 'number' || 
            typeof meal.macros.protein_grams !== 'number' ||
            typeof meal.macros.carbs_grams !== 'number' ||
            typeof meal.macros.fat_grams !== 'number') {
          throw new Error(`Invalid macros in meal: ${meal.meal_type}`);
        }
      }
      
      console.log('[GEMINI MEAL PLAN] ✅ Successfully parsed and validated AI meal plan');
      console.log('[GEMINI MEAL PLAN] Generated meals:', mealPlan.map(m => `${m.meal_type}: ${m.recipe_name}`));
      
      return mealPlan;
      
    } catch (parseError) {
      console.error('[GEMINI MEAL PLAN] ❌ Failed to parse response:', parseError.message);
      console.error('[GEMINI MEAL PLAN] Raw response for debugging:', text);
      throw new Error(`Failed to parse Gemini meal plan response: ${parseError.message}`);
    }
    
  } catch (error) {
    console.error('[GEMINI MEAL PLAN] ❌ Error generating meal plan:', error.message);
    throw error;
  }
}


/**
 * Generate a mathematical meal plan based on target macros (no AI)
 * Distributes calories and macros across meals using predefined templates
 */
function generateMathematicalMealPlan(targets, dietaryPreferences = []) {
  console.log('[MEAL PLAN] generateMathematicalMealPlan called with targets:', targets);
  
  // Handle both old format (direct properties) and new format (daily_targets object)
  const targetData = targets.daily_targets || targets;
  console.log('[MEAL PLAN] Using target data:', targetData);
  
  const totalCalories = targetData.calories || targetData.daily_calories;
  const totalProtein = targetData.protein_grams;
  const totalCarbs = targetData.carbs_grams;
  const totalFat = targetData.fat_grams;

  console.log('[MEAL PLAN] Extracted values: calories:', totalCalories, 'protein:', totalProtein, 'carbs:', totalCarbs, 'fat:', totalFat);

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

  console.log('[MEAL PLAN] All targets validated successfully');

  // Meal distribution percentages (breakfast, lunch, dinner, snack)
  const mealDistribution = {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
    lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.30 },
    dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
    snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 }
  };
  
  // Predefined meal templates based on dietary preferences
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
        instructions: ["Hollow out peppers", "Mix rice and beans", "Stuff peppers and bake"]
      },
      vegan: {
        name: "Tofu Stir-Fry",
        prep_time: 15,
        cook_time: 15,
        ingredients: ["Extra-firm tofu", "Mixed vegetables", "Brown rice", "Soy sauce", "Sesame oil"],
        instructions: ["Press and cube tofu", "Stir-fry with vegetables", "Serve over rice"]
      }
    },
    snack: {
      standard: {
        name: "Protein Smoothie",
        prep_time: 5,
        cook_time: 0,
        ingredients: ["Protein powder", "Milk", "Banana", "Peanut butter"],
        instructions: ["Blend all ingredients", "Serve immediately"]
      },
      vegetarian: {
        name: "Greek Yogurt with Nuts",
        prep_time: 2,
        cook_time: 0,
        ingredients: ["Greek yogurt", "Mixed nuts", "Honey"],
        instructions: ["Top yogurt with nuts", "Drizzle with honey"]
      },
      vegan: {
        name: "Hummus and Vegetables",
        prep_time: 5,
        cook_time: 0,
        ingredients: ["Hummus", "Carrot sticks", "Cucumber", "Bell pepper"],
        instructions: ["Cut vegetables", "Serve with hummus"]
      }
    }
  };
  
  // Determine dietary preference template
  const isVegan = dietaryPreferences.includes('vegan');
  const isVegetarian = dietaryPreferences.includes('vegetarian') || isVegan;
  const templateType = isVegan ? 'vegan' : (isVegetarian ? 'vegetarian' : 'standard');
  
  // Generate meal plan
  const mealPlan = [];
  
  Object.entries(mealDistribution).forEach(([mealType, distribution]) => {
    const template = mealTemplates[mealType][templateType];
    
    // Calculate macros for this meal
    const mealCalories = Math.round(totalCalories * distribution.calories);
    const mealProtein = Math.round(totalProtein * distribution.protein);
    const mealCarbs = Math.round(totalCarbs * distribution.carbs);
    const mealFat = Math.round(totalFat * distribution.fat);
    
    mealPlan.push({
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
      }
    });
  });
  
  return mealPlan;
}

// Nutrition plan generation using mathematical calculations (no AI)
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
          // Handle age calculation - support both direct age and birthday
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
            'moderate': 1.55,  // Support both 'moderate' and 'moderately_active'
            'moderately_active': 1.55,
      'active': 1.725,   // Map 'active' to 'very_active' multiplier
            'very_active': 1.725,
            'extra_active': 1.9
          };

          const activityLevel = profile.activity_level || 'moderate';
          const activityMultiplier = activityMultipliers[activityLevel] || 1.55;
          const tdee = bmr * activityMultiplier;

    // Map goal_type to fitness_strategy if fitness_strategy is not provided
    let fitnessStrategy = profile.fitness_strategy;
    if (!fitnessStrategy && profile.goal_type) {
      const goalTypeMapping = {
        'weight_loss': 'weight_loss',
        'fat_loss': 'fat_loss',
        'muscle_gain': 'muscle_gain',
        'weight_gain': 'weight_gain',
        'maintenance': 'maintenance',
        'body_recomposition': 'recomp'
      };
      fitnessStrategy = goalTypeMapping[profile.goal_type] || 'maintenance';
    }

          // Calculate goal-adjusted calories using user's fitness strategy
          const goalAdjustmentResult = calculateGoalCalories(
            tdee, 
      fitnessStrategy || 'maintenance',
            0,  // Legacy parameter - goal_muscle_gain column removed
            profile.weight || 70,
            profile.body_fat || 20
          );
          const adjustedCalories = goalAdjustmentResult.goalCalories;
          const calorieAdjustmentReason = goalAdjustmentResult.adjustmentReason;

    // Calculate strategy-based macro targets
    // Prioritize primary_goal for macro ratios when it conflicts with fitness_strategy
    let macroStrategy = profile.fitness_strategy || 'maintenance';
    if (profile.primary_goal === 'muscle_gain' && profile.fitness_strategy === 'recomp') {
      macroStrategy = 'muscle_gain'; // Use muscle_gain macros for better muscle building
    }
          const macroRatios = getMacroRatiosForStrategy(macroStrategy);
    const dailyTargets = {
      calories: Math.round(adjustedCalories),
      protein: Math.round((adjustedCalories * macroRatios.protein / 100) / 4),
      carbs: Math.round((adjustedCalories * macroRatios.carbs / 100) / 4),
      fat: Math.round((adjustedCalories * macroRatios.fat / 100) / 9),
      // Add database-compatible property names for consistency
      daily_calories: Math.round(adjustedCalories),
      protein_grams: Math.round((adjustedCalories * macroRatios.protein / 100) / 4),
      carbs_grams: Math.round((adjustedCalories * macroRatios.carbs / 100) / 4),
      fat_grams: Math.round((adjustedCalories * macroRatios.fat / 100) / 9)
    };

    // Metabolic calculations object
    const metabolicCalculations = {
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            activity_level: activityLevel,
            activity_multiplier: activityMultiplier,
            goal_calories: Math.round(adjustedCalories),
            goal_adjustment: goalAdjustmentResult.adjustment,
            goal_adjustment_reason: goalAdjustmentResult.adjustmentReason,
            adjusted_calories: Math.round(adjustedCalories), // Keep for backward compatibility
            calorie_adjustment_reason: calorieAdjustmentReason, // Keep for backward compatibility
            formula: 'Henry/Oxford Equation'
          };

    console.log('[NUTRITION] Traditional calculations completed:', {
      bmr: metabolicCalculations.bmr,
      tdee: metabolicCalculations.tdee,
      goal_calories: metabolicCalculations.goal_calories,
      macro_targets: dailyTargets
    });

    // Micronutrients targets
    const micronutrientsTargets = {
      sodium_mg: 2300,
      potassium_mg: 3400,
      vitamin_d_mcg: 15,
      calcium_mg: 1000,
      iron_mg: 8,
      vitamin_c_mg: 90,
      fiber_g: 25
    };

    // Save to database if supabase is available and user_id is provided
    if (supabase && profile.user_id) {
      try {
        console.log('[NUTRITION] Saving nutrition plan to database for user:', profile.user_id);
        
        // First deactivate any existing active plans for this user
        const { error: deactivateError } = await supabase
          .from('nutrition_plans')
          .update({ status: 'archived' })
          .eq('user_id', profile.user_id)
          .eq('status', 'active');
        
        if (deactivateError) {
          console.warn('[NUTRITION] Error deactivating existing plans:', deactivateError);
        }

        // Insert the new nutrition plan
        const { data: savedPlan, error: planError } = await supabase
          .from('nutrition_plans')
          .insert({
            user_id: profile.user_id,
            plan_name: mockPlanName,
            goal_type: profile.primary_goal,
            status: 'active',
            preferences: {
              dietary: preferences || [],
              intolerances: []
            },
            daily_targets: dailyTargets,
            micronutrients_targets: micronutrientsTargets
          })
          .select()
          .single();

        if (planError) {
          console.error('[NUTRITION] Error saving nutrition plan:', planError);
          throw planError;
        }

        console.log('[NUTRITION] Successfully saved nutrition plan with ID:', savedPlan.id);

        // Insert initial historical nutrition targets - use consistent calorie values
        const { data: savedTargets, error: targetsError } = await supabase
          .from('historical_nutrition_targets')
          .insert({
            nutrition_plan_id: savedPlan.id,
            start_date: new Date().toISOString().split('T')[0],
            end_date: null,
            daily_calories: dailyTargets.daily_calories, // Use the unified calorie value
            protein_grams: dailyTargets.protein_grams,
            carbs_grams: dailyTargets.carbs_grams,
            fat_grams: dailyTargets.fat_grams,
            micronutrients_targets: micronutrientsTargets,
            reasoning: `Initial plan created using scientific formulas: BMR (${Math.round(bmr)} cal) × Activity Factor (${activityMultiplier}) = ${Math.round(tdee)} TDEE. ${calorieAdjustmentReason}`
          })
          .select()
          .single();

        if (targetsError) {
          console.error('[NUTRITION] Error saving nutrition targets:', targetsError);
          throw targetsError;
        }

        console.log('[NUTRITION] Successfully saved nutrition targets with ID:', savedTargets.id);

        // Return nutrition plan with database IDs
        return res.json({
          success: true,
          message: 'Nutrition plan generated and saved successfully',
          saved_to_database: true,
          id: savedPlan.id,
          plan_name: mockPlanName,
          user_id: profile.user_id,
          goal_type: profile.primary_goal,
          status: 'active',
          preferences: {
            dietary: preferences || [],
            intolerances: []
          },
          created_at: savedPlan.created_at,
          updated_at: savedPlan.updated_at,
          metabolic_calculations: metabolicCalculations,
          daily_targets: dailyTargets,
          micronutrients_targets: micronutrientsTargets,
          daily_schedule: generateMealTemplates(dailyTargets, profile.fitness_strategy || 'maintenance', preferences || []),
          ...filterFoodSuggestions(preferences || [])
        });

      } catch (dbError) {
        console.error('[NUTRITION] Database error, returning plan without saving:', dbError);
        // Continue to fallback response below
      }
    } else if (!profile.user_id) {
      console.log('[NUTRITION] No user_id provided in profile, skipping database save');
    } else {
      console.log('[NUTRITION] Supabase not available, skipping database save');
    }

    // Fallback: Generate a unique ID for the plan if database save failed
    const planId = `traditional-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;

    // Return nutrition plan with traditional calculations (fallback)
        return res.json({
          success: true,
      message: 'Nutrition plan generated with mathematical calculations. Database not configured - set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY for persistence.',
      saved_to_database: false,
      id: planId,
      plan_name: mockPlanName,
      user_id: profile.user_id || profile.id,
      goal_type: profile.primary_goal,
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
      daily_schedule: generateMealTemplates(dailyTargets, profile.fitness_strategy || 'maintenance', preferences || []),
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
  // Handle guest users - return default score
  if (userId === 'guest-user') {
    console.log('[HABIT SCORE] Guest user detected, returning default score');
    return 0;
  }

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
        .select('daily_targets')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (nutritionPlan && nutritionPlan.daily_targets) {
        const targetCalories = nutritionPlan.daily_targets.calories || 2000;
        const targetProtein = nutritionPlan.daily_targets.protein_grams || 150;

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

  // Handle guest users - return success without database operations
  if (userId === 'guest-user') {
    console.log('[LOG METRIC] Guest user detected, returning success without database operations');
    return res.json({ 
      success: true, 
      message: 'Metrics logged successfully',
      habitScore: 0
    });
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

app.get('/api/recent-nutrition/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Handle guest users - return empty data
  if (userId === 'guest-user') {
    console.log('[RECENT NUTRITION] Guest user detected, returning empty data');
    return res.json({ success: true, data: [] });
  }

  try {
    const { data, error } = await supabase
      .from('nutrition_log_entries')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('[RECENT NUTRITION] Error fetching entries:', error);
      throw new Error(error.message);
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Legacy AI prompt function removed - nutrition re-evaluation now uses mathematical calculations only

function composeDailyMealPlanPrompt(targets, preferences) {
  // Ensure we use consistent calorie values - prioritize daily_calories, fallback to calories
  const targetCalories = targets.daily_calories || targets.calories || 2000;
  const targetProtein = targets.protein_grams || targets.protein || 150;
  const targetCarbs = targets.carbs_grams || targets.carbs || 200;
  const targetFat = targets.fat_grams || targets.fat || 65;

  return `You are an expert nutritionist and chef creating a complete personalized daily meal plan with detailed recipes.

DAILY NUTRITION TARGETS:
- Total Calories: ${targetCalories} kcal
- Protein: ${targetProtein}g
- Carbohydrates: ${targetCarbs}g
- Fat: ${targetFat}g

DIETARY PREFERENCES: ${preferences ? preferences.join(', ') : 'None specified'}

MEAL DISTRIBUTION GUIDELINES:
- Breakfast: ~25% of daily calories (${Math.round(targetCalories * 0.25)} kcal)
- Lunch: ~35% of daily calories (${Math.round(targetCalories * 0.35)} kcal)
- Dinner: ~30% of daily calories (${Math.round(targetCalories * 0.30)} kcal)
- Snack: ~10% of daily calories (${Math.round(targetCalories * 0.10)} kcal)

REQUIREMENTS:
1. Create exactly 4 complete meals: breakfast, lunch, dinner, and snack
2. Each meal must include FULL recipe details: ingredients with quantities, step-by-step instructions, prep/cook times
3. Calculate accurate nutritional information for each ingredient
4. Total calories must be within ±10% of target (${targetCalories} kcal)
5. Distribute protein, carbs, and fat proportionally across meals
6. Consider dietary preferences and create realistic, appealing meals
7. Make recipes practical and achievable for home cooking

CRITICAL: Return ONLY valid JSON in this exact format:
{
  "meal_plan": [
    {
      "meal_type": "breakfast",
      "recipe_name": "Creative, appealing recipe name",
      "prep_time": 10,
      "cook_time": 15,
      "servings": 1,
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": "amount with unit (e.g., 150g, 1 cup, 2 tbsp)",
          "calories": 120,
          "protein": 8.5,
          "carbs": 15.2,
          "fat": 4.1
        }
      ],
      "instructions": [
        "Step 1: Detailed cooking instruction",
        "Step 2: Another detailed instruction",
        "Step 3: Continue with clear steps"
      ],
      "macros": {
        "calories": 500,
        "protein_grams": 25,
        "carbs_grams": 45,
        "fat_grams": 18
      }
    },
    {
      "meal_type": "lunch",
      "recipe_name": "Creative, appealing recipe name",
      "prep_time": 15,
      "cook_time": 20,
      "servings": 1,
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": "amount with unit",
          "calories": 150,
          "protein": 12.0,
          "carbs": 20.5,
          "fat": 6.2
        }
      ],
      "instructions": [
        "Step 1: Detailed cooking instruction",
        "Step 2: Another detailed instruction"
      ],
      "macros": {
        "calories": 700,
        "protein_grams": 35,
        "carbs_grams": 65,
        "fat_grams": 25
      }
    },
    {
      "meal_type": "dinner",
      "recipe_name": "Creative, appealing recipe name",
      "prep_time": 20,
      "cook_time": 25,
      "servings": 1,
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": "amount with unit",
          "calories": 200,
          "protein": 15.0,
          "carbs": 25.0,
          "fat": 8.0
        }
      ],
      "instructions": [
        "Step 1: Detailed cooking instruction",
        "Step 2: Another detailed instruction"
      ],
      "macros": {
        "calories": 600,
        "protein_grams": 30,
        "carbs_grams": 55,
        "fat_grams": 22
      }
    },
    {
      "meal_type": "snack",
      "recipe_name": "Creative, appealing recipe name",
      "prep_time": 5,
      "cook_time": 0,
      "servings": 1,
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": "amount with unit",
          "calories": 80,
          "protein": 5.0,
          "carbs": 10.0,
          "fat": 3.0
        }
      ],
      "instructions": [
        "Step 1: Simple preparation instruction"
      ],
      "macros": {
        "calories": 200,
        "protein_grams": 10,
        "carbs_grams": 20,
        "fat_grams": 8
      }
    }
  ]
}

IMPORTANT JSON FORMATTING RULES:
1. Use ONLY double quotes (") for strings, never single quotes (')
2. Ensure all property names are quoted
3. Do not include trailing commas
4. Use proper JSON syntax - no comments
5. Ensure all arrays and objects are properly closed
6. Do not truncate the response - provide complete JSON

Do not include any explanations or additional text - return only the JSON object.`;
}

function validateDailyMealPlan(mealPlan, targets) {
  if (!Array.isArray(mealPlan) || mealPlan.length !== 4) {
    console.log('[VALIDATION] Meal plan must be an array with exactly 4 meals');
    return false;
  }

  const requiredMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const actualMealTypes = mealPlan.map(meal => meal.meal_type?.toLowerCase()).sort();
  const expectedMealTypes = requiredMealTypes.sort();
  
  if (JSON.stringify(actualMealTypes) !== JSON.stringify(expectedMealTypes)) {
    console.log('[VALIDATION] Missing required meal types. Expected:', expectedMealTypes, 'Got:', actualMealTypes);
    return false;
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const meal of mealPlan) {
    // Check required fields
    if (!meal.meal_type || !meal.recipe_name || !meal.macros) {
      console.log('[VALIDATION] Missing required meal fields:', meal);
      return false;
    }

    // Check recipe structure
    if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
      console.log('[VALIDATION] Meal must have ingredients array:', meal.meal_type);
      return false;
    }

    if (!Array.isArray(meal.instructions) || meal.instructions.length === 0) {
      console.log('[VALIDATION] Meal must have instructions array:', meal.meal_type);
      return false;
    }

    // Check ingredient structure
    for (const ingredient of meal.ingredients) {
      if (!ingredient.name || !ingredient.quantity || 
          typeof ingredient.calories !== 'number' || 
          typeof ingredient.protein !== 'number' ||
          typeof ingredient.carbs !== 'number' || 
          typeof ingredient.fat !== 'number') {
        console.log('[VALIDATION] Invalid ingredient structure:', ingredient);
        return false;
      }
    }

    // Check macros
    const macros = meal.macros;
    if (typeof macros.calories !== 'number' || macros.calories <= 0 ||
        typeof macros.protein_grams !== 'number' || macros.protein_grams < 0 ||
        typeof macros.carbs_grams !== 'number' || macros.carbs_grams < 0 ||
        typeof macros.fat_grams !== 'number' || macros.fat_grams < 0) {
      console.log('[VALIDATION] Invalid macros for meal:', meal.meal_type, macros);
      return false;
    }

    totalCalories += macros.calories;
    totalProtein += macros.protein_grams;
    totalCarbs += macros.carbs_grams;
    totalFat += macros.fat_grams;
  }

  // Check total calories are within 15% of target (more lenient than 10% for AI generation)
  const calorieTarget = targets.daily_calories || targets.calories || 2000;
  const calorieVariance = Math.abs(totalCalories - calorieTarget) / calorieTarget;
  if (calorieVariance > 0.15) {
    console.log(`[VALIDATION] Total calories ${totalCalories} too far from target ${calorieTarget} (${Math.round(calorieVariance * 100)}% variance)`);
    return false;
  }

  console.log(`[VALIDATION] ✅ Meal plan validated successfully. Calories: ${totalCalories}/${calorieTarget} (${Math.round(calorieVariance * 100)}% variance)`);
  return true;
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
- Goal: ${userProfile.primaryGoal || userProfile.goal_type}

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
- Primary Goal: ${userProfile.primaryGoal || userProfile.goal_type || 'a healthier lifestyle'}

TRIGGER EVENT: "${triggerEvent}"

INSTRUCTIONS:
1.  Based on the specific "TRIGGER EVENT", write a 1-2 sentence motivational message.
2.  The message should be personal, referencing the user's goal if it makes sense.
3.  The tone should be uplifting, but not cheesy or generic.
4.  You MUST return ONLY a valid JSON object with a single key, "message".

EXAMPLE (for '7_day_logging_streak'):
{
  "message": "That's 7 days in a row of tracking your nutrition, ${userProfile.full_name}! That level of consistency is how you build lasting habits and achieve your goal of ${userProfile.primaryGoal || userProfile.goal_type}."
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
    console.log('[RE-EVALUATE PLAN] Using mathematical calculations instead of AI');

    // 1. Fetch user profile and current plan data
    const [
      { data: userProfile, error: profileError },
      { data: currentPlan, error: planError },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('nutrition_plans').select('id, goal_type').eq('user_id', userId).eq('status', 'active').single(),
    ]);

    if (profileError || planError || !currentPlan || !userProfile) {
      console.error({ profileError, planError });
      throw new Error('Failed to fetch user profile or current nutrition plan.');
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

    // 2. Perform mathematical calculations
    // Calculate age from birthday
    let age;
    if (userProfile.age) {
      age = userProfile.age;
    } else if (userProfile.birthday) {
      const birthDate = new Date(userProfile.birthday);
      age = new Date().getFullYear() - birthDate.getFullYear();
    } else {
      age = 30; // Default fallback
    }

    // Calculate BMR using Henry/Oxford equation (metric)
    const weight = userProfile.weight || 70;
    const height = userProfile.height || 170;
    const gender = (userProfile.gender || 'male').toLowerCase();

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

    // Calculate TDEE
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extra_active': 1.9
    };

    const activityLevel = userProfile.activity_level || 'moderately_active';
    const activityMultiplier = activityMultipliers[activityLevel] || 1.55;
    const tdee = bmr * activityMultiplier;

    // Map goal_type to fitness_strategy if fitness_strategy is not provided
    let fitnessStrategy = userProfile.fitness_strategy;
    if (!fitnessStrategy && currentPlan.goal_type) {
      const goalTypeMapping = {
        'weight_loss': 'weight_loss',
        'fat_loss': 'fat_loss',
        'muscle_gain': 'muscle_gain',
        'weight_gain': 'weight_gain',
        'maintenance': 'maintenance',
        'body_recomposition': 'recomp'
      };
      fitnessStrategy = goalTypeMapping[currentPlan.goal_type] || 'maintenance';
    }

    // Calculate goal-adjusted calories using fitness strategy
    const goalAdjustmentResult = calculateGoalCalories(
      tdee, 
      fitnessStrategy || 'maintenance',
      0,  // Legacy parameter
      weight,
      userProfile.body_fat || 20
    );
    const adjustedCalories = goalAdjustmentResult.goalCalories;
    const calorieAdjustmentReason = goalAdjustmentResult.adjustmentReason;

    // Calculate strategy-based macro targets
    // Prioritize primary_goal for macro ratios when it conflicts with fitness_strategy
    let macroStrategy = fitnessStrategy || 'maintenance';
    if (userProfile.primary_goal === 'muscle_gain' && fitnessStrategy === 'recomp') {
      macroStrategy = 'muscle_gain'; // Use muscle_gain macros for better muscle building
    }
    const macroRatios = getMacroRatiosForStrategy(macroStrategy);
    const proteinGrams = Math.round((adjustedCalories * macroRatios.protein / 100) / 4);
    const carbsGrams = Math.round((adjustedCalories * macroRatios.carbs / 100) / 4);
    const fatGrams = Math.round((adjustedCalories * macroRatios.fat / 100) / 9);

    // Standard micronutrient targets
    const micronutrientsTargets = {
      sodium_mg: 2300,
      potassium_mg: 4700,
      calcium_mg: 1000,
      iron_mg: gender === 'female' ? 18 : 8,
      vitamin_d_mcg: 20,
      vitamin_c_mg: 90,
      fiber_g: 25
    };

    const reasoning = `Recalculated using scientific formulas: BMR (${Math.round(bmr)} cal) × Activity Factor (${activityMultiplier}) = ${Math.round(tdee)} TDEE. ${calorieAdjustmentReason}`;

    console.log('[RE-EVALUATE PLAN] Mathematical calculation results:', {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      goalCalories: Math.round(adjustedCalories),
      adjustment: goalAdjustmentResult.adjustment,
      macros: { proteinGrams, carbsGrams, fatGrams }
    });

    // 3. Update the database
    // End the current target period
    await supabase.from('historical_nutrition_targets').update({ 
      end_date: new Date().toISOString().split('T')[0] 
    }).eq('id', currentTargets.id);
    
    // Insert the new target period
    const { data: newTargetEntry, error: newTargetError } = await supabase.from('historical_nutrition_targets').insert({
      nutrition_plan_id: currentPlan.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      daily_calories: Math.round(adjustedCalories),
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams,
      micronutrients_targets: micronutrientsTargets,
      reasoning: reasoning,
    }).select().single();

    if (newTargetError) throw newTargetError;

    res.json({ success: true, new_targets: newTargetEntry });

  } catch (error) {
    console.error('[RE-EVALUATE PLAN] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to build the daily meal plan prompt for Gemini
function buildDailyMealPlanPrompt(dailyCalories, proteinGrams, carbsGrams, fatGrams, dietaryPreferences = [], cuisinePreference) {
  const dietaryText = dietaryPreferences.length > 0 
    ? `\nDietary restrictions/preferences: ${dietaryPreferences.join(', ')}`
    : '';
  
  const cuisineText = cuisinePreference 
    ? `\nPreferred cuisine style: ${cuisinePreference}`
    : '\nCuisine variety: Mix of different international cuisines for variety';

  return `Create a complete daily meal plan that meets these exact nutritional targets:

DAILY NUTRITIONAL TARGETS:
- Total Calories: ${dailyCalories} kcal
- Protein: ${proteinGrams}g  
- Carbohydrates: ${carbsGrams}g
- Fat: ${fatGrams}g${dietaryText}${cuisineText}

MEAL DISTRIBUTION REQUIREMENTS:
- Generate 4 meals: Breakfast, Lunch, Dinner, and 1 Snack
- Distribute calories and macros appropriately across meals
- Each meal should be from a different cuisine/cooking style for variety
- Each meal must include a complete recipe with cooking instructions

RECIPE REQUIREMENTS FOR EACH MEAL:
- Creative, appetizing meal names
- Realistic prep and cook times
- Detailed ingredient list with amounts
- Step-by-step cooking instructions (4-6 steps minimum)
- Accurate nutritional breakdown per ingredient
- Practical and achievable recipes

Please respond with a JSON object in this EXACT format:
{
  "total_nutrition": {
    "calories": ${dailyCalories},
    "protein": ${proteinGrams},
    "carbs": ${carbsGrams},
    "fat": ${fatGrams},
    "fiber": estimated_total_fiber,
    "sugar": estimated_total_sugar
  },
  "meals": [
    {
      "meal_type": "breakfast",
      "name": "Creative breakfast name",
      "cuisine": "Cuisine type (e.g., American, Mediterranean, Asian)",
      "prep_time": 10,
      "cook_time": 15,
      "servings": 1,
      "ingredients": [
        {
          "ingredient": "ingredient name",
          "amount": "amount with unit",
          "calories": ingredient_calories,
          "protein": ingredient_protein,
          "carbs": ingredient_carbs,
          "fat": ingredient_fat
        }
      ],
      "instructions": [
        "Step 1: Detailed cooking instruction",
        "Step 2: Detailed cooking instruction",
        "Step 3: Detailed cooking instruction",
        "Step 4: Detailed cooking instruction"
      ],
      "nutrition": {
        "calories": meal_total_calories,
        "protein": meal_total_protein,
        "carbs": meal_total_carbs,
        "fat": meal_total_fat,
        "fiber": meal_estimated_fiber,
        "sugar": meal_estimated_sugar
      }
    }
  ],
  "cuisine_variety": ["List of cuisines used"],
  "cooking_tips": [
    "Helpful cooking tip 1",
    "Helpful cooking tip 2", 
    "Helpful cooking tip 3"
  ]
}

CRITICAL REQUIREMENTS:
1. The sum of all meal calories must equal ${dailyCalories} (±50 calories acceptable)
2. The sum of all meal macros must match the targets (±5g acceptable)
3. Each meal must be from a different cuisine for variety
4. All recipes must be practical and achievable
5. Include accurate nutritional estimates for each ingredient
6. Provide detailed, step-by-step cooking instructions
7. Respond ONLY with valid JSON, no additional text
8. Make each meal delicious and nutritious!`;
}

// Helper function to parse Gemini's daily meal plan response
function parseGeminiMealPlanResponse(responseText) {
  try {
    // Clean up the response - remove any markdown or extra text
    let cleanResponse = responseText.trim();
    
    // Remove markdown code blocks if present
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to find JSON within the response
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    }
    
    const mealPlan = JSON.parse(cleanResponse);
    
    // Validate required fields
    if (!mealPlan.total_nutrition || !mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      throw new Error('Invalid meal plan format - missing required fields');
    }
    
    // Validate each meal has required fields
    for (const meal of mealPlan.meals) {
      if (!meal.name || !meal.ingredients || !meal.instructions || !meal.nutrition) {
        throw new Error(`Invalid meal format - missing required fields in meal: ${meal.name || 'unnamed'}`);
      }
    }
    
    console.log('[AI MEAL PLAN] Successfully parsed meal plan with', mealPlan.meals.length, 'meals');
    return mealPlan;
    
  } catch (error) {
    console.error('[AI MEAL PLAN] Error parsing Gemini response:', error);
    console.error('[AI MEAL PLAN] Raw response:', responseText.substring(0, 500) + '...');
    
    throw new Error(`Failed to parse Gemini meal plan response: ${error.message}`);
  }
}
// NEW: AI-powered daily meal plan generation with recipes
app.post('/api/generate-daily-meal-plan-ai', async (req, res) => {
  console.log('[AI MEAL PLAN] Received request for AI-powered meal plan generation');
  const { 
    dailyCalories, 
    proteinGrams, 
    carbsGrams, 
    fatGrams, 
    dietaryPreferences = [], 
    cuisinePreference 
  } = req.body;

  if (!dailyCalories || !proteinGrams || !carbsGrams || !fatGrams) {
    console.log('[AI MEAL PLAN] Missing required nutrition targets');
    return res.status(400).json({ 
      success: false, 
      error: 'Daily nutrition targets are required (calories, protein, carbs, fat).' 
    });
  }

  try {
    console.log('[AI MEAL PLAN] Generating meal plan with Gemini AI');
    console.log('[AI MEAL PLAN] Targets:', { dailyCalories, proteinGrams, carbsGrams, fatGrams });
    console.log('[AI MEAL PLAN] Preferences:', { dietaryPreferences, cuisinePreference });

    // Check if Gemini service is available
    if (!geminiTextService) {
      throw new Error('Gemini AI service is not available');
    }

    // Create targets object in the expected format
    const targets = {
      daily_calories: dailyCalories,
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams
    };

    // Use the working generateGeminiMealPlan function
    const mealPlan = await generateGeminiMealPlan(targets, dietaryPreferences);
    
    console.log('[AI MEAL PLAN] Successfully generated meal plan with', mealPlan.length, 'meals');
    
    // Calculate total nutrition
    const totalNutrition = mealPlan.reduce((total, meal) => ({
      calories: total.calories + meal.macros.calories,
      protein_grams: total.protein_grams + meal.macros.protein_grams,
      carbs_grams: total.carbs_grams + meal.macros.carbs_grams,
      fat_grams: total.fat_grams + meal.macros.fat_grams
    }), { calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0 });

    console.log('[AI MEAL PLAN] Total calories:', totalNutrition.calories);

    res.json({
      success: true,
      meal_plan: mealPlan,
      total_nutrition: totalNutrition,
      method: 'gemini_ai',
      aiProvider: 'gemini',
      used_ai: true,
      message: 'Daily meal plan generated successfully with AI-powered recipes'
    });

  } catch (error) {
    console.error('[AI MEAL PLAN] Error generating meal plan:', error.message);
    console.log('[AI MEAL PLAN] Falling back to mathematical meal plan generation');
    
    try {
      // Fallback to mathematical meal plan generation
      const targets = {
        daily_calories: dailyCalories,
        protein_grams: proteinGrams,
        carbs_grams: carbsGrams,
        fat_grams: fatGrams
      };
      
      const fallbackMealPlan = await generateMathematicalMealPlan(targets);
      
      console.log('[AI MEAL PLAN] Successfully generated fallback meal plan with', fallbackMealPlan.length, 'meals');
      
      // Calculate total nutrition
      const totalNutrition = fallbackMealPlan.reduce((total, meal) => ({
        calories: total.calories + meal.macros.calories,
        protein_grams: total.protein_grams + meal.macros.protein_grams,
        carbs_grams: total.carbs_grams + meal.macros.carbs_grams,
        fat_grams: total.fat_grams + meal.macros.fat_grams
      }), { calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0 });

      res.json({
        success: true,
        meal_plan: fallbackMealPlan,
        total_nutrition: totalNutrition,
        method: 'mathematical_fallback',
        aiProvider: 'fallback',
        used_ai: false,
        message: 'Daily meal plan generated successfully using mathematical approach (AI temporarily unavailable)',
        fallback_reason: error.message
      });
      
    } catch (fallbackError) {
      console.error('[AI MEAL PLAN] Fallback generation also failed:', fallbackError.message);
      res.status(500).json({
        success: false,
        error: 'Both AI and fallback meal plan generation failed',
        ai_error: error.message,
        fallback_error: fallbackError.message
      });
    }
  }
});

app.post('/api/generate-daily-meal-plan', async (req, res) => {
  console.log('[MEAL PLAN] Received request for user:', req.body.userId);
  const { userId } = req.body;
  if (!userId) {
    console.log('[MEAL PLAN] Missing userId in request');
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Handle guest users early - skip all database operations
  if (userId === 'guest-user') {
    console.log('[MEAL PLAN] Guest user detected, providing default meal plan');
    
    // Use standard nutritional targets for an average adult
    const defaultTargets = {
      calories: 2000,
      protein: 150,  // grams
      carbs: 250,    // grams  
      fat: 67        // grams
    };

    const mealPlan = [
      {
        meal_type: 'breakfast',
        recipe_name: 'Protein Oatmeal Bowl',
        prep_time: 5,
        cook_time: 10,
        servings: 1,
        ingredients: ['Rolled oats', 'Protein powder', 'Banana', 'Almond butter', 'Milk'],
        instructions: ['Cook oats with milk', 'Mix in protein powder', 'Top with banana and almond butter'],
        macros: {
          calories: 500,
          protein_grams: 38,
          carbs_grams: 60,
          fat_grams: 17
        }
      },
      {
        meal_type: 'lunch', 
        recipe_name: 'Grilled Chicken Salad',
        prep_time: 15,
        cook_time: 20,
        servings: 1,
        ingredients: ['Chicken breast', 'Mixed greens', 'Quinoa', 'Avocado', 'Olive oil dressing'],
        instructions: ['Grill chicken breast', 'Cook quinoa', 'Assemble salad with all ingredients'],
        macros: {
          calories: 700,
          protein_grams: 53,
          carbs_grams: 70,
          fat_grams: 20
        }
      },
      {
        meal_type: 'dinner',
        recipe_name: 'Baked Salmon with Vegetables', 
        prep_time: 10,
        cook_time: 25,
        servings: 1,
        ingredients: ['Salmon fillet', 'Sweet potato', 'Asparagus', 'Olive oil', 'Herbs'],
        instructions: ['Bake salmon at 400°F', 'Roast sweet potato and asparagus', 'Season with herbs'],
        macros: {
          calories: 600,
          protein_grams: 45,
          carbs_grams: 50,
          fat_grams: 23
        }
      },
      {
        meal_type: 'snack',
        recipe_name: 'Protein Smoothie',
        prep_time: 5,
        cook_time: 0,
        servings: 1,
        ingredients: ['Protein powder', 'Milk', 'Banana', 'Peanut butter'],
        instructions: ['Blend all ingredients', 'Serve immediately'],
        macros: {
          calories: 200,
          protein_grams: 15,
          carbs_grams: 20,
          fat_grams: 7
        }
      }
    ];

    return res.json({
      success: true,
      meal_plan: mealPlan,
      used_ai: false,
      message: 'Generated default meal plan. For personalized plans, please create a nutrition plan first.',
      is_default: true
    });
  }

  let currentTargets = null; // Declare at function scope
  let currentPlan = null;    // Declare at function scope

  try {
    // Check if Supabase is configured
    console.log('[MEAL PLAN] Checking Supabase configuration:', !!supabase);
    if (!supabase) {
      console.log('[MEAL PLAN] Supabase not configured, returning configuration error');
      return res.status(400).json({
        success: false,
        error: 'Database not configured. Please set up EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables to enable database features, or generate a nutrition plan first to work in offline mode.'
      });
    }

    // 1. Fetch user's most recent active plan
    const { data: planData, error: planError } = await supabase
      .from('nutrition_plans')
      .select('id, preferences')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !planData) {
      console.log('[MEAL PLAN] Plan query error:', planError);
      console.log('[MEAL PLAN] Current plan data:', planData);
      
      // Instead of failing, generate a default meal plan with standard values
      console.log('[MEAL PLAN] No active nutrition plan found, generating default meal plan');
      
      // Use standard nutritional targets for an average adult
      const defaultTargets = {
        daily_calories: 2000,
        protein_grams: 150,
        carbs_grams: 200,
        fat_grams: 67
      };
      
      console.log('[MEAL PLAN] Using default nutritional targets:', defaultTargets);
      
      // Create a temporary nutrition plan for this user
      console.log('[MEAL PLAN] Creating temporary nutrition plan for user without one');
      
      const tempPlanData = {
        user_id: userId,
        plan_name: 'Default Nutrition Plan',
        goal_type: 'maintenance',
        status: 'active',
        preferences: {
          dietary: [],
          intolerances: []
        },
        daily_targets: {
          calories: defaultTargets.daily_calories,
          protein_grams: defaultTargets.protein_grams,
          carbs_grams: defaultTargets.carbs_grams,
          fat_grams: defaultTargets.fat_grams,
          fiber_grams: 25,
          water_liters: 2.5
        },
        metabolic_calculations: {
          bmr: 1600,
          tdee: 2000,
          activity_multiplier: 1.25
        },
        micronutrients_targets: {
          vitamin_c_mg: 90,
          vitamin_d_iu: 600,
          calcium_mg: 1000,
          iron_mg: 8,
          magnesium_mg: 400,
          zinc_mg: 11
        }
      };

      const { data: tempPlan, error: tempPlanError } = await supabase
        .from('nutrition_plans')
        .insert(tempPlanData)
        .select()
        .single();

      if (tempPlanError) {
        console.error('[MEAL PLAN] Error creating temporary nutrition plan:', tempPlanError);
        // Fallback to returning meal plan without database storage
        const mealPlan = generateMathematicalMealPlan(defaultTargets, []);
        return res.json({
          success: true,
          meal_plan: mealPlan,
          used_ai: false,
          message: 'Generated default meal plan. For personalized plans, please create a nutrition plan first.',
          is_default: true
        });
      }

      console.log('[MEAL PLAN] Successfully created temporary nutrition plan:', tempPlan.id);
      currentPlan = tempPlan;
      
      // Set current targets to the default values
      currentTargets = {
        daily_calories: defaultTargets.daily_calories,
        protein_grams: defaultTargets.protein_grams,
        carbs_grams: defaultTargets.carbs_grams,
        fat_grams: defaultTargets.fat_grams
      };
      
      console.log('[MEAL PLAN] Using default nutritional targets:', currentTargets);
    } else {
      // User has an existing nutrition plan
      currentPlan = planData;
    }

    // Try to get targets from historical_nutrition_targets first (only if not already set from default plan)
    if (!currentTargets) {
      let { data: currentTargetsFromDB, error: targetsError } = await supabase
        .from('historical_nutrition_targets')
        .select('*')
        .eq('nutrition_plan_id', currentPlan.id)
        .is('end_date', null)
        .single();

      // If no historical targets found, get targets from nutrition_plans.daily_targets
      if (targetsError || !currentTargetsFromDB) {
        console.log('[MEAL PLAN] No historical targets found, fetching from nutrition_plans.daily_targets');
        const { data: planWithTargets, error: planTargetsError } = await supabase
          .from('nutrition_plans')
          .select('daily_targets')
          .eq('id', currentPlan.id)
          .single();

        if (planTargetsError || !planWithTargets?.daily_targets) {
          throw new Error('No nutrition targets found for your plan. Please regenerate your nutrition plan to ensure proper calorie and macro targets are set.');
        }

        // Convert daily_targets to the expected format
        currentTargets = {
          daily_calories: planWithTargets.daily_targets.daily_calories || planWithTargets.daily_targets.calories,
          protein_grams: planWithTargets.daily_targets.protein_grams || planWithTargets.daily_targets.protein,
          carbs_grams: planWithTargets.daily_targets.carbs_grams || planWithTargets.daily_targets.carbs,
          fat_grams: planWithTargets.daily_targets.fat_grams || planWithTargets.daily_targets.fat
        };
      } else {
        currentTargets = currentTargetsFromDB;
      }
    }

    console.log('[MEAL PLAN] Current targets object:', currentTargets);
    
    // DEBUG: Let's check what macro percentages these targets represent
    if (currentTargets.daily_calories) {
      const carbPercent = Math.round((currentTargets.carbs_grams * 4 / currentTargets.daily_calories) * 100);
      const proteinPercent = Math.round((currentTargets.protein_grams * 4 / currentTargets.daily_calories) * 100);  
      const fatPercent = Math.round((currentTargets.fat_grams * 9 / currentTargets.daily_calories) * 100);
      console.log('[MEAL PLAN] 🧮 Target macro percentages:');
      console.log('  Carbs:', carbPercent + '%', '(' + currentTargets.carbs_grams + 'g)');
      console.log('  Protein:', proteinPercent + '%', '(' + currentTargets.protein_grams + 'g)');
      console.log('  Fat:', fatPercent + '%', '(' + currentTargets.fat_grams + 'g)');
      console.log('  Total:', carbPercent + proteinPercent + fatPercent + '%');
    }
    console.log('[MEAL PLAN] Generating mathematical meal plan with targets:', {
      calories: currentTargets.daily_calories,
      protein: currentTargets.protein_grams,
      carbs: currentTargets.carbs_grams,
      fat: currentTargets.fat_grams
    });

    // 2. Generate meal plan using mathematical distribution (no AI)
    console.log('[MEAL PLAN] Calling generateMathematicalMealPlan with:', {
      targets: currentTargets,
      preferences: currentPlan.preferences?.dietary || []
    });
    console.log('[MEAL PLAN] Targets properties check:');
    console.log('  daily_calories:', currentTargets.daily_calories, typeof currentTargets.daily_calories);
    console.log('  protein_grams:', currentTargets.protein_grams, typeof currentTargets.protein_grams);
    console.log('  carbs_grams:', currentTargets.carbs_grams, typeof currentTargets.carbs_grams);
    console.log('  fat_grams:', currentTargets.fat_grams, typeof currentTargets.fat_grams);
    
    // PRIORITIZE AI GENERATION (GEMINI)
    let mealPlan = null;
    let usedAI = false;
    let aiProvider = 'none';
    
    console.log('[MEAL PLAN] 🤖 Attempting AI meal plan generation (Gemini primary)');
    
    // Try AI providers first
    const availableProviders = [];
    if (geminiTextService) availableProviders.push('gemini');
    
    console.log(`[MEAL PLAN] Available AI providers: [${availableProviders.join(', ')}]`);
    
    // Try Gemini AI generation
    for (const provider of availableProviders) {
      if (mealPlan && mealPlan.length > 0) break; // Stop if we got a successful meal plan
      
      try {
        console.log(`[MEAL PLAN] 🤖 Attempting ${provider.toUpperCase()} AI generation`);
        
        if (provider === 'gemini') {
          mealPlan = await generateGeminiMealPlan(currentTargets, currentPlan.preferences?.dietary || []);
        }
        
        if (mealPlan && mealPlan.length > 0) {
          console.log(`[MEAL PLAN] ✅ Successfully generated ${provider.toUpperCase()} AI meal plan with`, mealPlan.length, 'meals');
          usedAI = true;
          aiProvider = provider;
          break; // Success! Exit the loop
        }
      } catch (aiError) {
        console.error(`[MEAL PLAN] ${provider.toUpperCase()} generation failed:`, aiError.message);
        if (provider === availableProviders[availableProviders.length - 1]) {
          console.log('[MEAL PLAN] All AI providers failed, will use mathematical fallback');
        } else {
          console.log(`[MEAL PLAN] Will try next AI provider...`);
        }
      }
    }
    
    // Fallback to mathematical generation if AI failed
    if (!mealPlan || mealPlan.length === 0) {
      console.log('[MEAL PLAN] 🧮 Using mathematical meal plan generation as fallback');
      
      // Validate and transform targets to prevent 500 errors
      const validateAndTransformTargets = (currentTargets) => {
        console.log('[MEAL PLAN] Original targets received:', currentTargets);
        
        // Handle case where currentTargets is null or undefined
        if (!currentTargets) {
          throw new Error('No nutrition targets found. Please generate a nutrition plan first.');
        }
        
        // Extract values with multiple fallback strategies
        const extractValue = (obj, primaryKey, fallbackKeys = [], defaultValue = null) => {
          // Try primary key first
          if (obj[primaryKey] !== undefined && obj[primaryKey] !== null) {
            return Number(obj[primaryKey]);
          }
          
          // Try fallback keys
          for (const key of fallbackKeys) {
            if (obj[key] !== undefined && obj[key] !== null) {
              return Number(obj[key]);
            }
          }
          
          return defaultValue;
        };
        
        // Extract nutrition values with comprehensive fallbacks
        const daily_calories = extractValue(currentTargets, 'daily_calories', ['calories'], 2000);
        const protein_grams = extractValue(currentTargets, 'protein_grams', ['protein'], 150);
        const carbs_grams = extractValue(currentTargets, 'carbs_grams', ['carbs'], 200);
        const fat_grams = extractValue(currentTargets, 'fat_grams', ['fat'], 70);
        
        // Create the properly formatted targets object
        const validatedTargets = {
          daily_calories,
          protein_grams,
          carbs_grams,
          fat_grams
        };
        
        console.log('[MEAL PLAN] Validated targets:', validatedTargets);
        
        // Final validation to ensure all values are valid numbers
        if (!daily_calories || daily_calories <= 0 || isNaN(daily_calories)) {
          throw new Error(`Invalid daily calories: ${daily_calories}`);
        }
        if (!protein_grams || protein_grams <= 0 || isNaN(protein_grams)) {
          throw new Error(`Invalid protein target: ${protein_grams}`);
        }
        if (!carbs_grams || carbs_grams <= 0 || isNaN(carbs_grams)) {
          throw new Error(`Invalid carbs target: ${carbs_grams}`);
        }
        if (!fat_grams || fat_grams <= 0 || isNaN(fat_grams)) {
          throw new Error(`Invalid fat target: ${fat_grams}`);
        }
        
        return validatedTargets;
      };
      
      const validatedTargets = validateAndTransformTargets(currentTargets);
      mealPlan = generateMathematicalMealPlan(validatedTargets, currentPlan.preferences?.dietary || []);
      usedAI = false;
    }
    
    console.log('[MEAL PLAN] Generated meal plan:', mealPlan);
    console.log('[MEAL PLAN] Generation method:', usedAI ? 'Gemini AI' : 'Mathematical');

    if (!mealPlan || !Array.isArray(mealPlan) || mealPlan.length === 0) {
      throw new Error('Failed to generate valid meal plan');
    }

    // 3. Save the new meal plan suggestions to the database
    const today = new Date().toISOString().split('T')[0];
    const suggestionsToInsert = mealPlan.map((meal) => {
      if (!meal || !meal.macros) {
        throw new Error(`Invalid meal object: ${JSON.stringify(meal)}`);
      }

      // Combine recipe details into meal_description since that's the only text field in the schema
      const mealDescription = `${meal.recipe_name}\n\nPrep Time: ${meal.prep_time} minutes\nCook Time: ${meal.cook_time} minutes\nServings: ${meal.servings}\n\nIngredients:\n${meal.ingredients.map(ing => `- ${ing}`).join('\n')}\n\nInstructions:\n${meal.instructions.map(inst => `• ${inst}`).join('\n')}`;

      return {
      nutrition_plan_id: currentPlan.id,
      suggestion_date: today,
      meal_type: meal.meal_type,
        meal_description: mealDescription,
      calories: meal.macros.calories,
      protein_grams: meal.macros.protein_grams,
      carbs_grams: meal.macros.carbs_grams,
      fat_grams: meal.macros.fat_grams,
      };
    });

    console.log('[MEAL PLAN] Attempting to insert suggestions:', suggestionsToInsert);
    console.log('[MEAL PLAN] First suggestion structure:', suggestionsToInsert[0]);

    const { data: newSuggestions, error: insertError } = await supabase
      .from('meal_plan_suggestions')
      .upsert(suggestionsToInsert, {
        onConflict: 'nutrition_plan_id, suggestion_date, meal_type',
      })
      .select();

    if (insertError) {
      console.error('[MEAL PLAN] Database insertion error:', insertError);
      console.error('[MEAL PLAN] Error details:', JSON.stringify(insertError, null, 2));
      throw insertError;
    }

    res.json({ 
      success: true, 
      meal_plan: newSuggestions,
      plan_id: currentPlan.id,
      generated_at: new Date().toISOString(),
      generation_method: usedAI ? `${aiProvider}_ai` : 'mathematical',
      ai_provider: aiProvider,
      ai_generated: usedAI,
      used_ai: usedAI
    });
  } catch (error) {
    console.error('[GENERATE MEAL PLAN] Error:', error);
    console.error('[GENERATE MEAL PLAN] Error type:', typeof error);
    
    if (error && error.message) {
      console.error('[GENERATE MEAL PLAN] Error message:', error.message);
      console.error('[GENERATE MEAL PLAN] Error stack:', error.stack);
      console.error('[GENERATE MEAL PLAN] Error statusCode:', error.statusCode);
      
      // Use explicit statusCode if set, otherwise determine based on error type
      let statusCode = error.statusCode || 400; // Default to client error
      let errorMessage = error.message;
      
      // Check for specific error patterns (only if statusCode wasn't explicitly set)
      if (!error.statusCode) {
        if (error.message.includes('No active nutrition plan found')) {
          statusCode = 404;
          errorMessage = 'No active nutrition plan found. Please generate a nutrition plan first before creating a daily meal plan.';
        } else if (error.message.includes('No nutrition targets found')) {
          statusCode = 404;
          errorMessage = 'No nutrition targets found. Please generate a nutrition plan first.';
        } else if (error.message.includes('Invalid') && error.message.includes('target')) {
          statusCode = 422;
          errorMessage = `Invalid nutrition targets: ${error.message}. Please re-generate your nutrition plan to fix this issue.`;
        } else if (error.message.includes('Database not configured')) {
          statusCode = 503;
          errorMessage = 'Database service is not available. Please contact support.';
        } else if (error.message.includes('Failed to generate valid meal plan')) {
          statusCode = 500;
          errorMessage = 'Unable to generate meal plan. Please try again or contact support if the issue persists.';
        }
      }
      
      res.status(statusCode).json({ success: false, error: errorMessage });
    } else {
      console.error('[GENERATE MEAL PLAN] Undefined error caught');
      res.status(500).json({ success: false, error: 'An unexpected error occurred during meal plan generation. Please try again.' });
    }
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

// Add workout plan deletion endpoint
app.delete('/api/delete-workout-plan/:planId', async (req, res) => {
  const { planId } = req.params;

  if (!planId) {
    return res.status(400).json({ error: 'Plan ID is required.' });
  }

  try {
    console.log(`[WORKOUT DELETE] Deleting plan with ID: ${planId}`);

    // First, check if the plan exists
    const { data: plan, error: fetchError } = await supabase
      .from('workout_plans')
      .select('id, user_id')
      .eq('id', planId)
      .single();

    if (fetchError || !plan) {
      console.error(`[WORKOUT DELETE] Plan not found: ${planId}`);
      return res.status(404).json({ error: 'Workout plan not found.' });
    }

    // Delete the plan
    const { error: deleteError } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId);

    if (deleteError) {
      console.error(`[WORKOUT DELETE] Error deleting plan:`, deleteError);
      throw deleteError;
    }

    console.log(`[WORKOUT DELETE] Successfully deleted plan ${planId}`);
    res.json({ success: true, message: 'Workout plan deleted successfully.' });
  } catch (error) {
    console.error(`[WORKOUT DELETE] Exception during plan deletion:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete the workout plan.'
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
You are a professional chef and nutritionist creating a recipe for a mobile cooking app. Create ONE detailed, practical recipe for ${mealType} using ONLY the provided ingredients.

=== RECIPE REQUIREMENTS ===
MEAL TYPE: ${mealType}
NUTRITIONAL TARGETS: ${targets.calories} calories, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat
AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

=== CRITICAL RULES ===
1. Use ONLY the ingredients listed above - NO additional ingredients (no salt, pepper, oil unless explicitly provided)
2. Each ingredient must have a realistic quantity (e.g., "150g Greek yogurt", "100g fresh strawberries", "1 tbsp honey")
3. Recipe name should be COMPREHENSIVE and include ALL ingredients in an appetizing way (e.g., "Grilled Chicken with Roasted Broccoli, Rice & Sweet Potato" NOT just "Chicken Dinner")
4. Instructions must be clear, step-by-step, and easy to follow on a mobile device
5. For no-cook recipes (yogurt/fruit bowls, salads): focus on preparation, assembly, and presentation
6. For cooked recipes: include specific cooking times, temperatures, and techniques

=== OUTPUT FORMAT ===
Return ONLY valid JSON in this EXACT format (no markdown, no extra text):

{
  "recipe_name": "Fresh Berry Yogurt Bowl",
  "ingredients": [
    {
      "name": "Greek yogurt",
      "quantity": "150g",
      "macro_info": "High protein dairy"
    },
    {
      "name": "strawberries", 
      "quantity": "100g",
      "macro_info": "Vitamin C and antioxidants"
    }
  ],
  "instructions": [
    {
      "step": "1",
      "title": "Prepare the berries",
      "details": [
        "Rinse strawberries under cold water",
        "Remove green tops and hull each strawberry", 
        "Slice strawberries into quarters for easier eating"
      ]
    },
    {
      "step": "2", 
      "title": "Assemble the bowl",
      "details": [
        "Spoon Greek yogurt into a serving bowl",
        "Arrange sliced strawberries on top of yogurt",
        "Serve immediately for best texture"
      ]
    }
  ]
}

=== INSTRUCTION GUIDELINES ===
- Provide 2-6 clear steps (not too many for mobile viewing)
- Each step should have a descriptive title and 2-4 specific details
- Details should be actionable and specific (include times, sizes, techniques)
- For no-cook recipes: focus on prep techniques, assembly order, and presentation tips
- For cooked recipes: include heat levels, cooking times, and doneness indicators
- Make it feel like a real chef is guiding the user

=== INGREDIENT MATCHING ===
CRITICAL: Every ingredient "name" field must EXACTLY match one of these provided ingredients: ${ingredients.join(', ')}
If an ingredient is "yogurt", use "yogurt" - if it's "Greek yogurt", use "Greek yogurt"
Do NOT add adjectives or modify the ingredient names.

Create a delicious, practical recipe that matches the nutritional targets!`;
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
  
  // ✅ Generate comprehensive meal name with ALL ingredients
  const generateComprehensiveMealName = (mealType, ingredients) => {
    if (ingredients.length === 0) return `${mealType} Balanced Bowl`;
    if (ingredients.length === 1) return `${mealType} with ${ingredients[0]}`;
    if (ingredients.length === 2) return `${mealType} with ${ingredients.join(' & ')}`;
    
    // For 3+ ingredients, create an appetizing comprehensive name
    const mainItems = ingredients.slice(0, 2);
    const additionalItems = ingredients.slice(2);
    
    if (additionalItems.length === 1) {
      return `${mealType} with ${mainItems.join(', ')} & ${additionalItems[0]}`;
    } else {
      return `${mealType} with ${mainItems.join(', ')}, ${additionalItems.slice(0, -1).join(', ')} & ${additionalItems[additionalItems.length - 1]}`;
    }
  };
  
  // Basic recipe structure
  const recipe = {
    name: generateComprehensiveMealName(mealType, ingredients),
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

  // Generate structured instructions in the new format for UI compatibility
  if (mealType.toLowerCase() === 'breakfast') {
    recipe.instructions = [
      {
        step: "1",
        title: "Prepare ingredients",
        details: [
          "Gather all ingredients as listed",
          "Rinse fresh ingredients if needed",
          "Have measuring tools ready"
        ]
      },
      {
        step: "2", 
        title: "Assemble the meal",
        details: [
          "Combine ingredients according to recipe type",
          "Mix or layer as appropriate for the dish",
          "Adjust portions to meet nutritional targets"
        ]
      },
      {
        step: "3",
        title: "Serve and enjoy",
        details: [
          "Transfer to serving bowl or plate",
          "Garnish if desired",
          "Enjoy your nutritious breakfast!"
        ]
      }
    ];
  } else if (mealType.toLowerCase() === 'lunch' || mealType.toLowerCase() === 'dinner') {
    recipe.instructions = [
      {
        step: "1",
        title: "Prepare cooking area",
        details: [
          "Preheat cooking surface to medium heat",
          "Gather all ingredients and tools",
          "Prepare ingredients as needed"
        ]
      },
      {
        step: "2",
        title: "Cook the meal", 
        details: [
          "Cook protein first if applicable",
          "Add remaining ingredients in order of cooking time",
          "Cook until ingredients are properly done"
        ]
      },
      {
        step: "3",
        title: "Finish and serve",
        details: [
          "Season to taste",
          "Combine all components",
          "Serve hot and enjoy"
        ]
      }
    ];
  } else {
    recipe.instructions = [
      {
        step: "1",
        title: "Preparation",
        details: [
          "Gather all ingredients",
          "Prepare ingredients as indicated",
          "Have all tools ready"
        ]
      },
      {
        step: "2", 
        title: "Assembly",
        details: [
          "Combine or cook as appropriate for meal type",
          "Follow proper food safety guidelines",
          "Adjust seasoning as needed"
        ]
      },
      {
        step: "3",
        title: "Serve",
        details: [
          "Present the meal attractively",
          "Serve at appropriate temperature",
          "Enjoy your meal!"
        ]
      }
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
    model: CHAT_MODEL,
    version: '4.0.0-gemini-only',
    deployment_time: new Date().toISOString()
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
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
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
      gemini_api_configured: !!GEMINI_API_KEY,
      openai_configured: !!OPENAI_API_KEY,
      server_port: port,
      server_ip: getLocalIpAddress(),
      ai_provider: AI_PROVIDER,
      chat_model: CHAT_MODEL,
    }
  });
});

// Test endpoint to find users with nutrition plans
app.get('/api/test-users-with-plans', async (req, res) => {
  try {
    console.log('[TEST] Finding users with nutrition plans');
    
    const { data: users, error } = await supabase
      .from('nutrition_plans')
      .select('user_id, daily_targets, preferences, created_at, status')
      .eq('status', 'active')
      .limit(5);

    if (error) {
      console.error('[TEST] Database error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[TEST] Found ${users?.length || 0} users with active nutrition plans`);
    
    // Format users data with extracted targets
    const formattedUsers = users?.map(user => ({
      user_id: user.user_id,
      daily_calories: user.daily_targets?.daily_calories || user.daily_targets?.calories,
      protein_grams: user.daily_targets?.protein_grams || user.daily_targets?.protein,
      carbs_grams: user.daily_targets?.carbs_grams || user.daily_targets?.carbs,
      fat_grams: user.daily_targets?.fat_grams || user.daily_targets?.fat,
      preferences: user.preferences,
      status: user.status,
      created_at: user.created_at
    }));

    res.json({
      success: true,
      count: users?.length || 0,
      users: formattedUsers || [],
      message: 'Use any of these user_id values to test meal plan generation'
    });

  } catch (error) {
    console.error('[TEST] Error finding users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// (duplicate /api/health removed to avoid ambiguity)

// Add workout plan generation endpoint with robust JSON parsing
app.post('/api/generate-workout-plan', async (req, res) => {
  try {
    // Accept both 'profile' and 'userProfile' for backward compatibility
    const { profile, userProfile } = req.body;
    const profileData = profile || userProfile;
    
    if (!profileData) {
      return res.status(400).json({ success: false, error: 'Missing profile data' });
    }
    
    // Map userProfile fields to expected profile format if needed
    const normalizedProfile = userProfile ? {
      full_name: userProfile.fullName,
      gender: userProfile.gender,
      age: userProfile.age,
      training_level: userProfile.fitnessLevel,
      primary_goal: userProfile.primaryGoal,
      workout_frequency: userProfile.workoutFrequency
    } : profileData;

    console.log('[WORKOUT] Normalized profile data:', JSON.stringify(normalizedProfile, null, 2));
    console.log('[WORKOUT] Primary goal from user profile:', userProfile?.primaryGoal);
    console.log('[WORKOUT] Primary goal in normalized profile:', normalizedProfile.primary_goal);
    
    const prompt = composePrompt(normalizedProfile);
    const messages = [{ role: 'user', content: prompt }];

    console.log('[WORKOUT] Generated prompt (first 500 chars):', prompt.substring(0, 500) + '...');
    console.log('[WORKOUT] Prompt length:', prompt.length);
    
    // Try AI providers with systematic fallback
    console.log('[WORKOUT] Starting AI workout plan generation with systematic fallback');

    // Use GeminiTextService directly for workout plan generation
    let aiResponse = null;
    let usedProvider = null;
    let usedAI = false;

    try {
      console.log('[WORKOUT] 🤖 Attempting workout generation using GEMINI via TextService');
      console.log('[WORKOUT] Current GEMINI_MODEL:', GEMINI_MODEL);
      console.log('[WORKOUT] geminiTextService available:', !!geminiTextService);

      // Check if Gemini service is available
      if (!geminiTextService) {
        throw new Error('Gemini Text Service is not available');
      }

      // Use the GeminiTextService to generate the workout plan
      console.log('[WORKOUT] Calling generateWorkoutPlan with normalized profile');
      console.log('[WORKOUT] Profile data:', JSON.stringify(normalizedProfile, null, 2));

      const workoutPlanData = await geminiTextService.generateWorkoutPlan(normalizedProfile, {});
      console.log('[WORKOUT] Workout plan data received:', !!workoutPlanData);

      if (workoutPlanData && workoutPlanData.weekly_schedule) {
        console.log('[WORKOUT] ✅ Successfully generated workout plan using Gemini TextService');
        console.log('[WORKOUT] Plan name:', workoutPlanData.plan_name);
        console.log('[WORKOUT] Weekly schedule length:', workoutPlanData.weekly_schedule.length);

        // Return the structured plan directly instead of going through JSON parsing
        const workoutPlan = {
          plan_name: workoutPlanData.plan_name || `${normalizedProfile.primary_goal?.toUpperCase()} Workout Plan`,
          primary_goal: normalizedProfile.primary_goal,
          workout_frequency: normalizedProfile.workout_frequency,
          weekly_schedule: workoutPlanData.weekly_schedule,
          created_at: new Date().toISOString(),
          source: workoutPlanData.source || 'gemini_text'
        };

        return res.json({
          success: true,
          workoutPlan,
          provider: 'gemini',
          used_ai: true
        });
      } else {
        throw new Error('Invalid response from Gemini TextService - missing weekly_schedule');
      }
    } catch (aiError) {
      console.log('[WORKOUT] ❌ GEMINI failed:', aiError.message);
      console.log('[WORKOUT] 🧮 All AI providers failed, using rule-based workout plan generation');
    }

    // If all AI providers failed, use rule-based fallback
    if (!aiResponse || aiResponse.error) {
      console.log('[WORKOUT] 🧮 All AI providers failed, using rule-based workout plan generation');
      
      const fallbackPlan = generateRuleBasedWorkoutPlan(normalizedProfile);

        return res.json({
          success: true,
          workoutPlan: fallbackPlan,
        provider: 'rule_based_fallback',
        used_ai: false
        });
    }
    
    console.log(`[WORKOUT] ✅ Successfully generated workout plan using ${usedProvider?.toUpperCase()} AI`);
    console.log('[WORKOUT] AI response type:', typeof aiResponse);
    console.log('[WORKOUT] AI response keys:', Object.keys(aiResponse || {}));
    console.log('[WORKOUT] Raw AI response content:', aiResponse?.choices?.[0]?.message?.content || 'No content in response');
    
    if (!aiResponse || !aiResponse.choices || !aiResponse.choices[0]) {
      console.error('[WORKOUT] No valid AI response received');
      throw new Error('Failed to get valid response from AI provider');
    }
    
    // Process response as before
    const content = aiResponse.choices[0].message.content;
    console.log('[WORKOUT] Raw AI response content:', content.substring(0, 2000)); // Log first 2000 chars
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
      console.log('[WORKOUT] Parsed object before normalization:', JSON.stringify(plan, null, 2));
      
      // Normalize and validate structure
      plan = normalizePlan(plan);
      if (!plan || !Array.isArray(plan.weeklySchedule)) {
        console.error('[WORKOUT] Parsed plan missing weeklySchedule array after normalization:', plan);
        throw new Error('Parsed plan missing required weeklySchedule structure');
      }
      
      // Validate and fix workout frequency
      plan = validateAndFixWorkoutFrequency(plan, normalizedProfile);
      console.log('[WORKOUT] Workout frequency validated and fixed if necessary');
      
    } catch (parseError) {
      console.error('[WORKOUT] All parsing strategies failed:', parseError);
      console.log('[WORKOUT] Raw response (first 1000 chars):', content.substring(0, 1000));
      
      // Generate a valid fallback plan structure
      console.log('[WORKOUT] Generating fallback plan structure...');
      plan = {
        plan_name: "General Fitness Workout Plan",
        primary_goal: normalizedProfile.primary_goal || "general_fitness",
        weekly_schedule: [
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
        ],
        created_at: new Date().toISOString()
      };
      console.log('[WORKOUT] Using generated fallback plan');
    }
    
    if (!plan) {
      return res.status(500).json({ success: false, error: 'Failed to generate workout plan' });
    }
    
    // Format response to match expected structure
    const workoutPlan = {
      plan_name: `${normalizedProfile.primary_goal} Workout Plan`,
      primary_goal: normalizedProfile.primary_goal,
      weekly_schedule: plan.weekly_schedule || plan.weeklySchedule,
      created_at: new Date().toISOString()
    };

    return res.json({
      success: true,
      workoutPlan,
      provider: usedProvider || 'rule_based_fallback',
      used_ai: usedAI
    });
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
// SIMPLIFIED FOOD ANALYSIS ENDPOINT - GEMINI ONLY
// ===================

app.post('/api/analyze-food', upload.single('foodImage'), async (req, res) => {
  console.log('[FOOD ANALYZE] Received food analysis request using Gemini only');
  
  try {
    // Check if we have a file upload, base64 image, or text description
    if (!req.file && !req.body.image && !req.body.imageDescription) {
      return res.status(400).json({ 
        success: false, 
        error: 'No food image or description provided' 
      });
    }

    console.log('[FOOD ANALYZE] Request details:', {
      hasFile: !!req.file,
      hasDescription: !!req.body.imageDescription,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    let base64Image, mimeType;

    // Handle different input types
    if (req.body.imageDescription) {
      // Text description only - use Gemini for analysis
      console.log('[FOOD ANALYZE] Processing text description with Gemini');
      const description = String(req.body.imageDescription).slice(0, 2000);

      const messages = [
        {
          role: 'system',
          content: `You are an expert nutritionist. Analyze this food description and provide nutritional information.

CRITICAL REQUIREMENTS:
1. Identify the SPECIFIC food/dish name
2. Estimate realistic nutritional information based on typical serving sizes
3. Be specific about assumptions (e.g., "assuming standard restaurant serving")
4. Focus on accuracy for typical portions

Return ONLY this JSON structure:
{
  "food_name": "Specific food/dish name",
  "calories": 350,
    "protein": 25,
  "carbs": 45,
    "fat": 15,
  "assumptions": "Any assumptions made about portion sizes",
  "confidence": "high|medium|low"
}

Example: If someone says "chicken breast", don't just say "chicken" - be specific. If uncertain, state your assumption clearly.`
        },
        {
          role: 'user',
          content: `Analyze this food: "${description}"`
        }
      ];

      try {
        // Convert to Gemini format
        let geminiContents = [];
        let systemInstruction = '';

        const systemMessage = messages.find(msg => msg.role === 'system');
        if (systemMessage) {
          systemInstruction = systemMessage.content;
        }

        const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
        geminiContents = nonSystemMessages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }));

        const geminiRequestBody = {
          contents: geminiContents,
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json'
          }
        };

        if (systemInstruction) {
          geminiRequestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
          };
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await axios.post(
          geminiUrl,
          geminiRequestBody,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // 5 second timeout for fast fallback
          }
        );

        const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error('No response from Gemini');
        }

        const analysisResult = JSON.parse(textResponse);

        return res.json({
          success: true,
              data: {
            foodName: analysisResult.food_name || description, // ✅ Add missing foodName field!
            confidence: analysisResult.confidence || 75,
            estimatedServingSize: "1 serving",
            nutrition: analysisResult,
            totalNutrition: analysisResult, // Keep for backward compatibility
            foodItems: [{
              name: analysisResult.food_name || description,
              quantity: "1 serving",
              calories: analysisResult.calories || 0,
              protein: analysisResult.protein || 0,
              carbohydrates: analysisResult.carbs || 0,
              fat: analysisResult.fat || 0
            }],
            assumptions: [analysisResult.assumptions || "Based on typical serving size"],
            notes: "Analyzed using Gemini text analysis",
            analysisProvider: 'gemini_text',
            timestamp: new Date().toISOString(),
            message: "Analyzed using Gemini text analysis"
          }
        });

      } catch (geminiError) {
        console.error('[FOOD ANALYZE] Gemini API error:', geminiError.message);
        return res.status(500).json({
          success: false,
          error: 'Food analysis failed',
          message: 'AI service unavailable. Please try again later.'
        });
      }
    }

    // Handle image input
    if (req.body.image) {
      console.log('[FOOD ANALYZE] Processing base64 image');
      const imageData = req.body.image;
      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Image = matches[2];
        }
        } else {
          base64Image = imageData;
        mimeType = 'image/jpeg';
    }
    } else if (req.file) {
      console.log('[FOOD ANALYZE] Processing uploaded file');
      const imageBuffer = fs.readFileSync(req.file.path);

      // Validate image
    try {
      const metadata = await sharp(imageBuffer).metadata();
        if (!metadata.format) throw new Error('Invalid image');
    } catch (sharpError) {
        console.error('[FOOD ANALYZE] Image validation failed:', sharpError.message);
      return res.status(400).json({
          success: false,
          error: 'Invalid image format. Please upload JPG, PNG, or HEIC.'
      });
    }

      // Convert HEIC to JPEG if needed
      let processedBuffer = imageBuffer;
      const isHeic = req.file.mimetype?.includes('heic') || req.file.originalname?.includes('.heic');
      if (isHeic) {
        processedBuffer = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();
          mimeType = 'image/jpeg';
      }

      // Compress if too large
      if (processedBuffer.length > 2_000_000) {
        processedBuffer = await compressImageForVision(processedBuffer);
      }

      base64Image = processedBuffer.toString('base64');
      mimeType = mimeType || req.file.mimetype || 'image/jpeg';
      console.log('[FOOD ANALYZE] Processed image, mimeType:', mimeType);
    }

    // Use Gemini Vision for image analysis
    console.log('[FOOD ANALYZE] Using Gemini Vision API for image analysis');

    if (!visionService) {
      console.warn('[FOOD ANALYZE] Vision service unavailable. Using basic fallback analyzer');

        // Clean up uploaded file if present
        if (req.file?.path) {
          try { fs.unlinkSync(req.file.path); } catch (_) {}
        }

      return res.status(503).json({ 
        success: false, 
        error: 'Vision service not available',
        message: 'AI vision service unavailable. Please try again later.'
      });
    }

    // Convert base64 to Buffer for GeminiVisionService
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const visionResult = await visionService.analyzeFoodImage(imageBuffer, mimeType);
    
    console.log('[FOOD ANALYZE] Gemini vision analysis completed successfully');
    console.log('[FOOD ANALYZE] Food identified:', visionResult.foodName);
    console.log('[FOOD ANALYZE] Confidence:', visionResult.confidence);

    // Clean up uploaded file
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.warn('[FOOD ANALYZE] Failed to cleanup file:', error.message);
      }
    }

    // Return the vision analysis result directly with consistent format
    res.json({
      success: true,
      data: {
        foodName: visionResult.foodName, // ✅ CRITICAL: Add missing foodName field!
        confidence: visionResult.confidence,
        estimatedServingSize: visionResult.estimatedServingSize,
        nutrition: visionResult.totalNutrition,
        totalNutrition: visionResult.totalNutrition, // Keep for backward compatibility
        foodItems: visionResult.foodItems || [],
        assumptions: visionResult.assumptions || [],
        notes: visionResult.notes || "Nutritional analysis completed successfully",
        analysisProvider: 'gemini_vision_local',
        timestamp: new Date().toISOString(),
        message: `Analyzed using Gemini Vision. Confidence: ${visionResult.confidence}%`
      }
    });

  } catch (error) {
    console.error('[FOOD ANALYZE] Error:', error.message);

    // Handle specific error types
    if (error.message?.includes('Invalid image') || error.message?.includes('image format')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Please upload a clear photo.'
      });
    }

    if (error.message?.includes('too large')) {
      return res.status(413).json({
        success: false,
        error: 'Image too large. Please use a smaller image (max 1MB).'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Food analysis failed. Please try again.',
      details: error.message
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

// Get weight metrics for a user
app.get('/api/weight-metrics/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 30, startDate, endDate } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    console.log(`[WEIGHT GET] Getting weight metrics for user: ${userId}`);

    let query = supabase
      .from('daily_user_metrics')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('metric_date', startDate);
    }

    if (endDate) {
      query = query.lte('metric_date', endDate);
    }

    const { data, error } = await query
      .order('metric_date', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('[WEIGHT GET] Error getting weight metrics:', error);
      throw new Error(error.message);
    }

    console.log(`[WEIGHT GET] Retrieved ${data?.length || 0} weight records`);
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('[WEIGHT GET] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for Gemini service
app.get('/api/test-gemini', async (req, res) => {
  try {
    console.log('[TEST GEMINI] Testing Gemini API connection');
    
    if (!GEMINI_API_KEY) {
      return res.json({ 
        success: false, 
        error: 'Gemini API key not configured' 
      });
    }
    
    // Test if we can create a Gemini service instance
    if (visionService) {
      // If vision service exists, Gemini is working
      return res.json({ 
        success: true, 
        message: 'Gemini API is working correctly',
        provider: FOOD_ANALYZE_PROVIDER
      });
    } else {
      return res.json({ 
        success: false, 
        error: 'Gemini vision service not initialized' 
      });
    }
    
  } catch (error) {
    console.error('[TEST GEMINI] Error:', error);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint for direct AI meal plan generation (bypasses database)
app.post('/api/test-ai-meal-generation', async (req, res) => {
  console.log('[TEST AI] Direct AI meal plan generation test');
  const { targets, dietaryPreferences = [] } = req.body;
  
  if (!targets) {
    return res.status(400).json({ error: 'Targets are required for testing' });
  }
  
  try {
    console.log('[TEST AI] Testing with targets:', targets);
    console.log('[TEST AI] Dietary preferences:', dietaryPreferences);
    console.log('[TEST AI] AI_PROVIDER:', AI_PROVIDER);
    console.log('[TEST AI] geminiTextService available:', !!geminiTextService);
    console.log('[TEST AI] Available providers:', AI_PROVIDERS?.map(p => `${p.name}:${p.enabled}`).join(', '));
    
    // Try to generate meal plan using Gemini AI directly
    let mealPlan = null;
    let usedAI = false;
    
    // Get available AI providers in priority order
    const availableProviders = [];
    if (geminiTextService) availableProviders.push('gemini');
    
    // Prioritize the configured AI_PROVIDER
    let providersToTry = [];
    if (availableProviders.includes(AI_PROVIDER)) {
      providersToTry = [AI_PROVIDER, ...availableProviders.filter(p => p !== AI_PROVIDER)];
    } else {
      providersToTry = availableProviders;
    }
    
    console.log(`[TEST AI] Available AI providers: [${availableProviders.join(', ')}]`);
    console.log(`[TEST AI] Primary provider: ${AI_PROVIDER}`);
    console.log(`[TEST AI] Will try providers in order: [${providersToTry.join(', ')}]`);
    
    // Try each AI provider in order
    for (const provider of providersToTry) {
      if (mealPlan && mealPlan.length > 0) break; // Stop if we got a successful meal plan
      
      try {
        console.log(`[TEST AI] 🤖 Attempting direct ${provider.toUpperCase()} AI generation`);
        
        if (provider === 'gemini') {
          mealPlan = await generateGeminiMealPlan(targets, dietaryPreferences);
        }
        
        if (mealPlan && mealPlan.length > 0) {
          console.log(`[TEST AI] ✅ Successfully generated ${provider.toUpperCase()} AI meal plan with`, mealPlan.length, 'meals');
          usedAI = true;
          break; // Success! Exit the loop
        }
      } catch (aiError) {
        console.error(`[TEST AI] ${provider.toUpperCase()} generation failed:`, aiError.message);
        if (provider === providersToTry[providersToTry.length - 1]) {
          console.log('[TEST AI] All AI providers failed, will use mathematical fallback');
        } else {
          console.log(`[TEST AI] Will try next AI provider...`);
        }
      }
    }
    
    // Fallback to mathematical generation if AI failed
    if (!mealPlan || mealPlan.length === 0) {
      console.log('[TEST AI] 🧮 Using mathematical meal plan generation as fallback');
      mealPlan = generateMathematicalMealPlan(targets, dietaryPreferences);
      usedAI = false;
    }
    
    if (!mealPlan || !Array.isArray(mealPlan) || mealPlan.length === 0) {
      throw new Error('Failed to generate valid meal plan');
    }
    
    console.log('[TEST AI] ✅ Generated meal plan successfully');
    console.log('[TEST AI] Meal plan details:', {
      meals: mealPlan.length,
      usedAI: usedAI,
      mealNames: mealPlan.map(m => m.recipe_name || m.meal_type).join(', ')
    });
    
    res.json(mealPlan);
    
  } catch (error) {
    console.error('[TEST AI] Error in test generation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate test meal plan',
      usedAI: false
    });
  }
});

// Start the server with error handling
const server = app.listen(port, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`GoFitAI Server v2.0 running on port ${port}`);
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

// Generate recipe endpoint
app.post('/api/generate-recipe', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received recipe generation request`);
  
  try {
    const { mealType, targets, ingredients, strict } = req.body;
    
    // Check for meal plan recipe request (new behavior)
    if (req.body.meal_plan_request === true) {
      console.log(`[${new Date().toISOString()}] Received meal plan recipe request`);
      console.log(`[MEAL PLAN RECIPE] Generating meal for ${mealType} with targets:`, targets);
      console.log(`[MEAL PLAN RECIPE] Ingredients provided: ${ingredients ? ingredients.length : 0}`);
      console.log(`[MEAL PLAN RECIPE] Using strategy: ${req.body.strategy || 'unknown'}, preferences: ${req.body.preferences || ''}`);
      
      // Generate template meal for meal plan
      const schedule = generateMealTemplates(targets, req.body.strategy || 'balanced', req.body.preferences || []);
      const mealTemplate = schedule.find(meal => meal.time_slot.toLowerCase() === mealType.toLowerCase())?.meal || 
                          schedule[0]?.meal || 'Balanced meal';
      console.log(`[MEAL PLAN RECIPE] Generated meal plan recipe: ${mealTemplate}`);
      
      return res.json({
        success: true,
        recipe: {
          recipe_name: mealTemplate,
          meal_type: mealType.toLowerCase(),
          prep_time: 15,
          cook_time: 20,
          servings: 1,
          ingredients: [],
          instructions: [],
          nutrition: targets || { calories: 400, protein: 25, carbs: 40, fat: 15 }
        }
      });
    }
    
    // Validate inputs for regular recipe generation
    if (!mealType || !targets || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request. Required: mealType, targets, and ingredients array.' 
      });
    }

    console.log(`[RECIPE GENERATION] Generating recipe for ${mealType} with ${ingredients.length} ingredients`);
    console.log(`[RECIPE GENERATION] Ingredients: ${ingredients.join(', ')}`);
    console.log(`[RECIPE GENERATION] Strict mode: ${strict ? 'enabled' : 'disabled'}`);
    
    // Get available AI providers in priority order
    const availableProviders = [];
    if (geminiTextService) availableProviders.push('gemini');
    
    console.log(`[RECIPE GENERATION] Available AI providers: [${availableProviders.join(', ')}]`);
    
    // Define AI_STRICT_EFFECTIVE locally to ensure availability
    const AI_STRICT_EFFECTIVE = process.env.AI_STRICT_MODE === 'true';
    
    try {
      // Try to generate recipe using AI services
      console.log(`[RECIPE GENERATION] Trying ${AI_PROVIDER} for recipe generation`);
      
      let recipe = null;
      let aiError = null;
      
      
      if (AI_PROVIDER === 'gemini' && geminiTextService) {
        try {
          // Add timeout for recipe generation (should be longer than Gemini's internal timeout)
          const RECIPE_TIMEOUT = 80000; // 80 seconds for recipe generation (allows for 60s + retry overhead)
          const recipePromise = geminiTextService.generateRecipe(mealType, targets, ingredients);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Recipe generation timeout')), RECIPE_TIMEOUT);
          });
          
          recipe = await Promise.race([recipePromise, timeoutPromise]);
          if (recipe) {
            console.log(`[GEMINI] ✅ Recipe generated successfully: ${recipe.recipe_name || recipe.name}`);
            console.log(`[RECIPE GENERATION] ✅ Recipe generated successfully using gemini`);
            return res.json({ success: true, recipe: attachPerIngredientMacros(recipe), fallback: false });
          }
        } catch (error) {
          aiError = error;
          console.log(`[GEMINI] ❌ Failed: ${error.message}`);
        }
      }
      
      // If primary AI failed, try fallback services
      if (!recipe && availableProviders.length > 1) {
        for (const provider of availableProviders) {
          if (provider === AI_PROVIDER) continue; // Skip the one we already tried
          
          try {
            console.log(`[RECIPE GENERATION] Trying fallback provider: ${provider}`);
            
            if (provider === 'gemini' && geminiTextService) {
              recipe = await geminiTextService.generateRecipe(mealType, targets, ingredients);
            }
            
            if (recipe) {
              console.log(`[${provider.toUpperCase()}] ✅ Recipe generated successfully (fallback): ${recipe.recipe_name || recipe.name}`);
              return res.json({ success: true, recipe: attachPerIngredientMacros(recipe), fallback: false });
            }
          } catch (error) {
            console.log(`[${provider.toUpperCase()}] ❌ Fallback failed: ${error.message}`);
          }
        }
      }
      
      // If all AI services failed, use rule-based fallback
      if (!recipe) {
        console.log(`[RECIPE GENERATION] All AI services failed, using rule-based fallback`);
        
        if (AI_STRICT_EFFECTIVE) {
          return res.status(502).json({ 
            success: false, 
            error: 'AI recipe generation failed and strict mode is enabled' 
          });
        }
        
        const highQualityRecipe = generateHighQualityRecipe(mealType, ingredients, targets);
        console.log(`[RECIPE GENERATION] ✅ Rule-based recipe generated: ${highQualityRecipe.name}`);
        return res.json({ success: true, recipe: attachPerIngredientMacros(highQualityRecipe), fallback: true });
      }
      
    } catch (error) {
      console.error(`[RECIPE GENERATION] Recipe generation error:`, error);
      
      if (AI_STRICT_EFFECTIVE) {
        return res.status(502).json({ 
          success: false, 
          error: 'Recipe generation failed and strict mode is enabled' 
        });
      }
      
      // Final fallback - generate a simple recipe
      try {
        const simpleRecipe = generateSimpleRecipe(mealType, ingredients, targets);
        console.log(`[RECIPE GENERATION] ✅ Simple recipe generated: ${simpleRecipe.recipe_name || simpleRecipe.name}`);
        return res.json({ success: true, recipe: attachPerIngredientMacros(simpleRecipe), fallback: true });
      } catch (fallbackError) {
        console.error(`[RECIPE GENERATION] Even fallback recipe generation failed:`, fallbackError);
        return res.status(500).json({ 
          success: false, 
          error: 'Recipe generation failed completely.' 
        });
      }
    }
  } catch (error) {
    console.error(`[RECIPE GENERATION] Recipe generation error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Recipe generation failed' 
    });
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

