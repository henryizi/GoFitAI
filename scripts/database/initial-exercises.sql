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

-- Cardio Exercises
INSERT INTO exercises (name, category, muscle_groups, difficulty, equipment_needed, description, form_tips, rpe_recommendation, is_custom) VALUES
-- Bodyweight Cardio
('Burpees', 'cardio', ARRAY['full body', 'cardiovascular'], 'intermediate',
 ARRAY[],
 'Full-body explosive movement combining squat, plank, push-up, and jump.',
 ARRAY[
   'Start standing, drop to squat position',
   'Jump feet back to plank',
   'Perform push-up (optional)',
   'Jump feet back to squat',
   'Explosive jump up with arms overhead'
 ],
 8,
 false),

('Mountain Climbers', 'cardio', ARRAY['core', 'shoulders', 'cardiovascular'], 'beginner',
 ARRAY[],
 'High-intensity bodyweight exercise targeting core and cardiovascular system.',
 ARRAY[
   'Start in plank position',
   'Drive knees alternately to chest',
   'Keep hips level',
   'Maintain plank form throughout',
   'Quick tempo with control'
 ],
 7,
 false),

('Box Jumps', 'cardio', ARRAY['legs', 'glutes', 'cardiovascular'], 'intermediate',
 ARRAY['box', 'platform'],
 'Explosive plyometric exercise for power and cardio conditioning.',
 ARRAY[
   'Start arm''s length from box',
   'Bend knees and swing arms back',
   'Jump explosively onto box',
   'Land softly with bent knees',
   'Step down with control'
 ],
 7,
 false),

('Jumping Jacks', 'cardio', ARRAY['full body', 'cardiovascular'], 'beginner',
 ARRAY[],
 'Classic full-body cardiovascular exercise.',
 ARRAY[
   'Start with feet together, arms at sides',
   'Jump feet apart while raising arms overhead',
   'Jump back to starting position',
   'Keep knees slightly bent',
   'Maintain steady rhythm'
 ],
 5,
 false),

('High Knees', 'cardio', ARRAY['legs', 'core', 'cardiovascular'], 'beginner',
 ARRAY[],
 'In-place running with exaggerated knee lift for cardio and coordination.',
 ARRAY[
   'Run in place lifting knees high',
   'Aim to bring knees to waist level',
   'Keep torso upright',
   'Land on balls of feet',
   'Quick tempo with arm swing'
 ],
 6,
 false),

('Butt Kickers', 'cardio', ARRAY['legs', 'cardiovascular'], 'beginner',
 ARRAY[],
 'Running movement focusing on hamstring activation and cardio.',
 ARRAY[
   'Run in place kicking heels to glutes',
   'Keep knees pointing down',
   'Quick tempo',
   'Stay light on feet',
   'Swing arms naturally'
 ],
 5,
 false),

-- Jump Training
('Jump Squats', 'cardio', ARRAY['legs', 'glutes', 'cardiovascular'], 'intermediate',
 ARRAY[],
 'Explosive squat variation for power and conditioning.',
 ARRAY[
   'Start in squat position',
   'Jump explosively upward',
   'Land softly in squat position',
   'Absorb impact with bent knees',
   'Chain movements smoothly'
 ],
 7,
 false),

('Broad Jumps', 'cardio', ARRAY['legs', 'glutes', 'cardiovascular'], 'intermediate',
 ARRAY[],
 'Horizontal jumping exercise for power and distance.',
 ARRAY[
   'Start with feet hip-width apart',
   'Swing arms back and bend knees',
   'Jump forward as far as possible',
   'Land with bent knees',
   'Walk back to starting position'
 ],
 7,
 false),

('Lateral Bounds', 'cardio', ARRAY['legs', 'glutes', 'cardiovascular'], 'intermediate',
 ARRAY[],
 'Side-to-side jumping for lateral power and stability.',
 ARRAY[
   'Start on one leg',
   'Jump laterally to opposite leg',
   'Land softly on outside leg',
   'Absorb impact and stabilize',
   'Continue bouncing side to side'
 ],
 7,
 false),

-- HIIT Movements
('Bear Crawls', 'cardio', ARRAY['full body', 'core', 'cardiovascular'], 'intermediate',
 ARRAY[],
 'All-fours crawling movement for strength and cardio.',
 ARRAY[
   'Start on hands and feet, knees off ground',
   'Keep knees 1-2 inches off floor',
   'Crawl forward with opposite hand/foot',
   'Keep core tight and hips low',
   'Move with control'
 ],
 7,
 false),

('Crab Walks', 'cardio', ARRAY['shoulders', 'core', 'cardiovascular'], 'beginner',
 ARRAY[],
 'Reverse crawling movement targeting posterior chain.',
 ARRAY[
   'Sit with hands behind you, fingers facing forward',
   'Lift hips off ground',
   'Walk on hands and feet',
   'Keep hips elevated',
   'Move with opposite hand/foot'
 ],
 6,
 false),

