-- Add unit preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN height_unit_preference text CHECK (height_unit_preference IN ('cm', 'ft')),
ADD COLUMN weight_unit_preference text CHECK (weight_unit_preference IN ('kg', 'lbs'));

-- Add comments for documentation
COMMENT ON COLUMN profiles.height_unit_preference IS 'User preferred unit for height display (cm or ft)';
COMMENT ON COLUMN profiles.weight_unit_preference IS 'User preferred unit for weight display (kg or lbs)';











