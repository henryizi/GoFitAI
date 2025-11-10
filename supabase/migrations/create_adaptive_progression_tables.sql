-- =====================================================
-- Adaptive Progression Engine - Database Schema
-- =====================================================
-- This migration creates all tables needed for the
-- Adaptive Progression Engine feature
-- =====================================================

-- 1. Progression Settings Table
-- Stores user preferences for progression modes and goals
CREATE TABLE IF NOT EXISTS public.progression_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Progression Mode
  mode VARCHAR(20) NOT NULL DEFAULT 'balanced' CHECK (mode IN ('conservative', 'balanced', 'aggressive')),
  
  -- Goals & Targets
  primary_goal VARCHAR(50) DEFAULT 'strength_gain',
  target_weight_increase_kg DECIMAL(5,2) DEFAULT 2.5,
  target_rep_increase INTEGER DEFAULT 2,
  
  -- Intensity Settings
  intensity_preference VARCHAR(20) DEFAULT 'moderate' CHECK (intensity_preference IN ('low', 'moderate', 'high')),
  recovery_sensitivity VARCHAR(20) DEFAULT 'normal' CHECK (recovery_sensitivity IN ('low', 'normal', 'high')),
  
  -- Feature Toggles
  auto_progression_enabled BOOLEAN DEFAULT true,
  plateau_detection_enabled BOOLEAN DEFAULT true,
  recovery_tracking_enabled BOOLEAN DEFAULT true,
  form_quality_threshold INTEGER DEFAULT 7 CHECK (form_quality_threshold >= 1 AND form_quality_threshold <= 10),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- 2. Exercise History Table
-- Tracks detailed performance history for each exercise
CREATE TABLE IF NOT EXISTS public.exercise_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(255) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  
  -- Performance Data
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  sets INTEGER,
  volume_kg DECIMAL(10,2), -- weight * reps * sets
  one_rep_max_kg DECIMAL(6,2), -- Calculated 1RM
  
  -- Quality Metrics
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  form_quality INTEGER CHECK (form_quality >= 1 AND form_quality <= 10),
  
  -- Context
  workout_session_id VARCHAR(255),
  workout_plan_id VARCHAR(255),
  notes TEXT,
  
  -- Metadata
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Progression Recommendations Table
-- Stores AI-generated progression recommendations
CREATE TABLE IF NOT EXISTS public.progression_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(255) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  
  -- Recommendation Type
  recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN (
    'weight_increase',
    'rep_increase',
    'volume_increase',
    'deload',
    'maintain',
    'exercise_variation',
    'rest_day'
  )),
  
  -- Recommendation Details
  current_weight_kg DECIMAL(6,2),
  recommended_weight_kg DECIMAL(6,2),
  current_reps INTEGER,
  recommended_reps INTEGER,
  current_sets INTEGER,
  recommended_sets INTEGER,
  
  -- Reasoning
  reasoning TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  applied_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Plateau Detection Table
