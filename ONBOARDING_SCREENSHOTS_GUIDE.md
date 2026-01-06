# 📸 Onboarding Screenshots Guide

This guide helps you capture screenshots of the current app UI for the onboarding flow.

## Required Screenshots

### 1. AI-Powered Workout Plans
**File:** `ai-workout-plans.png`  
**Screen to Capture:** `app/(main)/workout/ai-custom-plan.tsx`  
**What to show:** The AI workout plan generation screen with goal selection and frequency options

### 2. Smart Food Tracking
**File:** `smart-food-tracking.png`  
**Screen to Capture:** `app/(main)/nutrition/log-food.tsx` or `app/(modals)/nutrition/food-camera.tsx`  
**What to show:** The food camera/photo analysis screen showing AI food recognition

### 3. Intelligent Meal Plans
**File:** `intelligent-meal-plans.png`  
**Screen to Capture:** `app/(main)/nutrition/plan.tsx` or `app/(main)/nutrition/index.tsx`  
**What to show:** The meal plan interface with daily meal suggestions

### 4. Progress Analytics
**File:** `progress-analytics.png`  
**Screen to Capture:** `app/(main)/progress/index.tsx` or `app/(main)/workout/progression-insights.tsx`  
**What to show:** Progress charts, analytics, and tracking data

### 5. Custom Workout Builder
**File:** `custom-workout-builder.png`  
**Screen to Capture:** `app/(main)/workout/plan-create.tsx` or `app/(main)/workout/plan-create-manual.tsx`  
**What to show:** The custom workout builder interface with exercise selection

### 6. AI Coach
**File:** `ai-coach.png`  
**Screen to Capture:** `app/(main)/dashboard.tsx`  
**What to show:** The dashboard with AI Coach header showing personalized greetings and insights

## How to Take Screenshots

### On iOS Simulator:
1. Open the app in iOS Simulator
2. Navigate to the screen you want to capture
3. Press `Cmd + S` to save screenshot
4. Or use Device → Screenshot menu

### On Physical Device:
1. Navigate to the screen
2. Press `Power + Volume Up` (iPhone X and later)
3. Or `Power + Home` (iPhone 8 and earlier)
4. Screenshot will be saved to Photos

### On Android:
1. Navigate to the screen
2. Press `Power + Volume Down`
3. Screenshot will be saved to Gallery

## File Naming Convention

Save screenshots with these exact names in `assets/images/onboarding/`:
- `ai-workout-plans.png`
- `smart-food-tracking.png`
- `intelligent-meal-plans.png`
- `progress-analytics.png`
- `custom-workout-builder.png`
- `ai-coach.png`

## Screenshot Requirements

- **Resolution:** At least 1242x2688 (iPhone 14 Pro Max) or equivalent
- **Format:** PNG format
- **Orientation:** Portrait (vertical)
- **Content:** Show the actual UI with real data if possible
- **Quality:** High resolution, clear text

## After Taking Screenshots

1. Copy all screenshots to `assets/images/onboarding/`
2. Ensure file names match exactly
3. The code will automatically use these screenshots



