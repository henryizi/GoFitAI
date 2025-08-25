CREATE TABLE body_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_type VARCHAR(20) NOT NULL, -- 'front', 'back'
  photo_url VARCHAR(500) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_analyzed BOOLEAN DEFAULT FALSE,
  analysis_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'processing', 'completed', 'failed'
);

CREATE TABLE body_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_session_id UUID, -- Links to a set of front/back photos
  chest_rating INTEGER CHECK (chest_rating >= 1 AND chest_rating <= 10),
  arms_rating INTEGER CHECK (arms_rating >= 1 AND arms_rating <= 10),
  back_rating INTEGER CHECK (back_rating >= 1 AND back_rating <= 10),
  legs_rating INTEGER CHECK (legs_rating >= 1 AND legs_rating <= 10),
  waist_rating INTEGER CHECK (waist_rating >= 1 AND waist_rating <= 10),
  overall_rating DECIMAL(3,1),
  strongest_body_part VARCHAR(20),
  weakest_body_part VARCHAR(20),
  ai_feedback TEXT,
  analysis_data JSONB, -- Detailed AI analysis results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX idx_body_analysis_user_id ON body_analysis(user_id); 