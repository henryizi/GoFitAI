app.post('/api/generate-workout-plan', async (req, res) => {
  try {
    // Extract userId from request body (optional for testing)
    const { userId } = req.body;
    // Generate a UUID-like string for testing if no userId provided
    const defaultUserId = userId || crypto.randomUUID();

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

        // Transform plan data to match database function expectations
        const transformedPlan = {
          name: workoutPlanData.plan_name || `${normalizedProfile.primary_goal?.toUpperCase()} Workout Plan`,
          training_level: normalizedProfile.training_level || 'intermediate',
          goal_fat_loss: normalizedProfile.primary_goal === 'fat_loss' ? 5 : 0,
          goal_muscle_gain: normalizedProfile.primary_goal === 'muscle_gain' ? 5 : 0,
          mesocycle_length_weeks: 8,
          estimated_time_per_session: "45-60 min",
          weeklySchedule: workoutPlanData.weekly_schedule && Array.isArray(workoutPlanData.weekly_schedule) ? workoutPlanData.weekly_schedule.map(day => ({
            day: day.day || day.day_name || 'Unknown',
            focus: day.focus || day.day || 'General',
            exercises: [
              // Warm-up exercises
              ...(day.warm_up || []).map(exercise => ({
                name: exercise.exercise || exercise.name,
                sets: exercise.sets || 1,
                reps: exercise.reps || exercise.duration || "Warm-up",
                restBetweenSets: exercise.restBetweenSets || exercise.rest || "0s",
                type: "warm_up"
              })),
              // Main workout exercises
              ...(day.main_workout || []).map(exercise => ({
                name: exercise.exercise || exercise.name,
                sets: exercise.sets || 3,
                reps: exercise.reps || "8-12",
                restBetweenSets: exercise.restBetweenSets || exercise.rest_seconds || "60s",
                type: "main_workout"
              })),
              // Cool-down exercises
              ...(day.cool_down || []).map(exercise => ({
                name: exercise.exercise || exercise.name,
                sets: exercise.sets || 1,
                reps: exercise.reps || exercise.duration || "Cool-down",
                restBetweenSets: exercise.restBetweenSets || exercise.rest || "0s",
                type: "cool_down"
              }))
            ]
          })) : []
        };

        // Save to database using the upsert function
        let savedPlanId = null;
        try {
          if (supabase && (userId || defaultUserId)) {
            console.log('[WORKOUT] Saving plan to database for user:', userId || defaultUserId);
            const { data, error } = await supabase.rpc('upsert_ai_workout_plan', {
              user_id_param: userId || defaultUserId,
              plan_data: transformedPlan
            });

            if (error) {
              console.error('[WORKOUT] Error saving plan to database:', error);
            } else {
              savedPlanId = data;
              console.log('[WORKOUT] ✅ Plan saved to database with ID:', savedPlanId);

              // Update the plan to be active
              await supabase
                .from('workout_plans')
                .update({ status: 'active' })
                .eq('id', savedPlanId)
                .eq('user_id', userId || defaultUserId);

              console.log('[WORKOUT] ✅ Plan set as active');
            }
          }
        } catch (dbError) {
          console.error('[WORKOUT] Database save failed:', dbError);
        }

        // Return the structured plan with database ID
        const workoutPlan = {
          id: savedPlanId,
          plan_name: workoutPlanData.plan_name || `${normalizedProfile.primary_goal?.toUpperCase()} Workout Plan`,
          name: workoutPlanData.plan_name || `${normalizedProfile.primary_goal?.toUpperCase()} Workout Plan`,
          training_level: normalizedProfile.training_level || 'intermediate',
          goal_fat_loss: normalizedProfile.primary_goal === 'fat_loss' ? 5 : 0,
          goal_muscle_gain: normalizedProfile.primary_goal === 'muscle_gain' ? 5 : 0,
          mesocycle_length_weeks: 8,
          estimated_time_per_session: "45-60 min",
          primary_goal: normalizedProfile.primary_goal,
          workout_frequency: normalizedProfile.workout_frequency,
          weekly_schedule: workoutPlanData.weekly_schedule,
          weeklySchedule: workoutPlanData.weekly_schedule,
          status: 'active',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
      } catch (dbError) {
        console.error('[WORKOUT] Database save failed:', dbError);
      }
    } catch (aiError) {
      console.log('[WORKOUT] ❌ GEMINI failed:', aiError.message);
      console.log('[WORKOUT] ❌ GEMINI error stack:', aiError.stack);
      console.log('[WORKOUT] ❌ GEMINI error type:', aiError.constructor.name);
      console.log('[WORKOUT] 🧮 All AI providers failed, using rule-based workout plan generation');
    }

    // If all AI providers failed, use rule-based fallback
    if (!aiResponse || aiResponse.error) {
      console.log('[WORKOUT] 🧮 All AI providers failed, using rule-based workout plan generation');
      
      const fallbackPlan = generateRuleBasedWorkoutPlan(normalizedProfile);

      // Transform fallback plan data to match database function expectations
      const transformedFallbackPlan = {
        name: fallbackPlan.plan_name || `${normalizedProfile.primary_goal?.toUpperCase()} Workout Plan`,
        training_level: normalizedProfile.training_level || 'intermediate',
        goal_fat_loss: normalizedProfile.primary_goal === 'fat_loss' ? 5 : 0,
        goal_muscle_gain: normalizedProfile.primary_goal === 'muscle_gain' ? 5 : 0,
        mesocycle_length_weeks: 8,
        estimated_time_per_session: "45-60 min",
        weeklySchedule: fallbackPlan.weekly_schedule || fallbackPlan.weeklySchedule || []
      };

      // Save fallback plan to database
      let savedFallbackPlanId = null;
      try {
        if (supabase && (userId || defaultUserId)) {
          console.log('[WORKOUT] Saving fallback plan to database for user:', userId || defaultUserId);
          const { data, error } = await supabase.rpc('upsert_ai_workout_plan', {
            user_id_param: userId,
            plan_data: transformedFallbackPlan
          });

          if (error) {
            console.error('[WORKOUT] Error saving fallback plan to database:', error);
          } else {
            savedFallbackPlanId = data;
            console.log('[WORKOUT] ✅ Fallback plan saved to database with ID:', savedFallbackPlanId);

            // Update the plan to be active
            await supabase
              .from('workout_plans')
              .update({ status: 'active' })
              .eq('id', savedFallbackPlanId)
              .eq('user_id', userId || defaultUserId);

            console.log('[WORKOUT] ✅ Fallback plan set as active');
          }
        }
      } catch (dbError) {
        console.error('[WORKOUT] Database save failed for fallback plan:', dbError);
      }

      // Return the fallback plan with database ID
      const fallbackWorkoutPlan = {
        ...fallbackPlan,
        id: savedFallbackPlanId,
        training_level: normalizedProfile.training_level || 'intermediate',
        goal_fat_loss: normalizedProfile.primary_goal === 'fat_loss' ? 5 : 0,
        goal_muscle_gain: normalizedProfile.primary_goal === 'muscle_gain' ? 5 : 0,
        mesocycle_length_weeks: 8,
        estimated_time_per_session: "45-60 min",
        status: 'active',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'rule_based_fallback'
      };

        return res.json({
          success: true,
        workoutPlan: fallbackWorkoutPlan,
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
    
    // Transform the final plan data to match database function expectations
    const transformedFinalPlan = {
      name: `${normalizedProfile.primary_goal} Workout Plan`,
      training_level: normalizedProfile.training_level || 'intermediate',
      goal_fat_loss: normalizedProfile.primary_goal === 'fat_loss' ? 5 : 0,
      goal_muscle_gain: normalizedProfile.primary_goal === 'muscle_gain' ? 5 : 0,
      mesocycle_length_weeks: 8,
      estimated_time_per_session: "45-60 min",
      weeklySchedule: plan.weekly_schedule || plan.weeklySchedule || []
    };

    // Save final plan to database
    let savedFinalPlanId = null;
    try {
      if (supabase && userId) {
        console.log('[WORKOUT] Saving final plan to database for user:', userId);
        const { data, error } = await supabase.rpc('upsert_ai_workout_plan', {
          user_id_param: userId,
          plan_data: transformedFinalPlan
        });

        if (error) {
          console.error('[WORKOUT] Error saving final plan to database:', error);
        } else {
          savedFinalPlanId = data;
          console.log('[WORKOUT] ✅ Final plan saved to database with ID:', savedFinalPlanId);

          // Update the plan to be active
          await supabase
            .from('workout_plans')
            .update({ status: 'active' })
            .eq('id', savedFinalPlanId)
            .eq('user_id', userId || defaultUserId);

          console.log('[WORKOUT] ✅ Final plan set as active');
        }
      }
    } catch (dbError) {
      console.error('[WORKOUT] Database save failed for final plan:', dbError);
    }
    
    // Format response to match expected structure
    const workoutPlan = {
      id: savedFinalPlanId,
      plan_name: `${normalizedProfile.primary_goal} Workout Plan`,
      name: `${normalizedProfile.primary_goal} Workout Plan`,
      training_level: normalizedProfile.training_level || 'intermediate',
      goal_fat_loss: normalizedProfile.primary_goal === 'fat_loss' ? 5 : 0,
      goal_muscle_gain: normalizedProfile.primary_goal === 'muscle_gain' ? 5 : 0,
      mesocycle_length_weeks: 8,
      estimated_time_per_session: "45-60 min",
      primary_goal: normalizedProfile.primary_goal,
      weekly_schedule: plan.weekly_schedule || plan.weeklySchedule,
      weeklySchedule: plan.weekly_schedule || plan.weeklySchedule,
      status: 'active',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: usedProvider || 'rule_based_fallback'
    };

    return res.json({
      success: true,
      workoutPlan,
      provider: usedProvider || 'rule_based_fallback',
      used_ai: usedAI,
    });
  } catch (error) {
    console.error('[WORKOUT] Error generating workout plan:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
}
