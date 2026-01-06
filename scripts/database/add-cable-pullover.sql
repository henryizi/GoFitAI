-- Insert Cable Pullover exercise into the database
-- This exercise was missing from the exercise library

INSERT INTO exercises (
  name, 
  category, 
  muscle_groups, 
  difficulty, 
  equipment_needed, 
  description, 
  form_tips, 
  rpe_recommendation, 
  is_custom
)
VALUES (
  'Cable Pullover',
  'isolation',
  ARRAY['chest', 'lats'],
  'intermediate',
  ARRAY['cable machine'],
  'Cable-based pullover exercise targeting chest and lats with constant tension throughout the movement.',
  ARRAY[
    'Set cable at highest position',
    'Use rope attachment or straight bar',
    'Keep slight bend in elbows',
    'Pull cable down and across body',
    'Feel stretch in chest and lats',
    'Control the return to starting position',
    'Maintain core engagement throughout'
  ],
  7,
  false
)
ON CONFLICT (name, plan_id) DO NOTHING;

-- Note: If the exercise already exists, this will not create a duplicate due to ON CONFLICT


























