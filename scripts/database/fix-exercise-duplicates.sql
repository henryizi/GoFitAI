-- Fix duplicate exercises in database
-- Standardizes exercise names to remove plural/singular and hyphen/space duplicates

-- Update exercises to use singular forms and spaces instead of hyphens
UPDATE exercises 
SET name = 'Dumbbell Fly'
WHERE LOWER(name) IN ('dumbbell flyes', 'dumbbell fly');

UPDATE exercises 
SET name = 'Lateral Raise'
WHERE LOWER(name) IN ('lateral raises', 'lateral raise');

UPDATE exercises 
SET name = 'Jump Squat'
WHERE LOWER(name) IN ('jump squats', 'jump squat');

UPDATE exercises 
SET name = 'Kettlebell Swing'
WHERE LOWER(name) IN ('kettlebell swings', 'kettlebell swing');

UPDATE exercises 
SET name = 'Mountain Climber'
WHERE LOWER(name) IN ('mountain climbers', 'mountain climber');

UPDATE exercises 
SET name = 'Burpee'
WHERE LOWER(name) IN ('burpees', 'burpee');

UPDATE exercises 
SET name = 'Box Jump'
WHERE LOWER(name) IN ('box jumps', 'box jump');

-- Fix hyphen vs space variations
UPDATE exercises 
SET name = 'Pull Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'pull up';

UPDATE exercises 
SET name = 'Diamond Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'diamond push up';

UPDATE exercises 
SET name = 'Wide Grip Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'wide grip push up';

UPDATE exercises 
SET name = 'Decline Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'decline push up';

UPDATE exercises 
SET name = 'Archer Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'archer push up';

UPDATE exercises 
SET name = 'One Arm Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) IN ('single arm push up', 'one arm push up');

UPDATE exercises 
SET name = 'Clap Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'clap push up';

UPDATE exercises 
SET name = 'Hindu Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'hindu push up';

UPDATE exercises 
SET name = 'Dive Bomber Push Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'dive bomber push up';

UPDATE exercises 
SET name = 'Step Ups'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'step ups';

UPDATE exercises 
SET name = 'Weighted Step Up'
WHERE LOWER(REPLACE(name, '-', ' ')) = 'weighted step up';

-- Remove any remaining exact duplicates (keep the first one, delete others)
-- This handles cases where the same exercise name exists multiple times
DELETE FROM exercises 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY LOWER(REPLACE(REPLACE(name, '-', ' '), 's', '')) ORDER BY created_at) as rn
    FROM exercises
    WHERE is_custom = false
  ) t
  WHERE rn > 1
);

-- Verify no duplicates remain
SELECT name, COUNT(*) as count
FROM exercises
WHERE is_custom = false
GROUP BY LOWER(REPLACE(REPLACE(name, '-', ' '), 's', ''))
HAVING COUNT(*) > 1;
