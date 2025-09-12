-- Create table for storing daily meal plans
CREATE TABLE IF NOT EXISTS daily_meal_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date TEXT NOT NULL,
    meal_plan JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create table for storing meal ratings
CREATE TABLE IF NOT EXISTS meal_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    meal_id TEXT NOT NULL,
    meal_description TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    rating TEXT CHECK (rating IN ('liked', 'disliked')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, meal_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_meal_plans_user_date ON daily_meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_user_meal ON meal_ratings(user_id, meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_user_rating ON meal_ratings(user_id, rating);

-- Add Row Level Security (RLS)
ALTER TABLE daily_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_meal_plans
CREATE POLICY "Users can view their own daily meal plans" 
    ON daily_meal_plans FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily meal plans" 
    ON daily_meal_plans FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily meal plans" 
    ON daily_meal_plans FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily meal plans" 
    ON daily_meal_plans FOR DELETE 
    USING (auth.uid() = user_id);

-- Create policies for meal_ratings
CREATE POLICY "Users can view their own meal ratings" 
    ON meal_ratings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal ratings" 
    ON meal_ratings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal ratings" 
    ON meal_ratings FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal ratings" 
    ON meal_ratings FOR DELETE 
    USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_meal_plans_updated_at 
    BEFORE UPDATE ON daily_meal_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_ratings_updated_at 
    BEFORE UPDATE ON meal_ratings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