('Star Jumps', 'cardio', ARRAY['full body', 'cardiovascular'], 'beginner',
 ARRAY[],
 'Explosive jumping movement in star formation.',
 ARRAY[
   'Start in squat position',
   'Jump up spreading arms and legs wide',
   'Form star shape at peak',
   'Land softly in squat position',
   'Chain movements smoothly'
 ],
 6,
 false),

-- Equipment-Based Cardio
('Battle Ropes', 'cardio', ARRAY['arms', 'shoulders', 'core', 'cardiovascular'], 'intermediate',
 ARRAY['battle ropes'],
 'High-intensity rope training for upper body and cardio.',
 ARRAY[
   'Hold rope ends with both hands',
   'Keep feet hip-width apart',
   'Create waves by alternating arms',
   'Keep core engaged',
   'Maintain steady rhythm'
 ],
 8,
 false),

('Kettlebell Swings', 'cardio', ARRAY['glutes', 'core', 'cardiovascular'], 'intermediate',
 ARRAY['kettlebell'],
 'Ballistic hip-hinge movement for power and conditioning.',
 ARRAY[
   'Start with kettlebell between legs',
   'Hinge at hips, swing kettlebell up',
   'Drive with hips, not arms',
   'Kettlebell reaches chest height',
   'Control descent between legs'
 ],
 7,
 false),

('Medicine Ball Slams', 'cardio', ARRAY['core', 'shoulders', 'cardiovascular'], 'intermediate',
 ARRAY['medicine ball'],
 'Explosive full-body movement for power and stress relief.',
 ARRAY[
   'Hold medicine ball overhead',
   'Engage core and slam ball down',
   'Use full body force',
   'Pick up ball and repeat',
   'Control the movement'
 ],
 7,
 false),

('Jump Rope', 'cardio', ARRAY['calves', 'cardiovascular'], 'beginner',
 ARRAY['jump rope'],
 'Classic cardio exercise for coordination and conditioning.',
 ARRAY[
   'Hold rope handles at hip level',
   'Jump with balls of feet',
   'Keep jumps small and controlled',
   'Turn rope with wrists, not arms',
   'Maintain steady rhythm'
 ],
 6,
 false),

-- Running Variations
('Shuttle Runs', 'cardio', ARRAY['legs', 'cardiovascular'], 'intermediate',
 ARRAY['cones', 'markers'],
 'Back-and-forth sprinting for agility and conditioning.',
 ARRAY[
   'Set markers 10-20 yards apart',
   'Sprint to marker and back',
   'Touch each marker',
   'Focus on quick direction changes',
   'Maintain speed throughout'
 ],
 7,
 false),

('Fartlek Training', 'cardio', ARRAY['full body', 'cardiovascular'], 'intermediate',
 ARRAY[],
 'Varied pace running combining speed and endurance.',
 ARRAY[
   'Alternate between jogging and sprinting',
   'Vary intervals based on feel',
   'Use landmarks as markers',
   'Keep overall effort moderate to high',
   'Focus on pace changes'
 ],
 7,
 false),

-- Swimming Movements (Dry Land)
('Swimming Strokes', 'cardio', ARRAY['shoulders', 'core', 'cardiovascular'], 'beginner',
 ARRAY[],
 'Dry land swimming movements for cardio and shoulder mobility.',
 ARRAY[
   'Simulate freestyle stroke motion',
   'Keep core engaged',
   'Alternate arms in smooth motion',
   'Add small hop for cardio boost',
   'Maintain rhythm and form'
 ],
 5,
 false),

-- Dance Cardio
('Dancing', 'cardio', ARRAY['full body', 'cardiovascular'], 'beginner',
 ARRAY[],
 'Rhythmic full-body movement for fun cardio workout.',
 ARRAY[
   'Move to the beat of music',
   'Engage whole body',
   'Keep moving continuously',
   'Have fun with movement',
   'Focus on enjoyment over perfection'
 ],
 5,
 false),

-- Stair/Step Exercises
('Step Ups', 'cardio', ARRAY['legs', 'glutes', 'cardiovascular'], 'beginner',
 ARRAY['box', 'step', 'platform'],
 'Simple step exercise for lower body and cardio.',
 ARRAY[
   'Step up onto platform with full foot',
   'Drive through heel',
   'Step down with control',
   'Alternate leading leg',
   'Keep torso upright'
 ],
 6,
 false),

('Stair Climbing', 'cardio', ARRAY['legs', 'glutes', 'cardiovascular'], 'beginner',
 ARRAY['stairs'],
 'Functional cardio exercise using stairs.',
 ARRAY[
   'Take stairs two at a time for intensity',
   'Use handrail for safety only',
   'Drive through legs',
   'Maintain steady pace',
   'Walk down for recovery'
 ],
 6,
 false);