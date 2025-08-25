# GoFitAI - AI-Powered Body Aesthetic Analysis & Fitness Planning

## Overview

GoFitAI is a comprehensive fitness application that leverages artificial intelligence to analyze body aesthetics, track progress, and provide personalized workout and nutrition plans. The app combines photo analysis, AI-driven insights, and personalized recommendations to help users achieve their fitness goals.

Tech Stack:
Frontend: React Native with TypeScript, Expo, and Expo Router
Backend/Database: Supabase
UI Framework: React Native Paper
AI Processing: DeepSeek

## Database Schema

### Tables Structure

#### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(10),
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  fitness_goal VARCHAR(50), -- 'muscle_gain', 'fat_loss', 'tone_up', 'maintenance'
  dietary_preferences TEXT[], -- ['vegan', 'keto', 'paleo', etc.]
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. body_photos
```sql
CREATE TABLE body_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_type VARCHAR(20) NOT NULL, -- 'front', 'back'
  photo_url VARCHAR(500) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_analyzed BOOLEAN DEFAULT FALSE,
  analysis_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'processing', 'completed', 'failed'
);
```

#### 3. body_analysis
```sql
CREATE TABLE body_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_session_id UUID, -- Links to a set of front/back photos
  chest_rating INTEGER CHECK (chest_rating >= 1 AND chest_rating <= 10),
  arms_rating INTEGER CHECK (arms_rating >= 1 AND arms_rating <= 10),
  back_rating INTEGER CHECK (back_rating >= 1 AND back_rating <= 10),
  legs_rating INTEGER CHECK (legs_rating >= 1 AND legs_rating <= 10),
  waist_rating INTEGER CHECK (waist_rating >= 1 AND waist_rating <= 10),
  overall_rating DECIMAL(3,1),
  strongest_body_part VARCHAR(20),
  weakest_body_part VARCHAR(20),
  ai_feedback TEXT,
  analysis_data JSONB, -- Detailed AI analysis results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. workout_plans
```sql
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL,
  goal_type VARCHAR(50) NOT NULL, -- 'muscle_gain', 'fat_loss', 'tone_up'
  difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
  duration_weeks INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. exercises
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_muscle_group VARCHAR(50), -- 'chest', 'arms', 'back', 'legs', 'core'
  equipment_needed VARCHAR(100),
  difficulty_level VARCHAR(20),
  video_url VARCHAR(500),
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. workout_sessions
```sql
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
  session_name VARCHAR(100),
  session_order INTEGER,
  exercises JSONB, -- Array of exercise objects with sets, reps, rest
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. user_workout_logs
```sql
CREATE TABLE user_workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workout_sessions(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER,
  notes TEXT,
  performance_data JSONB -- Track actual sets, reps, weights used
);
```

#### 8. nutrition_plans (Revised)
- Stores the overall strategy and settings for a user's nutrition plan.
```sql
CREATE TABLE nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL DEFAULT 'Adaptive Nutrition Plan',
  goal_type VARCHAR(50) NOT NULL, -- 'fat_loss', 'muscle_gain', 'maintenance'
  preferences JSONB, -- { "dietary": ["vegan"], "intolerances": ["gluten"] }
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 9. historical_nutrition_targets (New)
- Keeps a record of how the user's nutritional targets have changed over time.
```sql
CREATE TABLE historical_nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL if currently active
  daily_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,
  micronutrients_targets JSONB, -- { "vitamin_d_mcg": 20, "sodium_mg": 2300 }
  reasoning TEXT, -- AI-generated reason for the adjustment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 10. daily_user_metrics (New)
- Stores daily inputs from the user and wearables.
```sql
CREATE TABLE daily_user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  trend_weight_kg DECIMAL(5,2),
  sleep_hours DECIMAL(4,2),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  activity_calories INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);
