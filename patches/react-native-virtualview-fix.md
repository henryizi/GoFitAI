# React Native VirtualView Pattern Matching Fix

## Issue
React Native 0.81.4 includes experimental pattern matching syntax in VirtualView.js that causes syntax errors.

## Fix Applied
Changed pattern matching syntax to switch statement in:
`node_modules/react-native/src/private/components/virtualview/VirtualView.js`

```diff
- match (mode) {
-   VirtualViewMode.Visible => {
+ switch (mode) {
+   case VirtualViewMode.Visible: {
      setState(NotHidden);
      emitModeChange?.();
+     break;
    }
-   VirtualViewMode.Prerender => {
+   case VirtualViewMode.Prerender: {
      startTransition(() => {
        setState(NotHidden);
        emitModeChange?.();
      });
+     break;
    }
-   VirtualViewMode.Hidden => {
+   case VirtualViewMode.Hidden: {
      const {height} = event.nativeEvent.targetRect;
      startTransition(() => {
        setState(height as HiddenHeight);
        emitModeChange?.();
      });
+     break;
    }
  }
```

## Notes
- This fix needs to be reapplied after `npm install` or `node_modules` cleanup
- Consider creating a patch-package patch for permanent solution
