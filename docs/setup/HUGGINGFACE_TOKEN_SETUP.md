# 🤗 Hugging Face API Token Setup Guide

## Overview

The simplified SnapBodyAI backend uses Hugging Face's BLIP model for image analysis. While the system works without an API token using rule-based fallbacks, adding a token enables AI-powered food recognition.

## Getting Your Hugging Face API Token

### Step 1: Create Hugging Face Account
1. Go to [huggingface.co](https://huggingface.co)
2. Click **"Sign Up"** if you don't have an account
3. Complete the registration process
4. Verify your email address

### Step 2: Generate API Token
1. Sign in to your Hugging Face account
2. Click on your profile picture (top right)
3. Select **"Settings"**
4. Navigate to **"Access Tokens"** in the left sidebar
5. Click **"New token"**
6. Configure your token:
   - **Name**: `SnapBodyAI` (or any descriptive name)
   - **Type**: Select **"Read"** 
   - **Repositories**: Leave as default (all public repositories)
7. Click **"Generate a token"**
8. **Important**: Copy the token immediately - you won't see it again!

### Step 3: Token Permissions
For SnapBodyAI, you only need **"Read"** permissions:
- ✅ **Read**: Required for accessing BLIP model
- ❌ **Write**: Not needed
- ❌ **Manage**: Not needed

## Adding Token to Railway Deployment

### Method 1: Railway Web Dashboard
1. Go to [railway.app](https://railway.app)
2. Sign in and select your project
3. Click on your service/deployment
4. Go to **"Variables"** tab
5. Click **"Add Variable"**
6. Set:
   - **Name**: `HUGGINGFACE_API_TOKEN`
   - **Value**: Your copied token
7. Click **"Save"**
8. Railway will automatically redeploy

### Method 2: Railway CLI
```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Add the environment variable
railway variables set HUGGINGFACE_API_TOKEN="your_token_here"

# Deploy
railway up
```

### Method 3: Use Our Script
```bash
# Run the provided script
./scripts/add-hf-token-railway.sh YOUR_HUGGINGFACE_TOKEN
```

## Verification

### Test the Token Works
After deployment, test with:

```bash
# Test health endpoint
curl https://your-railway-app.up.railway.app/api/health

# Test food analysis with image description
curl -X POST https://your-railway-app.up.railway.app/api/analyze-food \
  -H "Content-Type: application/json" \
  -d '{"imageDescription": "grilled chicken with vegetables"}'
```

### Expected Response
With a valid token, you should see responses like:
```json
{
  "success": true,
  "data": {
    "success": true,
    "nutrition": {
      "food_name": "grilled chicken with vegetables",
      "calories": 250,
      "protein": 30,
      "carbs": 15,
      "fat": 8,
      "confidence": "medium"
    },
    "message": "Analysis completed using Hugging Face AI"
  }
}
```

## Token Management

### Security Best Practices
- ✅ **Never commit tokens to code repositories**
- ✅ **Use environment variables only**
- ✅ **Rotate tokens periodically**
- ✅ **Use minimal required permissions**
- ❌ **Don't share tokens with others**
- ❌ **Don't use write permissions unless needed**

### Token Rotation
To rotate your token:
1. Generate a new token in Hugging Face
2. Update the Railway environment variable
3. Delete the old token from Hugging Face

### Troubleshooting
- **"Unauthorized" errors**: Check token is correctly set in Railway
- **"Rate limited" errors**: Hugging Face has usage limits on free tier
- **"Model not found" errors**: Ensure you have read access to public models

## Cost & Limits

### Free Tier Limits
Hugging Face free tier includes:
- **1,000 requests/month** for Inference API
- **Rate limit**: ~1 request/second
- **No cost** for public models

### If You Exceed Limits
The system gracefully falls back to:
1. Rule-based nutrition estimation
2. Standard portion size calculations
3. Generic food categorization

## Alternative: No Token Setup

The system works perfectly without a token:
- Uses rule-based food analysis
- Provides nutrition estimates
- Returns consistent responses
- No external API dependencies

Simply deploy without setting `HUGGINGFACE_API_TOKEN` and the system will use fallback mechanisms.

## Integration with SnapBodyAI

The simplified backend uses the token for:
- **Image Captioning**: BLIP model describes food images
- **Text Analysis**: AI processes food descriptions
- **Fallback Chain**: Token → Rule-based → Always works

Your app will remain functional regardless of token availability!

