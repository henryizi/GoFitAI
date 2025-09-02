# 🤗 Hugging Face Only - Food Analysis Deployment

## ✅ What's Been Implemented

### 1. **Pure Hugging Face Vision Service**
- ✅ Created `server/services/visionService.js` with multiple HF models
- ✅ Multi-model fallback: `Salesforce/blip-image-captioning-large`, `nlpconnect/vit-gpt2-image-captioning`, `microsoft/git-base-coco`
- ✅ Smart image preprocessing with Sharp
- ✅ Fallback to OpenAI and Cloudflare if needed
- ✅ Smart estimation if all vision providers fail

### 2. **Updated Main Server**
- ✅ Replaced `server/index.js` with Hugging Face-only implementation
- ✅ Removed DeepSeek dependencies
- ✅ Clean, focused food analysis endpoint
- ✅ Proper error handling and fallbacks

### 3. **Features**
- ✅ **Image Upload Analysis**: Upload food photos for HF vision analysis
- ✅ **Base64 Image Support**: Direct base64 image analysis
- ✅ **Text Description Analysis**: Fallback text-based analysis
- ✅ **Smart Fallbacks**: Multiple safety nets if vision fails
- ✅ **File Cleanup**: Automatic cleanup of uploaded files

## 🚀 Deploy to Railway

### **Step 1: Set Environment Variables**
```bash
# Required for Hugging Face vision
railway variables set HUGGINGFACE_API_TOKEN="your_hf_token_here"

# Optional fallback providers (if you want them)
railway variables set OPENAI_API_KEY="your_openai_key" 
railway variables set CF_ACCOUNT_ID="your_cf_account"
railway variables set CF_API_TOKEN="your_cf_token"

# Basic server config
railway variables set NODE_ENV="production"
railway variables set PORT="4000"
```

### **Step 2: Get Your Hugging Face Token**
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token with "Read" permissions
3. Copy the token and use it in the railway command above

### **Step 3: Deploy**
```bash
railway up
```

## 🧪 Test After Deployment

### **1. Health Check**
```bash
curl https://your-railway-url.up.railway.app/health
```

### **2. Test Food Analysis with Text**
```bash
curl -X POST "https://your-railway-url.up.railway.app/api/analyze-food" \
  -F "imageDescription=grilled chicken with vegetables"
```

### **3. Test Food Analysis with Image**
```bash
curl -X POST "https://your-railway-url.up.railway.app/api/analyze-food" \
  -F "foodImage=@your_food_photo.jpg"
```

## 📊 API Response Format

```json
{
  "success": true,
  "dishName": "Grilled Chicken with Vegetables",
  "cuisineType": "International",
  "cookingMethod": "grilled",
  "foodItems": [
    {
      "name": "Chicken Breast",
      "quantity": "1 piece (150g)",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6,
      "fiber": 0,
      "sugar": 0,
      "sodium": 74
    }
  ],
  "totalNutrition": {
    "calories": 335,
    "protein": 33,
    "carbs": 10,
    "fat": 18.1,
    "fiber": 4,
    "sugar": 5,
    "sodium": 99
  },
  "confidence": "high",
  "visionProvider": "huggingface",
  "visionModel": "Salesforce/blip-image-captioning-large",
  "imageDescription": "A plate of grilled chicken breast with mixed vegetables including bell peppers and zucchini"
}
```

## 🔧 How It Works

### **Image Analysis Flow:**
```
1. User uploads food photo
2. Server converts to optimized base64
3. Hugging Face vision models analyze image
4. Generated description feeds nutrition analysis
5. Return detailed nutrition breakdown
```

### **Fallback Chain:**
```
1. Hugging Face (3 different models)
2. OpenAI Vision (if configured)
3. Cloudflare Workers AI (if configured)  
4. Smart estimation (always available)
```

## 🎯 Benefits of Hugging Face Only

- ✅ **Free**: Hugging Face Inference API is free for many models
- ✅ **Fast**: Direct API calls without complex routing
- ✅ **Reliable**: Multiple model fallbacks
- ✅ **Clean**: No DeepSeek dependencies
- ✅ **Focused**: Purpose-built for vision analysis

## 🔒 Security Features

- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Rate limiting (100 req/15min per IP)
- ✅ File size limits (10MB max)
- ✅ File type validation (images only)
- ✅ Automatic file cleanup

## 📋 Ready to Deploy!

Your SnapBodyAI server is now configured to use **only Hugging Face** for food image analysis. Simply add your Hugging Face API token to Railway and deploy!

🔗 **Get your token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

