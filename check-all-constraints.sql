-- Check all constraints on the profiles table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'c';

-- Also check what values currently exist in each enum-like field
SELECT 'activity_level' as field, activity_level as value, COUNT(*) as count 
FROM public.profiles 
WHERE activity_level IS NOT NULL 
GROUP BY activity_level

UNION ALL

SELECT 'fitness_level' as field, fitness_level as value, COUNT(*) as count 
FROM public.profiles 
WHERE fitness_level IS NOT NULL 
GROUP BY fitness_level

UNION ALL

SELECT 'goal' as field, goal as value, COUNT(*) as count 
FROM public.profiles 
WHERE goal IS NOT NULL 
GROUP BY goal

ORDER BY field, value;




