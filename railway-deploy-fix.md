# Railway Timeout Fix - Manual Steps

## Problem
Railway deployment is using an old version with 30-second timeout instead of the current 600-second (10-minute) timeout.

## Solution Options

### Option 1: Force Redeploy via Git Push
```bash
# Add a deployment trigger to force Railway to rebuild
echo "# Force redeploy $(date)" >> DEPLOY_TRIGGER.txt
git add DEPLOY_TRIGGER.txt
git commit -m "Force Railway redeploy - Fix timeout issue"
git push origin main
```

### Option 2: Railway Web Dashboard
1. Go to https://railway.app/dashboard
2. Select your GoFitAI project
3. Go to Settings → Environment Variables
4. Verify these variables exist (add if missing):
   - `AI_REQUEST_TIMEOUT=300000` (5 minutes in milliseconds)
   - `REQUEST_TIMEOUT=600` (10 minutes in seconds)
5. Go to Deployments tab
6. Click "Redeploy" on the latest deployment

### Option 3: Railway CLI (when ready)
```bash
railway login
railway variables set AI_REQUEST_TIMEOUT=300000
railway variables set REQUEST_TIMEOUT=600
railway up --detach
```

## Current Status
✅ Local server: 600-second timeout (working correctly)
❌ Railway deployment: 30-second timeout (needs fix)

## Expected Result
After redeployment, Railway should show:
```
[SERVER] Timeout configuration:
  - Request timeout: 600s
  - Keep-alive timeout: 610s  
  - Headers timeout: 620s
```

## Test Command
```bash
curl https://gofitai-production.up.railway.app/health
```
