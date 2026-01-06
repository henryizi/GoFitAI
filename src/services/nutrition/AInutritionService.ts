import { supabase } from '../supabase/client';
import { GeminiService } from '../ai/GeminiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AInutritionPlan {
  id: string;
  user_id: string;
  plan_name: string;
  goal_type: string;
  daily_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  protein_percentage: number;
  carbs_percentage: number;
  fat_percentage: number;
  explanation: string;
  reasoning: {
    bmr_calculation: string;
    tdee_calculation: string;
    calorie_adjustment: string;
    macro_distribution: string;
    personalization_factors: string[];
  };
  preferences?: {
    dietary?: string[];
    intolerances?: string[];
    favorite_cuisines?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  age?: number;
  birthday?: string;
  height?: number;  // Legacy column (deprecated)
  weight?: number;  // Legacy column (deprecated)
  height_cm?: number;  // ✅ Used by onboarding
  weight_kg?: number;  // ✅ Used by onboarding
  gender?: 'male' | 'female';
  activity_level?: 'sedentary' | 'moderately_active' | 'very_active';
  fitness_strategy?: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining';
  primary_goal?: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain';
  training_level?: 'beginner' | 'intermediate' | 'advanced';
  exercise_frequency?: '1' | '2-3' | '4-5' | '6-7';
  preferred_workout_frequency?: number; // Actual preferred workout days (1-7) - ✅ Used for AI nutrition calculations
  body_fat?: number;
  weight_trend?: 'losing' | 'gaining' | 'stable' | 'unsure';
  goal_fat_reduction?: number;
  goal_muscle_gain?: number;
}

