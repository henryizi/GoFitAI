# Gemini 503 Service Overloaded - Complete Fix Guide

## Problem
Your GoFitAI server is experiencing **503 Service Unavailable** errors from Gemini API. This happens when:
- Gemini's free tier is overloaded
- Too many requests in a short time
- API quota limits are reached

## ✅ Solution Implemented

### 1. **Improved Retry Logic** (Already Applied)
Updated `/server/services/geminiTextService.js` with:
- **Increased retry attempts**: 2 → 3 attempts
- **Longer delays for 503 errors**: 
  - Base delay: 10 seconds (was 3s)
  - Max delay: 30 seconds (was 15s)
  - Exponential backoff: 10s → 20s → 30s
  - Random jitter: 0-2 seconds to prevent thundering herd

### 2. **How It Works**
```javascript
// Retry sequence for 503 errors:
Attempt 1: Immediate request
Attempt 2: Wait 10-12 seconds, retry
Attempt 3: Wait 20-22 seconds, retry
If all fail: Returns error to user
```

### 3. **Multiple API Key Support** (Optional)
Your system already supports multiple Gemini API keys via `/server/services/apiKeyManager.js`.

**To add backup keys:**

1. **Local Development:**
   Create a `.env` file in `/server` directory:
   ```bash
   GEMINI_API_KEY=your_primary_key
   GEMINI_BACKUP_KEYS=backup_key_1,backup_key_2,backup_key_3
   ```

2. **Railway Production:**
   ```bash
   # Add backup keys
   railway variables set GEMINI_BACKUP_KEYS="key1,key2,key3"
   ```

**Get Free Gemini API Keys:**
- Go to: https://aistudio.google.com/app/apikey
- Click "Create API Key"
- Create 3-5 free keys (each has separate quota)
- Add them as comma-separated values

### 4. **Alternative: Use OpenRouter** (Recommended)

OpenRouter provides access to multiple AI models with better reliability:

**Step 1: Get OpenRouter API Key**
1. Visit: https://openrouter.ai/
2. Sign up for free account
3. Go to Keys section
4. Create new API key

**Step 2: Add to Railway**
```bash
railway variables set OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

**Step 3: Enable OpenRouter in Server**
Your code at `/server/services/openRouterClient.js` is already set up! The server will automatically use it as a fallback when Gemini fails.

### 5. **Check Current Status**

**View Server Logs:**
```bash
# Local
cd /Users/ngkwanho/Desktop/GoFitAI/server
tail -f server_local.log

# Railway
railway logs
```

**Look for:**
- `[GEMINI TEXT] ⚠️ Retryable error` - Shows retry attempts
- `[GEMINI TEXT] 🚀 IMPROVED 503 HANDLING` - Confirms new fix is active
- `Service unavailable (503): true` - Confirms 503 detection

### 6. **Testing the Fix**

**Test locally:**
```bash
cd /Users/ngkwanho/Desktop/GoFitAI/server
npm start
```

**Test specific endpoint:**
```bash
# Test recipe generation
curl -X POST http://localhost:3000/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "lunch",
    "targets": {"calories": 500, "protein": 30, "carbs": 50, "fat": 20},
    "ingredients": ["chicken", "rice", "broccoli"]
  }'
```

## 🚀 Deployment

**Deploy to Railway:**
```bash
cd /Users/ngkwanho/Desktop/GoFitAI
git add server/services/geminiTextService.js
git commit -m "fix: improved 503 retry logic with longer delays"
git push origin main
```

Railway will automatically redeploy with the new fix.

## 📊 Expected Behavior

### Before Fix:
```
[GEMINI TEXT] Attempt 1/2
[GEMINI TEXT] Error: 503 Service Unavailable
[GEMINI TEXT] Retrying in 3000ms...
[GEMINI TEXT] Attempt 2/2
[GEMINI TEXT] Error: 503 Service Unavailable
❌ ALL ATTEMPTS FAILED
```

### After Fix:
```
[GEMINI TEXT] Attempt 1/3
[GEMINI TEXT] Error: 503 Service Unavailable
[GEMINI TEXT] 🚀 IMPROVED 503 HANDLING: Longer delays for overloaded service
[GEMINI TEXT] Retrying in 10234ms...
[GEMINI TEXT] Attempt 2/3
✅ Success on attempt 2
```

## 🔍 Monitoring

**Check API Key Usage:**
```javascript
// In your server logs, look for:
[API KEY] Low quota remaining for key 1: 5 requests
[API KEY] Rotating to next key...
```

**API Key Stats Endpoint:**
Your server exposes key statistics. Check current quota:
```bash
curl http://localhost:3000/api/health
```

## 📱 User Experience

**What users see:**
- **Before**: Immediate error "Failed to generate recipe"
- **After**: 
  - First attempt: Instant if Gemini is available
  - If 503: Waits 10-30s automatically retrying
  - Users see loading spinner (no error unless all retries fail)

## 🎯 Recommendations

### Short-term (Immediate):
1. ✅ Deploy the improved retry logic (already done in code)
2. Add 2-3 backup Gemini API keys
3. Monitor Railway logs for 503 patterns

### Mid-term (This Week):
1. Set up OpenRouter API key ($5 credit = ~50k requests)
2. Add monitoring alerts for 503 errors
3. Consider caching common responses

### Long-term (Optional):
1. Implement request queuing for high traffic
2. Add response caching with Redis
3. Upgrade to Gemini Pro (paid tier) for higher limits

## 🆘 Troubleshooting

**Still getting 503 errors?**

1. **Check your API key is valid:**
   ```bash
   railway variables | grep GEMINI_API_KEY
   ```

2. **Try a different Gemini model:**
   ```bash
   railway variables set GEMINI_MODEL="gemini-1.5-flash-latest"
   ```

3. **Enable OpenRouter fallback:**
   ```bash
   railway variables set OPENROUTER_API_KEY="your-key"
   ```

4. **Check Gemini API Status:**
   - Visit: https://status.cloud.google.com/

## 📞 Support

**Get Help:**
- Gemini API Docs: https://ai.google.dev/docs
- OpenRouter Docs: https://openrouter.ai/docs
- Railway Status: https://railway.app/status

---

**Last Updated:** October 6, 2025
**Version:** 1.0.0
**Status:** ✅ Fix Applied, Ready for Deployment





