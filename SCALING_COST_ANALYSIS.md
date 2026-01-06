# GoFitAI Scaling & Cost Analysis for 100 Users

## 📊 Usage Estimates

### Typical User Behavior

**New Users:**
- Generate 1 workout plan when signing up
- Analyze 2-3 food photos during onboarding

**Active Users (30-40% of total):**
- Regenerate workout plan: Every 2-4 weeks (when they want variety)
- Food photo analysis: 1-5 times per day
- Recipe generation: 1-3 times per week

**Casual Users (60-70% of total):**
- Use app occasionally
- Maybe 1-2 food analyses per week

---

## 🧮 Calculations for 100 Users

### Scenario 1: Conservative Estimate (Low Activity)

**Assumptions:**
- 30 active users (30%)
- 70 casual users (70%)
- Active users: 2 food analyses/day, 1 workout plan/month
- Casual users: 1 food analysis/week

**Daily API Calls:**
- Workout plans: ~1/day (30 active users ÷ 30 days)
- Food analysis: ~60/day (30 active × 2)
- Recipe generation: ~5/day (30 active ÷ 6 days)
- **Total: ~66 requests/day**

**Monthly:**
- ~2,000 requests/month

---

### Scenario 2: Realistic Estimate (Moderate Activity)

**Assumptions:**
- 40 active users (40%)
- 60 casual users (60%)
- Active users: 3 food analyses/day, 1 workout plan/2 weeks
- Casual users: 2 food analyses/week

**Daily API Calls:**
- Workout plans: ~3/day (40 active users ÷ 14 days)
- Food analysis: ~120/day (40 active × 3)
- Recipe generation: ~8/day (40 active ÷ 5 days)
- **Total: ~131 requests/day**

**Monthly:**
- ~3,930 requests/month

---

### Scenario 3: High Activity (Engaged Users)

**Assumptions:**
- 50 active users (50%)
- 50 casual users (50%)
- Active users: 5 food analyses/day, 1 workout plan/week
- Casual users: 3 food analyses/week

**Daily API Calls:**
- Workout plans: ~7/day (50 active users ÷ 7 days)
- Food analysis: ~250/day (50 active × 5)
- Recipe generation: ~10/day (50 active ÷ 5 days)
- **Total: ~267 requests/day**

**Monthly:**
- ~8,010 requests/month

---

## 💰 Cost Options

### Option 1: Free Tier (Multiple API Keys)

**Setup:**
- Create 10-15 free API keys
- Each key: 20 requests/day
- Total capacity: 200-300 requests/day

**Cost:** $0/month

**Pros:**
- Free
- Good for testing/early stage
- Easy to set up

**Cons:**
- Need to manage multiple keys
- Limited to ~200-300 requests/day
- May hit limits during peak usage

**Best for:** Early stage, < 200 requests/day

---

### Option 2: Google Cloud Paid Tier

**Pricing (as of 2025):**
- Gemini 2.5 Flash: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
- Average workout plan: ~2,000 input tokens, ~8,000 output tokens
- Average food analysis: ~1,500 input tokens, ~500 output tokens

**Estimated Monthly Cost:**

**Conservative (2,000 requests/month):**
- Workout plans (60): ~$0.20
- Food analysis (1,800): ~$0.30
- Recipes (140): ~$0.10
- **Total: ~$0.60/month**

**Realistic (4,000 requests/month):**
- Workout plans (90): ~$0.30
- Food analysis (3,600): ~$0.60
- Recipes (310): ~$0.20
- **Total: ~$1.10/month**

**High Activity (8,000 requests/month):**
- Workout plans (210): ~$0.70
- Food analysis (7,200): ~$1.20
- Recipes (590): ~$0.40
- **Total: ~$2.30/month**

**Pros:**
- No quota limits (within reason)
- Single API key to manage
- Reliable and scalable
- Very affordable

**Cons:**
- Requires billing setup
- Small monthly cost

**Best for:** Production apps, scaling beyond free tier

---

### Option 3: Hybrid Approach (Recommended)

**Setup:**
- Use 5-10 free API keys for baseline traffic
- Upgrade to paid tier for overflow/peak times
- Or: Use free keys for food analysis, paid for workout plans

**Cost:** $0 - $1/month (depending on overflow)

**Best for:** Growing apps, cost optimization

---

## 🎯 Recommendations

### For 100 Users:

**If you're just starting:**
1. **Use 10-15 free API keys** (200-300 requests/day capacity)
2. **Cost: $0/month**
3. Monitor usage and upgrade when needed

**If you're growing/established:**
1. **Upgrade to Google Cloud paid tier**
2. **Cost: ~$1-2/month** for 100 users
3. **Benefits:**
   - No quota management
   - Scales automatically
   - More reliable
   - Very affordable

### Scaling Beyond 100 Users:

**500 users:** ~$5-10/month
**1,000 users:** ~$10-20/month
**5,000 users:** ~$50-100/month

**Note:** Costs scale linearly with usage, and Google Cloud pricing is very competitive.

---

## 📈 Growth Strategy

### Phase 1: 0-100 Users (Free Tier)
- Use 10-15 free API keys
- Cost: $0
- Monitor usage patterns

### Phase 2: 100-500 Users (Hybrid)
- Keep free keys for baseline
- Add paid tier for overflow
- Cost: $2-5/month

### Phase 3: 500+ Users (Paid Tier)
- Full paid tier
- Cost: $5-20/month
- Focus on user experience, not quota management

---

## 💡 Pro Tips

1. **Monitor Usage:** Track API calls to understand patterns
2. **Optimize Prompts:** Shorter prompts = lower costs
3. **Cache Results:** Cache common queries to reduce API calls
4. **Rate Limiting:** Implement per-user rate limits to prevent abuse
5. **Free Trial:** Start with free keys, upgrade when you hit limits

---

## 🚀 Quick Setup for 100 Users

**Recommended: Start with Free Keys**

```bash
# Get 10 free API keys from https://aistudio.google.com/app/apikey
# Add to Railway:
railway variables --set GEMINI_API_KEY="primary_key"
railway variables --set GEMINI_BACKUP_KEYS="key2,key3,key4,key5,key6,key7,key8,key9,key10"
```

**Capacity:** 200 requests/day (10 keys × 20/day)
**Cost:** $0/month
**Good for:** First 100-200 users

**When to Upgrade:**
- When you consistently hit 150+ requests/day
- When you want to focus on product, not quota management
- When you're ready to scale beyond 200 users

---

**Bottom Line:** For 100 users, you can start with **10-15 free API keys ($0/month)** or upgrade to **paid tier (~$1-2/month)** for peace of mind. Both are very affordable options!









