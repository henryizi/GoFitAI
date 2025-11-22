# 🚂 Railway Deployment Guide for GoFitAI

## Overview
This guide walks you through deploying the GoFitAI backend server to Railway.

---

## Prerequisites

✅ **Already Installed:**
- Railway CLI (`/usr/local/bin/railway`)
- Node.js and npm
- Git repository initialized

⚠️ **Need to Configure:**
- Railway account login
- Environment variables
- Database connections

---

## Quick Deploy (5 Minutes)

### Step 1: Login to Railway
```bash
railway login
```
This will open your browser for authentication.

### Step 2: Initialize Railway Project
```bash
# Navigate to project root
cd /Users/ngkwanho/Desktop/GoFitAI

# Link to existing project OR create new one
railway link
# OR create new:
# railway init
```

### Step 3: Set Environment Variables
```bash
# Required for GoFitAI to work
railway variables set GEMINI_API_KEY="your-gemini-api-key"
railway variables set SUPABASE_URL="your-supabase-url"
railway variables set SUPABASE_SERVICE_KEY="your-supabase-service-key"
railway variables set NODE_ENV="production"

# Optional (Railway provides PORT automatically)
# railway variables set PORT=4000
```

### Step 4: Deploy!
```bash
railway up
```

### Step 5: Verify Deployment
```bash
# Get your deployment URL
railway domain

# Test the health endpoint
curl https://your-app.railway.app/api/health
```

---

## Detailed Configuration

### 1. Railway Configuration File

Your project already has `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Server Entry Point

Railway will run: `node server/index.js`

Your server is configured to use `process.env.PORT` which Railway provides automatically.

### 3. Environment Variables Required

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for AI features | `AIzaSy...` |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Supabase service role key | `eyJhbG...` |
| `SUPABASE_ANON_KEY` | ⚠️ Optional | Supabase anonymous key | `eyJhbG...` |
| `NODE_ENV` | ⚠️ Optional | Set to `production` | `production` |
| `PORT` | ❌ No (Auto) | Railway provides this automatically | `4000` |

### 4. Setting Environment Variables via Dashboard

1. Go to https://railway.app/dashboard
2. Select your project
3. Click on your service
4. Go to "Variables" tab
5. Add each variable with its value
6. Click "Deploy" to apply changes

---

## Deployment Methods

### Method 1: CLI Deployment (Recommended)
```bash
# Deploy current code
railway up

# Watch logs in real-time
railway logs
```

### Method 2: GitHub Integration (Best for CI/CD)
1. Connect your GitHub repository in Railway dashboard
2. Select branch (e.g., `main`)
3. Railway will auto-deploy on every push

**Enable automatic deploys:**
```bash
# In Railway dashboard:
# Settings > Deploy > Automatic Deployments: ON
```

### Method 3: Manual Deploy Script
```bash
# Use the provided script
chmod +x deploy-railway.sh
./deploy-railway.sh
```

---

## Monitoring & Debugging

### View Logs
```bash
# Real-time logs
railway logs

# Follow logs continuously
railway logs --follow
```

### Check Deployment Status
```bash
# Get service info
railway status

# Get domain URL
railway domain
```

### Common Log Patterns to Look For

✅ **Successful startup:**
```
🚀 RAILWAY SERVER STARTED
📡 Port: 4000
🤖 AI Provider: Gemini Vision Only
✅ Configured Gemini API Key
✅ Configured Supabase URL
```

❌ **Configuration errors:**
```
❌ Missing GEMINI_API_KEY
❌ Missing Supabase URL
⚠️ WARNING: Progression routes will not be available!
```

---

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.railway.app/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-22T...",
  "services": {
    "gemini": true,
    "supabase": true
  }
}
```

### 2. Version Check
```bash
curl https://your-app.railway.app/api/version

# Expected response:
{
  "success": true,
  "version": "2.0.0",
  "hasProgressionRoutes": true,
  "deployment": "railway-clean"
}
```

### 3. Test Food Analysis (requires image)
```bash
curl -X POST https://your-app.railway.app/api/analyze-food \
  -F "foodImage=@/path/to/food-image.jpg"
```

### 4. Test Workout Generation
```bash
curl -X POST https://your-app.railway.app/api/generate-workout-plan \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "full_name": "Test User",
      "age": 25,
      "gender": "male",
      "training_level": "intermediate",
      "primary_goal": "muscle_gain",
      "workout_frequency": "4_5"
    }
  }'
```

---

## Updating Your Deployment

### Method 1: Push Updates via CLI
```bash
# Make code changes
git add .
git commit -m "Update server code"

# Deploy to Railway
railway up
```

### Method 2: Git Push (if GitHub integration enabled)
```bash
git push origin main
# Railway auto-deploys
```

