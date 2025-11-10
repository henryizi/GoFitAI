-- ============================================================
-- ADAPTIVE PROGRESSION ENGINE - DATABASE SCHEMA
-- ============================================================
-- This migration adds tables and functions for AI-driven adaptive
-- progression that automatically adjusts workout difficulty based
-- on user performance, fatigue, and trend analysis.
-- ============================================================

-- ============================================================
-- 1. PROGRESSION SETTINGS TABLE
-- ============================================================
-- Stores user's progression mode preferences
CREATE TABLE IF NOT EXISTS progression_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    -- Progression Mode: aggressive, moderate, conservative
    progression_mode TEXT NOT NULL DEFAULT 'moderate' CHECK (progression_mode IN ('aggressive', 'moderate', 'conservative')),
    
    -- Automatic adjustment settings
    auto_adjust_enabled BOOLEAN DEFAULT true,
    auto_deload_enabled BOOLEAN DEFAULT true,
    auto_exercise_swap_enabled BOOLEAN DEFAULT false,
    
    -- Progression parameters (adjusted by mode)
    weight_increment_percentage DECIMAL DEFAULT 2.5, -- % increase per successful session
    volume_increment_sets INTEGER DEFAULT 1, -- additional sets when progressing
    rpe_target_min INTEGER DEFAULT 7 CHECK (rpe_target_min BETWEEN 1 AND 10),
    rpe_target_max INTEGER DEFAULT 9 CHECK (rpe_target_max BETWEEN 1 AND 10),
    
    -- Plateau detection thresholds
    plateau_detection_weeks INTEGER DEFAULT 3, -- weeks without progress to trigger plateau
    deload_frequency_weeks INTEGER DEFAULT 6, -- weeks between planned deloads
    
    -- Fatigue management
    recovery_score_threshold INTEGER DEFAULT 6 CHECK (recovery_score_threshold BETWEEN 1 AND 10),
    high_fatigue_rpe_threshold INTEGER DEFAULT 9 CHECK (high_fatigue_rpe_threshold BETWEEN 1 AND 10),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, plan_id)
);

-- ============================================================
-- 2. PERFORMANCE ANALYTICS TABLE
-- ============================================================
-- Stores calculated performance metrics and trends
CREATE TABLE IF NOT EXISTS performance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance window (e.g., last 4 weeks)
    window_start_date TIMESTAMPTZ NOT NULL,
    window_end_date TIMESTAMPTZ NOT NULL,
    
    -- Volume metrics
    total_volume DECIMAL, -- sum(reps * weight) over window
    average_volume_per_session DECIMAL,
    volume_trend TEXT CHECK (volume_trend IN ('increasing', 'stable', 'decreasing', 'volatile')),
    
    -- Intensity metrics  
    average_rpe DECIMAL,
    average_weight DECIMAL,
    max_weight DECIMAL,
    weight_trend TEXT CHECK (weight_trend IN ('increasing', 'stable', 'decreasing')),
    
    -- Estimated 1RM progression
    estimated_1rm DECIMAL,
    e1rm_change_percentage DECIMAL, -- % change vs previous window
    
    -- Frequency metrics
    sessions_completed INTEGER,
    sessions_skipped INTEGER,
    completion_rate DECIMAL, -- % of planned sessions completed
    
    -- Fatigue indicators
    average_recovery_score DECIMAL,
    high_rpe_frequency INTEGER, -- count of sets with RPE >= 9
    fatigue_score DECIMAL, -- 0-10 composite fatigue metric
    
    -- Performance status
    performance_status TEXT CHECK (performance_status IN ('progressing', 'maintaining', 'regressing', 'plateaued', 'overtrained')),
    
    -- AI-generated insights
    insights JSONB, -- structured insights from AI analysis
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PLATEAU DETECTION TABLE
-- ============================================================
-- Records detected plateaus and recommended actions
CREATE TABLE IF NOT EXISTS plateau_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    plateau_type TEXT NOT NULL CHECK (plateau_type IN ('exercise_specific', 'muscle_group', 'overall_training')),
    
    -- Plateau characteristics
    weeks_without_progress INTEGER,
    metric_plateaued TEXT, -- 'weight', 'volume', 'reps', 'e1rm'
    previous_value DECIMAL,
    current_value DECIMAL,
    
    -- Recommended actions
    recommended_action TEXT NOT NULL CHECK (recommended_action IN ('deload', 'increase_volume', 'decrease_volume', 'swap_exercise', 'change_rep_range', 'rest_week')),
    action_details JSONB, -- structured details about the recommendation
    
    -- Action status
    action_status TEXT DEFAULT 'pending' CHECK (action_status IN ('pending', 'applied', 'dismissed', 'completed')),
    applied_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results after action
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 10),
    results_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. ADAPTIVE ADJUSTMENTS TABLE