-- Tracks detected plateaus and their resolution
CREATE TABLE IF NOT EXISTS public.plateau_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(255) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  
  -- Plateau Details
  plateau_type VARCHAR(50) NOT NULL CHECK (plateau_type IN (
    'strength_plateau',
    'volume_plateau',
    'performance_decline',
    'form_degradation'
  )),
  
  -- Detection Data
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plateau_duration_days INTEGER,
  performance_data JSONB, -- Stores historical data points
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_method VARCHAR(100),
  
  -- Recommendations
  suggested_actions JSONB, -- Array of suggested interventions
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Recovery Metrics Table
-- Tracks recovery indicators and readiness
CREATE TABLE IF NOT EXISTS public.recovery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recovery Scores (1-10 scale)
  overall_readiness INTEGER CHECK (overall_readiness >= 1 AND overall_readiness <= 10),
  muscle_soreness INTEGER CHECK (muscle_soreness >= 1 AND muscle_soreness <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  
  -- Context
  workout_yesterday BOOLEAN DEFAULT false,
  rest_days_count INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.progression_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plateau_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_metrics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Users can only access their own data
-- =====================================================

-- Progression Settings Policies
CREATE POLICY "Users can view own progression settings"
  ON public.progression_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progression settings"
  ON public.progression_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progression settings"
  ON public.progression_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progression settings"
  ON public.progression_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Exercise History Policies
CREATE POLICY "Users can view own exercise history"
  ON public.exercise_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise history"
  ON public.exercise_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise history"
  ON public.exercise_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise history"
  ON public.exercise_history FOR DELETE
  USING (auth.uid() = user_id);

-- Progression Recommendations Policies
CREATE POLICY "Users can view own progression recommendations"
  ON public.progression_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progression recommendations"
  ON public.progression_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progression recommendations"
  ON public.progression_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progression recommendations"
  ON public.progression_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Plateau Detection Policies
CREATE POLICY "Users can view own plateau detections"
  ON public.plateau_detections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plateau detections"
  ON public.plateau_detections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plateau detections"
  ON public.plateau_detections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plateau detections"
  ON public.plateau_detections FOR DELETE
  USING (auth.uid() = user_id);

-- Recovery Metrics Policies
CREATE POLICY "Users can view own recovery metrics"
  ON public.recovery_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery metrics"
  ON public.recovery_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery metrics"
  ON public.recovery_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery metrics"
  ON public.recovery_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Exercise history indexes
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_exercise 
  ON public.exercise_history(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_history_performed_at 
  ON public.exercise_history(performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_history_user_performed 
  ON public.exercise_history(user_id, performed_at DESC);

-- Progression recommendations indexes
CREATE INDEX IF NOT EXISTS idx_progression_recommendations_user_exercise 
  ON public.progression_recommendations(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_progression_recommendations_user_status 
  ON public.progression_recommendations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_progression_recommendations_exercise 
  ON public.progression_recommendations(exercise_id);

CREATE INDEX IF NOT EXISTS idx_progression_recommendations_created 
  ON public.progression_recommendations(created_at DESC);

-- Plateau detections indexes
CREATE INDEX IF NOT EXISTS idx_plateau_detections_user_exercise 
  ON public.plateau_detections(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_plateau_detections_user_resolved 
  ON public.plateau_detections(user_id, resolved);

CREATE INDEX IF NOT EXISTS idx_plateau_detections_exercise 
  ON public.plateau_detections(exercise_id);

CREATE INDEX IF NOT EXISTS idx_plateau_detections_detected 
  ON public.plateau_detections(detected_at DESC);

-- Recovery metrics indexes
CREATE INDEX IF NOT EXISTS idx_recovery_metrics_user_date 
  ON public.recovery_metrics(user_id, recorded_at DESC);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to progression_settings
CREATE TRIGGER update_progression_settings_updated_at
  BEFORE UPDATE ON public.progression_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to calculate 1RM (One Rep Max) using Epley formula
CREATE OR REPLACE FUNCTION calculate_one_rep_max(weight_kg DECIMAL, reps INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  -- Epley Formula: 1RM = weight * (1 + reps/30)
  IF reps = 1 THEN
    RETURN weight_kg;
  ELSIF reps > 12 THEN
    -- For high reps, cap at 12 to avoid unrealistic estimates
    RETURN weight_kg * (1 + 12.0/30.0);
  ELSE
    RETURN weight_kg * (1 + reps::DECIMAL/30.0);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get recent exercise performance summary
CREATE OR REPLACE FUNCTION get_exercise_performance_summary(
  p_user_id UUID,
  p_exercise_id VARCHAR(255),
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  avg_weight DECIMAL,
  max_weight DECIMAL,
  avg_reps DECIMAL,
  max_reps INTEGER,
  avg_volume DECIMAL,
  max_volume DECIMAL,
  session_count INTEGER,
  avg_rpe DECIMAL,
  trend VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_sessions AS (
    SELECT *
    FROM public.exercise_history
    WHERE user_id = p_user_id
      AND exercise_id = p_exercise_id
      AND performed_at >= NOW() - INTERVAL '1 day' * p_days_back
    ORDER BY performed_at DESC
  ),
  first_half AS (
    SELECT AVG(weight_kg) as avg_weight_first
    FROM (
      SELECT weight_kg
      FROM recent_sessions
      ORDER BY performed_at
      LIMIT (SELECT COUNT(*) / 2 FROM recent_sessions)
    ) sub
  ),
  second_half AS (
    SELECT AVG(weight_kg) as avg_weight_second
    FROM (
      SELECT weight_kg
      FROM recent_sessions
      ORDER BY performed_at DESC
      LIMIT (SELECT COUNT(*) / 2 FROM recent_sessions)
    ) sub
  )
  SELECT
    AVG(eh.weight_kg)::DECIMAL as avg_weight,
    MAX(eh.weight_kg)::DECIMAL as max_weight,
    AVG(eh.reps)::DECIMAL as avg_reps,
    MAX(eh.reps)::INTEGER as max_reps,
    AVG(eh.volume_kg)::DECIMAL as avg_volume,
    MAX(eh.volume_kg)::DECIMAL as max_volume,
    COUNT(*)::INTEGER as session_count,
    AVG(eh.rpe)::DECIMAL as avg_rpe,
    CASE
      WHEN (SELECT avg_weight_second FROM second_half) > (SELECT avg_weight_first FROM first_half) * 1.05 THEN 'improving'
      WHEN (SELECT avg_weight_second FROM second_half) < (SELECT avg_weight_first FROM first_half) * 0.95 THEN 'declining'
      ELSE 'stable'
    END as trend
  FROM recent_sessions eh;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Sample Data for Testing (Optional)
-- =====================================================

-- This will create default settings for any user who doesn't have them
-- You can call this function when a new user signs up
CREATE OR REPLACE FUNCTION create_default_progression_settings(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.progression_settings (
    user_id,
    mode,
    primary_goal,
    auto_progression_enabled,
    plateau_detection_enabled
  )
  VALUES (
    p_user_id,
    'balanced',
    'strength_gain',
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_exercise_date 
  ON public.exercise_history (user_id, exercise_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_valid 
  ON public.progression_recommendations (user_id, status, valid_until);

CREATE INDEX IF NOT EXISTS idx_plateau_user_exercise_unresolved 
  ON public.plateau_detections (user_id, exercise_id, resolved) 
  WHERE resolved = false;

-- =====================================================
-- Views for Analytics
-- =====================================================

-- View: User Progression Summary
CREATE OR REPLACE VIEW user_progression_summary AS
SELECT
  eh.user_id,
  eh.exercise_id,
  eh.exercise_name,
  COUNT(*) as total_sessions,
  MAX(eh.weight_kg) as max_weight,
  MAX(eh.one_rep_max_kg) as max_one_rep_max,
  AVG(eh.rpe) as avg_rpe,
  AVG(eh.form_quality) as avg_form_quality,
  MIN(eh.performed_at) as first_session,
  MAX(eh.performed_at) as last_session,
  (MAX(eh.weight_kg) - MIN(eh.weight_kg)) / NULLIF(MIN(eh.weight_kg), 0) * 100 as weight_improvement_pct
FROM public.exercise_history eh
GROUP BY eh.user_id, eh.exercise_id, eh.exercise_name;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON user_progression_summary TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Add a comment to track this migration
COMMENT ON TABLE public.progression_settings IS 'Stores user preferences for the Adaptive Progression Engine';
COMMENT ON TABLE public.exercise_history IS 'Detailed performance history for each exercise';
COMMENT ON TABLE public.progression_recommendations IS 'AI-generated progression recommendations';
COMMENT ON TABLE public.plateau_detections IS 'Tracks detected plateaus and their resolution';
COMMENT ON TABLE public.recovery_metrics IS 'Recovery indicators and readiness tracking';





-- =====================================================
-- This migration creates all tables needed for the
-- Adaptive Progression Engine feature
-- =====================================================

-- 1. Progression Settings Table
-- Stores user preferences for progression modes and goals
CREATE TABLE IF NOT EXISTS public.progression_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Progression Mode
  mode VARCHAR(20) NOT NULL DEFAULT 'balanced' CHECK (mode IN ('conservative', 'balanced', 'aggressive')),
  
  -- Goals & Targets
  primary_goal VARCHAR(50) DEFAULT 'strength_gain',
  target_weight_increase_kg DECIMAL(5,2) DEFAULT 2.5,
  target_rep_increase INTEGER DEFAULT 2,
  
  -- Intensity Settings
  intensity_preference VARCHAR(20) DEFAULT 'moderate' CHECK (intensity_preference IN ('low', 'moderate', 'high')),
  recovery_sensitivity VARCHAR(20) DEFAULT 'normal' CHECK (recovery_sensitivity IN ('low', 'normal', 'high')),
  
  -- Feature Toggles
  auto_progression_enabled BOOLEAN DEFAULT true,
  plateau_detection_enabled BOOLEAN DEFAULT true,
  recovery_tracking_enabled BOOLEAN DEFAULT true,
  form_quality_threshold INTEGER DEFAULT 7 CHECK (form_quality_threshold >= 1 AND form_quality_threshold <= 10),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- 2. Exercise History Table
-- Tracks detailed performance history for each exercise
CREATE TABLE IF NOT EXISTS public.exercise_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(255) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  
  -- Performance Data
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  sets INTEGER,
  volume_kg DECIMAL(10,2), -- weight * reps * sets
  one_rep_max_kg DECIMAL(6,2), -- Calculated 1RM
  
  -- Quality Metrics
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  form_quality INTEGER CHECK (form_quality >= 1 AND form_quality <= 10),
  
  -- Context
  workout_session_id VARCHAR(255),
  workout_plan_id VARCHAR(255),
  notes TEXT,
  
  -- Metadata
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Progression Recommendations Table
-- Stores AI-generated progression recommendations
CREATE TABLE IF NOT EXISTS public.progression_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(255) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  
  -- Recommendation Type
  recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN (
    'weight_increase',
    'rep_increase',
    'volume_increase',
    'deload',
    'maintain',
    'exercise_variation',
    'rest_day'
  )),
  
  -- Recommendation Details
  current_weight_kg DECIMAL(6,2),
  recommended_weight_kg DECIMAL(6,2),
  current_reps INTEGER,
  recommended_reps INTEGER,
  current_sets INTEGER,
  recommended_sets INTEGER,
  
  -- Reasoning
  reasoning TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  applied_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Plateau Detection Table
-- Tracks detected plateaus and their resolution
CREATE TABLE IF NOT EXISTS public.plateau_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(255) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  
  -- Plateau Details
  plateau_type VARCHAR(50) NOT NULL CHECK (plateau_type IN (
    'strength_plateau',
    'volume_plateau',
    'performance_decline',
    'form_degradation'
  )),
  
  -- Detection Data
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plateau_duration_days INTEGER,
  performance_data JSONB, -- Stores historical data points
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_method VARCHAR(100),
  
  -- Recommendations
  suggested_actions JSONB, -- Array of suggested interventions
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Recovery Metrics Table
-- Tracks recovery indicators and readiness
CREATE TABLE IF NOT EXISTS public.recovery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recovery Scores (1-10 scale)
  overall_readiness INTEGER CHECK (overall_readiness >= 1 AND overall_readiness <= 10),
  muscle_soreness INTEGER CHECK (muscle_soreness >= 1 AND muscle_soreness <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  
  -- Context
  workout_yesterday BOOLEAN DEFAULT false,
  rest_days_count INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.progression_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plateau_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_metrics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Users can only access their own data
-- =====================================================

-- Progression Settings Policies
CREATE POLICY "Users can view own progression settings"
  ON public.progression_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progression settings"
  ON public.progression_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progression settings"
  ON public.progression_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progression settings"
  ON public.progression_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Exercise History Policies
CREATE POLICY "Users can view own exercise history"
  ON public.exercise_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise history"
  ON public.exercise_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise history"
  ON public.exercise_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise history"
  ON public.exercise_history FOR DELETE
  USING (auth.uid() = user_id);

-- Progression Recommendations Policies
CREATE POLICY "Users can view own progression recommendations"
  ON public.progression_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progression recommendations"
  ON public.progression_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progression recommendations"
  ON public.progression_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progression recommendations"
  ON public.progression_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Plateau Detection Policies
CREATE POLICY "Users can view own plateau detections"
  ON public.plateau_detections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plateau detections"
  ON public.plateau_detections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plateau detections"
  ON public.plateau_detections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plateau detections"
  ON public.plateau_detections FOR DELETE
  USING (auth.uid() = user_id);

-- Recovery Metrics Policies
CREATE POLICY "Users can view own recovery metrics"
  ON public.recovery_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery metrics"
  ON public.recovery_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery metrics"
  ON public.recovery_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery metrics"
  ON public.recovery_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Exercise history indexes
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_exercise 
  ON public.exercise_history(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_history_performed_at 
  ON public.exercise_history(performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_history_user_performed 
  ON public.exercise_history(user_id, performed_at DESC);

-- Progression recommendations indexes
CREATE INDEX IF NOT EXISTS idx_progression_recommendations_user_exercise 
  ON public.progression_recommendations(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_progression_recommendations_user_status 
  ON public.progression_recommendations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_progression_recommendations_exercise 
  ON public.progression_recommendations(exercise_id);

CREATE INDEX IF NOT EXISTS idx_progression_recommendations_created 
  ON public.progression_recommendations(created_at DESC);

-- Plateau detections indexes
CREATE INDEX IF NOT EXISTS idx_plateau_detections_user_exercise 
  ON public.plateau_detections(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_plateau_detections_user_resolved 
  ON public.plateau_detections(user_id, resolved);

CREATE INDEX IF NOT EXISTS idx_plateau_detections_exercise 
  ON public.plateau_detections(exercise_id);

CREATE INDEX IF NOT EXISTS idx_plateau_detections_detected 
  ON public.plateau_detections(detected_at DESC);

-- Recovery metrics indexes
CREATE INDEX IF NOT EXISTS idx_recovery_metrics_user_date 
  ON public.recovery_metrics(user_id, recorded_at DESC);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to progression_settings
CREATE TRIGGER update_progression_settings_updated_at
  BEFORE UPDATE ON public.progression_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to calculate 1RM (One Rep Max) using Epley formula
CREATE OR REPLACE FUNCTION calculate_one_rep_max(weight_kg DECIMAL, reps INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  -- Epley Formula: 1RM = weight * (1 + reps/30)
  IF reps = 1 THEN
    RETURN weight_kg;
  ELSIF reps > 12 THEN
    -- For high reps, cap at 12 to avoid unrealistic estimates
    RETURN weight_kg * (1 + 12.0/30.0);
  ELSE
    RETURN weight_kg * (1 + reps::DECIMAL/30.0);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get recent exercise performance summary
CREATE OR REPLACE FUNCTION get_exercise_performance_summary(
  p_user_id UUID,
  p_exercise_id VARCHAR(255),
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  avg_weight DECIMAL,
  max_weight DECIMAL,
  avg_reps DECIMAL,
  max_reps INTEGER,
  avg_volume DECIMAL,
  max_volume DECIMAL,
  session_count INTEGER,
  avg_rpe DECIMAL,
  trend VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_sessions AS (
    SELECT *
    FROM public.exercise_history
    WHERE user_id = p_user_id
      AND exercise_id = p_exercise_id
      AND performed_at >= NOW() - INTERVAL '1 day' * p_days_back
    ORDER BY performed_at DESC
  ),
  first_half AS (
    SELECT AVG(weight_kg) as avg_weight_first
    FROM (
      SELECT weight_kg
      FROM recent_sessions
      ORDER BY performed_at
      LIMIT (SELECT COUNT(*) / 2 FROM recent_sessions)
    ) sub
  ),
  second_half AS (
    SELECT AVG(weight_kg) as avg_weight_second
    FROM (
      SELECT weight_kg
      FROM recent_sessions
      ORDER BY performed_at DESC
      LIMIT (SELECT COUNT(*) / 2 FROM recent_sessions)
    ) sub
  )
  SELECT
    AVG(eh.weight_kg)::DECIMAL as avg_weight,
    MAX(eh.weight_kg)::DECIMAL as max_weight,
    AVG(eh.reps)::DECIMAL as avg_reps,
    MAX(eh.reps)::INTEGER as max_reps,
    AVG(eh.volume_kg)::DECIMAL as avg_volume,
    MAX(eh.volume_kg)::DECIMAL as max_volume,
    COUNT(*)::INTEGER as session_count,
    AVG(eh.rpe)::DECIMAL as avg_rpe,
    CASE
      WHEN (SELECT avg_weight_second FROM second_half) > (SELECT avg_weight_first FROM first_half) * 1.05 THEN 'improving'
      WHEN (SELECT avg_weight_second FROM second_half) < (SELECT avg_weight_first FROM first_half) * 0.95 THEN 'declining'
      ELSE 'stable'
    END as trend
  FROM recent_sessions eh;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Sample Data for Testing (Optional)
-- =====================================================

-- This will create default settings for any user who doesn't have them
-- You can call this function when a new user signs up
CREATE OR REPLACE FUNCTION create_default_progression_settings(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.progression_settings (
    user_id,
    mode,
    primary_goal,
    auto_progression_enabled,
    plateau_detection_enabled
  )
  VALUES (
    p_user_id,
    'balanced',
    'strength_gain',
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_exercise_date 
  ON public.exercise_history (user_id, exercise_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_valid 
  ON public.progression_recommendations (user_id, status, valid_until);

CREATE INDEX IF NOT EXISTS idx_plateau_user_exercise_unresolved 
  ON public.plateau_detections (user_id, exercise_id, resolved) 
  WHERE resolved = false;

-- =====================================================
-- Views for Analytics
-- =====================================================

-- View: User Progression Summary
CREATE OR REPLACE VIEW user_progression_summary AS
SELECT
  eh.user_id,
  eh.exercise_id,
  eh.exercise_name,
  COUNT(*) as total_sessions,
  MAX(eh.weight_kg) as max_weight,
  MAX(eh.one_rep_max_kg) as max_one_rep_max,
  AVG(eh.rpe) as avg_rpe,
  AVG(eh.form_quality) as avg_form_quality,
  MIN(eh.performed_at) as first_session,
  MAX(eh.performed_at) as last_session,
  (MAX(eh.weight_kg) - MIN(eh.weight_kg)) / NULLIF(MIN(eh.weight_kg), 0) * 100 as weight_improvement_pct
FROM public.exercise_history eh
GROUP BY eh.user_id, eh.exercise_id, eh.exercise_name;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON user_progression_summary TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Add a comment to track this migration
COMMENT ON TABLE public.progression_settings IS 'Stores user preferences for the Adaptive Progression Engine';
COMMENT ON TABLE public.exercise_history IS 'Detailed performance history for each exercise';
COMMENT ON TABLE public.progression_recommendations IS 'AI-generated progression recommendations';
COMMENT ON TABLE public.plateau_detections IS 'Tracks detected plateaus and their resolution';
COMMENT ON TABLE public.recovery_metrics IS 'Recovery indicators and readiness tracking';


