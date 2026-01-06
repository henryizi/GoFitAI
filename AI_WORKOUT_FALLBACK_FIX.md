# AI Workout Plan Fallback Issue - Fix Guide

## 🔍 Problem
The AI workout plan generation is falling back to rule-based plans instead of using Gemini AI. The logs show:
- `"provider": "rule_based_fallback"`
- `"usedAI": false`
- `"fallback_reason": "ai_unavailable"`

## 🎯 Root Cause
The `GEMINI_API_KEY` environment variable is likely **not set** in your Railway production environment, causing the server to skip AI generation and use fallback plans.

## ✅ Solution

### Step 1: Verify Your API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in and check your API key
3. Copy your API key

### Step 2: Set Environment Variable on Railway

**Option A: Using Railway CLI**
```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set the GEMINI_API_KEY
railway variables --set GEMINI_API_KEY=your_actual_api_key_here
```

**Option B: Using Railway Dashboard**
1. Go to [Railway Dashboard](https://railway.app/)
2. Select your GoFitAI project
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your actual Gemini API key
6. Click **Add**

### Step 3: Verify the Variable is Set
```bash
# Check Railway variables
railway variables
```

You should see `GEMINI_API_KEY` in the list.

### Step 4: Redeploy (if needed)
Railway should automatically redeploy when you add environment variables. If not:
```bash
railway up
```

Or trigger a redeploy from the Railway dashboard.

### Step 5: Test
1. Try generating a workout plan in your app
2. Check the response - it should show:
   - `"provider": "gemini_enhanced"` or `"gemini"`
   - `"usedAI": true`
   - `"system_info.ai_available": true`

## 🔧 Additional Checks

### Check Server Logs
```bash
railway logs --tail
```

Look for:
- `[AI SERVICE] Initializing Gemini Text Service` - ✅ Good
- `[AI SERVICE] Gemini API key not configured` - ❌ Bad (key not set)
- `[WORKOUT] ❌ AI generation failed:` - Check the error message

### Verify API Key Format
Your API key should:
- Start with `AIzaSy`
- Be about 39 characters long
- Not have any spaces or extra characters

### Check API Quota
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Dashboard**
3. Check if you've exceeded quota limits
4. If needed, increase quota or wait for reset

## 🐛 Troubleshooting

### Issue: Still getting fallback after setting key
1. **Wait 1-2 minutes** - Railway needs time to redeploy
2. **Check variable name** - Must be exactly `GEMINI_API_KEY` (case-sensitive)
3. **Check for typos** - No extra spaces or characters
4. **Restart service** - In Railway dashboard, click **Restart**

### Issue: API key invalid error
1. Verify key at [Google AI Studio](https://aistudio.google.com/)
2. Generate a new key if needed
3. Update Railway variable with new key

### Issue: Quota exceeded
1. Check [Google Cloud Console](https://console.cloud.google.com/)
2. Wait for quota reset (usually daily)
3. Consider upgrading your Google Cloud plan

## 📊 Expected Behavior After Fix

**Before (Fallback):**
```json
{
  "provider": "rule_based_fallback",
  "usedAI": false,
  "system_info": {
    "ai_available": false,
    "fallback_reason": "ai_unavailable"
  }
}
```

**After (AI Working):**
```json
{
  "provider": "gemini_enhanced",
  "usedAI": true,
  "system_info": {
    "ai_available": true,
    "fallback_used": false,
    "fallback_reason": null
  }
}
```

## 🚀 Quick Test Command

After setting the variable, test with:
```bash
node scripts/diagnose-ai-workout-issue.js
```

This will verify if the AI is working correctly.

---

**Last Updated:** 2025-12-11
**Status:** Ready to fix









