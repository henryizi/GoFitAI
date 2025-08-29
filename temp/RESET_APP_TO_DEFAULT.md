# Reset GoFitAI App to Default State

## 🗑️ **Complete App Reset Guide**

### **Step 1: Clear Local Storage Data**

#### **Option A: Using React Native Debugger (Recommended)**
1. Open React Native Debugger
2. Go to Application tab
3. Select Local Storage
4. Clear all entries for your app
5. Refresh the app

#### **Option B: Using iOS Simulator**
1. In iOS Simulator, go to **Device** → **Erase All Content and Settings**
2. This will completely reset the simulator
3. Reinstall the app

#### **Option C: Using Physical Device**
1. Delete the app completely from your device
2. Reinstall the app fresh

### **Step 2: Clear AsyncStorage Data**

Run this in your development console or add a temporary reset function:

```javascript
// Add this temporarily to your app to clear all data
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('All data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Call this function once to reset everything
clearAllData();
```

### **Step 3: Clear Database Data (if connected)**

If you have database access, run these SQL commands:

```sql
-- Clear all user data (replace with actual user ID)
DELETE FROM workout_plans WHERE user_id = 'your-user-id';
DELETE FROM weight_logs WHERE user_id = 'your-user-id';
DELETE FROM body_fat_logs WHERE user_id = 'your-user-id';
DELETE FROM progress_photos WHERE user_id = 'your-user-id';
DELETE FROM user_profiles WHERE id = 'your-user-id';

-- Reset user profile to defaults
INSERT INTO user_profiles (id, name, email, goal_weight, height, age, gender, activity_level, created_at, updated_at)
VALUES ('your-user-id', 'Test User', 'test@example.com', 70, 170, 25, 'male', 'moderate', NOW(), NOW());
```

### **Step 4: Reset User Settings**

The app should automatically create default settings when first launched:

```javascript
// Default user settings
const defaultUser = {
  id: 'default-user-id',
  name: 'Test User',
  email: 'test@example.com',
  goal_weight: 70,
  height: 170,
  age: 25,
  gender: 'male',
  activity_level: 'moderate'
};
```

### **Step 5: Clear Server Cache (if applicable)**

If you're running a local server, restart it:

```bash
# Stop the server
Ctrl+C

# Clear any cached data
rm -rf node_modules/.cache

# Restart the server
npm start
```

## 🔄 **Manual Reset Steps**

### **1. Clear Workout Plans**
- Delete all existing workout plans
- Remove any saved AI-generated plans
- Clear plan history

### **2. Clear Analytics Data**
- Reset weight tracking data
- Clear body fat percentage logs
- Remove progress photos
- Reset all charts and metrics

### **3. Clear User Profile**
- Reset to default user settings
- Clear personal information
- Reset goals and preferences

### **4. Clear App State**
- Reset navigation state
- Clear any cached data
- Reset app preferences

## 📱 **Testing as New User**

### **What You Should See After Reset:**

1. **Home Screen**
   - Empty recent activities
   - Default user profile
   - No weight/body fat data
   - Empty charts

2. **Workout Plans**
   - No existing plans
   - "Create New Plan" option
   - Empty plan history

3. **Analytics**
   - Empty weight chart
   - Empty body fat chart
   - No progress photos
   - Default date ranges

4. **Settings**
   - Default user information
   - Default goals
   - Fresh app state

## 🎯 **Quick Reset Commands**

### **For Development Testing:**

```bash
# Clear React Native cache
npx react-native start --reset-cache

# Clear Metro bundler cache
npx react-native start --reset-cache

# Clear iOS build
cd ios && rm -rf build && cd ..

# Clear Android build
cd android && ./gradlew clean && cd ..
```

### **For Simulator Reset:**

```bash
# Reset iOS Simulator
xcrun simctl erase all

# Reset Android Emulator
adb shell pm clear com.yourapp.package
```

## ✅ **Verification Checklist**

After reset, verify these are cleared:

- [ ] No workout plans exist
- [ ] No weight tracking data
- [ ] No body fat data
- [ ] No progress photos
- [ ] No user preferences
- [ ] No cached data
- [ ] App shows default state
- [ ] All charts are empty
- [ ] Recent activities list is empty
- [ ] User profile shows defaults

## 🚀 **Ready for Testing**

Once reset is complete, you can:

1. **Test the complete user onboarding flow**
2. **Test AI workout plan generation from scratch**
3. **Test weight logging from zero**
4. **Test all features as a new user**
5. **Verify data persistence works correctly**
6. **Test the complete user journey**

## 📝 **Reset Confirmation**

After completing the reset:

- [ ] App launches to default state
- [ ] No existing data visible
- [ ] All features work as expected for new users
- [ ] Data persistence works when adding new information
- [ ] No errors or crashes occur

---

**Reset Date:** ___________  
**Reset Method:** ___________  
**Verification Status:** ___________


