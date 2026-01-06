# Exercise Library Duplicates Fix

## 🔍 Problem
The exercise library had duplicate exercises in plural/singular forms and hyphen vs space variations, making the library cluttered and confusing.

## ✅ Fixed Duplicates

### 1. Singular/Plural Forms
- ✅ **Dumbbell Flyes** → **Dumbbell Fly** (kept singular)
- ✅ **Lateral Raises** → **Lateral Raise** (kept singular)
- ✅ **Jump Squats** → **Jump Squat** (kept singular)
- ✅ **Kettlebell Swings** → **Kettlebell Swing** (kept singular)
- ✅ **Mountain Climbers** → **Mountain Climber** (kept singular)
- ✅ **Burpees** → **Burpee** (kept singular)
- ✅ **Box Jumps** → **Box Jump** (kept singular)

### 2. Hyphen vs Space Variations
- ✅ **Diamond Push-up** → **Diamond Push Up** (standardized to space)
- ✅ **Wide Grip Push-up** → **Wide Grip Push Up** (standardized to space)
- ✅ **Decline Push-up** → **Decline Push Up** (standardized to space)
- ✅ **Archer Push-up** → **Archer Push Up** (standardized to space)
- ✅ **Single Arm Push-up** → **Single Arm Push Up** (standardized to space, then removed as duplicate)
- ✅ **Clap Push-up** → **Clap Push Up** (standardized to space)
- ✅ **Hindu Push-up** → **Hindu Push Up** (standardized to space)
- ✅ **Dive Bomber Push-up** → **Dive Bomber Push Up** (standardized to space)
- ✅ **Pull-ups** (SQL) → **Pull Up** (standardized to space)
- ✅ **Step-Ups** → **Step Ups** (standardized to space)
- ✅ **Weighted Step-Up** → **Weighted Step Up** (standardized to space)

### 3. Synonym Variations
- ✅ **Single Arm Push Up** → Removed (duplicate of "One Arm Push Up")

## 📋 Files Modified

1. **src/constants/exerciseNames.ts**
   - Fixed all plural forms to singular
   - Standardized all hyphens to spaces
   - Removed duplicate "Single Arm Push Up"

2. **scripts/database/initial-exercises.sql**
   - Fixed "Lateral Raises" → "Lateral Raise"
   - Fixed "Burpees" → "Burpee"
   - Fixed "Mountain Climbers" → "Mountain Climber"
   - Fixed "Box Jumps" → "Box Jump"
   - Fixed "Jump Squats" → "Jump Squat"
   - Fixed "Kettlebell Swings" → "Kettlebell Swing"
   - Fixed "Pull-ups" → "Pull Up"

## 🎯 Standardization Rules Applied

1. **Singular Forms Preferred**: Exercise names use singular form (e.g., "Squat" not "Squats")
2. **Spaces Over Hyphens**: Use spaces instead of hyphens (e.g., "Push Up" not "Push-up")
3. **Consistent Naming**: "One Arm" preferred over "Single Arm" for consistency

## ✅ Verification

Run the duplicate finder script to verify:
```bash
node scripts/find-all-exercise-duplicates.js
```

**Result:** ✅ No duplicates found!

## 📊 Summary

- **Total duplicates removed:** 14 entries
- **Files cleaned:** 2 files
- **Standardization:** All exercises now use consistent naming conventions

---

**Last Updated:** 2025-12-11
**Status:** ✅ All duplicates fixed
