# How to Upgrade Gemini API to Paid Tier

## 🎯 Why Upgrade?

- ✅ **No daily quota limits** (free tier: 20 requests/day)
- ✅ **Higher rate limits** (more requests per minute)
- ✅ **Better reliability** (priority access)
- ✅ **Single API key** (no need to manage multiple keys)
- ✅ **Very affordable** (~$1-2/month for 100 users)

---

## 📋 Step-by-Step Upgrade Guide

### Step 1: Go to Google Cloud Console

1. Visit: [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with the **same Google account** you used for Google AI Studio
3. If you don't have a Google Cloud account, it will prompt you to create one

---

### Step 2: Create or Select a Project

1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Click **"New Project"**
3. Enter project name: `GoFitAI` (or any name you prefer)
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)
6. Select your new project from the dropdown

**Note:** If you already have a project, just select it.

---

### Step 3: Enable Billing

1. In the left sidebar, click **"Billing"** (or search for "Billing" in the top search bar)
2. If you haven't set up billing before:
   - Click **"Link a billing account"**
   - Click **"Create billing account"**
3. Fill in the billing form:
   - **Account name:** `GoFitAI Billing` (or any name)
   - **Country:** Select your country
   - **Currency:** Select your currency
   - **Type:** Individual or Business (choose what applies)
4. Click **"Submit and enable billing"**

**Note:** Google requires a credit/debit card, but you won't be charged unless you exceed the free tier limits.

---

### Step 4: Enable Gemini API

1. Go to [API Library](https://console.cloud.google.com/apis/library)
2. Search for: **"Generative Language API"** or **"Gemini API"**
3. Click on **"Generative Language API"**
4. Click **"Enable"**
5. Wait for it to enable (~30 seconds)

**Alternative:** Direct link to enable:
- [Enable Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)

---

### Step 5: Link Your API Key to the Billing Account

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. You should see your existing API key(s)
3. Click on your API key (or create a new one)
4. The key should automatically be linked to your Google Cloud project
5. If not, you'll see an option to **"Link to Google Cloud Project"**
   - Select your project (the one you created in Step 2)
   - Click **"Link"**

**Important:** Once linked to a billing account, the API key will use paid tier quotas automatically.

---

### Step 6: Verify Upgrade

1. Go to [API Quotas](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas)
2. You should see much higher limits:
   - **Free tier:** 20 requests/day
   - **Paid tier:** Much higher (varies by region, typically 1,500+ requests/minute)

3. Test your API key:
   ```bash
   # Test with curl (replace YOUR_API_KEY)
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

---

### Step 7: Update Railway (If Needed)

**Your existing API key should work automatically!** No changes needed in Railway.

However, if you want to verify:

1. Go to Railway Dashboard
2. Check your `GEMINI_API_KEY` variable
3. It should be the same key (no need to change it)

**The upgrade happens on Google's side, not in your code!**

---

## 💰 Understanding Billing

### Free Tier Credits

Google Cloud provides **$300 free credits** for new accounts:
- Valid for 90 days
- Covers most API usage for small apps
- After credits expire, you pay only for what you use

### Pricing (Gemini 2.5 Flash)

- **Input:** ~$0.075 per 1M tokens
- **Output:** ~$0.30 per 1M tokens
- **Average workout plan:** ~$0.003 (less than 1 cent)
- **Average food analysis:** ~$0.0002 (very cheap)

### Cost Estimates

| Users | Monthly Requests | Estimated Cost |
|-------|------------------|----------------|
| 100   | 2,000-4,000      | $0.60-$1.20    |
| 500   | 10,000-20,000   | $3-$6          |
| 1,000 | 20,000-40,000   | $6-$12         |

**Note:** You only pay for what you use. No monthly subscription fees.

---

## 🛡️ Set Up Budget Alerts (Recommended)

To avoid surprise charges:

1. Go to [Budgets & Alerts](https://console.cloud.google.com/billing/budgets)
2. Click **"Create Budget"**
3. Set budget amount: **$10/month** (or your preferred limit)
4. Set alert threshold: **50%** and **90%**
5. Add your email for notifications
6. Click **"Create Budget"**

This way, you'll get notified if costs approach your limit.

---

## ✅ Verification Checklist

After upgrading, verify:

- [ ] Billing account created and linked
- [ ] Generative Language API enabled
- [ ] API key linked to billing account
- [ ] Test API call works
- [ ] Budget alerts set up (optional but recommended)
- [ ] Railway still using the same API key (no code changes needed)

---

## 🚨 Troubleshooting

### Issue: "Billing account required"

**Solution:**
- Make sure you completed Step 3 (Enable Billing)
- Verify billing account is linked to your project
- Check that payment method is added

### Issue: "API not enabled"

**Solution:**
- Go back to Step 4
- Make sure "Generative Language API" is enabled
- Wait a few minutes and try again

### Issue: "Still hitting quota limits"

**Solution:**
- Wait 5-10 minutes for changes to propagate
- Verify API key is linked to billing account
- Check [API Quotas page](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas) to see new limits

### Issue: "Charged unexpectedly"

**Solution:**
- Check [Billing Reports](https://console.cloud.google.com/billing/reports)
- Review usage breakdown
- Set up budget alerts (Step 7 above)
- You can disable billing if needed (though this will revert to free tier)

---

## 📊 Monitor Your Usage

### Check API Usage

1. Go to [API Dashboard](https://console.cloud.google.com/apis/dashboard)
2. Select your project
3. Click on "Generative Language API"
4. View usage charts and metrics

### Check Billing

1. Go to [Billing Dashboard](https://console.cloud.google.com/billing)
2. Select your billing account
3. View current charges and usage

---

## 🎯 Quick Start (TL;DR)

1. **Go to:** [Google Cloud Console](https://console.cloud.google.com/)
2. **Create project** (if needed)
3. **Enable billing** (add payment method)
4. **Enable API:** [Enable Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
5. **Link API key** to billing account in [AI Studio](https://aistudio.google.com/app/apikey)
6. **Done!** Your existing Railway setup will automatically use paid tier

**No code changes needed!** The upgrade is transparent to your application.

---

## 💡 Pro Tips

1. **Start with free credits:** Use the $300 free credits first (90 days)
2. **Set budget alerts:** Get notified before spending too much
3. **Monitor usage:** Check your usage weekly to understand patterns
4. **Optimize prompts:** Shorter prompts = lower costs
5. **Cache results:** Cache common queries to reduce API calls

---

## 📞 Need Help?

- **Google Cloud Support:** [Cloud Support](https://cloud.google.com/support)
- **Gemini API Docs:** [API Documentation](https://ai.google.dev/docs)
- **Billing Help:** [Billing Support](https://cloud.google.com/billing/docs/how-to/get-support)

---

**Last Updated:** 2025-12-11
**Status:** Ready to upgrade









