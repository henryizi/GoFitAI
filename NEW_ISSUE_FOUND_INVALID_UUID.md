# 🚨 NEW ISSUE DISCOVERED: Invalid UUID in split_id

## Error Details
```
ERROR [WorkoutService] Error fetching sessions (retry):
  "invalid input syntax for type uuid: \"server-1761201554466\""
```

Location: `WorkoutService.ts:460` during retry query

## Root Cause Analysis

The error indicates that `split_id` contains `"server-1761201554466"` instead of a valid UUID.

### Pattern Found
The value `"server-1761201554466"` matches the pattern from `test_api.js`:
```javascript
userId: 'test-user-' + Date.now()  // Generates "test-user-1761201554466"
```

**BUT** - in this case it's showing `"server-1761201554466"`, not `"test-user-1761201554466"`.

### Hypothesis
The `training_splits.id` is being returned with an invalid value instead of a proper UUID. This could happen if:

1. **Supabase mock/dev environment issue** - The database is returning server-generated IDs incorrectly
2. **Bad data in database** - Existing training_splits have malformed IDs
3. **API interceptor** - Something is modifying the response before it reaches the code
4. **Offline/stub mode** - Supabase client is in stub mode and generating fake IDs

## Solution

### Option 1: Verify Database Connectivity (RECOMMENDED)
Check if Supabase is properly connected:

```typescript
// In WorkoutService.ts, add validation
if (!supabase) {
  console.error('[WorkoutService] Supabase is not properly initialized!');
  // Use mock data or throw error
}

// Validate the split_id before using it in a query
if (!planId || !isValidUUID(planId)) {
  console.error('[WorkoutService] Invalid plan ID:', planId);
  return [];
}
```

### Option 2: Add UUID Validation
Add validation before using any UUID in queries:

```typescript
function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && uuidRegex.test(value);
}
```

### Option 3: Add Logging to Track Source
Add detailed logging to identify where the bad ID comes from:

```typescript
console.log('[SAVE PLAN] restSplit data:', restSplit);
console.log('[SAVE PLAN] restSplit.id type:', typeof restSplit.id);
console.log('[SAVE PLAN] restSplit.id value:', restSplit.id);

// Then check it's valid
if (restSplit.id && !isValidUUID(restSplit.id)) {
  console.error('[SAVE PLAN] Invalid UUID returned:', restSplit.id);
  // Handle error or use fallback
}
```

## Recommended Action

1. **Add UUID validation function** to `src/services/workout/WorkoutService.ts`
2. **Add logging** in `server/index.js` around lines 3055-3072 to log the actual split.id value received
3. **Test with valid user authentication** to ensure Supabase isn't in stub/dev mode

## Files to Check/Modify

1. `server/index.js` - Lines 3055-3072 (rest day split creation)
2. `src/services/workout/WorkoutService.ts` - Line 460 (error logging)
3. `src/services/workout/WorkoutService.ts` - Lines 407-477 (getSessionsForPlan method)

## Expected Fix

Once this is fixed:
- ✅ All split_ids will be proper UUIDs
- ✅ Queries will work without "invalid input syntax" errors
- ✅ Sessions and history will load correctly
