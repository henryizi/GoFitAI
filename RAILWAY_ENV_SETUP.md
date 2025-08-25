# 🚂 Railway Environment Configuration Fix

## 🚨 **CRITICAL ISSUE IDENTIFIED**

The "Invalid API key" error is coming from **Supabase**, not the AI providers. Your Railway deployment is missing essential environment variables.

## 📋 **Required Environment Variables for Railway**

You need to set these environment variables in your Railway dashboard:

### **🔑 Essential Database (Supabase) Variables**
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **🤖 AI Provider Variables**
```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
AI_PROVIDER=deepseek
```

### **🔧 App Configuration**
```bash
NODE_ENV=production
PORT=4000
EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app
```

## 🔧 **How to Fix This on Railway**

### **Step 1: Access Railway Dashboard**
1. Go to [railway.app](https://railway.app)
2. Sign in to your account
3. Select your `gofitai-production` project

### **Step 2: Set Environment Variables**
1. Click on your deployment/service
2. Go to the **"Variables"** tab
3. Add each environment variable listed above

### **Step 3: Find Your Supabase Credentials**
1. Go to [supabase.com](https://supabase.com)
2. Sign in and select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → use for `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → use for `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → use for `SUPABASE_SERVICE_KEY`

### **Step 4: Get Your DeepSeek API Key**
1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign in to your account
3. Go to **API Keys**
4. Copy your API key → use for `DEEPSEEK_API_KEY`

### **Step 5: Redeploy**
After setting all environment variables:
1. In Railway dashboard, trigger a new deployment
2. Wait for deployment to complete
3. Test the API endpoints

## 🧪 **Test Your Fix**

Once configured, test with:

```bash
# Test health endpoint
curl https://gofitai-production.up.railway.app/api/health

# Test weight logging (use a real user ID from your Supabase users table)
curl -X POST "https://gofitai-production.up.railway.app/api/log-daily-metric" \
  -H "Content-Type: application/json" \
  -d '{"userId": "REAL_USER_ID", "metricDate": "2025-08-24", "metrics": {"weight_kg": 70}}'
```

## ⚡ **Quick Fix Script**

If you have Railway CLI installed:

```bash
# Install Railway CLI if needed
npm install -g @railway/cli

# Login and set variables
railway login
railway variables set EXPO_PUBLIC_SUPABASE_URL="your_url_here"
railway variables set SUPABASE_SERVICE_KEY="your_service_key_here"
railway variables set EXPO_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here"
railway variables set DEEPSEEK_API_KEY="your_deepseek_key_here"
railway variables set DEEPSEEK_API_URL="https://api.deepseek.com/chat/completions"
railway variables set AI_PROVIDER="deepseek"

# Redeploy
railway up
```

## 🎯 **Expected Result**

After configuration:
- ✅ Weight entries will save successfully
- ✅ Progress tracking will work
- ✅ AI features will function properly
- ✅ No more "Invalid API key" errors

The issue is **not with your app code** - it's purely a deployment configuration issue!



