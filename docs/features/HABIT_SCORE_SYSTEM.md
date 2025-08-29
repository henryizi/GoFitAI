# Habit Score Tracking System

## Overview

The habit score system tracks daily user adherence to healthy behaviors and calculates a comprehensive score from 0-100 based on four key categories.

## Implementation Components

### 1. HabitScoreService (`src/services/HabitScoreService.ts`)

Core service that calculates daily habit scores by analyzing:

- **Nutrition (40 points max)**
  - Food logged: 15 points
  - Macro compliance: 15 points (compared to nutrition plan targets)
  - Quality score: 10 points (based on protein/fat ratios)

- **Weight Tracking (20 points max)**
  - Weight logged today: 15 points
  - Streak bonus: 5 points (for 7+ day streak)

- **Workouts (30 points max)**
  - Workout completed: 25 points
  - Consistency bonus: 5 points (3+ workouts this week)

- **Wellness (10 points max)**
  - Sleep logged: 5 points
  - Stress level logged: 5 points

### 2. Database Schema (`scripts/add-habit-score-column.sql`)

Added `habit_score` column to `daily_user_metrics` table:
- INTEGER type with CHECK constraint (0-100)
- Indexed for efficient queries
- Included in existing RLS policies

### 3. Frontend Integration (`app/(main)/progress/index.tsx`)

- Integrated habit score calculation into progress screen
- Automatic calculation on page load and data changes
- Stores and retrieves cached scores for performance

### 4. UI Components

#### TodayCard Enhancement
- Displays habit score (/100) in the TODAY card
- Shows `--` when no score available

#### HabitScoreBreakdown (`src/components/progress/HabitScoreBreakdown.tsx`)
- Expandable component showing detailed score breakdown
- Color-coded progress bars for each category
- Personalized tips for improvement
- Real-time score calculation

### 5. Backend Integration (`server/index.js`)

#### New Function: `calculateHabitScore(userId, date)`
- Server-side habit score calculation
- Matches frontend logic for consistency
- Handles edge cases and errors gracefully

#### Enhanced API: `/api/log-daily-metric`
- Automatically calculates habit score when metrics are logged
- Stores score in database for caching
- Non-blocking - doesn't fail if habit score calculation fails

### 6. Type Definitions (`src/types/database.ts`)

Updated database types to include `habit_score` field in `daily_user_metrics` table.

## Usage Flow

1. **Daily Activities**: User logs food, weight, completes workouts, tracks wellness
2. **Score Calculation**: System calculates habit score based on completed activities
3. **Storage**: Score is stored in database for caching
4. **Display**: Score appears in progress screen with breakdown available
5. **Insights**: User can see detailed breakdown and improvement tips

## Scoring Logic

### Nutrition Score (40 points)
```
Food Logged: 15 points (binary)
Macro Compliance: 15 points (0-1 based on how close to targets)
Quality Score: 10 points (0-1 based on protein/fat ratios)
```

### Weight Score (20 points)
```
Weight Logged: 15 points (binary)
Streak Bonus: 5 points (if 7+ day streak)
```

### Workout Score (30 points)
```
Workout Completed: 25 points (binary)
Consistency Bonus: 5 points (if 3+ workouts this week)
```

### Wellness Score (10 points)
```
Sleep Logged: 5 points (binary)
Stress Logged: 5 points (binary)
```

## Key Features

- **Real-time Calculation**: Scores update as users log activities
- **Caching**: Scores are stored to avoid recalculation
- **Progressive Disclosure**: Summary score with expandable breakdown
- **Actionable Insights**: Personalized tips based on missing activities
- **Performance Optimized**: Efficient queries and minimal computation
- **Error Resilient**: Graceful handling of missing data or calculation errors

## Database Setup

Run the schema update:
```sql
-- Execute scripts/add-habit-score-column.sql in your Supabase dashboard
ALTER TABLE public.daily_user_metrics 
ADD COLUMN IF NOT EXISTS habit_score INTEGER CHECK (habit_score >= 0 AND habit_score <= 100);
```

## Future Enhancements

1. **Historical Trends**: Track habit score trends over time
2. **Goal Setting**: Allow users to set habit score targets
3. **Achievements**: Unlock badges for consistency milestones
4. **Social Features**: Compare scores with friends (anonymized)
5. **AI Insights**: Personalized coaching based on habit patterns