```

#### 11. nutrition_log_entries (New)
- Logs every single food item a user consumes.
```sql
CREATE TABLE nutrition_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  food_name VARCHAR(200) NOT NULL,
  serving_size_grams INTEGER,
  calories INTEGER,
  protein_grams DECIMAL(5,1),
  carbs_grams DECIMAL(5,1),
  fat_grams DECIMAL(5,1),
  micronutrients JSONB -- { "vitamin_d_mcg": 5, "sodium_mg": 300 }
);
```

#### 12. progress_tracking (Revised - was 10)
```sql
CREATE TABLE progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  body_measurements JSONB, -- Chest, waist, arms, etc.
  body_fat_percentage DECIMAL(4,2),
  muscle_mass_kg DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 13. notifications (Revised - was 11)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50), -- 'workout_reminder', 'meal_log', 'photo_upload', 'milestone'
  title VARCHAR(100),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX idx_body_analysis_user_id ON body_analysis(user_id);
CREATE INDEX idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX idx_historical_targets_plan_id ON historical_nutrition_targets(nutrition_plan_id);
CREATE INDEX idx_daily_metrics_user_date ON daily_user_metrics(user_id, metric_date);
CREATE INDEX idx_nutrition_log_user_date ON nutrition_log_entries(user_id, logged_at);
CREATE INDEX idx_progress_tracking_user_id_date ON progress_tracking(user_id, tracking_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

## Project Folder Structure

```
GoFitAI/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication routes
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (main)/                   # Main app routes
│   │   ├── dashboard.tsx         # Main dashboard
│   │   ├── photo-upload.tsx      # Photo upload screen
│   │   ├── analysis.tsx          # AI analysis results
│   │   ├── workout/              # Workout related screens
│   │   │   ├── plans.tsx
│   │   │   ├── session.tsx
│   │   │   └── exercises.tsx
│   │   ├── nutrition/            # Nutrition related screens
│   │   │   ├── plan.tsx
│   │   │   ├── meal-log.tsx
│   │   │   └── tracking.tsx
│   │   ├── progress/             # Progress tracking screens
│   │   │   ├── timeline.tsx
│   │   │   ├── comparisons.tsx
│   │   │   └── analytics.tsx
│   │   └── settings/             # Settings screens
│   │       ├── profile.tsx
│   │       ├── preferences.tsx
│   │       └── notifications.tsx
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point
├── src/
│   ├── components/               # Reusable components
│   │   ├── ui/                   # UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── forms/                # Form components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── PhotoUploadForm.tsx
│   │   │   └── SettingsForm.tsx
│   │   ├── charts/               # Chart components
│   │   │   ├── ProgressChart.tsx
│   │   │   ├── BodyRatingChart.tsx
│   │   │   └── NutritionChart.tsx
│   │   └── workout/              # Workout specific components
│   │       ├── ExerciseCard.tsx
│   │       ├── WorkoutTimer.tsx
│   │       └── ProgressTracker.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSupabase.ts
│   │   ├── usePhotoUpload.ts
│   │   ├── useWorkout.ts
│   │   └── useNutrition.ts
│   ├── services/                 # API and external services
│   │   ├── supabase/             # Supabase related services
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── photos.ts
│   │   │   ├── workouts.ts
│   │   │   └── nutrition.ts
│   │   ├── ai/                   # AI processing services
│   │   │   ├── deepseek.ts
│   │   │   ├── bodyAnalysis.ts
│   │   │   └── recommendations.ts
│   │   └── storage/              # File storage services
│   │       ├── photoStorage.ts
│   │       └── videoStorage.ts
│   ├── utils/                    # Utility functions
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── types/                    # TypeScript type definitions
│   │   ├── user.ts
│   │   ├── workout.ts
│   │   ├── nutrition.ts
│   │   ├── analysis.ts
│   │   └── api.ts
│   ├── store/                    # State management
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── workoutStore.ts
│   │   └── nutritionStore.ts
│   └── styles/                   # Global styles
│       ├── theme.ts
│       ├── colors.ts
│       └── typography.ts
├── assets/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── videos/
├── docs/                         # Documentation
│   ├── CONTEXT.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example                  # Environment variables template
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── babel.config.js               # Babel configuration
└── README.md                     # Project documentation
```

## Core Features

### 1. User Authentication & Login

**User Flow:**
- Users open the app and are greeted with a login screen
- Authentication options:
  - Email-based  login
- Upon successful login, users are directed to the Dashboard

### 2. Dashboard (Primary User Interface)

**User Flow:**
The Dashboard serves as the main interface after login, providing access to:

- **Photo Upload**: Upload front-facing and back-facing body photos
- **Body Metrics Input**: Enter height and weight measurements
- **Goals Setup**: Define fitness objectives (e.g., "Build muscle," "Lose fat," "Tone up")

### 3. Photo Upload System

**User Flow:**
Users upload two high-quality body photos:

1. **Front-facing photo** (head to toe)
2. **Back-facing photo** (head to toe)

**Security:** All photos are stored securely in cloud storage for AI analysis.

### 4. AI Body Aesthetic Analysis

**AI Functionality:**

#### Body Part Identification
- AI identifies key body parts: chest, arms, back, legs, waist
- Comprehensive analysis of proportions and symmetry

#### Aesthetic Rating System
- Each body part receives a rating (1-10 scale)
- Example feedback:
  - "Your chest is well-defined with a rating of 7/10 for strength"
  - "Your arms have a rating of 5/10, suggesting room for improvement"

#### Strength & Weakness Analysis
- Identifies strongest and weakest body parts
- Provides balanced feedback: "Your chest is strong, but your arms need more focus to balance your upper body"
- Visual summary with radar charts or color-coded graphs

### 5. Progress Tracking & Change Detection

**User Flow:**
- Users upload new photos periodically (e.g., monthly)
- AI compares new photos with previous ones
- Tracks physical changes over time

**AI Comparison Features:**
- Evaluates differences between photo sets
- Tracks muscle gain, fat loss, and overall progress
- Provides before/after comparisons
- Generates progress reports

### 6. Personalized Workout Plans

**AI Functionality:**
Based on body aesthetics analysis and fitness goals, AI generates customized workout plans:

#### Plan Customization
- **Weak area focus**: Targets specific body parts needing improvement
- **Goal-oriented**: Adjusts intensity based on objectives (muscle gain, fat loss, toning)
- **Balanced approach**: Combines cardio and strength training as needed

#### Exercise Details
- Exercise name, sets, reps, and rest intervals
- Video demonstrations (short clips or GIFs)
- Proper form guidance

### 7. Advanced Adaptive Nutrition Planning

The app features a next-generation nutrition system that goes far beyond static meal plans. It functions as a dynamic and adaptive coach, making continuous adjustments based on a holistic view of the user's health and behavior.

#### A. Advanced Adaptive Macro and Micro Tracking System

- **Personalized Dynamic Nutrition Adjustments:** The plan begins with a baseline tailored to the user's goals. The system's core strength is its ability to dynamically adjust both macronutrient (protein, fats, carbohydrates) and micronutrient (vitamins, minerals) targets based on progress, activity levels from wearables, sleep patterns, and user-reported stress levels.
- **AI-Powered Adjustments:** The app continually monitors food intake, exercise routines, and health data to adjust nutrition goals on a weekly basis. For instance, if a user completes a high-intensity workout cycle, the app will automatically recommend an increase in calorie intake or specific macronutrient shifts to optimize recovery and performance.
- **Comprehensive Micronutrient Monitoring:** Beyond macros, the app tracks key micronutrients to ensure users meet their vitamin and mineral needs. It provides real-time alerts and actionable insights for potential deficiencies (e.g., low Vitamin D in winter, high sodium intake).

#### B. Real-Time Weight Tracking with Advanced Wearables Integration

- **Trend Weight Tracking:** Instead of relying on noisy daily weigh-ins, the system integrates with wearables (smartwatches, fitness trackers) to calculate a "trend weight." This metric is derived from daily weigh-ins, physical activity, and biological signals like hydration levels, body fat percentage, and muscle mass for a more accurate picture of the user's progress.
- **Predictive Weight Trends:** Using machine learning, the app predicts future weight changes based on past data and activity. This allows the system to make proactive adjustments to the user’s nutrition plan, suggesting changes *before* a user hits a plateau.
- **Advanced Health Data Integration:** Users can sync data from advanced health trackers that monitor metabolic markers. The system can factor this data into the nutrition plan, ensuring dietary recommendations are optimized for the user's internal metabolic and hormonal condition.

#### C. Smart Meal Planning & Recipe Suggestions

- **Personalized Meal Planning:** The AI-driven meal planner creates daily or weekly suggestions based on the user's goals, preferences, and dietary restrictions. The meal plan adjusts automatically each week in response to the user's progress and evolving nutritional needs.
- **Smart Recipe Generator:** Users can input ingredients they have at home, and the app will suggest recipes that fit their nutritional targets for the day, customized to meet calorie, macronutrient, and health goals (e.g., improving gut health, enhancing recovery).
- **Grocery Delivery Integration:** For added convenience, the app can partner with grocery delivery services (e.g., Instacart, Amazon Fresh) to allow users to order ingredients for recommended meals directly.

#### D. Behavioral Insights & Adaptive Coaching

- **Behavioral Tracking for Habit Formation:** The app analyzes *how* and *when* users eat, identifying patterns, emotional triggers (e.g., stress eating), and other habits that might impact progress.
- **Psychological Adaptation & Coaching:** When the app detects struggles like overeating or skipping meals, it provides personalized behavioral coaching. For instance, if it detects late-night snacking, it might suggest healthier alternatives or provide mindfulness exercises to manage cravings.
- **Adaptive Motivation System:** The app helps users stay motivated by setting progressive goals, tracking micro-progress, and offering regular, positive reinforcement and constructive feedback.

### 8. Motivation & Engagement

**User Flow:**
The app provides ongoing support and motivation:

#### Motivational Feedback
- Progress-based encouragement
- Example: "Great progress! Your arms have become more defined. Keep up the good work!"
- Constructive suggestions: "Your back is looking stronger, but try focusing more on leg exercises"

#### Daily Reminders
- Workout schedule reminders
- Meal logging prompts
- Photo upload reminders

#### Milestone Celebrations
- Goal achievement notifications
- Progress milestones: "You've gained 5 lbs of muscle!" or "You've lost 10 lbs!"

### 9. Progress Tracking & Analytics

**User Flow:**
Comprehensive progress monitoring system:

#### Timeline View
- Chronological progress entries
- Photo upload dates
- Workout completion tracking
- Body part rating changes

#### Visual Comparisons
- Side-by-side before/after photos
- Progress graphs and charts
- Weakest body part improvement tracking
- Overall progress visualization

### 10. Settings & Preferences

**User Flow:**
Customizable app experience:

#### Adjustable Preferences
- **Fitness goals**: Update objectives as needed
- **Diet preferences**: Vegan, keto, etc.
- **Notification settings**: Customize reminder frequency
- **Body metrics**: Update height, weight, and other measurements

## Future Enhancements

### Wearable Integration
- **Fitness tracker sync**: Fitbit, Apple Watch integration
- **Real-time data**: Steps, calories burned, heart rate
- **Dynamic adjustments**: Modify plans based on daily activity

### Advanced AI Features
- **Real-time workout feedback**: Form correction and exercise suggestions
- **Dynamic exercise recommendations**: Target weak areas during workouts
- **Enhanced body analysis**: More detailed aesthetic assessments

### 3D Body Modeling
- **3D body reconstruction**: Detailed body visualization
- **Muscle growth tracking**: Visual representation of progress
- **Fat reduction mapping**: Precise change detection
- **Aesthetic progress visualization**: Comprehensive before/after analysis

## Technical Architecture

### Security Considerations
- Secure photo storage and transmission
- User data privacy protection
- Encrypted authentication
- GDPR compliance

### AI/ML Components
- Computer vision for body analysis
- Machine learning for progress tracking
- Natural language processing for feedback generation
- Recommendation systems for workouts and nutrition

### Data Management
- Cloud storage for photos and user data
- Real-time synchronization
- Backup and recovery systems
- Data analytics for continuous improvement

---

*This document outlines the comprehensive feature set and user experience for GoFitAI, designed to provide users with AI-powered fitness guidance and progress tracking.* 