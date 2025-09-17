CREATE TABLE meal_plan_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  suggestion_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL, -- e.g., 'Breakfast', 'Lunch', 'Dinner', 'Snack'
  recipe_name VARCHAR(255),
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  ingredients TEXT, -- JSON string array
  instructions TEXT, -- JSON string array
  meal_description TEXT,
  calories INTEGER,
  protein_grams DECIMAL(5,1),
  carbs_grams DECIMAL(5,1),
  fat_grams DECIMAL(5,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nutrition_plan_id, suggestion_date, meal_type)
);

CREATE INDEX idx_meal_suggestion_plan_date ON meal_plan_suggestions(nutrition_plan_id, suggestion_date);

-- Migration commands to add missing columns to existing table
-- Run these if the table already exists
-- ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS recipe_name VARCHAR(255);
-- ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS prep_time INTEGER;
-- ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS cook_time INTEGER;
-- ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS servings INTEGER;
-- ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS ingredients TEXT;
-- ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS instructions TEXT; 