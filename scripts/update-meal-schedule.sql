-- scripts/update-meal-schedule.sql
CREATE OR REPLACE FUNCTION update_meal_in_schedule(
    plan_id_param UUID,
    meal_time_slot_param TEXT,
    new_meal_description_param TEXT
)
RETURNS VOID AS $$
DECLARE
    current_schedule JSONB;
    updated_schedule JSONB := '[]'::JSONB;
    meal_element JSONB;
BEGIN
    -- 1. Get the current daily_schedule for the specified plan
    SELECT daily_schedule INTO current_schedule
    FROM public.nutrition_plans
    WHERE id = plan_id_param;

    -- 2. If a schedule exists, iterate through its elements
    IF current_schedule IS NOT NULL THEN
        FOR meal_element IN SELECT * FROM jsonb_array_elements(current_schedule)
        LOOP
            -- 3. If the time_slot matches, update the 'meal' field
            IF meal_element->>'time_slot' = meal_time_slot_param THEN
                meal_element := jsonb_set(meal_element, '{meal}', to_jsonb(new_meal_description_param));
            END IF;
            -- 4. Append the (possibly modified) element to the new schedule
            updated_schedule := updated_schedule || meal_element;
        END LOOP;

        -- 5. Update the nutrition_plan with the new schedule
        UPDATE public.nutrition_plans
        SET daily_schedule = updated_schedule
        WHERE id = plan_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql; 