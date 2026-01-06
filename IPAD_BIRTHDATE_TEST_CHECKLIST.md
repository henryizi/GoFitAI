# iPad Birthdate Picker Test Checklist

## Simulator Setup
✅ iPad Air 11-inch (M3) simulator is booted
✅ Expo development server is running

## Testing Steps

### 1. Launch App on iPad Simulator
- In the Expo terminal, press `i` to launch on iOS simulator
- Or select the iPad from the device list if prompted
- Wait for app to load

### 2. Navigate to Birthdate Screen
- **Option A:** Create a new account
  - Sign up with a test email
  - Go through onboarding: Name → Gender → **Birthday**
  
- **Option B:** If already logged in
  - Sign out first
  - Create new account to see onboarding

### 3. Test Birthdate Picker on iPad

#### Visual Checks:
- [ ] All three pickers (Month, Day, Year) are visible
- [ ] Picker labels are readable (not too small)
- [ ] Layout is centered and not stretched
- [ ] Preview text shows selected date clearly

#### Touch/Interaction Tests:
- [ ] **Month Picker:**
  - [ ] Can tap to select different months
  - [ ] Can scroll through months smoothly
  - [ ] Selected month is highlighted
  
- [ ] **Day Picker:**
  - [ ] Can tap to select different days
  - [ ] Can scroll through days smoothly
  - [ ] Selected day is highlighted
  
- [ ] **Year Picker:**
  - [ ] Can tap to select different years
  - [ ] Can scroll through years smoothly
  - [ ] Selected year is highlighted

#### Functionality Tests:
- [ ] Selecting a month updates the preview
- [ ] Selecting a day updates the preview
- [ ] Selecting a year updates the preview
- [ ] Preview shows correct date format (e.g., "January 15, 1990")
- [ ] "Continue" button is tappable
- [ ] Tapping "Continue" navigates to next screen
- [ ] Date is saved correctly (check in console/logs)

### 4. Compare with iPhone (Optional)
- [ ] Test on iPhone simulator to ensure no regression
- [ ] Verify iPhone layout still works correctly

## Expected Behavior (iPad)

### Layout:
- Picker row should be centered with max-width ~600px
- Spacing between pickers: 16px
- Picker height: 240px (vs 180px on iPhone)
- Item height: 60px (vs 50px on iPhone)

### Text Sizes:
- Picker labels: 14px (vs 12px on iPhone)
- Picker text: 20px (vs 16px on iPhone)
- Selected text: 24px (vs 18px on iPhone)

### Touch Targets:
- All picker items should be easily tappable
- No need to zoom or struggle to tap
- Smooth scrolling behavior

## Issues to Watch For

❌ **Picker not responding to taps**
- Check if `hitSlop` is working
- Verify `TouchableOpacity` is properly configured

❌ **Can't scroll pickers**
- Check if `scrollEnabled` is true
- Verify `nestedScrollEnabled` is set

❌ **Layout looks wrong**
- Check if `isTablet` detection is working
- Verify responsive styles are applied

❌ **Text too small**
- Verify font sizes are increased for iPad
- Check if labels are readable

## If Issues Found

1. **Check Console Logs:**
   - Look for any errors in Expo terminal
   - Check React Native debugger if enabled

2. **Verify Code:**
   - Check `app/(onboarding)/birthday.tsx`
   - Ensure `isTablet` is correctly detecting iPad
   - Verify all style changes are applied

3. **Test Different iPad Models:**
   - Try iPad Pro if available
   - Test different screen sizes

## Success Criteria

✅ All three pickers are tappable
✅ Scrolling works smoothly
✅ Selected values update correctly
✅ "Continue" button works
✅ Layout looks good on iPad
✅ No crashes or errors

---

**Note:** The rejection mentioned iPad Air (5th generation) with iPadOS 26.1. The iPad Air 11-inch (M3) simulator should be similar enough for testing. If possible, test on the exact device mentioned in the rejection.














