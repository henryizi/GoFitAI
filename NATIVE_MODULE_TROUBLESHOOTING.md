# Native StoreKit Module Troubleshooting

## Issue: Native Module Not Detected

If the app is not fetching products directly from App Store Connect, the native module might not be properly linked.

## Check Console Logs

When you refresh the paywall, look for these logs:

### If Module is Available:
```
[StoreKitDirect] ✅ Native module is available!
[StoreKitDirect] 🍎 Fetching products directly from App Store Connect using StoreKit 2...
```

### If Module is NOT Available:
```
[StoreKitDirect] ⚠️ Native module not found!
[StoreKitDirect] ⚠️ This means the native module is not properly linked.
```

## Solution: Add Files to Xcode Project

The native module files exist, but they need to be added to the Xcode project:

### Step 1: Open Xcode Project
1. Open `ios/GoFitAI.xcworkspace` in Xcode (NOT `.xcodeproj`)
2. Wait for Xcode to finish indexing

### Step 2: Add Swift File
1. In Xcode, right-click on the `GoFitAI` folder (in the left sidebar)
2. Select "Add Files to 'GoFitAI'..."
3. Navigate to `ios/GoFitAI/StoreKitDirectFetcher.swift`
4. Make sure these options are checked:
   - ✅ "Copy items if needed" (if not already in project)
   - ✅ "Create groups" (not "Create folder references")
   - ✅ Target: "GoFitAI" is checked
5. Click "Add"

### Step 3: Add Objective-C Bridge File
1. Right-click on the `GoFitAI` folder again
2. Select "Add Files to 'GoFitAI'..."
3. Navigate to `ios/GoFitAI/StoreKitDirectFetcher.m`
4. Make sure Target: "GoFitAI" is checked
5. Click "Add"

### Step 4: Verify Files Are Added
1. In Xcode, you should see both files in the project navigator:
   - `StoreKitDirectFetcher.swift`
   - `StoreKitDirectFetcher.m`
2. Click on each file - they should open without errors

### Step 5: Rebuild
1. In Xcode, press `Cmd+Shift+K` to clean build folder
2. Press `Cmd+B` to build
3. Press `Cmd+R` to run

## Alternative: Use Expo Development Build

If you're using Expo, you might need to create a development build:

```bash
npx expo run:ios
```

This will automatically:
- Add the native files to the project
- Build the app
- Run it

## Verify It's Working

After rebuilding, when you refresh the paywall, you should see:
```
[StoreKitDirect] ✅ Native module is available!
[StoreKitDirect] 🍎 Fetching products directly from App Store Connect...
[StoreKitDirect] ✅ Successfully fetched X products
```

If you still see "Native module not found", the files aren't properly linked in Xcode.



