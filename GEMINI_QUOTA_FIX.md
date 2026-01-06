# Gemini API Quota Exceeded - Fix Guide

## 🔍 Problem
You're hitting the **free tier quota limit**: 20 requests per day per model for `gemini-2.5-flash`.

Error message:
```
[429 Too Many Requests] You exceeded your current quota
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
limit: 20, model: gemini-2.5-flash
```

## ✅ Solutions (Choose One)

### Option 1: Add Multiple Free API Keys (Recommended - Free)

**Best for:** Getting more requests without paying

**Steps:**
1. **Get more free API keys:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create 3-5 new API keys (each has separate 20/day quota)
   - Copy each key

2. **Add backup keys to Railway:**
   ```bash
   railway variables --set GEMINI_BACKUP_KEYS="key1,key2,key3,key4"
   ```
   
   Or in Railway Dashboard:
   - Go to Variables tab
   - Add variable: `GEMINI_BACKUP_KEYS`
   - Value: `key1,key2,key3,key4` (comma-separated, no spaces)

3. **The system will automatically:**
   - Rotate between keys when quota is exceeded
   - Use the key with most available quota
   - Switch to next key on 429 errors

**Result:** With 5 keys, you get **100 requests/day** (5 × 20)

---

### Option 2: Upgrade to Paid Google Cloud Plan

**Best for:** Production apps with high usage

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable billing
3. Set up a paid account
4. Your quota increases significantly:
   - **Free tier:** 20 requests/day
   - **Paid tier:** Much higher limits (varies by plan)

**Cost:** Pay-as-you-go, typically very affordable for moderate usage

---

### Option 3: Wait for Daily Reset

**Best for:** Temporary solution

- Quota resets daily (24 hours from first request)
- You can check reset time in the error message
- The system will automatically retry after reset

---

## 🚀 What I've Fixed

I've updated the code to **automatically rotate API keys** when a 429 error occurs:

1. **Automatic Key Rotation:** When quota is exceeded, the system will:
   - Detect 429 errors
   - Rotate to the next available API key
   - Retry the request automatically

2. **Smart Key Selection:** The system uses the key with the most available quota

## 📋 Quick Setup (Multiple Keys)

```bash
# 1. Get 5 free API keys from https://aistudio.google.com/app/apikey

# 2. Set them in Railway
railway variables --set GEMINI_API_KEY="your_primary_key"
railway variables --set GEMINI_BACKUP_KEYS="key2,key3,key4,key5"

# 3. Redeploy (automatic, or manually)
railway up
```

## 🧪 Test It

After adding backup keys, test with:
```bash
node scripts/diagnose-ai-workout-issue.js
```

You should see:
- Multiple keys loaded
- Automatic rotation on quota errors
- Successful AI generation

## 📊 Expected Behavior

**Before (Single Key):**
- 20 requests/day limit
- Falls back to rule-based after quota

**After (Multiple Keys):**
- 20 requests/day per key
- 5 keys = 100 requests/day total
- Automatic rotation when one key is exhausted
- Seamless experience for users

---

## 💡 Pro Tips

1. **Monitor Usage:** Check [Google AI Studio Usage](https://aistudio.google.com/app/apikey) to see quota usage
2. **Add More Keys:** You can add up to 10+ keys for even more capacity
3. **Key Rotation:** The system automatically uses the best available key
4. **Fallback:** If all keys are exhausted, it gracefully falls back to rule-based plans

---

**Last Updated:** 2025-12-11
**Status:** Code updated - Ready to add backup keys









