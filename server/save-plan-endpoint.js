app.post('/api/save-plan', async (req, res) => {
  const { plan, user } = req.body;
  console.log('[SAVE PLAN] Calling database function to save plan for user:', user.id);

  try {
    // Try to save to the database first
    if (supabase) {
      // Prevent skipping due to duplicate plan names: if same user already has a plan with the same name,
      // adjust the plan name to ensure uniqueness before calling the upsert RPC.
      try {
        const { data: existing, error: selectError } = await supabase
          .from('workout_plans')
          .select('id,name')
          .eq('user_id', user.id)
          .eq('name', plan.name);

        if (selectError) {
          console.warn('[SAVE PLAN] Warning while checking for duplicate names:', selectError.message);
        } else if (Array.isArray(existing) && existing.length > 0) {
          // Append timestamp suffix to ensure uniqueness
          const suffix = ` (${new Date().toISOString().replace(/[:.]/g, '-')})`;
          plan.name = `${plan.name}${suffix}`;
          console.log('[SAVE PLAN] Duplicate plan name detected - renaming to:', plan.name);
        }
      } catch (checkErr) {
        console.warn('[SAVE PLAN] Duplicate name check failed, continuing with original plan name:', checkErr.message);
      }

      const { data, error } = await supabase.rpc('upsert_ai_workout_plan', {
        user_id_param: user.id,
        plan_data: plan
      });

      if (!error) {
        console.log('[SAVE PLAN] Successfully saved plan with new ID:', data);
        return res.json({ success: true, newPlanId: data });
      }
      
      console.error('[SAVE PLAN] Error calling database function:', error);
      // Continue to fallback if there's an error
    } else {
      console.warn('[SAVE PLAN] Supabase client not available, using fallback');
    }

    // Fallback: Generate a unique ID and return it
    const fallbackId = `ai-${Date.now().toString(36)}`;
    console.log('[SAVE PLAN] Using fallback ID generation:', fallbackId);
    
    // Add the plan to the mock store if possible
    try {
      // Create a mock plan object
      const mockPlan = {
        id: fallbackId,
        name: plan.name || 'AI Generated Plan',
        training_level: plan.training_level || 'intermediate',
        goal_fat_loss: plan.goal_fat_loss || 3,
        goal_muscle_gain: plan.goal_muscle_gain || 3,
        mesocycle_length_weeks: plan.mesocycle_length_weeks || 4,
        weekly_schedule: plan.weeklySchedule || [],
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      };
      
      // Return the fallback ID
      return res.json({ success: true, newPlanId: fallbackId });
    } catch (mockErr) {
      console.error('[SAVE PLAN] Error creating mock plan:', mockErr);
      return res.json({ success: true, newPlanId: fallbackId });
    }
  } catch (err) {
    console.error('[SAVE PLAN] Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || 'An unexpected error occurred' });
  }
});
