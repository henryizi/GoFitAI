CREATE TABLE meal_plan_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  suggestion_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL, -- e.g., 'Breakfast', 'Lunch', 'Dinner', 'Snack'
  meal_description TEXT,
  calories INTEGER,
  protein_grams DECIMAL(5,1),
  carbs_grams DECIMAL(5,1),
  fat_grams DECIMAL(5,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nutrition_plan_id, suggestion_date, meal_type)
);

CREATE INDEX idx_meal_suggestion_plan_date ON meal_plan_suggestions(nutrition_plan_id, suggestion_date); 