export class AInutritionService {
  /**
   * Generate an AI-powered nutrition plan that considers all user factors
   */
  static async generateAInutritionPlan(
    userId: string,
    options: {
      dietaryPreferences?: string[];
      intolerances?: string[];
      cuisinePreferences?: string[];
    } = {}
  ): Promise<AInutritionPlan | null> {
    try {
      console.log('[AI NUTRITION] 🤖 Generating AI-powered nutrition plan');
      console.log('[AI NUTRITION] Options:', options);

      const dietaryPreferences = options.dietaryPreferences ?? [];
      const intolerances = options.intolerances ?? [];
      const cuisinePreferences = options.cuisinePreferences ?? [];

      // Fetch comprehensive user profile
      const userProfile = await this.fetchUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      console.log('[AI NUTRITION] User profile loaded:', JSON.stringify(userProfile, null, 2));
      console.log('[AI NUTRITION] Profile fields check:',  {
        hasAge: !!userProfile.age,
        hasBirthday: !!userProfile.birthday,
        hasWeight: !!userProfile.weight,
        hasHeight: !!userProfile.height,
        hasGender: !!userProfile.gender,
        weight: userProfile.weight,
        height: userProfile.height,
        age: userProfile.age
      });

      let nutritionTargets: any;
      let explanation: any;
      let usingAIGeneration = false;

      // 🤖 TRY TO GENERATE TARGETS WITH REAL AI FIRST
      console.log('[AI NUTRITION] 🧠 Attempting to generate nutrition targets with Gemini AI...');
      try {
        const aiResult = await GeminiService.generateAINutritionTargets(userProfile);
        
        if (aiResult.success && aiResult.calories) {
          console.log('[AI NUTRITION] ✅ Successfully generated AI nutrition targets');
          nutritionTargets = {
            calories: Math.round(aiResult.calories),
            protein: Math.round(aiResult.protein || 0),
            carbs: Math.round(aiResult.carbs || 0),
            fat: Math.round(aiResult.fat || 0),
            proteinPercentage: Math.round((aiResult.protein! * 4 / aiResult.calories) * 100),
            carbsPercentage: Math.round((aiResult.carbs! * 4 / aiResult.calories) * 100),
            fatPercentage: Math.round((aiResult.fat! * 9 / aiResult.calories) * 100),
          };
          
          explanation = {
            summary: aiResult.explanation || 'Your personalized AI nutrition plan is ready.',
            reasoning: {
              ai_generated: true,
              model: 'gemini',
              message: 'All targets calculated by Gemini AI based on your complete profile.'
            }
          };
          
          usingAIGeneration = true;
          console.log('[AI NUTRITION] 🎯 Using 100% AI-generated targets and explanation');
        } else {
          throw new Error(aiResult.error || 'AI generation failed');
        }
      } catch (aiError) {
        console.warn('[AI NUTRITION] ⚠️ AI generation failed, falling back to mathematical calculation:', aiError);
        
        // FALLBACK: Calculate AI-optimized nutrition targets using math
        nutritionTargets = await this.calculateAInutritionTargets(userProfile);
        
        // Generate detailed explanation
        explanation = this.generateExplanation(userProfile, nutritionTargets);

        // Try to enhance explanation with AI at least
        try {
          console.log('[AI NUTRITION] 🧠 Enhancing explanation with Generative AI...');
          const aiExplanation = await GeminiService.generateNutritionExplanation(userProfile, nutritionTargets);
          
          if (aiExplanation) {
            console.log('[AI NUTRITION] ✨ Successfully generated AI explanation');
            explanation.summary = aiExplanation;
          }
        } catch (explError) {
          console.warn('[AI NUTRITION] ⚠️ Failed to generate AI explanation, using template fallback:', explError);
        }
      }

      // Determine goal_type from user profile
      let goalType = 'maintenance';
      if (userProfile.fitness_strategy === 'cut') goalType = 'weight_loss';
      else if (userProfile.fitness_strategy === 'bulk') goalType = 'muscle_gain';
      else if (userProfile.fitness_strategy === 'recomp') goalType = 'recomp';
      else if (userProfile.fitness_strategy === 'maingaining') goalType = 'muscle_gain';
      else if (userProfile.primary_goal === 'fat_loss') goalType = 'weight_loss';
      else if (userProfile.primary_goal === 'muscle_gain' || userProfile.primary_goal === 'hypertrophy') goalType = 'muscle_gain';

      // Create and save the AI nutrition plan (ID will be generated by Supabase)
      const aiPlanData = {
        user_id: userId,
        plan_name: `${userProfile.full_name || 'Your'} AI Nutrition Plan`,
        goal_type: goalType,
        daily_calories: nutritionTargets.calories,
        protein_grams: nutritionTargets.protein,
        carbs_grams: nutritionTargets.carbs,
        fat_grams: nutritionTargets.fat,
        protein_percentage: nutritionTargets.proteinPercentage,
        carbs_percentage: nutritionTargets.carbsPercentage,
        fat_percentage: nutritionTargets.fatPercentage,
        explanation: explanation.summary,
        reasoning: explanation.reasoning,
        preferences: {
          dietary: dietaryPreferences,
          intolerances,
          favorite_cuisines: cuisinePreferences
        },
      };

      // Save to database (using existing nutrition_plans table structure)
      // Skip database save for guest users
      if (userId === 'guest') {
        console.log('[AI NUTRITION] Guest user detected, returning unsaved plan');
        const tempPlan = {
          id: 'temp-guest-plan',
          ...aiPlanData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AInutritionPlan;
        
        // Store in AsyncStorage for retrieval by the result screen
        await AsyncStorage.setItem('temp_guest_nutrition_plan', JSON.stringify(tempPlan));
        
        return tempPlan;
      }

      const aiPlan = await this.saveAInutritionPlan(aiPlanData);

      console.log('[AI NUTRITION] ✅ AI nutrition plan generated successfully');
      console.log('[AI NUTRITION] Plan details:', {
        id: aiPlan.id,
        user_id: aiPlan.user_id,
        plan_name: aiPlan.plan_name,
        status: 'active'
      });
      
      // Add a small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return aiPlan;

    } catch (error) {
      console.error('[AI NUTRITION] ❌ Error generating AI nutrition plan:', error);
      throw error;
    }
  }

  /**
   * Fetch comprehensive user profile data
   */
  private static async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    if (userId === 'guest') {
      console.log('[AI NUTRITION] Guest user detected, returning mock profile for calculation');
      return {
        id: 'guest',
        full_name: 'Guest User',
        age: 30,
        height_cm: 175,
        weight_kg: 75,
        gender: 'male',
        activity_level: 'moderately_active',
        fitness_strategy: 'maintenance',
        primary_goal: 'general_fitness',
        training_level: 'beginner',
        exercise_frequency: '2-3',
      } as UserProfile;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AI NUTRITION] Error fetching user profile:', error);
        return null;
      }

