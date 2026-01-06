# Fix Xcode File Reference Error

## Problem
Xcode is looking for the file at the wrong path:
- ❌ Wrong: `/Users/ngkwanho/Desktop/GoFitAI/ios/StoreKitDirectFetcher.swift`
- ✅ Correct: `/Users/ngkwanho/Desktop/GoFitAI/ios/GoFitAI/StoreKitDirectFetcher.swift`

## Solution: Remove and Re-add Files in Xcode

### Step 1: Remove Old File References
1. Open `ios/GoFitAI.xcworkspace` in Xcode
2. In the left sidebar (Project Navigator), look for:
   - `StoreKitDirectFetcher.swift` (might be in wrong location)
   - `StoreKitDirectFetcher.m` (might be in wrong location)
3. **Right-click** on each file → **Delete**
4. When asked, choose **"Remove Reference"** (NOT "Move to Trash")
   - This removes it from the project but keeps the file on disk

### Step 2: Add Files from Correct Location
1. In Xcode, right-click on the **`GoFitAI`** folder (in the left sidebar)
2. Select **"Add Files to 'GoFitAI'..."**
3. Navigate to: `ios/GoFitAI/`
4. Select **both files**:
   - `StoreKitDirectFetcher.swift`
   - `StoreKitDirectFetcher.m`
5. Make sure these options are checked:
   - ✅ **"Copy items if needed"** (uncheck if files are already in project folder)
   - ✅ **"Create groups"** (not "Create folder references")
   - ✅ **Target: "GoFitAI"** is checked
6. Click **"Add"**

### Step 3: Verify Files Are Added Correctly
1. In Xcode Project Navigator, you should see:
   ```
   GoFitAI/
     ├── StoreKitDirectFetcher.swift
     ├── StoreKitDirectFetcher.m
     └── ... (other files)
   ```
2. Click on each file - they should open without errors
3. The file path should show: `GoFitAI/StoreKitDirectFetcher.swift` (not `ios/StoreKitDirectFetcher.swift`)

### Step 4: Clean and Rebuild
1. Press `Cmd+Shift+K` (Clean Build Folder)
2. Press `Cmd+B` (Build)
3. The error should be gone!

## Alternative: Quick Fix in Xcode

If you see the file in the wrong location in Xcode:
1. Select the file in Project Navigator
2. In the right sidebar (File Inspector), check the "Location" path
3. If it's wrong, click the folder icon next to the path
4. Navigate to the correct file: `ios/GoFitAI/StoreKitDirectFetcher.swift`
5. Click "Choose"



