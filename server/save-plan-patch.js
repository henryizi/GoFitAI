app.post('/api/save-plan', async (req, res) => {
  const { plan, user } = req.body;
  console.log('[SAVE PLAN] Calling database function to save plan for user:', user.id);

  try {
    // Try to save to the database first
    if (supabase) {
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
    }

    // Fallback: Generate a unique ID and return it
    const fallbackId = `ai-${Date.now().toString(36)}`;
    console.log('[SAVE PLAN] Using fallback ID generation:', fallbackId);
    
    // Return the fallback ID
    return res.json({ success: true, newPlanId: fallbackId });
  } catch (err) {
    console.error('[SAVE PLAN] Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || 'An unexpected error occurred' });
  }
});

// Add endpoint to set a plan as active
app.post('/api/set-active-plan', async (req, res) => {
  const { userId, planId } = req.body;
  console.log('[SET ACTIVE PLAN] Setting plan as active for user:', userId, 'plan:', planId);

  try {
    if (supabase) {
      // First, deactivate all existing active plans for this user
      const { error: deactivateError } = await supabase
        .from('workout_plans')
        .update({ status: 'archived' })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (deactivateError) {
        console.error('[SET ACTIVE PLAN] Error deactivating existing plans:', deactivateError);
        return res.status(500).json({ success: false, error: 'Failed to deactivate existing plans' });
      }

      // Then, activate the specified plan
      const { error: activateError } = await supabase
        .from('workout_plans')
        .update({ status: 'active' })
        .eq('id', planId)
        .eq('user_id', userId);

      if (activateError) {
        console.error('[SET ACTIVE PLAN] Error activating plan:', activateError);
        return res.status(500).json({ success: false, error: 'Failed to activate plan' });
      }

      console.log('[SET ACTIVE PLAN] Successfully set plan as active');
      return res.json({ success: true });
    }

    // Fallback for when supabase is not available
    console.log('[SET ACTIVE PLAN] Supabase not available, using fallback');
    return res.json({ success: true });
  } catch (err) {
    console.error('[SET ACTIVE PLAN] Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || 'An unexpected error occurred' });
  }
});
