# Tutorial Completion State Logic

## 📊 State Values

The `tutorial_completed` column in the `profiles` table has three possible values:

| Value | Meaning | When It Happens |
|-------|---------|----------------|
| `NULL` | User hasn't paid yet (or skipped paywall) | Default state, or user skipped paywall |
| `false` | User paid, needs to complete tutorial | Set when user completes purchase |
| `true` | User completed tutorial | Set when user finishes/skips tutorial |

---

## 🔄 State Flow

### Scenario 1: User Pays (Completes Paywall)

```
1. User signs up → tutorial_completed = NULL
2. User completes onboarding → tutorial_completed = NULL (unchanged)
3. User sees paywall → tutorial_completed = NULL (unchanged)
4. User purchases subscription → tutorial_completed = false ✅
5. User sees tutorial → tutorial_completed = false (unchanged)
6. User completes/skips tutorial → tutorial_completed = true ✅
```

**Code Location:** `src/components/subscription/PaywallScreen.tsx` (line 120)
```typescript
// Set tutorial_completed to false for new premium users
await supabase
  .from('profiles')
  .update({ tutorial_completed: false })
  .eq('id', user.id);
```

---

### Scenario 2: User Skips Paywall (Doesn't Pay)

```
1. User signs up → tutorial_completed = NULL
2. User completes onboarding → tutorial_completed = NULL (unchanged)
3. User sees paywall → tutorial_completed = NULL (unchanged)
4. User skips paywall → tutorial_completed = NULL ✅ (remains null)
5. User accesses app (free tier) → tutorial_completed = NULL (unchanged)
```

**Code Location:** No update happens when user skips - value remains `NULL`

---

### Scenario 3: User Completes Tutorial

```
1. User is premium → tutorial_completed = false
2. User sees tutorial screen → tutorial_completed = false (unchanged)
3. User completes tutorial → tutorial_completed = true ✅
```

**Code Location:** `src/contexts/TutorialContext.tsx` (line 408)
```typescript
const completeTutorial = useCallback(async () => {
  const { error } = await supabase
    .from('profiles')
    .update({ tutorial_completed: true })
    .eq('id', user.id);
  // ...
}, []);
```

---

## 🎯 Answer to Your Question

**Q: If user finishes paywall, does `tutorial_completed` turn into `false`?**

**A: YES ✅**
- When user **pays** (completes purchase), `tutorial_completed` is set to `false`
- This ensures they see the mandatory tutorial after becoming premium

**Q: If they don't pay, does it remain `null`?**

**A: YES ✅**
- When user **skips** paywall (doesn't pay), `tutorial_completed` remains `NULL`
- No update happens, so it stays in the default state

---

## 📋 Complete State Matrix

| User Action | tutorial_completed Value | Code Location |
|-------------|-------------------------|---------------|
| New user signup | `NULL` | Default in database |
| Complete onboarding | `NULL` (unchanged) | No update |
| Skip paywall | `NULL` (unchanged) | No update |
| **Purchase subscription** | **`false`** ✅ | `PaywallScreen.tsx:120` |
| Complete tutorial | `true` | `TutorialContext.tsx:408` |
| Skip tutorial | `true` | `TutorialContext.tsx:408` |

---

## 🔍 How It's Checked

**In `app/index.tsx` (line 579):**
```typescript
// Check if tutorial has been completed
// tutorial_completed is null by default, so we check if it's explicitly false or null
if (profile.tutorial_completed === false || profile.tutorial_completed === null) {
  console.log('🔍 User is premium but tutorial not completed, redirecting to tutorial');
  return <Redirect href="/(tutorial)" />;
}
```

**Logic:**
- If `tutorial_completed === false` → Show tutorial (user paid, needs tutorial)
- If `tutorial_completed === null` → Show tutorial (user is premium but state not set)
- If `tutorial_completed === true` → Skip tutorial (user completed it)

---

## 🎨 Visual Flow Diagram

```
┌─────────────────┐
│  New User       │
│  NULL           │
└────────┬────────┘
         │
         ├─── Skip Paywall ────┐
         │                     │
         │                     ▼
         │              ┌──────────────┐
         │              │ Skip Paywall │
         │              │ NULL         │
         │              │ (Free User)  │
         │              └──────────────┘
         │
         └─── Purchase ────┐
                           │
                           ▼
                    ┌──────────────┐
                    │ Paid User    │
                    │ false        │
                    │ (Needs       │
                    │  Tutorial)   │
                    └──────┬───────┘
                           │
                           ├─── Complete Tutorial ────┐
                           │                          │
                           └─── Skip Tutorial ────────┼───┐
                                                      │   │
                                                      ▼   ▼
                                               ┌──────────────┐
                                               │ Tutorial     │
                                               │ Completed    │
                                               │ true         │
                                               └──────────────┘
```

---

## 💡 Key Points

1. **`NULL` = Default state** (user hasn't paid or skipped paywall)
2. **`false` = User paid** (set when purchase completes, triggers tutorial)
3. **`true` = Tutorial done** (set when user completes/skips tutorial)
4. **Only premium users** see the tutorial (checked in `app/index.tsx`)
5. **Free users** (who skipped) never have `tutorial_completed` updated

---

## 🧪 Testing Scenarios

### Test 1: User Pays
```sql
-- Before purchase
SELECT tutorial_completed FROM profiles WHERE id = 'user-id';
-- Result: NULL

-- After purchase (in PaywallScreen.tsx)
UPDATE profiles SET tutorial_completed = false WHERE id = 'user-id';

-- After tutorial completion
UPDATE profiles SET tutorial_completed = true WHERE id = 'user-id';
```

### Test 2: User Skips
```sql
-- Before skip
SELECT tutorial_completed FROM profiles WHERE id = 'user-id';
-- Result: NULL

-- After skip (no update happens)
SELECT tutorial_completed FROM profiles WHERE id = 'user-id';
-- Result: NULL (unchanged)
```

---

**Last Updated:** 2025-12-11
**Status:** Complete documentation









