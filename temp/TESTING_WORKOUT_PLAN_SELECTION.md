# Workout Plan Selection Testing Guide

## 🎯 **Specific Test Cases for Plan Selection**

### **Test Case 1: Basic Plan Selection**
1. Navigate to Workout Plans screen
2. Look for plans that are NOT marked as "ACTIVE PLAN"
3. Tap the "SELECT PLAN" button on any non-active plan
4. **Expected Result**: 
   - Plan should immediately show "ACTIVE PLAN" badge
   - Other plans should no longer show "ACTIVE PLAN"
   - Success message should appear: "Plan activated successfully!"
   - Button should disappear from the newly active plan

### **Test Case 2: Switching Between Plans**
1. Select Plan A as active
2. Then select Plan B as active
3. **Expected Result**:
   - Plan A should lose "ACTIVE PLAN" status
   - Plan B should gain "ACTIVE PLAN" status
   - Only one plan should be active at a time

### **Test Case 3: Active Plan Button Visibility**
1. Look at a plan marked as "ACTIVE PLAN"
2. **Expected Result**: Should NOT show "SELECT PLAN" button
3. Look at non-active plans
4. **Expected Result**: Should show "SELECT PLAN" button

### **Test Case 4: Database Integration**
1. Select a plan with a valid UUID (database plan)
2. Check server logs for API call
3. **Expected Result**: Should see `/api/set-active-plan` call in logs
4. Select a plan with non-UUID ID (local plan)
5. **Expected Result**: Should only update local storage, no API call

### **Test Case 5: Error Handling**
1. Turn off internet connection
2. Try to select a database plan
3. **Expected Result**: Should still work with local storage fallback
4. Check console for warning messages about database failure

### **Test Case 6: UI Responsiveness**
1. Rapidly tap "SELECT PLAN" on different plans
2. **Expected Result**: Should handle rapid taps gracefully
3. Check for any UI freezing or lag

### **Test Case 7: Data Persistence**
1. Select a plan as active
2. Close the app completely
3. Reopen the app
4. **Expected Result**: Same plan should still be marked as active

### **Test Case 8: Analytics Tracking**
1. Select a plan
2. Check analytics/console for tracking event
3. **Expected Result**: Should see "workout_plan_activated" event

## 🔍 **What to Look For**

### **Visual Indicators**
- ✅ Orange gradient button with check icon
- ✅ "ACTIVE PLAN" badge on selected plan
- ✅ Button disappears from active plan
- ✅ Button appears on non-active plans
- ✅ Success message appears briefly

### **Functional Behavior**
- ✅ Only one plan can be active at a time
- ✅ Selection updates immediately
- ✅ Data persists across app restarts
- ✅ Works with both local and database plans

### **Error Scenarios**
- ✅ Network failures don't break functionality
- ✅ Invalid plan IDs are handled gracefully
- ✅ Database errors don't crash the app

## 🐛 **Common Issues to Watch For**

1. **Multiple Active Plans**: More than one plan showing "ACTIVE PLAN"
2. **Button Not Appearing**: "SELECT PLAN" button missing on non-active plans
3. **Selection Not Sticking**: Plan loses active status after app restart
4. **UI Lag**: Slow response when tapping select button
5. **Missing Success Message**: No confirmation when plan is selected
6. **Database Sync Issues**: Active status not syncing to server

## 📝 **Testing Notes Template**

```
Test Date: ___________
Device: ___________
iOS Version: ___________

Test Results:
□ Plan selection works correctly
□ Only one plan active at a time
□ UI updates immediately
□ Success message appears
□ Data persists after restart
□ Works offline
□ Database sync works

Issues Found:
- Issue 1: ___________
- Issue 2: ___________
- Issue 3: ___________

Additional Notes:
___________
```

## 🎯 **Quick Test Checklist**

- [ ] Can select non-active plans
- [ ] Active plan shows correct badge
- [ ] Other plans lose active status
- [ ] Success message appears
- [ ] Button disappears from active plan
- [ ] Selection persists after app restart
- [ ] Works with database plans
- [ ] Works with local plans
- [ ] Handles network errors gracefully
- [ ] No UI freezing or lag


