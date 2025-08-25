CREATE TABLE motivational_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_event VARCHAR(100) NOT NULL, -- e.g., '7_day_streak', 'weight_milestone', 'first_workout'
  message TEXT NOT NULL,
  is_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_motivational_messages_user_seen ON motivational_messages(user_id, is_seen); 