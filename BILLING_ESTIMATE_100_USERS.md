# Billing Estimate: 100 Users with Single Paid API Key

## 📊 Usage Assumptions

### User Distribution
- **Active Users:** 40% (40 users) - Use app regularly
- **Casual Users:** 40% (40 users) - Use app occasionally  
- **Inactive Users:** 20% (20 users) - Signed up but rarely use

### Feature Usage Patterns

**Workout Plan Generation:**
- New users: 1 plan on signup
- Active users: Regenerate every 3 weeks (10 plans/year = ~0.83/month)
- Casual users: Regenerate every 2 months (6 plans/year = ~0.5/month)
- **Daily average:** ~2.5 workout plans/day

**Food Photo Analysis:**
- Active users: 3 photos/day
- Casual users: 2 photos/week (0.29/day)
- **Daily average:** ~125 food analyses/day

**Recipe Generation:**
- Active users: 2 recipes/week (0.29/day)
- Casual users: 1 recipe/month (0.03/day)
- **Daily average:** ~12 recipes/day

---

## 🧮 Daily API Call Breakdown

| Feature | Daily Calls | Monthly Total |
|---------|-------------|---------------|
| Workout Plans | 2.5 | 75 |
| Food Analysis | 125 | 3,750 |
| Recipe Generation | 12 | 360 |
| **TOTAL** | **139.5** | **4,185** |

---

## 💰 Token Usage & Cost Calculation

### Gemini 2.5 Flash Pricing (as of 2025)
- **Input tokens:** $0.075 per 1M tokens
- **Output tokens:** $0.30 per 1M tokens

### Average Token Usage Per Request

**1. Workout Plan Generation:**
- Input: ~2,000 tokens (user profile + prompt)
- Output: ~8,000 tokens (full workout plan with exercises)
- **Cost per plan:** ~$0.0027

**2. Food Photo Analysis:**
- Input: ~1,500 tokens (image + prompt)
- Output: ~500 tokens (nutrition info)
- **Cost per analysis:** ~$0.0002

**3. Recipe Generation:**
- Input: ~1,200 tokens (ingredients + preferences)
- Output: ~2,000 tokens (recipe details)
- **Cost per recipe:** ~$0.0008

---

## 💵 Monthly Cost Breakdown

### Detailed Calculation

**Workout Plans (75/month):**
- 75 plans × $0.0027 = **$0.20/month**

**Food Analysis (3,750/month):**
- 3,750 analyses × $0.0002 = **$0.75/month**

**Recipe Generation (360/month):**
- 360 recipes × $0.0008 = **$0.29/month**

### **TOTAL MONTHLY COST: $1.24/month**

---

## 📈 Cost Scenarios

### Scenario 1: Conservative (Low Activity)
- 2,000 requests/month
- **Cost: ~$0.60/month**

### Scenario 2: Realistic (Our Estimate)
- 4,185 requests/month
- **Cost: ~$1.24/month**

### Scenario 3: High Activity (Engaged Users)
- 8,000 requests/month
- **Cost: ~$2.40/month**

---

## 🎯 Final Estimate for 100 Users

### **Most Likely Cost: $1.00 - $1.50/month**

This assumes:
- Mix of active and casual users
- Normal usage patterns
- Standard feature usage

### Cost Breakdown:
- **Workout plans:** $0.20/month (15%)
- **Food analysis:** $0.75/month (60%)
- **Recipes:** $0.29/month (25%)

---

## 💡 Cost Optimization Tips

### 1. Cache Common Queries
- Cache workout plans for similar profiles
- **Savings:** 10-20% reduction

### 2. Optimize Prompts
- Shorter, more efficient prompts
- **Savings:** 5-10% reduction

### 3. Rate Limiting
- Limit per-user API calls
- **Savings:** Prevents abuse, saves 5-15%

### 4. Smart Caching Strategy
- Cache food analysis for similar meals
- **Savings:** 15-25% reduction

**With optimizations:** Could reduce to **$0.80 - $1.00/month**

---

## 📊 Cost Per User

- **Average cost per user:** $0.0124/month (~1.2 cents)
- **Cost per active user:** $0.031/month (~3 cents)
- **Cost per casual user:** $0.005/month (~0.5 cents)

**Very affordable!** Even at 1,000 users, you're looking at ~$12-15/month.

---

## 🚀 Scaling Projections

| Users | Monthly Requests | Estimated Cost |
|-------|------------------|----------------|
| 100   | 4,185           | **$1.24**      |
| 250   | 10,463          | **$3.10**      |
| 500   | 20,925          | **$6.20**      |
| 1,000 | 41,850          | **$12.40**     |
| 5,000 | 209,250         | **$62.00**     |

**Note:** Costs scale linearly with usage. Very predictable!

---

## 🎁 Google Cloud Free Credits

### New Account Benefits:
- **$300 free credits** for 90 days
- Covers ~240,000 requests (enough for 5,700 users for 3 months!)
- After credits expire, you pay only for what you use

**For 100 users:** Your first 3 months could be **completely free** with the $300 credit!

---

## ✅ Summary

### For 100 Users with Single Paid API Key:

**Monthly Cost:** **$1.00 - $1.50**

**Breakdown:**
- Workout plans: ~$0.20
- Food analysis: ~$0.75
- Recipes: ~$0.29

**With Free Credits:**
- First 3 months: **$0** (covered by $300 credit)
- After credits: **$1.00 - $1.50/month**

**Cost per user:** ~1.2 cents/month

**Very affordable!** Even if you have 1,000 users, you're looking at ~$12-15/month.

---

## 💰 Comparison: Free vs Paid

### Free Tier (Multiple Keys):
- **Cost:** $0/month
- **Capacity:** 200-300 requests/day (with 10-15 keys)
- **Management:** Need to rotate keys
- **Reliability:** May hit limits during peak

### Paid Tier (Single Key):
- **Cost:** $1.00-1.50/month
- **Capacity:** Unlimited (within reason)
- **Management:** Zero maintenance
- **Reliability:** Always available

**Recommendation:** For production apps, paid tier is worth the small cost for peace of mind and scalability.

---

**Last Updated:** 2025-12-11
**Based on:** Gemini 2.5 Flash pricing and realistic usage patterns









