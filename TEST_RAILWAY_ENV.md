# 🔍 **RAILWAY ENVIRONMENT DIAGNOSTIC**

## Problem Identified
- **Error**: "Invalid API key" from `/api/log-daily-metric`
- **Root Cause**: Supabase credentials in Railway environment variables
- **Solution**: Verify and fix Railway environment variables

## 🧪 **Step 1: Check Current Railway Variables**

```bash
# Login to Railway (if not done already)
railway login

# Link to your project
railway link

# List all environment variables
railway variables
```

## 🎯 **Step 2: Required Environment Variables**

Your Railway deployment MUST have these exact variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://lmfdgnxertwrhbjhrcby.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY
DEEPSEEK_API_KEY=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
AI_PROVIDER=deepseek
NODE_ENV=production
PORT=4000
```

## 🚀 **Step 3: Fix Railway Variables (if needed)**

Run these commands one by one:

```bash
# Set Supabase URL
railway variables set EXPO_PUBLIC_SUPABASE_URL="https://lmfdgnxertwrhbjhrcby.supabase.co"

# Set Supabase Service Key  
railway variables set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"

# Set AI provider
railway variables set DEEPSEEK_API_KEY="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"
railway variables set AI_PROVIDER="deepseek"

# Force redeploy
railway up --detach
```

## 🧪 **Step 4: Test After Fix**

After Railway redeploys (2-3 minutes), test:

```bash
# This should work without "Invalid API key" error
curl -X POST "https://gofitai-production.up.railway.app/api/log-daily-metric" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "metricDate": "2025-08-24", "metrics": {"weight_kg": 70}}'

# Expected response: {"success": true, "data": {...}}
```

## 🎯 **Most Likely Issue**

The Railway variables might have:
1. **Wrong variable names** (missing `SUPABASE_SERVICE_KEY`)
2. **Truncated values** (environment variables got cut off)
3. **Wrong service key** (using anon key instead of service key)

## 📋 **Double-Check Variable Names**

Make sure Railway has EXACTLY these variable names:
- ✅ `EXPO_PUBLIC_SUPABASE_URL` 
- ✅ `SUPABASE_SERVICE_KEY` (NOT `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- ✅ `DEEPSEEK_API_KEY`
- ✅ `AI_PROVIDER`

The server code specifically looks for `SUPABASE_SERVICE_KEY`, not the anon key!