### Rolling Back
```bash
# In Railway dashboard:
# Deployments > Find previous deployment > Click "Redeploy"
```

---

## Custom Domain Setup

### Add Custom Domain
```bash
# Via CLI
railway domain add yourdomain.com

# Or via dashboard:
# Settings > Domains > Add Domain
```

### DNS Configuration
Add these records to your DNS provider:
```
Type: CNAME
Name: @
Value: your-app.railway.app
```

---

## Troubleshooting

### Issue: "Module not found" Error
**Solution:** Ensure all dependencies are in `package.json`
```bash
# Reinstall dependencies
npm install
git add package-lock.json
git commit -m "Update dependencies"
railway up
```

### Issue: Server Not Starting
**Check logs:**
```bash
railway logs
```

**Common causes:**
1. Missing environment variables
2. Wrong start command
3. Port binding issues (ensure using `process.env.PORT`)

### Issue: 503 Service Unavailable
**Solutions:**
1. Check if service is starting: `railway logs`
2. Verify health check endpoint: `/api/health`
3. Increase healthcheck timeout in `railway.json`

### Issue: API Timeouts
**Current Configuration:**
- Health check timeout: 100 seconds
- Gemini complex requests: 360 seconds (6 minutes)
- Restart policy: ON_FAILURE with 10 retries

**If still timing out:**
1. Check Railway service logs
2. Verify Gemini API key is valid
3. Monitor Gemini API status: https://status.cloud.google.com/

---

## Performance Optimization

### 1. Enable Caching
Consider adding Redis for caching AI responses:
```bash
# Add Redis to Railway project
railway add redis

# Update code to use Redis
```

### 2. Monitor Resource Usage
```bash
# View metrics in dashboard
# Railway Dashboard > Metrics
```

### 3. Scale if Needed
```bash
# Railway dashboard > Settings > Resources
# Adjust RAM/CPU as needed
```

---

## CI/CD Pipeline (Advanced)

### GitHub Actions Integration
Create `.github/workflows/deploy-railway.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Get Railway token:
```bash
railway token
```

Add to GitHub Secrets: `Settings > Secrets > RAILWAY_TOKEN`

---

## Cost Management

### Railway Pricing (as of 2025)
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage

### Monitor Usage
```bash
# Check current usage
railway status

# View in dashboard:
# Railway Dashboard > Billing
```

### Optimize Costs
1. **Use health checks** to prevent unnecessary restarts
2. **Cache AI responses** to reduce API calls
3. **Monitor logs** to catch issues early
4. **Scale appropriately** - don't over-provision

---

## Security Best Practices

### 1. Environment Variables
- ✅ Use Railway's encrypted variable storage
- ❌ Never commit `.env` files with real keys
- ✅ Rotate API keys regularly

### 2. Service Security
```bash
# Enable HTTPS (automatic with Railway)
# Enable CORS properly in server/index.js
# Use Supabase RLS policies
```

### 3. Monitoring
- Set up alerts for:
  - High error rates
  - Unusual traffic patterns
  - Service downtime

---

## Quick Reference Commands

```bash
# Login to Railway
railway login

# Link project
railway link

# Set environment variable
railway variables set KEY="value"

# Deploy code
railway up

# View logs
railway logs

# Get deployment URL
railway domain

# Check status
railway status

# Open dashboard
railway open
```

---

## Support & Resources

### Official Railway Docs
- https://docs.railway.app/

### GoFitAI Specific
- Server code: `server/index.js`
- Railway config: `railway.json`
- Deploy script: `deploy-railway.sh`

### Get Help
- Railway Discord: https://discord.gg/railway
- Railway Support: support@railway.app

---

## Deployment Checklist

Before deploying, verify:

- [ ] Railway CLI installed and logged in
- [ ] Project linked to Railway
- [ ] Environment variables set (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
- [ ] `railway.json` configured
- [ ] `server/index.js` uses `process.env.PORT`
- [ ] Health check endpoint (`/api/health`) works locally
- [ ] All dependencies in `package.json`
- [ ] Git repository is clean
- [ ] Tested locally first

After deploying:

- [ ] Health check returns 200 OK
- [ ] Version endpoint works
- [ ] Logs show successful startup
- [ ] Test food analysis endpoint
- [ ] Test workout generation endpoint
- [ ] Update mobile app API URL to Railway domain
- [ ] Monitor for first 24 hours

---

## Next Steps

1. **Deploy your backend:**
   ```bash
   railway up
   ```

2. **Update mobile app:** 
   Change API URL in `app.json` or `.env`:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-app.railway.app
   ```

3. **Test TestFlight build:**
   Follow `TESTFLIGHT_BUILD_GUIDE.md`

4. **Monitor and iterate:**
   Use Railway logs and metrics to optimize

---

**Last Updated:** November 22, 2025  
**Status:** Ready for Deployment ✅

