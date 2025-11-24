# 🩹 AI Nutrition "Missing Weight" Fix

## Problem Discovered

When users completed onboarding and tried to generate an AI nutrition plan, the AI would say "weight is missing" or "height is missing" even though the user filled in this information during onboarding.

## Root Cause

**Column Name Mismatch** between onboarding and AI nutrition service:

### What Onboarding Saves:
- `weight_kg` (from `app/(onboarding)/weight.tsx`)
- `height_cm` (from `app/(onboarding)/height.tsx`)

### What AI Service Was Reading:
- `weight` ❌ (old/legacy column)
- `height` ❌ (old/legacy column)

### Database Schema Has BOTH:
```sql
CREATE TABLE profiles (
  ...
  height NUMERIC,        -- Legacy, not used by onboarding
  weight NUMERIC,        -- Legacy, not used by onboarding
  height_cm NUMERIC,     -- ✅ Used by onboarding
  weight_kg NUMERIC,     -- ✅ Used by onboarding
  ...
);
```

## The Fix

### 1. Updated `AInutritionService.ts`

Added normalization in `fetchUserProfile()`:

```typescript
// Normalize profile data to handle both old and new column names
const profile = data as any;
return {
  ...profile,
  // Use weight_kg if available, fallback to weight
  weight: profile.weight_kg || profile.weight,
  // Use height_cm if available, fallback to height
  height: profile.height_cm || profile.height,
} as UserProfile;
```

### 2. Updated `server/index.js`

Added normalization in the AI nutrition endpoint:

```javascript
// Normalize profile data to handle both old and new column names
const weight = profile.weight_kg || profile.weight;
const height = profile.height_cm || profile.height;

console.log('[AI NUTRITION TARGETS] Normalized data - weight:', weight, 'height:', height);
```

### 3. Added Enhanced Logging

To help diagnose future issues:
- Log received profile data (JSON)
- Log which fields are present/missing
- Log normalized weight/height values

## Impact

### ✅ Before Fix:
- Onboarding saved to `weight_kg: 75`
- AI service read from `weight: null`
- Result: "Weight: Not specified" ❌

### ✅ After Fix:
- Onboarding saves to `weight_kg: 75`
- AI service reads `weight_kg || weight` = 75 ✅
- Result: "Weight: 75 kg" ✅

## Testing

Run the test script to verify:
```bash
node test-ai-nutrition-backend.js
```

Expected output:
```
✅ AI Nutrition Generation SUCCESSFUL!
📈 Generated Nutrition Targets:
  • Weight: 75 kg
  • Height: 178 cm
  • All fields present
```

## Deployment

```bash
git add -A
git commit -m "Fix: Use weight_kg and height_cm columns from onboarding"
railway up
```

## Future Prevention

To prevent similar issues:

1. **Standardize Column Names** - Choose one naming convention:
   - Option A: Always use `weight_kg` and `height_cm`
   - Option B: Always use `weight` and `height`

2. **Update All References** - If we choose to standardize:
   - Update database schema (remove legacy columns or add migration)
   - Update all services to use same column names
   - Update TypeScript interfaces

3. **Add Validation** - In onboarding completion:
   - Verify all required fields are saved
   - Show error if save fails
   - Don't mark onboarding complete until all data is confirmed

## Related Files

- ✅ `src/services/nutrition/AInutritionService.ts` - Fixed
- ✅ `server/index.js` - Fixed
- 📄 `app/(onboarding)/weight.tsx` - Uses `weight_kg`
- 📄 `app/(onboarding)/height.tsx` - Uses `height_cm`
- 📄 `supabase-setup-complete.sql` - Has both column sets

## Status

**✅ FIXED AND DEPLOYED**

Users can now successfully generate AI nutrition plans with their complete profile data!


