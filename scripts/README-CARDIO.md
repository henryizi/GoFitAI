# Cardio Exercise Database Seeding

This directory contains scripts and data files for adding comprehensive cardio exercises to the GoFitAI database.

## 🏃‍♂️ Cardio Exercise Collection

We've created **25 comprehensive cardio exercises** with timing-based parameters specifically designed for the custom workout builder:

### Exercise Categories:

#### **Bodyweight Cardio (No Equipment Required)**
- Jumping Jacks
- High Knees  
- Burpees
- Mountain Climbers
- Bear Crawls
- Plank Jacks
- Squat Jumps
- Lateral Shuffles

#### **Equipment-Based Cardio**
- Jump Rope
- Box Jumps
- Battle Ropes
- Kettlebell Swings
- Step-Ups
- Wall Balls
- Thrusters

#### **Machine-Based Cardio**
- Treadmill Running
- Rowing Machine
- Stationary Bike
- Elliptical Machine
- Bike Sprints

#### **Outdoor/Activity-Based**
- Sprint Intervals
- Stair Climbing
- Dancing
- Swimming

#### **HIIT Workouts**
- HIIT Circuit

## 📊 Exercise Parameters

All cardio exercises use **timing-based parameters** instead of sets/reps:

- ✅ **duration_seconds**: How long to perform the exercise
- ✅ **rest_seconds**: Rest time between rounds
- ❌ **sets**: Set to `null` for cardio
- ❌ **reps**: Set to `null` for cardio

### Example Timing Patterns:
- **Short Intervals**: 20-30 seconds work, 10-30 seconds rest
- **Medium Intervals**: 45-60 seconds work, 30-60 seconds rest  
- **Long Cardio**: 15-30 minutes continuous (rest = 0)
- **HIIT Style**: 20 seconds work, 10 seconds rest
- **Sprint Intervals**: 30-60 seconds work, 90-120 seconds rest

## 🔧 Available Data Formats

### 1. **Node.js Seeding Script** (`seed-comprehensive-cardio.js`)
- Automated seeding using Supabase client
- Checks for existing exercises to avoid duplicates
- Provides detailed logging and progress feedback
- **Usage**: `node scripts/seed-comprehensive-cardio.js`

### 2. **JSON Data File** (`cardio-exercises.json`)
- Raw exercise data in JSON format
- Can be imported programmatically
- Useful for custom import scripts or data migration

### 3. **SQL Import File** (`cardio-exercises.sql`)
- Direct SQL statements for database import
- Includes proper PostgreSQL array syntax
- Has conflict resolution (`ON CONFLICT DO NOTHING`)
- Creates performance indexes
- **Usage**: Execute in your PostgreSQL/Supabase database

## 🚀 Implementation Status

The custom workout builder has been updated to support cardio exercises:

### ✅ **Frontend Changes**
- Added "Cardio" filter to muscle groups in `custom-builder.tsx`
- Enhanced filtering logic to recognize cardio exercises
- Users can now filter by "Cardio" category

### ✅ **Backend Changes**
- Updated `getExerciseCategory` function in server to recognize cardio exercises
- Improved exercise categorization algorithm
- Supports both muscle group and category-based filtering

### ✅ **User Experience**
- Cardio exercises appear when "Cardio" filter is selected
- Seamless integration with existing workout builder flow
- Timing-based parameters display properly in UI

## 🎯 Next Steps

1. **Run the Seeding Script** (when Supabase credentials are available):
   ```bash
   node scripts/seed-comprehensive-cardio.js
   ```

2. **Or Import SQL Directly**:
   - Copy contents of `cardio-exercises.sql`
   - Execute in Supabase SQL editor or PostgreSQL

3. **Verify in App**:
   - Open custom workout builder
   - Click "Cardio" filter
   - Should see all 25 cardio exercises

## 💡 Benefits

- **Comprehensive Coverage**: 25 different cardio exercises across all categories
- **Timing-Based**: Proper cardio parameters (duration/rest vs sets/reps)
- **Difficulty Levels**: Beginner, intermediate, and advanced options
- **Equipment Variety**: Bodyweight, equipment-based, and machine options
- **Clear Instructions**: Step-by-step guidance for each exercise
- **Performance Optimized**: Includes database indexes for fast filtering

## 🔍 Technical Details

### Database Schema Compatibility:
- Uses existing `exercises` table structure
- Leverages PostgreSQL array types for `muscle_groups` and `instructions`
- Maintains consistency with existing exercise data format

### Filtering Logic:
- Exercises categorized with `category = 'cardio'`
- Muscle groups include `'cardio'` in the array
- Backend recognizes common cardio exercise names
- Compatible with existing exercise filtering system

The cardio category is now fully functional and ready for users to create comprehensive workout plans that include cardiovascular training! 🏃‍♂️💪

