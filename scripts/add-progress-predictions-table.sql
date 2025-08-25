CREATE TABLE progress_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  predicted_weight_kg DECIMAL(5,2),
  confidence_level VARCHAR(50), -- e.g., 'High', 'Medium', 'Low'
  prediction_summary TEXT, -- e.g., "You are on track to lose 0.5kg next week."
  warning_flags TEXT[], -- e.g., ['plateau_risk', 'inconsistent_logging']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_progress_predictions_user_date ON progress_predictions(user_id, prediction_date); 