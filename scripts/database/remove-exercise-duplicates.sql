-- Remove duplicate exercises from database
-- This script removes plural forms, hyphen variations, and exact duplicates
-- Keeping singular forms and space-separated names

-- Remove duplicate exercises (keeping singular forms and space-separated names)
DELETE FROM exercises WHERE id = 'fdb8d960-dd81-41ba-88a3-fd8f0dd56cad'; -- Removing "Archer Push-up" (duplicate of "Archer Push Up")
DELETE FROM exercises WHERE id = '313521e6-eb3f-4ecd-be31-df29ef1f34a2'; -- Removing "Back Squats" (duplicate of "Back Squat")
DELETE FROM exercises WHERE id = '5fec7eaf-3243-447e-8c06-01f07dee7d36'; -- Removing "Barbell Back Squats" (duplicate of "Barbell Back Squat")
DELETE FROM exercises WHERE id = '58f34d43-b922-42d8-82e8-c1b434b8af67'; -- Removing "Barbell Bicep Curls" (duplicate of "Barbell Bicep Curl")
DELETE FROM exercises WHERE id = '14aa52ff-8772-4290-bfb1-716389da89cd'; -- Removing "Barbell Curls" (duplicate of "Barbell Curl")
DELETE FROM exercises WHERE id = '534170a9-8ed9-491b-852a-f298c3046f6b'; -- Removing "Barbell Rows" (duplicate of "Barbell Row")
DELETE FROM exercises WHERE id = 'b81d9390-a1dd-4ad0-8f0f-4733d540f816'; -- Removing "Bent Over Barbell Rows" (duplicate of "Bent Over Barbell Row")
DELETE FROM exercises WHERE id = '63047833-82f9-4fb0-90bd-958eeacace81'; -- Removing "Bent-Over Barbell Rows" (duplicate of "Bent Over Barbell Row")
DELETE FROM exercises WHERE id = '254042e6-ec19-4f07-a9bd-e220cb53d6a8'; -- Removing "Bent-Over Rows" (duplicate of "Bent Over Rows")
DELETE FROM exercises WHERE id = '32b03147-f287-4234-b547-93d71926eab3'; -- Removing "Bicep Curls" (duplicate of "Bicep Curl")
DELETE FROM exercises WHERE id = 'ba9b4327-2177-4681-8655-af69575d5ba1'; -- Removing "Bicycle Crunches" (duplicate of "Bicycle Crunch")
DELETE FROM exercises WHERE id = '11542dcb-df6e-452b-97ac-284f54cbb1a0'; -- Removing "Bird-Dog" (duplicate of "Bird Dog")
DELETE FROM exercises WHERE id = 'e4f02976-293f-40a9-a6d2-55b859517ac6'; -- Removing "Box Jumps" (duplicate of "Box Jump")
DELETE FROM exercises WHERE id = '189245ff-2dcf-47ae-a2f2-e963a1547d0c'; -- Removing "Bulgarian Split Squats" (duplicate of "Bulgarian Split Squat")
DELETE FROM exercises WHERE id = '3f7abc17-bf1f-41b6-aefd-f388bfd1a4d6'; -- Removing "Burpees" (duplicate of "Burpee")
DELETE FROM exercises WHERE id = 'dfabea59-1ebb-4c9f-996a-d21b697a24ff'; -- Removing "Cable Crunches" (duplicate of "Cable Crunch")
DELETE FROM exercises WHERE id = '190ca769-363a-41e6-91c5-31b4688ed2f9'; -- Removing "Cable Lateral Raises" (duplicate of "Cable Lateral Raise")
DELETE FROM exercises WHERE id = '1ebc2b18-2d94-4715-a8d3-8d0327e691d1'; -- Removing "Calf Raises" (duplicate of "Calf Raise")
DELETE FROM exercises WHERE id = '0d5f922b-4604-4618-bca5-8e944a7cb106'; -- Removing "Chin-Up" (duplicate of "Chin Up")
DELETE FROM exercises WHERE id = 'c152b469-c71c-4dd3-baab-efd64cb96ee8'; -- Removing "Close-Grip Bench Press" (duplicate of "Close Grip Bench Press")
DELETE FROM exercises WHERE id = '8b23f1dc-3f3c-4186-9195-7edf228262b1'; -- Removing "Crunches" (duplicate of "Crunch")
DELETE FROM exercises WHERE id = '8dd48eb8-ee4f-4766-a63b-bdce49da1526'; -- Removing "Deadlifts" (duplicate of "Deadlift")
DELETE FROM exercises WHERE id = '0cb82314-7422-4746-ad6e-f2ecbd803bc8'; -- Removing "Decline Push-up" (duplicate of "Decline Push Up")
DELETE FROM exercises WHERE id = '363b5da1-0c7d-41d4-9bad-d3114858e655'; -- Removing "Diamond Push-up" (duplicate of "Diamond Push Up")
DELETE FROM exercises WHERE id = 'efbc69fa-f46c-42e1-ad69-68a1902025b8'; -- Removing "Dips" (duplicate of "Dip")
DELETE FROM exercises WHERE id = 'a93521c1-de82-4771-8f7f-913cb722d4d9'; -- Removing "Dumbbell Bicep Curls" (duplicate of "Dumbbell Bicep Curl")
DELETE FROM exercises WHERE id = 'a33dbc88-212f-4bf0-8ef1-9858572dbe50'; -- Removing "Dumbbell Flyes" (duplicate of "Dumbbell Fly")
DELETE FROM exercises WHERE id = '021597ae-4a1b-41b3-abbf-28612f0ec5d5'; -- Removing "Dumbbell Lateral Raises" (duplicate of "Dumbbell Lateral Raise")
DELETE FROM exercises WHERE id = 'b0a743af-a004-4861-8481-7df002d2fda5'; -- Removing "Dumbbell Pullovers" (duplicate of "Dumbbell Pullover")
DELETE FROM exercises WHERE id = '7a553024-68d4-4b39-a5bf-ee34b726a77c'; -- Removing "Dumbbell Rows" (duplicate of "Dumbbell Row")
DELETE FROM exercises WHERE id = '90ad9556-e3e3-4730-b779-1780f780529b'; -- Removing "Dumbbell Squats" (duplicate of "Dumbbell Squat")
DELETE FROM exercises WHERE id = '32f03209-9b09-439f-bf26-3e376a1cd28a'; -- Removing "Dumbbell Step-ups" (duplicate of "Dumbbell Step Up")
DELETE FROM exercises WHERE id = 'e6287d0a-6882-426c-b62f-30b46944b62b'; -- Removing "Dumbbell Step-Ups" (duplicate of "Dumbbell Step Up")
DELETE FROM exercises WHERE id = '637f4787-a9ed-4368-bfd3-725108e710a2'; -- Removing "Face Pulls" (duplicate of "Face Pull")
DELETE FROM exercises WHERE id = '5a797ca1-fa32-4ac9-8852-9cb07d00fe84'; -- Removing "Farmer's Walk" (duplicate of "Farmers Walk")
DELETE FROM exercises WHERE id = '96e4232a-6c5d-4288-8aea-a6433475baa3'; -- Removing "Front Raises" (duplicate of "Front Raise")
DELETE FROM exercises WHERE id = '7d150dda-641b-490a-af60-fc340c6dcd07'; -- Removing "Front Squats" (duplicate of "Front Squat")
DELETE FROM exercises WHERE id = '72429f0a-f895-4275-90c9-3d1e0660f951'; -- Removing "Glute Bridges" (duplicate of "Glute Bridge")
DELETE FROM exercises WHERE id = 'd02353b0-3c84-429b-83fd-526b9fb0830c'; -- Removing "Goblet Squats" (duplicate of "Goblet Squat")
DELETE FROM exercises WHERE id = 'e9598394-b04e-4252-af1c-84c91438cffa'; -- Removing "Hack Squats" (duplicate of "Hack Squat")
DELETE FROM exercises WHERE id = '5319b4ba-26ce-4971-bd3d-26edba3d6bf0'; -- Removing "Hammer Curls" (duplicate of "Hammer Curl")
DELETE FROM exercises WHERE id = '8015f0c8-4195-4195-be24-7c6d0b631b69'; -- Removing "Hanging Knee Raises" (duplicate of "Hanging Knee Raise")
DELETE FROM exercises WHERE id = '4a3379de-da81-4cd1-ae14-cc06630f12a4'; -- Removing "Hanging Leg Raises" (duplicate of "Hanging Leg Raise")
DELETE FROM exercises WHERE id = 'b6642101-5046-4883-a6a5-9411c5c70bbc'; -- Removing "Hip Thrusts" (duplicate of "Hip Thrust")
DELETE FROM exercises WHERE id = 'c06ec036-36da-43a1-aea7-a7bf14c19fd8'; -- Removing "Incline Dumbbell Curls" (duplicate of "Incline Dumbbell Curl")
DELETE FROM exercises WHERE id = 'bd4084f4-3446-4c96-89c4-6f0f78ed161b'; -- Removing "Incline Push-Up" (duplicate of "Incline Push-up")
DELETE FROM exercises WHERE id = 'f22c8c71-8e7a-4d51-88f3-5b8700ac4172'; -- Removing "Jump Squats" (duplicate of "Jump Squat")
DELETE FROM exercises WHERE id = '069c2ac7-562e-4443-b20f-e743b0082d07'; -- Removing "Kettlebell Swings" (duplicate of "Kettlebell Swing")
DELETE FROM exercises WHERE id = '1e4fe186-1b97-41c6-b2fb-9f4c0a281697'; -- Removing "Lat Pulldowns" (duplicate of "Lat Pulldown")
DELETE FROM exercises WHERE id = '92192f63-fee6-4283-9d8a-a034911b3c6b'; -- Removing "Lateral Raises" (duplicate of "Lateral Raise")
DELETE FROM exercises WHERE id = '0b9ca416-a51c-4a82-9fd6-8af13139f69a'; -- Removing "Lateral Raises (Dumbbells)" (duplicate of "Lateral Raises (Dumbbell)")
DELETE FROM exercises WHERE id = 'd4445832-daca-4c7d-b46a-f5824e4f60ad'; -- Removing "Leg Curls" (duplicate of "Leg Curl")
DELETE FROM exercises WHERE id = 'ec802f48-b301-4eb5-a64b-4366b34ff2a6'; -- Removing "Leg Extensions" (duplicate of "Leg Extension")
DELETE FROM exercises WHERE id = '6a4a1819-46fb-4216-a76f-b071d49fc9d8'; -- Removing "Leg Press (Machine)" (duplicate of "Leg Press Machine")
DELETE FROM exercises WHERE id = '817756ef-91d3-4be2-9a58-8fb769890a73'; -- Removing "Leg Raises" (duplicate of "Leg Raise")
DELETE FROM exercises WHERE id = 'a70c8c88-a654-4c4d-ad9c-75d7d50d3324'; -- Removing "Lying Leg Curls" (duplicate of "Lying Leg Curl")
DELETE FROM exercises WHERE id = 'ea7907bb-245a-473b-a6c1-917de43961fe'; -- Removing "Mountain Climbers" (duplicate of "Mountain Climber")
DELETE FROM exercises WHERE id = '45a4f030-a5e9-409b-b2ce-b9e0b6ffd0df'; -- Removing "Planks" (duplicate of "Plank")
DELETE FROM exercises WHERE id = '2aa3b13c-21bb-43d9-bfad-ffe017005339'; -- Removing "Pull Ups" (duplicate of "Pull Up")
DELETE FROM exercises WHERE id = '3aaeac62-e3ee-4703-af41-d8459566235e'; -- Removing "Pull-up" (duplicate of "Pull Up")
DELETE FROM exercises WHERE id = 'e9dac155-95ee-4825-af02-ea140ca0ad5c'; -- Removing "Pull-Up" (duplicate of "Pull Up")
DELETE FROM exercises WHERE id = 'd95f8362-6ae2-4012-8baf-4567ee402054'; -- Removing "Pull-ups" (duplicate of "Pull Up")
DELETE FROM exercises WHERE id = 'd0d2ec8f-f08e-4ece-b996-5044dae5da56'; -- Removing "Pull-Ups" (duplicate of "Pull Up")
DELETE FROM exercises WHERE id = 'c15172af-4e58-402c-9a93-c17835c594f0'; -- Removing "Push-Up" (duplicate of "Push Up")
DELETE FROM exercises WHERE id = 'f5db936c-29be-4530-9f37-487cb47d480e'; -- Removing "Push-ups" (duplicate of "Push Up")
DELETE FROM exercises WHERE id = '5142be00-a23b-44dc-b7c6-3ca09cfe660d'; -- Removing "Push-Ups" (duplicate of "Push Up")
DELETE FROM exercises WHERE id = '67a8ae3f-2558-4978-8451-dd0c08e5927d'; -- Removing "Rear Delt Flyes" (duplicate of "Rear Delt Fly")
DELETE FROM exercises WHERE id = '4b1c623b-807c-485d-8ebc-4bf65ce93279'; -- Removing "Reverse Lunges" (duplicate of "Reverse Lunge")
DELETE FROM exercises WHERE id = '7adcc407-31df-4315-8282-048f22edaadf'; -- Removing "Romanian Deadlifts" (duplicate of "Romanian Deadlift")
DELETE FROM exercises WHERE id = 'd80cdbb7-69d6-4789-a662-32333c9a3ccc'; -- Removing "Romanian Deadlifts (Dumbbells)" (duplicate of "Romanian Deadlifts (Dumbbell)")
DELETE FROM exercises WHERE id = '64854e53-68ae-4ee3-8aec-ffa204198171'; -- Removing "Russian Twists" (duplicate of "Russian Twist")
DELETE FROM exercises WHERE id = '35b4c50d-5c0d-429d-9636-b212857a2d8c'; -- Removing "Seated Cable Rows" (duplicate of "Seated Cable Row")
DELETE FROM exercises WHERE id = 'd779109f-67a6-4e6b-9d40-9d9550d411ca'; -- Removing "Seated Calf Raises" (duplicate of "Seated Calf Raise")
DELETE FROM exercises WHERE id = 'd501119a-8848-41e1-ab57-3bd818a39563'; -- Removing "Seated Calf Raise Machine" (duplicate of "Seated Calf Raise Machine")
DELETE FROM exercises WHERE id = '8d1881b1-7c29-4f69-b430-125f4b7c6d0e'; -- Removing "Sit-Up" (duplicate of "Sit Up")
DELETE FROM exercises WHERE id = 'c8508f17-ec7c-4bc2-8282-d04e0010f3c6'; -- Removing "Squats" (duplicate of "Squat")
DELETE FROM exercises WHERE id = 'a378b1d1-77aa-41af-929c-1ccf6c15b54c'; -- Removing "Standing Calf Raises" (duplicate of "Standing Calf Raise")
DELETE FROM exercises WHERE id = 'd5ffaa18-1a38-4bbd-9304-6b7fd1f40889'; -- Removing "Standing Calf Raise Machine" (duplicate of "Standing Calf Raise Machine")
DELETE FROM exercises WHERE id = '3b25deeb-699c-4882-b187-1136ce593d79'; -- Removing "Step Ups" (duplicate of "Step-Up")
DELETE FROM exercises WHERE id = 'b5f0506d-2c0d-48e7-9ab5-20b6072c3af5'; -- Removing "Step-Ups" (duplicate of "Step-Up")
DELETE FROM exercises WHERE id = 'b669e6d2-85a1-4c6f-a831-901181f60ad6'; -- Removing "T-Bar Rows" (duplicate of "T-Bar Row")
DELETE FROM exercises WHERE id = 'fd41eafb-33e6-4c77-a4a8-6c1374ae1ac0'; -- Removing "Thrusters" (duplicate of "Thruster")
DELETE FROM exercises WHERE id = 'e0d441ed-1de8-4fd4-937b-f49814df9898'; -- Removing "Tricep Pushdowns" (duplicate of "Tricep Pushdown")
DELETE FROM exercises WHERE id = '7e61af8b-9522-4cb6-8386-f171fc2e74f9'; -- Removing "Walking Lunges" (duplicate of "Walking Lunge")
DELETE FROM exercises WHERE id = '5677e4e0-6091-4a26-ac2d-c047d5e4d6fc'; -- Removing "Walking Lunges (Dumbbells)" (duplicate of "Walking Lunges (Dumbbell)")
DELETE FROM exercises WHERE id = '6ef8ee5c-1b70-4901-bdd3-c367decdf5ba'; -- Removing "Walking Lunges (with dumbbells)" (duplicate of "Walking Lunges with Dumbbells")
DELETE FROM exercises WHERE id = 'f13a5e7e-12f1-4842-97f2-ab9102dbe8c3'; -- Removing "Wall Balls" (duplicate of "Wall Ball")
DELETE FROM exercises WHERE id = '4a14a2f5-d6ff-42b0-8fe3-37ab6bbcf699'; -- Removing "Wide Grip Push-up" (duplicate of "Wide Grip Push Up")

-- Verify no duplicates remain
SELECT 
  LOWER(REPLACE(REPLACE(name, '-', ' '), 's', '')) as normalized_name,
  COUNT(*) as count,
  array_agg(name ORDER BY name) as exercise_names
FROM exercises
WHERE is_custom = false
GROUP BY LOWER(REPLACE(REPLACE(name, '-', ' '), 's', ''))
HAVING COUNT(*) > 1
ORDER BY count DESC;








