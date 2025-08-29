-- Compound Exercises
INSERT INTO exercises (name, category, muscle_groups, difficulty, equipment_needed, description, form_tips, rpe_recommendation, is_custom) VALUES
-- Chest/Push
('Barbell Bench Press', 'compound', ARRAY['chest', 'shoulders', 'triceps'], 'intermediate', 
 ARRAY['barbell', 'bench'], 
 'The king of upper body exercises, primarily targeting the chest with secondary work for shoulders and triceps.',
 ARRAY[
   'Retract and depress shoulder blades',
   'Keep feet flat and drive through heels',
   'Maintain natural arch in lower back',
   'Touch bar to mid-chest',
   'Keep elbows at 45-degree angle from body'
 ],
 8,
 false),

('Incline Dumbbell Press', 'compound', ARRAY['chest', 'shoulders', 'triceps'], 'intermediate',
 ARRAY['dumbbells', 'adjustable bench'],
 'Upper chest focused pressing movement that allows natural arm path.',
 ARRAY[
   'Set bench angle between 30-45 degrees',
   'Keep elbows slightly tucked',
   'Control the eccentric portion',
   'Drive dumbbells up and slightly together'
 ],
 7,
 false),

-- Back/Pull
('Barbell Row', 'compound', ARRAY['back', 'biceps'], 'intermediate',
 ARRAY['barbell'],
 'Fundamental back exercise targeting overall back development.',
 ARRAY[
   'Hinge at hips, maintain flat back',
   'Pull to lower chest/upper abs',
   'Keep elbows at 45-degree angle',
   'Control the weight throughout',
   'Squeeze shoulder blades at top'
 ],
 8,
 false),

('Pull-ups', 'compound', ARRAY['back', 'biceps'], 'advanced',
 ARRAY['pull-up bar'],
 'Premier upper body pulling exercise for back width and strength.',
 ARRAY[
   'Start from dead hang',
   'Pull shoulder blades down first',
   'Drive elbows down and back',
   'Clear chin over bar',
   'Control descent'
 ],
 8,
 false),

-- Legs
('Barbell Back Squat', 'compound', ARRAY['legs', 'glutes', 'core'], 'advanced',
 ARRAY['barbell', 'squat rack'],
 'The fundamental lower body exercise for overall leg development.',
 ARRAY[
   'Bar positioned across upper traps',
   'Brace core before descent',
   'Break at hips and knees simultaneously',
   'Keep knees in line with toes',
   'Drive through mid-foot'
 ],
 9,
 false),

('Romanian Deadlift', 'compound', ARRAY['legs', 'glutes', 'back'], 'intermediate',
 ARRAY['barbell'],
 'Hip-hinge movement targeting posterior chain development.',
 ARRAY[
   'Start with bar against legs',
   'Hinge at hips, maintain flat back',
   'Feel stretch in hamstrings',
   'Keep bar close to legs throughout',
   'Drive hips forward to stand'
 ],
 8,
 false),

-- Isolation Exercises
-- Chest
('Dumbbell Fly', 'isolation', ARRAY['chest'], 'beginner',
 ARRAY['dumbbells', 'bench'],
 'Isolation movement for chest targeting the pec major through horizontal adduction.',
 ARRAY[
   'Maintain slight elbow bend',
   'Lower weights in wide arc',
   'Feel stretch at bottom',
   'Squeeze chest at top'
 ],
 6,
 false),

-- Back
('Lat Pulldown', 'isolation', ARRAY['back'], 'beginner',
 ARRAY['cable machine'],
 'Machine-based vertical pulling movement targeting lat development.',
 ARRAY[
   'Grip slightly wider than shoulders',
   'Lead with elbows',
   'Keep chest up',
   'Full stretch at top',
   'Control the weight up'
 ],
 7,
 false),

-- Shoulders
('Lateral Raises', 'isolation', ARRAY['shoulders'], 'beginner',
 ARRAY['dumbbells'],
 'Key exercise for lateral deltoid development.',
 ARRAY[
   'Slight bend in elbows',
   'Lead with elbows',
   'Control the descent',
   'Keep shoulders down',
   'Think about pouring water from your elbows'
 ],
 7,
 false),

-- Arms
('EZ Bar Curl', 'isolation', ARRAY['biceps'], 'beginner',
 ARRAY['ez bar'],
 'Primary bicep exercise with reduced wrist strain.',
 ARRAY[
   'Keep elbows at sides',
   'Full range of motion',
   'Control the negative',
   'Squeeze at top'
 ],
 7,
 false),

('Rope Pushdown', 'isolation', ARRAY['triceps'], 'beginner',
 ARRAY['cable machine', 'rope attachment'],
 'Effective tricep isolation with constant tension.',
 ARRAY[
   'Keep elbows tucked',
   'Split rope at bottom',
   'Control the return',
   'Full extension'
 ],
 6,
 false),

-- Accessory Movements
('Face Pull', 'accessory', ARRAY['shoulders', 'upper back'], 'beginner',
 ARRAY['cable machine', 'rope attachment'],
 'Posterior shoulder health and development exercise.',
 ARRAY[
   'Pull to forehead level',
   'Lead with elbows high',
   'External rotate at end',
   'Control return'
 ],
 6,
 false),

('Cable Wood Chop', 'accessory', ARRAY['core'], 'beginner',
 ARRAY['cable machine'],
 'Dynamic core movement for rotational strength.',
 ARRAY[
   'Start high to low',
   'Keep arms straight',
   'Rotate through core',
   'Control the return'
 ],
 6,
 false),

('Plank', 'accessory', ARRAY['core'], 'beginner',
 ARRAY[],
 'Fundamental core stability exercise.',
 ARRAY[
   'Maintain neutral spine',
   'Engage glutes',
   'Keep body in straight line',
   'Breathe normally'
 ],
 5,
 false);

-- Advanced Compound Variations
INSERT INTO exercises (name, category, muscle_groups, difficulty, equipment_needed, description, form_tips, rpe_recommendation, is_custom) VALUES
('Deficit Deadlift', 'compound', ARRAY['legs', 'back', 'core'], 'advanced',
 ARRAY['barbell', 'platform'],
 'Extended range of motion deadlift for increased difficulty and development.',
 ARRAY[
   'Stand on 1-2 inch platform',
   'Maintain flat back despite deeper start',
   'Drive through mid-foot',
   'Keep bar close to body',
   'Control descent'
 ],
 9,
 false),

('Front Squat', 'compound', ARRAY['legs', 'core'], 'advanced',
 ARRAY['barbell', 'squat rack'],
 'Quad-focused squat variation with high core demands.',
 ARRAY[
   'Bar rests on front deltoids',
   'Elbows high throughout',
   'Maintain upright torso',
   'Knees track over toes',
   'Control descent'
 ],
 8,
 false),

('Weighted Dips', 'compound', ARRAY['chest', 'triceps', 'shoulders'], 'advanced',
 ARRAY['dip bars', 'weight belt'],
 'Advanced upper body pressing movement.',
 ARRAY[
   'Lean forward for chest emphasis',
   'Control descent speed',
   'Lock out at top',
   'Keep shoulder blades down',
   'Maintain tension throughout'
 ],
 8,
 false); 