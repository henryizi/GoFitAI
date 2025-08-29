-- This script clears the exercises table to remove duplicates.
-- WARNING: This will delete all entries in your exercises table.
-- This is intended for a development environment to resolve data corruption.

DELETE FROM public.exercises;

-- Optional: Reset the sequence if you have one (not strictly necessary with UUIDs)
-- ALTER SEQUENCE exercises_id_seq RESTART WITH 1;

SELECT 'Exercises table has been cleared successfully.'; 