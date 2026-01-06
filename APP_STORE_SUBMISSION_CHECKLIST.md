# App Store Submission Checklist - GoFitAI

## ✅ Complete Action Plan

---

## 📋 STEP 1: Host Privacy Policy & Support Pages (15 minutes)

### Option A: GitHub Pages (Recommended)
1. **Create GitHub account** (if needed): https://github.com
2. **Create new repository:**
   - Go to https://github.com/new
   - Name: `gofitai-privacy`
   - Make it **Public**
   - Click "Create repository"

3. **Upload files:**
   - Click "uploading an existing file"
   - Upload `privacy-policy.html` → **Rename to `index.html`**
   - Upload `support.html` → Keep as `support.html`
   - Commit changes

4. **Enable GitHub Pages:**
   - Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main`, Folder: `/ (root)`
   - Save

5. **Get your URLs:**
   - Privacy Policy: `https://[your-username].github.io/gofitai-privacy/`
   - Support: `https://[your-username].github.io/gofitai-privacy/support.html`

**✅ Write down these URLs - you'll need them!**

---

## 📋 STEP 2: Prepare App Store Connect Content (10 minutes)

### Copy from these files:
- **`APP_STORE_LISTING.md`** - Full description, keywords, promotional text
- **`APP_STORE_REVIEW_NOTES_QUICK.txt`** - Review notes (copy-paste ready)

### What you need:
1. **App Name:** GoFitAI
2. **Subtitle:** AI-Powered Fitness Coach
3. **Promotional Text:** (from APP_STORE_LISTING.md)
4. **Description:** (from APP_STORE_LISTING.md)
5. **Keywords:** (from APP_STORE_LISTING.md)
6. **Privacy Policy URL:** (from Step 1)
7. **Support URL:** (from Step 1)

---

## 📋 STEP 3: App Store Connect Setup (30 minutes)

### A. App Information
1. **Go to:** https://appstoreconnect.apple.com
2. **Your App → App Information**
3. **Fill in:**
   - ✅ App Name: GoFitAI
   - ✅ Subtitle: AI-Powered Fitness Coach
   - ✅ Privacy Policy URL: [Your URL from Step 1]
   - ✅ Support URL: [Your URL from Step 1]
   - ✅ Category: Health & Fitness

### B. Pricing and Availability
1. **Set pricing:** Free (app is free, subscriptions are in-app)
2. **Availability:** Select countries (or worldwide)

### C. App Store Listing
1. **Promotional Text:** (Copy from APP_STORE_LISTING.md)
2. **Description:** (Copy from APP_STORE_LISTING.md)
3. **Keywords:** (Copy from APP_STORE_LISTING.md)
4. **What's New:** (Copy from APP_STORE_LISTING.md)

### D. App Review Information
1. **Test Account:**
   - Email: [Your test account email]
   - Password: [Your test account password]
   - **Note:** Add explanation that account has completed onboarding

2. **Review Notes:** (Copy from APP_STORE_REVIEW_NOTES_QUICK.txt)
   - Paste the entire content
   - Fill in your test account email/password

3. **Contact Information:**
   - First Name: [Your name]
   - Last Name: [Your name]
   - Phone: [Your phone]
   - Email: support@gofitai.com

### E. Screenshots (Required!)
**You need screenshots for:**
- iPhone 6.7" (iPhone 14 Pro Max, etc.)
- iPhone 6.5" (iPhone 11 Pro Max, etc.)
- iPhone 5.5" (iPhone 8 Plus, etc.)

**Recommended screenshots:**
1. Onboarding screen
2. Paywall/subscription screen
3. AI workout generation
4. Food analysis
5. Progress tracking
6. Dashboard/main screen

**How to take screenshots:**
- Use iOS Simulator or real device
- Take screenshots of key features
- Make sure they look professional

---

## 📋 STEP 4: Build & Upload Your App (1-2 hours)

### A. Update Version Numbers
✅ Already done:
- Bundle version: 26
- Version: 1.0.1

### B. Build for App Store
```bash
# Build for App Store
eas build --platform ios --profile production
```

### C. Upload to App Store Connect
```bash
# Submit to App Store
eas submit --platform ios
```

**OR manually:**
1. Go to App Store Connect
2. Your App → TestFlight (or App Store)
3. Click "+" to add new build
4. Upload your `.ipa` file

---

## 📋 STEP 5: Final Checklist Before Submission

### App Store Connect
- [ ] App name filled in
- [ ] Subtitle added
- [ ] Description complete
- [ ] Keywords added
- [ ] Promotional text added
- [ ] Privacy Policy URL added and working
- [ ] Support URL added and working
- [ ] Screenshots uploaded (all required sizes)
- [ ] App icon uploaded
- [ ] Test account information provided
- [ ] Review notes completed
- [ ] Contact information filled in

### App Build
- [ ] Build number is 26
- [ ] Version is 1.0.1
- [ ] App builds successfully
- [ ] Tested on device/simulator
- [ ] All features working
- [ ] Subscription flow tested
- [ ] Paywall appears correctly

### Content
- [ ] Privacy policy accessible online
- [ ] Support page accessible online
- [ ] All URLs working
- [ ] Test account credentials correct

---

## 📋 STEP 6: Submit for Review

1. **Go to App Store Connect**
2. **Your App → App Store**
3. **Click "Submit for Review"**
4. **Answer export compliance questions:**
   - Encryption: "No" (if using standard encryption)
   - Or: "Yes" and provide details if using custom encryption

5. **Review all information**
6. **Submit!**

---

## ⏱️ Timeline

- **Step 1 (Hosting):** 15 minutes
- **Step 2 (Content Prep):** 10 minutes
- **Step 3 (App Store Connect):** 30 minutes
- **Step 4 (Build & Upload):** 1-2 hours
- **Step 5 (Final Check):** 15 minutes
- **Step 6 (Submit):** 5 minutes

**Total Time:** ~2-3 hours

---

## 🎯 Priority Order

**Do these FIRST:**
1. ✅ Host privacy policy & support pages (Step 1)
2. ✅ Fill in App Store Connect information (Step 3)
3. ✅ Upload screenshots (Step 3)
4. ✅ Build and upload app (Step 4)
5. ✅ Submit for review (Step 6)

---

## 📞 Need Help?

**If you get stuck:**
- **Hosting issues:** Check `PRIVACY_POLICY_HOSTING_GUIDE.md`
- **Content questions:** Check `APP_STORE_LISTING.md`
- **Review notes:** Check `APP_STORE_REVIEW_NOTES.md`
- **Support:** support@gofitai.com

---

## 🚨 Important Reminders

1. **Test Account:** Make sure your test account email/password are correct
2. **URLs:** Privacy Policy and Support URLs must be accessible
3. **Screenshots:** Required for all device sizes
4. **Build Number:** Must be unique and incrementing (you're at 26)
5. **Review Time:** Apple typically reviews in 24-48 hours

---

## ✅ You're Ready!

Once you complete these steps, your app will be submitted for review. Good luck! 🚀

















