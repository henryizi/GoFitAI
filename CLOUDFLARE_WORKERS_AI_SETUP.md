# Cloudflare Workers AI Setup Guide

## Overview
This guide will help you set up Cloudflare Workers AI for enhanced food image analysis in your SnapBodyAI application. When properly configured, Cloudflare Workers AI provides more accurate dish recognition and nutritional analysis compared to the basic fallback system.

## Current Status
✅ **System is working without Cloudflare** - Your food analysis works perfectly using the BasicFoodAnalyzer fallback system
⚠️  **Cloudflare 7000 Error** - This error occurs when Cloudflare credentials are not configured or invalid

## Error Explanation
```
[FOOD ANALYZE] Cloudflare returned code 7000 (No route for that URI)
```
This error code 7000 specifically means:
- `CF_ACCOUNT_ID` is incorrect or not enabled for Workers AI
- Model slug is unavailable for this account
- API token permissions are insufficient (needs Workers AI access)

## Step-by-Step Setup

### 1. Create Cloudflare Account
1. Go to [https://cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Verify your email address

### 2. Enable Workers AI
1. Log into your Cloudflare dashboard
2. Navigate to **AI** → **Workers AI** in the left sidebar
3. Click **"Get started"** if prompted
4. Your account should now have Workers AI enabled

### 3. Get Your Account ID
1. In your Cloudflare dashboard, click on your profile (top right)
2. Select **"My Profile"**
3. Scroll down to **"API Tokens"**
4. Your **Account ID** will be displayed at the top
5. Copy this ID - you'll need it for configuration

### 4. Create API Token
1. Go to **My Profile** → **API Tokens**
2. Click **"Create Token"**
3. Select **"Edit Cloudflare Workers"** template (recommended)
4. Or create a custom token with these permissions:
   - **Account**: Workers AI - Read
   - **Account**: Workers AI - Edit
5. Set token name: "SnapBodyAI Workers AI"
6. Click **"Continue to summary"**
7. Copy the generated API token (keep it secure!)

### 5. Configure Environment Variables

#### Option A: Server Environment File (Recommended)
Create or update your server `.env` file:

```bash
# Cloudflare Workers AI Configuration
CF_ACCOUNT_ID=your_actual_account_id_here
CF_API_TOKEN=your_actual_api_token_here
CF_VISION_MODEL=@cf/llava-hf/llava-1.5-7b-hf
```

#### Option B: System Environment Variables
Set environment variables in your system:

```bash
export CF_ACCOUNT_ID="your_actual_account_id_here"
export CF_API_TOKEN="your_actual_api_token_here"
export CF_VISION_MODEL="@cf/llava-hf/llava-1.5-7b-hf"
```

### 6. Test Configuration
Run this test to verify your setup:

```bash
cd /Users/ngkwanho/Desktop/SnapBodyAI
node test-cloudflare-llava.js
```

Expected output:
```
🧪 Testing Cloudflare Workers AI LLaVA Model...
✅ Success! LLaVA model is working.
Response: [model response content]
```

## Available Models

### Primary Models (Recommended)
- `@cf/llava-hf/llava-1.5-7b-hf` - **LLaVA 1.5** (Best for food recognition)
- `@cf/meta/llama-3.2-11b-vision-instruct` - **LLaMA 11B Vision** (Good alternative)

### Fallback Models
- `@cf/meta/llama-3.2-90b-vision-instruct` - **LLaMA 90B Vision** (Slower, more accurate)
- `@cf/unum/uform-gen2-qwen-500m` - **UForm Gen2** (Fast, lightweight)

## Troubleshooting

### Error: "7000 (No route for that URI)"
**Cause**: Model not available for your account or incorrect Account ID
**Solution**:
1. Verify your `CF_ACCOUNT_ID` is correct
2. Check that Workers AI is enabled in your account
3. Try a different model from the list above

### Error: "9109 (Unauthorized)"
**Cause**: API token lacks permissions
**Solution**:
1. Regenerate your API token with proper permissions
2. Ensure the token has "Workers AI" permissions
3. Check token hasn't expired

### Error: "Account not found"
**Cause**: Incorrect Account ID
**Solution**:
1. Double-check your Account ID in Cloudflare dashboard
2. Ensure you're using the correct account
3. Verify the ID format (should be alphanumeric)

## Free Tier Limits
- **Requests per minute**: 50
- **Monthly usage**: 10,000 requests
- **Models available**: All vision models listed above

## Benefits of Cloudflare Workers AI

### ✅ Enhanced Analysis
- **Better dish recognition** - Identifies specific dish names and cuisines
- **Improved accuracy** - More precise nutritional estimates
- **Detailed descriptions** - Better food item detection

### ✅ Performance
- **Faster processing** - Cloudflare's global network
- **Lower latency** - Edge computing benefits
- **Reliable uptime** - Enterprise-grade infrastructure

### ✅ Cost Effective
- **Free tier** - 10,000 requests/month
- **No setup costs** - Just configure API credentials
- **Pay-as-you-go** - Scale with usage

## Fallback System
Your application will continue working even without Cloudflare setup:
- ✅ **BasicFoodAnalyzer** provides reliable nutritional analysis
- ✅ **Intelligent fallbacks** handle all error conditions
- ✅ **No service interruption** when Cloudflare is unavailable

## Quick Test
After setup, test with a food image:

```bash
curl -X POST http://localhost:4000/api/analyze-food \
  -F "foodImage=@path/to/food/photo.jpg"
```

Expected response includes enhanced analysis with:
- Specific dish name recognition
- Cuisine type identification
- Detailed nutritional breakdown
- Higher confidence scores

## Support
If you encounter issues:
1. Check the troubleshooting section above
2. Verify your environment variables
3. Test with the provided test script
4. Review Cloudflare Workers AI documentation

---
**Note**: Cloudflare Workers AI is optional but recommended for enhanced food analysis accuracy. Your application works perfectly without it using the intelligent fallback system.
