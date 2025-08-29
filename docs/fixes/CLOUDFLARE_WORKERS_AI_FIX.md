# 🔧 Cloudflare Workers AI Setup Fix

## 🚨 **Current Issue**
The Cloudflare Workers AI is returning error code **7000 "No route for that URI"** which indicates the API token doesn't have Workers AI permissions or the account isn't properly configured.

## 🔍 **Diagnosed Problems**
Our debug test revealed these specific issues:

1. **❌ Error 9109**: "Unauthorized to access requested resource" - Account access denied
2. **❌ Error 7000**: "No route for that URI" - Workers AI endpoint not accessible  
3. **❌ Error 10000**: "Method not allowed for api_token authentication" - Wrong token type

## ✅ **Step-by-Step Fix**

### **Step 1: Verify Account Has Workers AI Access**
1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **AI** section
3. Verify you see the Workers AI interface
4. If not available, you may need to:
   - Upgrade to a paid plan (Workers AI requires paid tier)
   - Enable Workers AI in your account settings

### **Step 2: Create Proper API Token**
The current token may not have Workers AI permissions. Create a new one:

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use **"Workers AI"** template or **"Custom Token"**
4. Set permissions:
   ```
   ✅ Workers AI:Edit
   ✅ Account:Read
   ✅ Zone:Read (optional)
   ```
5. Set **Account Resources**: Include your account
6. Set **Zone Resources**: All zones (or specific zones if preferred)
7. Copy the generated token immediately

### **Step 3: Update Railway Environment Variables**
Replace the current API token with the new one:

```bash
# Update with your new token
railway variables set CF_API_TOKEN="your_new_workers_ai_token_here"
```

### **Step 4: Verify Account ID**
Double-check your account ID:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Right sidebar shows **Account ID**
3. Copy the full ID and verify it matches: `b250a9011545cb1ec917651da27c0594`

```bash
# Update if different
railway variables set CF_ACCOUNT_ID="your_correct_account_id"
```

### **Step 5: Test Available Models**
After fixing the token, test which models are actually available:

```bash
# Run our debug script to verify
node test-cloudflare-debug.js
```

## 🔄 **Alternative Solutions**

### **Option A: Switch to Different Model**
If `@cf/unum-cloud/uform-gen2-qwen-500m` isn't available, try:

```bash
# Try LLaVA model instead
railway variables set CF_VISION_MODEL="@cf/llava-hf/llava-1.5-7b-hf"

# Or try newer models
railway variables set CF_VISION_MODEL="@cf/meta/llama-3.2-90b-vision-instruct"
```

### **Option B: Use Alternative Vision Provider**
If Cloudflare doesn't work, consider:

1. **OpenAI GPT-4 Vision** (requires ***REMOVED***)
2. **Anthropic Claude Vision** (requires ANTHROPIC_API_KEY)
3. **Local vision model** (requires setup)

## 🧪 **Testing the Fix**

After applying the fix:

1. **Test API connectivity**:
   ```bash
   node test-cloudflare-debug.js
   ```

2. **Deploy updated config**:
   ```bash
   railway up --detach
   ```

3. **Test food analysis** in the app

## 🎯 **Expected Results After Fix**

✅ **Before**: Error 7000 "No route for that URI"  
✅ **After**: Successful food image analysis

The debug script should show:
- ✅ Model list request successful
- ✅ Target model found
- ✅ Vision API request successful
- ✅ Account access successful

## 📞 **Need Help?**

If issues persist:
1. Check if your Cloudflare account is on a paid plan
2. Verify Workers AI is available in your region
3. Contact Cloudflare support for Workers AI access
4. Consider switching to OpenAI GPT-4 Vision as alternative

## 🔧 **Current Configuration**
```
CF_ACCOUNT_ID=b250a9011545cb1ec917651da27c0594
CF_API_TOKEN=ozmpEQmGss_pPLZIyI4E-7obcaZnxHS5jik5NYnv (❌ needs Workers AI permissions)
CF_VISION_MODEL=@cf/unum-cloud/uform-gen2-qwen-500m
```

---
*This guide was generated based on the specific error codes from your Cloudflare API diagnostic test.*