      // Normalize profile data to handle both old and new column names
      const profile = data as any;
      return {
        ...profile,
        // Use weight_kg if available, fallback to weight
        weight: profile.weight_kg || profile.weight,
        // Use height_cm if available, fallback to height
        height: profile.height_cm || profile.height,
      } as UserProfile;
    } catch (error) {
      console.error('[AI NUTRITION] Exception fetching user profile:', error);
      return null;
    }
  }

  /**
   * Calculate AI-optimized nutrition targets using advanced algorithms
   */
  private static async calculateAInutritionTargets(profile: UserProfile) {
    // Calculate age
    const age = this.calculateAge(profile);
    
    // Calculate BMR using the most accurate formula based on available data
    const bmr = this.calculateAdvancedBMR(profile, age);
    
    // Calculate TDEE with intelligent activity level assessment
    const tdee = this.calculateIntelligentTDEE(bmr, profile);
    
    // Apply AI-driven calorie adjustments based on goals and trends
    const adjustedCalories = this.applyAIcalorieAdjustments(tdee, profile);
    
    // Calculate optimal macro distribution using AI logic
    const macros = this.calculateAImacroDistribution(adjustedCalories, profile);

    return {
      calories: Math.round(adjustedCalories),
      protein: Math.round(macros.protein),
      carbs: Math.round(macros.carbs),
      fat: Math.round(macros.fat),
      proteinPercentage: Math.round(macros.proteinPercentage),
      carbsPercentage: Math.round(macros.carbsPercentage),
      fatPercentage: Math.round(macros.fatPercentage),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    };
  }

  /**
   * Calculate age from birthday or use provided age
   */
  private static calculateAge(profile: UserProfile): number {
    if (profile.age) return profile.age;
    
    if (profile.birthday) {
      const birthDate = new Date(profile.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    
    return 30; // Default fallback
  }

  /**
   * Calculate BMR using advanced formulas considering body composition
   */
  private static calculateAdvancedBMR(profile: UserProfile, age: number): number {
    const weight = profile.weight || 70;
    const height = profile.height || 170;
    const gender = profile.gender || 'male';

    // If body fat percentage is available, use Katch-McArdle formula (more accurate)
    if (profile.body_fat && profile.body_fat > 0) {
      const leanBodyMass = weight * (1 - profile.body_fat / 100);
      return 370 + (21.6 * leanBodyMass);
    }

    // Otherwise use Henry/Oxford equation (more accurate than Harris-Benedict)
    if (gender === 'male') {
      if (age >= 18 && age <= 30) {
        return 14.4 * weight + 3.13 * height + 113;
      } else if (age >= 30 && age <= 60) {
        return 11.4 * weight + 5.41 * height - 137;
      } else {
        return 11.4 * weight + 5.41 * height - 256;
      }
    } else {
      if (age >= 18 && age <= 30) {
        return 10.4 * weight + 6.15 * height - 282;
      } else if (age >= 30 && age <= 60) {
        return 8.18 * weight + 5.02 * height - 11.6;
      } else {
        return 8.52 * weight + 4.21 * height + 10.7;
      }
    }
  }

  /**
   * Calculate TDEE with intelligent activity assessment
   */
  private static calculateIntelligentTDEE(bmr: number, profile: UserProfile): number {
    let baseMultiplier = 1.2; // sedentary default

    // Base activity level multiplier
    switch (profile.activity_level) {
      case 'sedentary':
        baseMultiplier = 1.2;
        break;
      case 'moderately_active':
        baseMultiplier = 1.55;
        break;
      case 'very_active':
        baseMultiplier = 1.725;
        break;
    }

    // Adjust based on workout frequency (use preferred_workout_frequency if available)
    let exerciseMultiplier = 1.0;
    
    if (profile.preferred_workout_frequency) {
      // Use actual workout frequency for more accurate calculation
      const freq = profile.preferred_workout_frequency;
      if (freq === 1) exerciseMultiplier = 1.0;
      else if (freq <= 3) exerciseMultiplier = 1.05;
      else if (freq <= 5) exerciseMultiplier = 1.1;
      else exerciseMultiplier = 1.15;
    } else {
      // Fallback to bucketed exercise_frequency
      switch (profile.exercise_frequency) {
        case '1':
          exerciseMultiplier = 1.0;
          break;
        case '2-3':
          exerciseMultiplier = 1.05;
          break;
        case '4-5':
          exerciseMultiplier = 1.1;
          break;
        case '6-7':
          exerciseMultiplier = 1.15;
          break;
      }
    }

    // Adjust based on training level (advanced athletes burn more)
    let trainingMultiplier = 1.0;
    switch (profile.training_level) {
      case 'beginner':
        trainingMultiplier = 1.0;
        break;
      case 'intermediate':
        trainingMultiplier = 1.02;
        break;
      case 'advanced':
        trainingMultiplier = 1.05;
        break;
    }

    return bmr * baseMultiplier * exerciseMultiplier * trainingMultiplier;
  }

  /**
   * Apply AI-driven calorie adjustments based on goals and trends
   */
  private static applyAIcalorieAdjustments(tdee: number, profile: UserProfile): number {
    let adjustedCalories = tdee;

    // Primary goal adjustments
    switch (profile.fitness_strategy) {
      case 'cut':
        adjustedCalories = tdee * 0.8; // 20% deficit
        break;
      case 'bulk':
        adjustedCalories = tdee * 1.15; // 15% surplus
        break;
      case 'maintenance':
        adjustedCalories = tdee;
        break;
      case 'recomp':
        adjustedCalories = tdee * 0.95; // Slight deficit for body recomposition
        break;
      case 'maingaining':
        adjustedCalories = tdee * 1.05; // Small surplus for lean gains
        break;
    }

    // Fine-tune based on specific goals
    if (profile.primary_goal === 'fat_loss') {
      adjustedCalories *= 0.9; // Additional 10% reduction for fat loss focus
    } else if (profile.primary_goal === 'muscle_gain') {
      adjustedCalories *= 1.1; // Additional 10% increase for muscle gain focus
    }

    // Adjust based on weight trend (AI learns from user's current progress)
    switch (profile.weight_trend) {
      case 'losing':
        if (profile.fitness_strategy === 'bulk' || profile.fitness_strategy === 'maingaining') {
          adjustedCalories *= 1.1; // Increase calories if losing weight but trying to gain
        }
        break;
      case 'gaining':
        if (profile.fitness_strategy === 'cut') {
          adjustedCalories *= 0.9; // Decrease calories if gaining weight but trying to cut
        }
        break;
      case 'stable':
        // No adjustment needed - current approach is working
        break;
    }

    // Consider specific fat/muscle goals
    if (profile.goal_fat_reduction && profile.goal_fat_reduction > 5) {
      adjustedCalories *= 0.95; // More aggressive deficit for significant fat loss
    }
    if (profile.goal_muscle_gain && profile.goal_muscle_gain > 3) {
      adjustedCalories *= 1.05; // More calories for significant muscle gain
    }

    return adjustedCalories;
  }

  /**
   * Calculate optimal macro distribution using AI logic
   */
  private static calculateAImacroDistribution(calories: number, profile: UserProfile) {
    let proteinPercentage = 25; // Default
    let carbsPercentage = 45;   // Default
    let fatPercentage = 30;     // Default

    // Adjust protein based on goals and training
    if (profile.primary_goal === 'muscle_gain' || profile.primary_goal === 'hypertrophy') {
      proteinPercentage = 30; // Higher protein for muscle building
    } else if (profile.primary_goal === 'fat_loss') {
      proteinPercentage = 35; // High protein for fat loss and muscle preservation
    }

    // Adjust based on training level
    if (profile.training_level === 'advanced') {
      proteinPercentage += 2; // Advanced athletes need more protein
    }

    // Adjust carbs based on activity and goals
    const isVeryActive = profile.activity_level === 'very_active' || 
                         profile.exercise_frequency === '6-7' ||
                         (profile.preferred_workout_frequency && profile.preferred_workout_frequency >= 6);
    
    if (isVeryActive) {
      carbsPercentage = 50; // Higher carbs for very active individuals
      fatPercentage = 20;   // Lower fat to accommodate higher carbs
    } else if (profile.fitness_strategy === 'cut') {
      carbsPercentage = 35; // Lower carbs for cutting
      fatPercentage = 30;   // Maintain fat for hormone production
    }

    // Adjust based on body fat percentage
    if (profile.body_fat && profile.body_fat > 20) {
      carbsPercentage -= 5; // Lower carbs for higher body fat
      proteinPercentage += 3; // Higher protein
      fatPercentage += 2;   // Slightly higher fat
    }

    // Ensure percentages add up to 100
    const total = proteinPercentage + carbsPercentage + fatPercentage;
    if (total !== 100) {
      const adjustment = (100 - total) / 3;
      proteinPercentage += adjustment;
      carbsPercentage += adjustment;
      fatPercentage += adjustment;
    }

    // Calculate grams
    const proteinGrams = (calories * (proteinPercentage / 100)) / 4; // 4 calories per gram
    const carbsGrams = (calories * (carbsPercentage / 100)) / 4;     // 4 calories per gram
    const fatGrams = (calories * (fatPercentage / 100)) / 9;         // 9 calories per gram

    return {
      protein: proteinGrams,
      carbs: carbsGrams,
      fat: fatGrams,
      proteinPercentage,
      carbsPercentage,
      fatPercentage,
    };
  }

  /**
   * Generate detailed explanation for the AI nutrition plan
   */
  private static generateExplanation(profile: UserProfile, targets: any) {
    const age = this.calculateAge(profile);
    const personalizationFactors: string[] = [];

    // Collect personalization factors
    if (profile.body_fat) {
      personalizationFactors.push(`Body fat percentage (${profile.body_fat}%) for precise metabolic calculations`);
    }
    if (profile.training_level) {
      personalizationFactors.push(`${profile.training_level} training level for appropriate protein needs`);
    }
    
    // Use preferred_workout_frequency if available, otherwise fall back to exercise_frequency
    const workoutFreqDisplay = profile.preferred_workout_frequency 
      ? `${profile.preferred_workout_frequency} days per week`
      : profile.exercise_frequency ? `${profile.exercise_frequency} times per week` : null;
    
    if (workoutFreqDisplay) {
      personalizationFactors.push(`${workoutFreqDisplay} workout frequency for activity adjustments`);
    }
    
    if (profile.weight_trend) {
      personalizationFactors.push(`Current weight trend (${profile.weight_trend}) for dynamic adjustments`);
    }
    if (profile.goal_fat_reduction || profile.goal_muscle_gain) {
      personalizationFactors.push('Specific body composition goals for targeted approach');
    }

    const summary = `Your AI nutrition plan is personalized based on ${personalizationFactors.length} key factors from your profile. 

This plan provides ${targets.calories} daily calories with ${targets.protein}g protein (${targets.proteinPercentage}%), ${targets.carbs}g carbs (${targets.carbsPercentage}%), and ${targets.fat}g fat (${targets.fatPercentage}%).

The AI considered your ${profile.fitness_strategy || 'maintenance'} strategy, ${profile.activity_level || 'moderate'} activity level, and ${profile.primary_goal || 'general fitness'} goal to optimize your nutrition for maximum results.`;

    const reasoning = {
      bmr_calculation: profile.body_fat 
        ? `Used Katch-McArdle formula with ${profile.body_fat}% body fat for precise BMR of ${targets.bmr} calories`
        : `Used Henry/Oxford equation based on age (${age}), gender (${profile.gender}), height (${profile.height}cm), and weight (${profile.weight}kg) for BMR of ${targets.bmr} calories`,
      
      tdee_calculation: `Applied ${profile.activity_level} multiplier with ${workoutFreqDisplay || 'moderate'} workout frequency and ${profile.training_level} training level adjustments for TDEE of ${targets.tdee} calories`,
      
      calorie_adjustment: `Adjusted from TDEE based on ${profile.fitness_strategy} strategy${profile.weight_trend ? ` and current ${profile.weight_trend} weight trend` : ''} to reach ${targets.calories} daily calories`,
      
      macro_distribution: `Optimized macros for ${profile.primary_goal} with ${targets.proteinPercentage}% protein for muscle support, ${targets.carbsPercentage}% carbs for energy, and ${targets.fatPercentage}% fat for hormone production`,
      
      personalization_factors: personalizationFactors,
    };

    return { summary, reasoning };
  }

  /**
   * Save AI nutrition plan to database
   */
  private static async saveAInutritionPlan(planData: Omit<AInutritionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<AInutritionPlan> {
    try {
      // Save to nutrition_plans table with AI-specific metadata
      // Supabase will auto-generate the UUID and timestamps
      // First, archive any existing active plans for this user
      try {
        await supabase
          .from('nutrition_plans')
          .update({ status: 'archived' })
          .eq('user_id', planData.user_id)
          .eq('status', 'active');
      } catch (archiveError) {
        console.warn('[AI NUTRITION] Could not archive existing plans:', archiveError);
      }

      const { data, error } = await supabase
        .from('nutrition_plans')
        .insert({
          user_id: planData.user_id,
          plan_name: planData.plan_name,
          goal_type: planData.goal_type,
          plan_type: 'ai_generated',
          status: 'active', // Set as active so it shows up in the list
          daily_targets: {
            calories: planData.daily_calories,
            protein: planData.protein_grams,
            carbs: planData.carbs_grams,
            fat: planData.fat_grams,
            protein_percentage: planData.protein_percentage,
            carbs_percentage: planData.carbs_percentage,
            fat_percentage: planData.fat_percentage,
          },
          ai_explanation: planData.explanation,
          ai_reasoning: planData.reasoning,
          preferences: planData.preferences || {
            dietary: [],
            intolerances: [],
            favorite_cuisines: []
          },
        })
        .select()
        .single();

      if (error) {
        console.error('[AI NUTRITION] Error saving AI nutrition plan:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      console.log('[AI NUTRITION] ✅ AI nutrition plan saved successfully with ID:', data.id);

      // Convert the database response to AInutritionPlan format
      return {
        id: data.id,
        user_id: data.user_id,
        plan_name: data.plan_name,
        goal_type: data.goal_type || planData.goal_type,
        daily_calories: data.daily_targets.calories,
        protein_grams: data.daily_targets.protein,
        carbs_grams: data.daily_targets.carbs,
        fat_grams: data.daily_targets.fat,
        protein_percentage: data.daily_targets.protein_percentage,
        carbs_percentage: data.daily_targets.carbs_percentage,
        fat_percentage: data.daily_targets.fat_percentage,
        explanation: data.ai_explanation,
        reasoning: data.ai_reasoning,
        preferences: data.preferences || planData.preferences,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('[AI NUTRITION] Exception saving AI nutrition plan:', error);
      throw error;
    }
  }
}
