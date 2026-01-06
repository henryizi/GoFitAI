-- Add tutorial_completed column to profiles table
-- This tracks whether the user has completed the mandatory app tutorial after payment

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT NULL;

-- Note: Existing premium users will have tutorial_completed set to false when they:
-- 1. Make a new purchase (via PaywallScreen.tsx)
-- 2. Receive a webhook from RevenueCat (via revenueCatWebhook.js)
-- We don't need to update existing users here as the app uses RevenueCat for premium status,
-- not a database column.

-- Add comment to column
COMMENT ON COLUMN public.profiles.tutorial_completed IS 'Whether the user has completed the mandatory app tutorial after becoming premium. NULL means not yet checked, false means needs tutorial, true means completed.';

r