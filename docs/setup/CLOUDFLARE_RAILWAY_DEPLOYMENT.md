# 🚂 Railway Deployment with Cloudflare Photo Analysis

## 🎯 Overview

This guide shows how to deploy your SnapBodyAI server to Railway with Cloudflare Workers AI for photo analysis. The server is already configured to use Cloudflare for vision analysis when users upload photos.

## 📋 Required Environment Variables for Railway

### 🔑 Essential Database (Supabase)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://lmfdgnxertwrhbjhrcby.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY
```

### 🤖 AI Provider Configuration
```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=ozmpEQmGss_pPLZIyI4E-7obcaZnxHS5jik5NYnv
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
AI_DEEPSEEK_ONLY=true
```

### 🌐 **NEW: Cloudflare Workers AI (REQUIRED for Photo Analysis)**
```bash
CF_ACCOUNT_ID=your_cloudflare_account_id_here
CF_API_TOKEN=your_cloudflare_api_token_here
CF_VISION_MODEL=@cf/llava-1.5-7b-hf
```

### 🔧 App Configuration
```bash
NODE_ENV=production
PORT=4000
EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app
USDA_FDC_API_KEY=1lhmKZ3NzzMJ9GONtJZRoJFTwD70JVLXVj0ZoLzZ
FOOD_ANALYZE_PROVIDER=deepseek
AI_REQUEST_TIMEOUT=120000
LOG_LEVEL=info
```

## 🔧 How to Get Cloudflare Credentials

### Step 1: Get Cloudflare Account ID
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign in to your account
3. On the right sidebar, you'll see your **Account ID**
4. Copy this for `CF_ACCOUNT_ID`

### Step 2: Create Cloudflare API Token
1. In Cloudflare dashboard, go to **My Profile** → **API Tokens**
2. Click **"Create Token"**
3. Use **"Custom token"** template
4. Set permissions:
   - **Account** - Cloudflare Workers:Edit
   - **Zone Resources** - Include All zones
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. Copy the token for `CF_API_TOKEN`

### Step 3: Verify Cloudflare Workers AI Access
1. Make sure you have access to **Cloudflare Workers AI**
2. Go to **Workers & Pages** → **AI** in your Cloudflare dashboard
3. Enable Workers AI if not already enabled

## 🚂 Deploy to Railway

### Method 1: Railway Web Dashboard
1. Go to [railway.app](https://railway.app)
2. Sign in and select your `gofitai-production` project
3. Click on your service
4. Go to **"Variables"** tab
5. Add all environment variables listed above
6. Click **"Deploy"** to trigger redeploy

### Method 2: Railway CLI (Recommended)
```bash
# Install Railway CLI if needed
npm install -g @railway/cli

# Login to Railway
railway login

# Set all environment variables
railway variables set EXPO_PUBLIC_SUPABASE_URL="https://lmfdgnxertwrhbjhrcby.supabase.co"
railway variables set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"
railway variables set EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"

# AI Configuration
railway variables set AI_PROVIDER="deepseek"
railway variables set DEEPSEEK_API_KEY="ozmpEQmGss_pPLZIyI4E-7obcaZnxHS5jik5NYnv"
railway variables set DEEPSEEK_API_URL="https://api.deepseek.com/chat/completions"
railway variables set DEEPSEEK_MODEL="deepseek-chat"
railway variables set AI_DEEPSEEK_ONLY="true"

# 🌐 CLOUDFLARE CONFIGURATION (REPLACE WITH YOUR VALUES)
railway variables set CF_ACCOUNT_ID="your_cloudflare_account_id_here"
railway variables set CF_API_TOKEN="your_cloudflare_api_token_here"
railway variables set CF_VISION_MODEL="@cf/llava-1.5-7b-hf"

# App Configuration
railway variables set NODE_ENV="production"
railway variables set PORT="4000"
railway variables set EXPO_PUBLIC_API_URL="https://gofitai-production.up.railway.app"
railway variables set USDA_FDC_API_KEY="1lhmKZ3NzzMJ9GONtJZRoJFTwD70JVLXVj0ZoLzZ"
railway variables set FOOD_ANALYZE_PROVIDER="deepseek"
railway variables set AI_REQUEST_TIMEOUT="120000"
railway variables set LOG_LEVEL="info"

# Deploy
railway up
```

## 🔄 How Photo Analysis Works

### Current Flow:
1. **User uploads photos** → BodyAnalysisForm.tsx calls AnalysisService.startAnalysis()
2. **Frontend sends photos** → `/api/analyze-body` endpoint
3. **Server processes** → Uses DeepSeek for text analysis
4. **For food photos** → `/api/analyze-food` endpoint uses **Cloudflare Workers AI** for vision analysis

### Code Path for Photo Analysis:
```javascript
// server/index.js lines 4552-4586
app.post('/api/analyze-food', upload.single('foodImage'), async (req, res) => {
  // ... image processing ...
  
  // Uses Cloudflare Workers AI for vision analysis
  const visionResponse = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${VISION_MODEL}`,
    {
      prompt: prompt,
      image: `data:${mimeType};base64,${base64Image}`,
      stream: false
    },
    {
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
});
```

## 🧪 Test Photo Analysis After Deployment

### 1. Test Health Endpoint
```bash
curl https://gofitai-production.up.railway.app/api/health
```

### 2. Test Food Photo Analysis
```bash
# Upload a test food image
curl -X POST "https://gofitai-production.up.railway.app/api/analyze-food" \
  -F "foodImage=@/path/to/test-food-image.jpg"
```

### 3. Test Body Analysis
```bash
curl -X POST "https://gofitai-production.up.railway.app/api/analyze-body" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "frontPhotoUrl": "https://example.com/front.jpg",
    "backPhotoUrl": "https://example.com/back.jpg"
  }'
```

## ✅ Expected Results After Deployment

- ✅ **Photo analysis works** using Cloudflare Workers AI
- ✅ **Food recognition** from uploaded images
- ✅ **Body analysis** from front/back photos
- ✅ **DeepSeek integration** for text-based AI features
- ✅ **No more vision model errors**

## 🚨 Important Notes

1. **Cloudflare Workers AI is REQUIRED** for photo analysis features
2. **DeepSeek doesn't support vision** - only text-based AI
3. **Replace placeholder values** with your actual Cloudflare credentials
4. **Test thoroughly** after deployment to ensure photo analysis works
5. **Monitor logs** for any Cloudflare API errors

## 🔍 Troubleshooting

### If photo analysis fails:
1. Check Cloudflare credentials are correct
2. Verify Workers AI is enabled in your Cloudflare account
3. Check Railway logs for API errors
4. Ensure CF_ACCOUNT_ID and CF_API_TOKEN are set correctly

### Common Issues:
- **"Invalid API token"** → Check CF_API_TOKEN permissions
- **"Account not found"** → Verify CF_ACCOUNT_ID is correct
- **"Model not available"** → Ensure Workers AI is enabled

