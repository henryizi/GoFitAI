CREATE TABLE behavioral_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL,
  insight_type VARCHAR(100) NOT NULL, -- e.g., 'late_night_snacking', 'missed_breakfast', 'high_calorie_weekend'
  insight_message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_behavioral_insights_user_date ON behavioral_insights(user_id, insight_date); 