-- ============================================================
-- Logs all automatic adjustments made by the progression engine
CREATE TABLE IF NOT EXISTS adaptive_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_set_id UUID REFERENCES exercise_sets(id) ON DELETE CASCADE,
    
    adjusted_at TIMESTAMPTZ DEFAULT NOW(),
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('weight', 'reps', 'sets', 'rest_period', 'exercise_swap', 'deload', 'rep_range_shift')),
    
    -- Before adjustment
    previous_value TEXT NOT NULL, -- JSON string of previous state
    
    -- After adjustment  
    new_value TEXT NOT NULL, -- JSON string of new state
    
    -- Reason for adjustment
    reason TEXT NOT NULL, -- human-readable explanation
    trigger TEXT NOT NULL CHECK (trigger IN ('performance_improvement', 'plateau_detected', 'high_fatigue', 'recovery_score_low', 'rpe_too_high', 'rpe_too_low', 'scheduled_deload', 'manual_override')),
    
    -- Supporting data
    supporting_metrics JSONB, -- metrics that led to this decision
    
    -- User interaction
    user_accepted BOOLEAN, -- did user accept the adjustment?
    user_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. DELOAD SCHEDULE TABLE
-- ============================================================
-- Plans and tracks deload weeks
CREATE TABLE IF NOT EXISTS deload_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    -- Deload timing
    scheduled_week INTEGER NOT NULL,
    scheduled_start_date DATE NOT NULL,
    scheduled_end_date DATE NOT NULL,
    
    -- Deload type
    deload_type TEXT NOT NULL CHECK (deload_type IN ('volume_reduction', 'intensity_reduction', 'full_rest', 'active_recovery')),
    reduction_percentage INTEGER DEFAULT 40 CHECK (reduction_percentage BETWEEN 20 AND 60),
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'skipped')),
    
    -- Reason
    reason TEXT CHECK (reason IN ('planned_periodization', 'fatigue_detected', 'plateau_recovery', 'injury_prevention', 'user_requested')),
    
    -- Effectiveness tracking
    pre_deload_fatigue_score DECIMAL,
    post_deload_recovery_score DECIMAL,
    performance_improvement_after BOOLEAN,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. EXERCISE ALTERNATIVES TABLE
