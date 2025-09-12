# 🏋️ Fitness Strategy Database Setup

This guide will help you add the `fitness_strategy` column to your Supabase database to support the new onboarding flow.

## 🎯 What This Enables

The fitness strategy system replaces complex slider-based goal setting with simple, intuitive strategy selection:

- **🔥 Bulk** - Build muscle mass aggressively  
- **🏃 Cut** - Lose body fat efficiently
- **⚖️ Maintenance** - Maintain current physique
- **🔄 Body Recomp** - Build muscle & lose fat simultaneously  
- **📈 Maingaining** - Slow, lean muscle gains

## 📋 Manual Setup Steps

### Step 1: Open Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **+ New Query**

### Step 2: Run the Migration SQL

Copy and paste this SQL into the editor and click **Run**:

```sql
-- Add fitness_strategy column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_strategy TEXT;

-- Add constraint to ensure only valid strategies are stored
-- PostgreSQL doesn't support IF NOT EXISTS for constraints, so we check first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_fitness_strategy' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT check_fitness_strategy 
        CHECK (fitness_strategy IS NULL OR fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));
    END IF;
END $$;

-- Optional: Update existing profiles with a default strategy
-- (You can skip this if you want existing users to go through onboarding again)
UPDATE profiles 
SET fitness_strategy = 'maintenance'
WHERE fitness_strategy IS NULL 
  AND onboarding_completed = true;
```

### Step 3: Verify the Setup

Run this query to verify the column was added successfully:

```sql
-- Check the column exists and see sample data
SELECT 
  id,
  full_name,
  fitness_strategy,
  onboarding_completed
FROM profiles 
LIMIT 5;
```

You should see the `fitness_strategy` column in the results.

## 🧪 Test the Integration

### Option 1: Run the Test Script

If you have your environment variables set up:

```bash
node test-fitness-strategy-db.js
```

### Option 2: Manual Testing

1. **Start your app**: `npx expo start`
2. **Go through onboarding** to the fitness strategy screen
3. **Select a strategy** and complete onboarding
4. **Check the database** to verify the strategy was saved

## 🔧 Troubleshooting

### Column Already Exists Error

If you see an error like "column already exists", that's fine! The `IF NOT EXISTS` clause should prevent this, but if it happens, the column is already there.

### Constraint Already Exists Error

Similar to above - if the constraint already exists, you're good to go!

### Permission Errors

Make sure you're using the correct Supabase project and have admin access.

### App Still Shows Sliders

If the app still shows the old goal sliders instead of strategy cards:

1. **Clear Expo cache**: `npx expo start --clear`
2. **Restart the development server**
3. **Check the fitness-strategy.tsx file** is being used in your onboarding flow

## 📊 Database Schema

After setup, your `profiles` table will have:

```typescript
fitness_strategy: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining' | null
```

## 🎉 You're Ready!

Once the database is set up:

✅ Users can select their fitness strategy during onboarding  
✅ The strategy is saved to their profile  
✅ Future features can use this strategy for personalized recommendations  
✅ The complex goal sliders are replaced with simple, intuitive choices  

The fitness strategy onboarding screen should now work perfectly! 🚀

This guide will help you add the `fitness_strategy` column to your Supabase database to support the new onboarding flow.

## 🎯 What This Enables

The fitness strategy system replaces complex slider-based goal setting with simple, intuitive strategy selection:

- **🔥 Bulk** - Build muscle mass aggressively  
- **🏃 Cut** - Lose body fat efficiently
- **⚖️ Maintenance** - Maintain current physique
- **🔄 Body Recomp** - Build muscle & lose fat simultaneously  
- **📈 Maingaining** - Slow, lean muscle gains

## 📋 Manual Setup Steps

### Step 1: Open Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **+ New Query**

### Step 2: Run the Migration SQL

Copy and paste this SQL into the editor and click **Run**:

```sql
-- Add fitness_strategy column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_strategy TEXT;

-- Add constraint to ensure only valid strategies are stored
-- PostgreSQL doesn't support IF NOT EXISTS for constraints, so we check first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_fitness_strategy' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT check_fitness_strategy 
        CHECK (fitness_strategy IS NULL OR fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));
    END IF;
END $$;

-- Optional: Update existing profiles with a default strategy
-- (You can skip this if you want existing users to go through onboarding again)
UPDATE profiles 
SET fitness_strategy = 'maintenance'
WHERE fitness_strategy IS NULL 
  AND onboarding_completed = true;
```

### Step 3: Verify the Setup

Run this query to verify the column was added successfully:

```sql
-- Check the column exists and see sample data
SELECT 
  id,
  full_name,
  fitness_strategy,
  onboarding_completed
FROM profiles 
LIMIT 5;
```

You should see the `fitness_strategy` column in the results.

## 🧪 Test the Integration

### Option 1: Run the Test Script

If you have your environment variables set up:

```bash
node test-fitness-strategy-db.js
```

### Option 2: Manual Testing

1. **Start your app**: `npx expo start`
2. **Go through onboarding** to the fitness strategy screen
3. **Select a strategy** and complete onboarding
4. **Check the database** to verify the strategy was saved

## 🔧 Troubleshooting

### Column Already Exists Error

If you see an error like "column already exists", that's fine! The `IF NOT EXISTS` clause should prevent this, but if it happens, the column is already there.

### Constraint Already Exists Error

Similar to above - if the constraint already exists, you're good to go!

### Permission Errors

Make sure you're using the correct Supabase project and have admin access.

### App Still Shows Sliders

If the app still shows the old goal sliders instead of strategy cards:

1. **Clear Expo cache**: `npx expo start --clear`
2. **Restart the development server**
3. **Check the fitness-strategy.tsx file** is being used in your onboarding flow

## 📊 Database Schema

After setup, your `profiles` table will have:

```typescript
fitness_strategy: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining' | null
```

## 🎉 You're Ready!

Once the database is set up:

✅ Users can select their fitness strategy during onboarding  
✅ The strategy is saved to their profile  
✅ Future features can use this strategy for personalized recommendations  
✅ The complex goal sliders are replaced with simple, intuitive choices  

The fitness strategy onboarding screen should now work perfectly! 🚀