-- ============================================================
-- Maps exercises to suitable alternatives for swapping
CREATE TABLE IF NOT EXISTS exercise_alternatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    
    -- Similarity metrics
    muscle_group_overlap DECIMAL, -- 0-1 score
    movement_pattern_similarity DECIMAL, -- 0-1 score
    difficulty_difference INTEGER, -- -2 (easier) to +2 (harder)
    equipment_compatibility BOOLEAN,
    
    -- Swap context
    recommended_for TEXT[], -- ['plateau', 'injury_prevention', 'equipment_unavailable', 'variety']
    
    -- Usage tracking
    times_swapped INTEGER DEFAULT 0,
    average_user_satisfaction DECIMAL, -- 1-5 rating from users who tried the swap
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(primary_exercise_id, alternative_exercise_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_progression_settings_user_plan ON progression_settings(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_user_exercise ON performance_analytics(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_date ON performance_analytics(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_plateau_detection_user ON plateau_detection(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_plateau_detection_status ON plateau_detection(action_status);
CREATE INDEX IF NOT EXISTS idx_adaptive_adjustments_session ON adaptive_adjustments(session_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_adjustments_user_date ON adaptive_adjustments(user_id, adjusted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deload_schedule_user_plan ON deload_schedule(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_deload_schedule_dates ON deload_schedule(scheduled_start_date, scheduled_end_date);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_primary ON exercise_alternatives(primary_exercise_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE progression_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE plateau_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deload_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progression_settings
DROP POLICY IF EXISTS "Users can manage their own progression settings" ON progression_settings;
CREATE POLICY "Users can manage their own progression settings"
    ON progression_settings FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for performance_analytics
DROP POLICY IF EXISTS "Users can view their own performance analytics" ON performance_analytics;
CREATE POLICY "Users can view their own performance analytics"
    ON performance_analytics FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert performance analytics" ON performance_analytics;
CREATE POLICY "System can insert performance analytics"
    ON performance_analytics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for plateau_detection
DROP POLICY IF EXISTS "Users can manage their own plateau detection" ON plateau_detection;
CREATE POLICY "Users can manage their own plateau detection"
    ON plateau_detection FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for adaptive_adjustments
DROP POLICY IF EXISTS "Users can view their own adaptive adjustments" ON adaptive_adjustments;
CREATE POLICY "Users can view their own adaptive adjustments"
    ON adaptive_adjustments FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for deload_schedule
DROP POLICY IF EXISTS "Users can manage their own deload schedule" ON deload_schedule;
CREATE POLICY "Users can manage their own deload schedule"
    ON deload_schedule FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for exercise_alternatives (read-only for users)
DROP POLICY IF EXISTS "Users can view exercise alternatives" ON exercise_alternatives;
CREATE POLICY "Users can view exercise alternatives"
    ON exercise_alternatives FOR SELECT
    USING (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to calculate estimated 1RM from reps and weight
CREATE OR REPLACE FUNCTION calculate_e1rm(weight DECIMAL, reps INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    -- Using Brzycki formula: weight × (36 / (37 - reps))
    IF reps <= 1 THEN
        RETURN weight;
    ELSIF reps >= 37 THEN
        RETURN weight * 1.5; -- Cap for very high reps
    ELSE
        RETURN weight * (36.0 / (37.0 - reps));
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get progression mode multipliers
CREATE OR REPLACE FUNCTION get_progression_multiplier(mode TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN CASE mode
        WHEN 'aggressive' THEN jsonb_build_object(
            'weight_increment', 5.0,
            'volume_increment', 2,
            'rest_reduction', 10,
            'rpe_target_min', 8,
            'rpe_target_max', 10
        )
        WHEN 'conservative' THEN jsonb_build_object(
            'weight_increment', 1.0,
            'volume_increment', 0,
            'rest_reduction', 0,
            'rpe_target_min', 6,
            'rpe_target_max', 8
        )
        ELSE jsonb_build_object(
            'weight_increment', 2.5,
            'volume_increment', 1,
            'rest_reduction', 5,
            'rpe_target_min', 7,
            'rpe_target_max', 9
        )
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to initialize default progression settings for a user
CREATE OR REPLACE FUNCTION initialize_progression_settings(
    p_user_id UUID,
    p_plan_id UUID DEFAULT NULL,
    p_mode TEXT DEFAULT 'moderate'
)
RETURNS UUID AS $$
DECLARE
    v_settings_id UUID;
    v_multipliers JSONB;
BEGIN
    v_multipliers := get_progression_multiplier(p_mode);
    
    INSERT INTO progression_settings (
        user_id,
        plan_id,
        progression_mode,
        weight_increment_percentage,
        volume_increment_sets,
        rpe_target_min,
        rpe_target_max
    ) VALUES (
        p_user_id,
        p_plan_id,
        p_mode,
        (v_multipliers->>'weight_increment')::DECIMAL,
        (v_multipliers->>'volume_increment')::INTEGER,
        (v_multipliers->>'rpe_target_min')::INTEGER,
        (v_multipliers->>'rpe_target_max')::INTEGER
    )
    ON CONFLICT (user_id, plan_id)
    DO UPDATE SET
        progression_mode = EXCLUDED.progression_mode,
        weight_increment_percentage = EXCLUDED.weight_increment_percentage,
        volume_increment_sets = EXCLUDED.volume_increment_sets,
        rpe_target_min = EXCLUDED.rpe_target_min,
        rpe_target_max = EXCLUDED.rpe_target_max,
        updated_at = NOW()
    RETURNING id INTO v_settings_id;
    
    RETURN v_settings_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_progression_settings_updated_at
    BEFORE UPDATE ON progression_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA: Exercise Alternatives
-- ============================================================
-- This will be populated via a script that analyzes exercise similarities

COMMENT ON TABLE progression_settings IS 'User preferences for adaptive progression behavior';
COMMENT ON TABLE performance_analytics IS 'Calculated performance metrics and trends for exercises';
COMMENT ON TABLE plateau_detection IS 'Detected training plateaus and recommended interventions';
COMMENT ON TABLE adaptive_adjustments IS 'Log of all automatic adjustments made by the progression engine';
COMMENT ON TABLE deload_schedule IS 'Planned and tracked deload weeks for recovery';
COMMENT ON TABLE exercise_alternatives IS 'Mapping of exercises to suitable alternatives for swapping';

-- ============================================================
-- END OF MIGRATION
-- ============================================================




-- ADAPTIVE PROGRESSION ENGINE - DATABASE SCHEMA
-- ============================================================
-- This migration adds tables and functions for AI-driven adaptive
-- progression that automatically adjusts workout difficulty based
-- on user performance, fatigue, and trend analysis.
-- ============================================================

-- ============================================================
-- 1. PROGRESSION SETTINGS TABLE
-- ============================================================
-- Stores user's progression mode preferences
CREATE TABLE IF NOT EXISTS progression_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    -- Progression Mode: aggressive, moderate, conservative
    progression_mode TEXT NOT NULL DEFAULT 'moderate' CHECK (progression_mode IN ('aggressive', 'moderate', 'conservative')),
    
    -- Automatic adjustment settings
    auto_adjust_enabled BOOLEAN DEFAULT true,
    auto_deload_enabled BOOLEAN DEFAULT true,
    auto_exercise_swap_enabled BOOLEAN DEFAULT false,
    
    -- Progression parameters (adjusted by mode)
    weight_increment_percentage DECIMAL DEFAULT 2.5, -- % increase per successful session
    volume_increment_sets INTEGER DEFAULT 1, -- additional sets when progressing
    rpe_target_min INTEGER DEFAULT 7 CHECK (rpe_target_min BETWEEN 1 AND 10),
    rpe_target_max INTEGER DEFAULT 9 CHECK (rpe_target_max BETWEEN 1 AND 10),
    
    -- Plateau detection thresholds
    plateau_detection_weeks INTEGER DEFAULT 3, -- weeks without progress to trigger plateau
    deload_frequency_weeks INTEGER DEFAULT 6, -- weeks between planned deloads
    
    -- Fatigue management
    recovery_score_threshold INTEGER DEFAULT 6 CHECK (recovery_score_threshold BETWEEN 1 AND 10),
    high_fatigue_rpe_threshold INTEGER DEFAULT 9 CHECK (high_fatigue_rpe_threshold BETWEEN 1 AND 10),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, plan_id)
);

-- ============================================================
-- 2. PERFORMANCE ANALYTICS TABLE
-- ============================================================
-- Stores calculated performance metrics and trends
CREATE TABLE IF NOT EXISTS performance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance window (e.g., last 4 weeks)
    window_start_date TIMESTAMPTZ NOT NULL,
    window_end_date TIMESTAMPTZ NOT NULL,
    
    -- Volume metrics
    total_volume DECIMAL, -- sum(reps * weight) over window
    average_volume_per_session DECIMAL,
    volume_trend TEXT CHECK (volume_trend IN ('increasing', 'stable', 'decreasing', 'volatile')),
    
    -- Intensity metrics  
    average_rpe DECIMAL,
    average_weight DECIMAL,
    max_weight DECIMAL,
    weight_trend TEXT CHECK (weight_trend IN ('increasing', 'stable', 'decreasing')),
    
    -- Estimated 1RM progression
    estimated_1rm DECIMAL,
    e1rm_change_percentage DECIMAL, -- % change vs previous window
    
    -- Frequency metrics
    sessions_completed INTEGER,
    sessions_skipped INTEGER,
    completion_rate DECIMAL, -- % of planned sessions completed
    
    -- Fatigue indicators
    average_recovery_score DECIMAL,
    high_rpe_frequency INTEGER, -- count of sets with RPE >= 9
    fatigue_score DECIMAL, -- 0-10 composite fatigue metric
    
    -- Performance status
    performance_status TEXT CHECK (performance_status IN ('progressing', 'maintaining', 'regressing', 'plateaued', 'overtrained')),
    
    -- AI-generated insights
    insights JSONB, -- structured insights from AI analysis
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PLATEAU DETECTION TABLE
-- ============================================================
-- Records detected plateaus and recommended actions
CREATE TABLE IF NOT EXISTS plateau_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    plateau_type TEXT NOT NULL CHECK (plateau_type IN ('exercise_specific', 'muscle_group', 'overall_training')),
    
    -- Plateau characteristics
    weeks_without_progress INTEGER,
    metric_plateaued TEXT, -- 'weight', 'volume', 'reps', 'e1rm'
    previous_value DECIMAL,
    current_value DECIMAL,
    
    -- Recommended actions
    recommended_action TEXT NOT NULL CHECK (recommended_action IN ('deload', 'increase_volume', 'decrease_volume', 'swap_exercise', 'change_rep_range', 'rest_week')),
    action_details JSONB, -- structured details about the recommendation
    
    -- Action status
    action_status TEXT DEFAULT 'pending' CHECK (action_status IN ('pending', 'applied', 'dismissed', 'completed')),
    applied_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results after action
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 10),
    results_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. ADAPTIVE ADJUSTMENTS TABLE
-- ============================================================
-- Logs all automatic adjustments made by the progression engine
CREATE TABLE IF NOT EXISTS adaptive_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_set_id UUID REFERENCES exercise_sets(id) ON DELETE CASCADE,
    
    adjusted_at TIMESTAMPTZ DEFAULT NOW(),
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('weight', 'reps', 'sets', 'rest_period', 'exercise_swap', 'deload', 'rep_range_shift')),
    
    -- Before adjustment
    previous_value TEXT NOT NULL, -- JSON string of previous state
    
    -- After adjustment  
    new_value TEXT NOT NULL, -- JSON string of new state
    
    -- Reason for adjustment
    reason TEXT NOT NULL, -- human-readable explanation
    trigger TEXT NOT NULL CHECK (trigger IN ('performance_improvement', 'plateau_detected', 'high_fatigue', 'recovery_score_low', 'rpe_too_high', 'rpe_too_low', 'scheduled_deload', 'manual_override')),
    
    -- Supporting data
    supporting_metrics JSONB, -- metrics that led to this decision
    
    -- User interaction
    user_accepted BOOLEAN, -- did user accept the adjustment?
    user_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. DELOAD SCHEDULE TABLE
-- ============================================================
-- Plans and tracks deload weeks
CREATE TABLE IF NOT EXISTS deload_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    -- Deload timing
    scheduled_week INTEGER NOT NULL,
    scheduled_start_date DATE NOT NULL,
    scheduled_end_date DATE NOT NULL,
    
    -- Deload type
    deload_type TEXT NOT NULL CHECK (deload_type IN ('volume_reduction', 'intensity_reduction', 'full_rest', 'active_recovery')),
    reduction_percentage INTEGER DEFAULT 40 CHECK (reduction_percentage BETWEEN 20 AND 60),
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'skipped')),
    
    -- Reason
    reason TEXT CHECK (reason IN ('planned_periodization', 'fatigue_detected', 'plateau_recovery', 'injury_prevention', 'user_requested')),
    
    -- Effectiveness tracking
    pre_deload_fatigue_score DECIMAL,
    post_deload_recovery_score DECIMAL,
    performance_improvement_after BOOLEAN,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. EXERCISE ALTERNATIVES TABLE
-- ============================================================
-- Maps exercises to suitable alternatives for swapping
CREATE TABLE IF NOT EXISTS exercise_alternatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    
    -- Similarity metrics
    muscle_group_overlap DECIMAL, -- 0-1 score
    movement_pattern_similarity DECIMAL, -- 0-1 score
    difficulty_difference INTEGER, -- -2 (easier) to +2 (harder)
    equipment_compatibility BOOLEAN,
    
    -- Swap context
    recommended_for TEXT[], -- ['plateau', 'injury_prevention', 'equipment_unavailable', 'variety']
    
    -- Usage tracking
    times_swapped INTEGER DEFAULT 0,
    average_user_satisfaction DECIMAL, -- 1-5 rating from users who tried the swap
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(primary_exercise_id, alternative_exercise_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_progression_settings_user_plan ON progression_settings(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_user_exercise ON performance_analytics(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_date ON performance_analytics(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_plateau_detection_user ON plateau_detection(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_plateau_detection_status ON plateau_detection(action_status);
CREATE INDEX IF NOT EXISTS idx_adaptive_adjustments_session ON adaptive_adjustments(session_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_adjustments_user_date ON adaptive_adjustments(user_id, adjusted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deload_schedule_user_plan ON deload_schedule(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_deload_schedule_dates ON deload_schedule(scheduled_start_date, scheduled_end_date);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_primary ON exercise_alternatives(primary_exercise_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE progression_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE plateau_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deload_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progression_settings
DROP POLICY IF EXISTS "Users can manage their own progression settings" ON progression_settings;
CREATE POLICY "Users can manage their own progression settings"
    ON progression_settings FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for performance_analytics
DROP POLICY IF EXISTS "Users can view their own performance analytics" ON performance_analytics;
CREATE POLICY "Users can view their own performance analytics"
    ON performance_analytics FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert performance analytics" ON performance_analytics;
CREATE POLICY "System can insert performance analytics"
    ON performance_analytics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for plateau_detection
DROP POLICY IF EXISTS "Users can manage their own plateau detection" ON plateau_detection;
CREATE POLICY "Users can manage their own plateau detection"
    ON plateau_detection FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for adaptive_adjustments
DROP POLICY IF EXISTS "Users can view their own adaptive adjustments" ON adaptive_adjustments;
CREATE POLICY "Users can view their own adaptive adjustments"
    ON adaptive_adjustments FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for deload_schedule
DROP POLICY IF EXISTS "Users can manage their own deload schedule" ON deload_schedule;
CREATE POLICY "Users can manage their own deload schedule"
    ON deload_schedule FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for exercise_alternatives (read-only for users)
DROP POLICY IF EXISTS "Users can view exercise alternatives" ON exercise_alternatives;
CREATE POLICY "Users can view exercise alternatives"
    ON exercise_alternatives FOR SELECT
    USING (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to calculate estimated 1RM from reps and weight
CREATE OR REPLACE FUNCTION calculate_e1rm(weight DECIMAL, reps INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    -- Using Brzycki formula: weight × (36 / (37 - reps))
    IF reps <= 1 THEN
        RETURN weight;
    ELSIF reps >= 37 THEN
        RETURN weight * 1.5; -- Cap for very high reps
    ELSE
        RETURN weight * (36.0 / (37.0 - reps));
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get progression mode multipliers
CREATE OR REPLACE FUNCTION get_progression_multiplier(mode TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN CASE mode
        WHEN 'aggressive' THEN jsonb_build_object(
            'weight_increment', 5.0,
            'volume_increment', 2,
            'rest_reduction', 10,
            'rpe_target_min', 8,
            'rpe_target_max', 10
        )
        WHEN 'conservative' THEN jsonb_build_object(
            'weight_increment', 1.0,
            'volume_increment', 0,
            'rest_reduction', 0,
            'rpe_target_min', 6,
            'rpe_target_max', 8
        )
        ELSE jsonb_build_object(
            'weight_increment', 2.5,
            'volume_increment', 1,
            'rest_reduction', 5,
            'rpe_target_min', 7,
            'rpe_target_max', 9
        )
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to initialize default progression settings for a user
CREATE OR REPLACE FUNCTION initialize_progression_settings(
    p_user_id UUID,
    p_plan_id UUID DEFAULT NULL,
    p_mode TEXT DEFAULT 'moderate'
)
RETURNS UUID AS $$
DECLARE
    v_settings_id UUID;
    v_multipliers JSONB;
BEGIN
    v_multipliers := get_progression_multiplier(p_mode);
    
    INSERT INTO progression_settings (
        user_id,
        plan_id,
        progression_mode,
        weight_increment_percentage,
        volume_increment_sets,
        rpe_target_min,
        rpe_target_max
    ) VALUES (
        p_user_id,
        p_plan_id,
        p_mode,
        (v_multipliers->>'weight_increment')::DECIMAL,
        (v_multipliers->>'volume_increment')::INTEGER,
        (v_multipliers->>'rpe_target_min')::INTEGER,
        (v_multipliers->>'rpe_target_max')::INTEGER
    )
    ON CONFLICT (user_id, plan_id)
    DO UPDATE SET
        progression_mode = EXCLUDED.progression_mode,
        weight_increment_percentage = EXCLUDED.weight_increment_percentage,
        volume_increment_sets = EXCLUDED.volume_increment_sets,
        rpe_target_min = EXCLUDED.rpe_target_min,
        rpe_target_max = EXCLUDED.rpe_target_max,
        updated_at = NOW()
    RETURNING id INTO v_settings_id;
    
    RETURN v_settings_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_progression_settings_updated_at
    BEFORE UPDATE ON progression_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA: Exercise Alternatives
-- ============================================================
-- This will be populated via a script that analyzes exercise similarities

COMMENT ON TABLE progression_settings IS 'User preferences for adaptive progression behavior';
COMMENT ON TABLE performance_analytics IS 'Calculated performance metrics and trends for exercises';
COMMENT ON TABLE plateau_detection IS 'Detected training plateaus and recommended interventions';
COMMENT ON TABLE adaptive_adjustments IS 'Log of all automatic adjustments made by the progression engine';
COMMENT ON TABLE deload_schedule IS 'Planned and tracked deload weeks for recovery';
COMMENT ON TABLE exercise_alternatives IS 'Mapping of exercises to suitable alternatives for swapping';

-- ============================================================
-- END OF MIGRATION
-- ============================================================



